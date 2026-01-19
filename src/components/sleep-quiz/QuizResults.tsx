/**
 * Premium Quiz Results Component v10
 * 
 * Pre-Reveal / Full-Reveal architecture:
 * - Pre-Reveal (before email): Persona name, short description, 1-2 insights, 1 product
 * - Full-Reveal (after email): Complete assessment breakdown, all recommendations, Coach CTA
 * 
 * Design: Scandinavian calm, scientific framing, premium feel
 */
import { memo, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  CheckCircle, 
  Moon, 
  Sparkles, 
  Lock, 
  Eye, 
  EyeOff, 
  Loader2,
  ArrowRight,
  Bed,
  Thermometer,
  Sun,
  Package,
  Calendar,
  User,
  AlertCircle,
  Shield,
  Zap,
  Brain,
  Target,
  Activity,
  Mail,
} from "lucide-react";
import PasswordStrengthIndicator from "@/components/PasswordStrengthIndicator";
import {
  type AnalysisResult,
  type QuizAnswers,
  type SleepAssessment,
  type PersonaCluster,
  PERSONA_DEFINITIONS,
  MODULE_DEFINITIONS,
  getPersonaConfidenceLevel,
  shouldPersonalizePersonaMessaging,
} from "@/components/sleep-quiz";
import { 
  deriveDetectedIssues, 
  convertToIssuePresentation, 
  getRiskDriverDisplayText,
  getCoachReadinessExplanation,
} from "./QuizHelpers";
import { CLUSTER_TO_URL_SLUG } from "@/data/personaLandingMocks";
import { getSessionId } from "@/lib/abTesting";

// ============ ANALYTICS TRACKING ============
// Uses unified session ID from abTesting.ts for cross-funnel tracking consistency

/**
 * Track quiz reveal analytics events
 */
const trackRevealEvent = async (
  eventType: "pre_reveal_viewed" | "full_reveal_unlocked",
  personaCluster?: string,
  insightCount?: number,
  email?: string
) => {
  try {
    const sessionId = getSessionId();
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    await fetch(`${supabaseUrl}/functions/v1/quiz-reveal-analytics`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
      },
      body: JSON.stringify({
        action: "track",
        event_type: eventType,
        session_id: sessionId,
        persona_cluster: personaCluster,
        insight_count: insightCount,
        email: email,
        user_agent: navigator.userAgent,
        referrer: document.referrer,
      }),
    });
    
    console.debug(`[Analytics] ${eventType} tracked for session: ${sessionId}`);
  } catch (error) {
    // Fail silently - don't block user experience
    console.warn("[Analytics] Failed to track event:", error);
  }
};

/**
 * Track partial reveal view (pre-reveal state)
 */
const trackPartialReveal = (personaCluster: string | undefined, insightCount: number) => {
  trackRevealEvent("pre_reveal_viewed", personaCluster, insightCount);
};

/**
 * Track full reveal unlock (after email submission)
 */
const trackFullRevealUnlock = (personaCluster: string | undefined, email?: string) => {
  trackRevealEvent("full_reveal_unlocked", personaCluster, undefined, email);
};

// ============ INTERFACES ============

interface QuizResultsProps {
  results: AnalysisResult;
  answers: QuizAnswers;
  visibleQuestionCount: number;
  isRetake: boolean;
  shouldNotifyQuizUpdated: boolean;
  email: string;
  // Account creation state
  showAccountForm: boolean;
  setShowAccountForm: (show: boolean) => void;
  accountExists: boolean | null;
  isCheckingAccount: boolean;
  password: string;
  setPassword: (password: string) => void;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
  isSubmitting: boolean;
  // Handlers
  onUnlockSleepCoach: () => void;
  onAccountSubmit: () => void;
  onForgotPassword: () => void;
  onGoToSleepCoach: () => void;
  onBackToHome: () => void;
  onViewProducts: () => void;
  onCancelAccountForm: () => void;
  // Email submission
  onEmailChange?: (email: string) => void;
  onEmailSubmit?: () => void;
}

// ============ SCORE BAR COMPONENT ============

interface ScoreBarProps {
  label: string;
  score: number;
  inverted?: boolean;
  description?: string;
}

const ScoreBar = ({ label, score, inverted = false, description }: ScoreBarProps) => {
  const displayScore = inverted ? 100 - score : score;
  
  const getBarColor = (s: number) => {
    if (s >= 75) return "bg-emerald-500/80";
    if (s >= 50) return "bg-amber-500/70";
    return "bg-rose-400/70";
  };
  
  const getLabel = (s: number) => {
    if (s >= 80) return "Excellent";
    if (s >= 65) return "Good";
    if (s >= 45) return "Moderate";
    return "Needs attention";
  };
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground/90">{label}</span>
        <span className="text-xs text-muted-foreground">{getLabel(displayScore)}</span>
      </div>
      <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-700 ease-out ${getBarColor(displayScore)}`}
          style={{ width: `${displayScore}%` }}
        />
      </div>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
};

// ============ PRODUCT DISPLAY MAPPING ============

const PRODUCT_DISPLAY: Record<string, { name: string; route: string; description: string; image?: string }> = {
  ergonomic_pillow: {
    name: "Rise By Night™ Ergonomic Sleep Pillow",
    route: "/products/ergonomic-pillow",
    description: "Contoured memory foam designed for cervical support",
    image: "/images/pillow-main-new.png",
  },
  knee_pillow: {
    name: "Rise By Night™ Ergonomic Knee Pillow",
    route: "/products/knee-pillow",
    description: "Hip alignment and lower back comfort for side sleepers",
    image: "/images/knee-pillow-main-new.png",
  },
  silk_mask: {
    name: "Rise By Night™ Silk Sleep Mask",
    route: "/products/sleep-mask",
    description: "Complete light blocking for uninterrupted deep sleep",
  },
};

const BUNDLE_DISPLAY: Record<string, { name: string; description: string; icon: typeof Shield }> = {
  alignment_set: {
    name: "Alignment Set",
    description: "Complete spinal support from neck to hips",
    icon: Shield,
  },
  deep_sleep_set: {
    name: "Deep Sleep Set",
    description: "Optimized support with complete darkness",
    icon: Moon,
  },
  performance_set: {
    name: "Performance Set",
    description: "Full optimization for maximum recovery",
    icon: Zap,
  },
};

// ============ PRE-REVEAL COMPONENT ============

interface PreRevealProps {
  assessment: SleepAssessment;
  visibleQuestionCount: number;
  email: string;
  onEmailChange?: (email: string) => void;
  onContinueToFullResults: () => void;
  isSubmitting: boolean;
}

const QuizResultsPreReveal = memo(function QuizResultsPreReveal({
  assessment,
  visibleQuestionCount,
  email,
  onEmailChange,
  onContinueToFullResults,
  isSubmitting,
}: PreRevealProps) {
  // Track partial reveal view - use useEffect instead of useMemo for side effects
  const hasTrackedPartialReveal = useRef(false);
  useEffect(() => {
    if (!hasTrackedPartialReveal.current) {
      hasTrackedPartialReveal.current = true;
      trackPartialReveal(assessment.persona.cluster, 2);
    }
  }, [assessment.persona.cluster]);

  // Get first 1-2 insights from environment findings or risk drivers
  const insights: string[] = [];
  if (assessment.top_risk_drivers && assessment.top_risk_drivers.length > 0) {
    insights.push(getRiskDriverDisplayText(assessment.top_risk_drivers[0]));
  }
  if (assessment.environmentFindings?.keyIssues?.[0]) {
    insights.push(assessment.environmentFindings.keyIssues[0]);
  }
  
  // Get primary product
  const primaryProduct = assessment.productRecommendations?.primary_product;
  const productInfo = primaryProduct ? PRODUCT_DISPLAY[primaryProduct] : PRODUCT_DISPLAY.ergonomic_pillow;

  const personaLabel = assessment.persona.label || 
    PERSONA_DEFINITIONS[assessment.persona.cluster as PersonaCluster]?.label || 
    "Your Sleep Profile";
  
  const personaDescription = assessment.persona.description || 
    PERSONA_DEFINITIONS[assessment.persona.cluster as PersonaCluster]?.description;

  return (
    <div 
      className="space-y-8 max-w-2xl mx-auto"
      data-result-stage="pre-reveal"
    >
      {/* Header */}
      <header className="text-center pb-6 border-b border-border/30">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950/40 mb-5">
          <CheckCircle className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-2">
          Your Sleep Profile Preview
        </h1>
        <p className="text-muted-foreground text-sm">
          Based on {visibleQuestionCount} science-backed questions
        </p>
      </header>

      {/* Persona Section - Primary Value */}
      <section className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-50 dark:bg-violet-950/40 flex items-center justify-center flex-shrink-0">
            <Brain className="w-6 h-6 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <p className="text-xs font-medium text-primary uppercase tracking-wider mb-1">Your Sleep Profile</p>
            <h2 className="text-xl font-semibold text-foreground">{personaLabel}</h2>
          </div>
        </div>
        
        <div className="p-5 rounded-2xl bg-violet-50/50 dark:bg-violet-950/20 border border-violet-200/50 dark:border-violet-800/30">
          <p className="text-foreground/85 leading-relaxed text-[15px]">
            {personaDescription}
          </p>
        </div>
      </section>

      {/* Key Insights - Limited Preview */}
      {insights.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <Target className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <h3 className="font-semibold text-foreground">Initial Observations</h3>
          </div>
          
          <div className="space-y-3">
            {insights.slice(0, 2).map((insight, idx) => (
              <div 
                key={idx}
                className="flex items-start gap-3 p-4 rounded-xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-700/40"
              >
                <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-amber-700 dark:text-amber-300">{idx + 1}</span>
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed">{insight}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Single Product Recommendation */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <Package className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <h3 className="font-semibold text-foreground">Top Recommendation</h3>
        </div>
        
        <Card className="p-5 border-primary/20 bg-primary/[0.02]">
          <div className="flex items-start gap-4">
            {productInfo.image && (
              <div className="w-20 h-20 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden flex-shrink-0">
                <img 
                  src={productInfo.image} 
                  alt={productInfo.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex-1 space-y-1">
              <p className="text-xs font-medium text-primary uppercase tracking-wider">Based on your profile</p>
              <p className="font-semibold text-foreground">{productInfo.name}</p>
              <p className="text-sm text-muted-foreground">{productInfo.description}</p>
            </div>
          </div>
        </Card>
      </section>

      {/* Email Capture Section */}
      <section className="space-y-5">
        <Card className="p-6 bg-gradient-to-br from-slate-50 via-background to-background dark:from-slate-900/50 border-slate-200/60 dark:border-slate-700/40">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mx-auto">
              <Lock className="w-5 h-5 text-primary" />
            </div>
            
            <div>
              <h3 className="font-semibold text-lg text-foreground mb-2">
                Unlock Your Complete Sleep Profile
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
                Enter your email to receive your full risk breakdown, personalized recommendations, 
                and AI Sleep Coach plan preview.
              </p>
            </div>

            <div className="max-w-sm mx-auto space-y-3">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => onEmailChange?.(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && onContinueToFullResults()}
                  className="pl-12 h-12 rounded-xl"
                />
              </div>
              
              <Button
                onClick={onContinueToFullResults}
                disabled={isSubmitting || !email.trim()}
                className="w-full rounded-xl h-12"
                size="lg"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4 mr-2" />
                )}
                Continue to Full Results
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              We'll send your complete sleep profile privately to your inbox.
            </p>
          </div>
        </Card>
      </section>
    </div>
  );
});

// ============ MAIN COMPONENT ============

const QuizResults = memo(function QuizResults({
  results,
  answers,
  visibleQuestionCount,
  isRetake,
  shouldNotifyQuizUpdated,
  email,
  showAccountForm,
  setShowAccountForm,
  accountExists,
  isCheckingAccount,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  isSubmitting,
  onUnlockSleepCoach,
  onAccountSubmit,
  onForgotPassword,
  onGoToSleepCoach,
  onBackToHome,
  onViewProducts,
  onCancelAccountForm,
  onEmailChange,
  onEmailSubmit,
}: QuizResultsProps) {
  
  // Extract structured assessment if available
  const assessment = useMemo<SleepAssessment | null>(() => {
    if (typeof results.assessment === 'object' && 'sleepIdentity' in results.assessment) {
      return results.assessment;
    }
    return null;
  }, [results.assessment]);

  // Determine reveal state: pre-reveal if no profile created/updated
  const isPreReveal = !(results.profileCreated || results.profileUpdated);

  // Track full reveal unlock when state changes from pre-reveal to full
  const hasTrackedFullReveal = useRef(false);
  useEffect(() => {
    if (!isPreReveal && !hasTrackedFullReveal.current && assessment) {
      hasTrackedFullReveal.current = true;
      trackFullRevealUnlock(assessment.persona?.cluster, email);
    }
  }, [isPreReveal, assessment, email]);

  // Fallback to legacy display if no structured assessment
  const detectedIssues = results.detectedIssues || deriveDetectedIssues(answers);

  if (!assessment) {
    return (
      <LegacyQuizResults 
        results={results}
        detectedIssues={detectedIssues}
        visibleQuestionCount={visibleQuestionCount}
        showAccountForm={showAccountForm}
        setShowAccountForm={setShowAccountForm}
        accountExists={accountExists}
        isCheckingAccount={isCheckingAccount}
        password={password}
        setPassword={setPassword}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
        isSubmitting={isSubmitting}
        email={email}
        onUnlockSleepCoach={onUnlockSleepCoach}
        onAccountSubmit={onAccountSubmit}
        onForgotPassword={onForgotPassword}
        onGoToSleepCoach={onGoToSleepCoach}
        onBackToHome={onBackToHome}
        onViewProducts={onViewProducts}
        onCancelAccountForm={onCancelAccountForm}
      />
    );
  }

  // Show Pre-Reveal state if email not submitted and no profile exists
  if (isPreReveal) {
    return (
      <QuizResultsPreReveal
        assessment={assessment}
        visibleQuestionCount={visibleQuestionCount}
        email={email}
        onEmailChange={onEmailChange}
        onContinueToFullResults={onEmailSubmit || onUnlockSleepCoach}
        isSubmitting={isSubmitting}
      />
    );
  }

  // Safe accessors for optional fields
  const confidenceScore = assessment.productRecommendations?.recommendation_confidence ?? 75;
  const fitExplanation = assessment.productRecommendations?.fit_explanation ?? "";

  // ============ FULL RESULTS (after email) ============
  return (
    <div 
      className="space-y-10 max-w-2xl mx-auto"
      data-result-stage="full"
    >
      {/* Header */}
      <header className="text-center pb-8 border-b border-border/30">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950/40 mb-5">
          <CheckCircle className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-2">
          Your Complete Sleep Assessment
        </h1>
        <p className="text-muted-foreground text-sm">
          Personalized analysis based on {visibleQuestionCount} responses
        </p>
      </header>

      {/* Section 1: Sleep Identity */}
      <section className="space-y-5">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </div>
          <div>
            <h2 className="font-semibold text-lg text-foreground">Your Sleep Identity</h2>
            <p className="text-sm text-primary font-medium">{assessment.sleepIdentity.label}</p>
          </div>
        </div>
        
        <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-700/40">
          <p className="text-foreground/85 leading-relaxed text-[15px]">
            {assessment.sleepIdentity.description}
          </p>
        </div>
      </section>

      {/* Section 1b: Your Sleep Persona - Full Science Explanation */}
      {assessment.persona.cluster && (
        <section className="space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-violet-50 dark:bg-violet-950/40 flex items-center justify-center flex-shrink-0">
              <Brain className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-lg text-foreground">
                  {shouldPersonalizePersonaMessaging(assessment.persona.confidence) 
                    ? "Your Sleep Persona" 
                    : "Current Sleep Pattern"}
                </h2>
                {assessment.persona.confidence !== undefined && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    getPersonaConfidenceLevel(assessment.persona.confidence) === 'high' 
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400'
                      : getPersonaConfidenceLevel(assessment.persona.confidence) === 'medium'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    {getPersonaConfidenceLevel(assessment.persona.confidence) === 'high' 
                      ? 'High match' 
                      : getPersonaConfidenceLevel(assessment.persona.confidence) === 'medium'
                        ? 'Good match'
                        : 'Closest match'}
                  </span>
                )}
              </div>
              <p className="text-sm text-primary font-medium">
                {shouldPersonalizePersonaMessaging(assessment.persona.confidence)
                  ? (assessment.persona.label || PERSONA_DEFINITIONS[assessment.persona.cluster as PersonaCluster]?.label)
                  : `Closest match: ${assessment.persona.label || PERSONA_DEFINITIONS[assessment.persona.cluster as PersonaCluster]?.label}`
                }
              </p>
            </div>
          </div>
          
          <div className="p-5 rounded-2xl bg-violet-50/50 dark:bg-violet-950/20 border border-violet-200/50 dark:border-violet-800/30">
            <p className="text-foreground/85 leading-relaxed text-[15px] mb-4">
              {assessment.persona.description || PERSONA_DEFINITIONS[assessment.persona.cluster as PersonaCluster]?.description}
            </p>
            
            {/* Full persona rationale - only in full reveal */}
            <div className="pt-4 border-t border-violet-200/40 dark:border-violet-700/30">
              <p className="text-xs font-medium text-muted-foreground mb-1">Why this matches you</p>
              <p className="text-sm text-foreground/80 leading-relaxed">
                {assessment.persona.rationale}
              </p>
            </div>
          </div>

          {/* Recommended Modules - Full reveal only */}
          {assessment.persona.recommended_modules && assessment.persona.recommended_modules.length > 0 && (
            <div className="p-4 rounded-xl bg-slate-100/70 dark:bg-slate-800/40">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-violet-500 dark:text-violet-400" />
                <p className="text-sm font-medium text-foreground/90">Recommended Focus Modules</p>
              </div>
              <div className="space-y-2">
                {assessment.persona.recommended_modules.map((moduleNum) => {
                  const moduleInfo = MODULE_DEFINITIONS[moduleNum];
                  return (
                    <div 
                      key={moduleNum}
                      className="flex items-center justify-between p-2 rounded-lg bg-white/60 dark:bg-slate-900/40"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-violet-200 dark:bg-violet-800/50 flex items-center justify-center text-xs font-medium text-violet-700 dark:text-violet-300">
                          {moduleNum}
                        </div>
                        <span className="text-sm text-foreground/90">{moduleInfo?.name || `Module ${moduleNum}`}</span>
                      </div>
                      {moduleInfo?.description && (
                        <span className="text-xs text-muted-foreground hidden sm:block">
                          {moduleInfo.description}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Section 1c: Full Risk Drivers & Coach Readiness - Full Reveal Only */}
      {(assessment.top_risk_drivers?.length > 0 || assessment.coach_readiness_label) && (
        <section className="space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center flex-shrink-0">
              <Target className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="font-semibold text-lg text-foreground">Key Focus Areas</h2>
              <p className="text-sm text-muted-foreground">What we identified as priorities</p>
            </div>
          </div>

          {/* All Top Risk Drivers */}
          {assessment.top_risk_drivers && assessment.top_risk_drivers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {assessment.top_risk_drivers.map((driver, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 text-sm rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                >
                  {getRiskDriverDisplayText(driver)}
                </span>
              ))}
            </div>
          )}

          {/* Coach Readiness Indicator */}
          {assessment.coach_readiness_label && (
            <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-700/40">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground/90">Coach Readiness</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  assessment.coach_readiness_label === 'Ready' 
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400'
                    : assessment.coach_readiness_label === 'Developing'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}>
                  {assessment.coach_readiness_label}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {assessment.coach_readiness_rationale || getCoachReadinessExplanation(assessment.coach_readiness_label)}
              </p>
            </div>
          )}

          {/* Energy Potential Score */}
          {assessment.energy_potential_score !== undefined && (
            <div className="flex items-center gap-4 p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/40 dark:border-emerald-800/30">
              <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground/90">Morning Energy Potential</p>
                <p className="text-xs text-muted-foreground">
                  {assessment.energy_potential_score >= 70 
                    ? "Your profile suggests strong morning energy potential with the right support."
                    : assessment.energy_potential_score >= 45
                      ? "There's good room to improve your morning energy levels."
                      : "Addressing key factors could meaningfully boost your morning energy."}
                </p>
              </div>
              <span className="text-lg font-semibold text-emerald-700 dark:text-emerald-400">
                {assessment.energy_potential_score}%
              </span>
            </div>
          )}
        </section>
      )}

      {/* Section 2: Alignment & Support */}
      <section className="space-y-5">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center flex-shrink-0">
            <Bed className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="font-semibold text-lg text-foreground">Alignment & Support</h2>
            <p className="text-sm text-muted-foreground">How well your current setup supports your spine</p>
          </div>
        </div>
        
        <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-700/40 space-y-5">
          <ScoreBar 
            label="Alignment Risk" 
            score={assessment.scores.alignment_risk_score} 
            inverted={true}
          />
          <ScoreBar 
            label="Neck Support" 
            score={assessment.scores.neck_support_score} 
          />
          <ScoreBar 
            label="Sleep Stability" 
            score={assessment.scores.sleep_stability_score} 
          />
        </div>

        {assessment.scores.alignment_risk_score >= 35 && (
          <div className="flex items-start gap-4 p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-200/90 leading-relaxed">
              {assessment.persona.rationale}
            </p>
          </div>
        )}
      </section>

      {/* Section 3: Environment & Sleep Quality */}
      <section className="space-y-5">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center flex-shrink-0">
            <Thermometer className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="font-semibold text-lg text-foreground">Environment & Sleep Quality</h2>
            <p className="text-sm text-muted-foreground">External factors affecting your rest</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-700/40 space-y-5">
          <ScoreBar 
            label="Environment" 
            score={assessment.scores.environment_score} 
          />
          <ScoreBar 
            label="Light Sensitivity" 
            score={assessment.scores.light_sensitivity_score} 
            inverted={true}
          />
          <ScoreBar 
            label="Temperature Comfort" 
            score={100 - assessment.scores.temperature_disruption_score} 
          />
        </div>

        {/* All environment findings */}
        {assessment.environmentFindings.keyIssues.length > 0 && (
          <div className="space-y-3">
            {assessment.environmentFindings.keyIssues.map((issue, idx) => (
              <div 
                key={idx} 
                className="flex items-start gap-3 p-4 rounded-xl bg-slate-100/70 dark:bg-slate-800/40"
              >
                <Sun className="w-4 h-4 text-slate-500 dark:text-slate-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-foreground/80 leading-relaxed">{issue}</p>
              </div>
            ))}
          </div>
        )}

        <p className="text-sm text-muted-foreground leading-relaxed px-1">
          {assessment.environmentFindings.summary}
        </p>
      </section>

      {/* Section 4: All Recommended Products */}
      <section className="space-y-5">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center flex-shrink-0">
            <Package className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="font-semibold text-lg text-foreground">Your Recommended Setup</h2>
            <p className="text-sm text-muted-foreground">
              {confidenceScore >= 80 ? "High confidence match" : "Personalized for your needs"}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Primary Product */}
          <Card 
            className="p-5 border-primary/20 bg-primary/[0.03] hover:bg-primary/[0.06] cursor-pointer transition-colors group"
            onClick={onViewProducts}
          >
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-primary uppercase tracking-wider">Primary Recommendation</p>
                <p className="font-semibold text-foreground">{PRODUCT_DISPLAY[assessment.productRecommendations.primary_product]?.name || "Ergonomic Sleep Pillow"}</p>
                <p className="text-sm text-muted-foreground">
                  {PRODUCT_DISPLAY[assessment.productRecommendations.primary_product]?.description || "Designed for optimal cervical support"}
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-primary opacity-60 group-hover:opacity-100 transition-opacity" />
            </div>
          </Card>

          {/* Secondary Product */}
          {assessment.productRecommendations.secondary_product && PRODUCT_DISPLAY[assessment.productRecommendations.secondary_product] && (
            <Card className="p-5 border-border/50 hover:border-primary/30 cursor-pointer transition-colors group">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Recommended Add-on</p>
                  <p className="font-medium text-foreground">{PRODUCT_DISPLAY[assessment.productRecommendations.secondary_product].name}</p>
                  <p className="text-sm text-muted-foreground">
                    {PRODUCT_DISPLAY[assessment.productRecommendations.secondary_product].description}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity" />
              </div>
            </Card>
          )}

          {/* Bundle Recommendation */}
          {assessment.productRecommendations.recommended_bundle && BUNDLE_DISPLAY[assessment.productRecommendations.recommended_bundle] && (
            <Card className="p-5 border-emerald-200/60 dark:border-emerald-800/40 bg-emerald-50/50 dark:bg-emerald-950/20">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center flex-shrink-0">
                  {(() => {
                    const IconComponent = BUNDLE_DISPLAY[assessment.productRecommendations.recommended_bundle!].icon;
                    return <IconComponent className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
                  })()}
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                    Best Value Bundle
                  </p>
                  <p className="font-semibold text-emerald-800 dark:text-emerald-300">
                    {BUNDLE_DISPLAY[assessment.productRecommendations.recommended_bundle].name}
                  </p>
                  <p className="text-sm text-emerald-700/80 dark:text-emerald-400/80">
                    {BUNDLE_DISPLAY[assessment.productRecommendations.recommended_bundle].description}
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Why this fits + Persona reasoning */}
        <div className="px-1 space-y-3">
          <p className="text-sm text-foreground/80 leading-relaxed italic">
            {assessment.productRecommendations.reasoning}
          </p>
          
          {assessment.productRecommendations.persona_reasoning && (
            <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/40 dark:border-emerald-800/30">
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1">Why this fits your persona</p>
              <p className="text-sm text-emerald-800/80 dark:text-emerald-300/80 leading-relaxed">
                {assessment.productRecommendations.persona_reasoning}
              </p>
            </div>
          )}
          
          {fitExplanation && (
            <p className="text-xs text-muted-foreground">
              {fitExplanation}
            </p>
          )}
          
          {assessment.persona.recommended_modules && assessment.persona.recommended_modules.length > 0 && (
            <div className="p-3 rounded-xl bg-violet-50/50 dark:bg-violet-950/20 border border-violet-200/40 dark:border-violet-800/30">
              <p className="text-xs font-medium text-violet-700 dark:text-violet-400 mb-2">Where this shows up in your Sleep Coach</p>
              <p className="text-sm text-violet-800/80 dark:text-violet-300/80 leading-relaxed">
                You'll work on this inside{' '}
                {assessment.persona.recommended_modules.map((moduleNum, idx) => {
                  const moduleInfo = MODULE_DEFINITIONS[moduleNum];
                  const isLast = idx === assessment.persona.recommended_modules.length - 1;
                  const isSecondToLast = idx === assessment.persona.recommended_modules.length - 2;
                  return (
                    <span key={moduleNum}>
                      <strong>{moduleInfo?.name || `Module ${moduleNum}`}</strong>
                      {isSecondToLast ? ' and ' : !isLast ? ', ' : ''}
                    </span>
                  );
                })}
                .
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Section 5: Sleep Coach Preview - Full Reveal Only */}
      <section className="space-y-5">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-violet-50 dark:bg-violet-950/40 flex items-center justify-center flex-shrink-0">
            <Calendar className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h2 className="font-semibold text-lg text-foreground">Your AI Sleep Coach Plan</h2>
            <p className="text-sm text-muted-foreground">Preview of your personalized 14-day program</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-700/40">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <p className="text-xs font-semibold text-primary uppercase tracking-wider">Days 1–3: Setup</p>
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed">{assessment.coachPreview.day_1_3}</p>
          </div>
          
          <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-700/40">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Days 4–7: Adjustment</p>
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed">{assessment.coachPreview.day_4_7}</p>
          </div>
          
          <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-700/40">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Days 7–14: Consolidation</p>
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed">{assessment.coachPreview.day_7_14}</p>
          </div>
        </div>
      </section>

      {/* Sleep Coach CTA */}
      <Card className="p-6 bg-gradient-to-br from-primary/[0.04] via-background to-background border-primary/20">
        <div className="flex items-start gap-5">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Moon className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <h3 className="font-semibold text-lg text-foreground mb-1">
                {results.profileCreated || results.profileUpdated
                  ? "Your AI Sleep Coach Is Ready"
                  : "Unlock Your AI Sleep Coach"}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {results.profileCreated || results.profileUpdated
                  ? "Access your complete personalized 14-day sleep improvement program."
                  : "Create a free account to access your full personalized program with daily guidance."}
              </p>
            </div>

            {results.profileCreated || results.profileUpdated ? (
              <Button
                onClick={onGoToSleepCoach}
                className="w-full rounded-xl h-12"
                size="lg"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Continue to My Sleep Coach
              </Button>
            ) : !showAccountForm ? (
              <Button
                onClick={onUnlockSleepCoach}
                className="w-full rounded-xl h-12"
                size="lg"
              >
                <Lock className="w-4 h-4 mr-2" />
                Unlock Full Plan
              </Button>
            ) : (
              <AccountForm 
                isCheckingAccount={isCheckingAccount}
                accountExists={accountExists}
                email={email}
                password={password}
                setPassword={setPassword}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                isSubmitting={isSubmitting}
                onAccountSubmit={onAccountSubmit}
                onForgotPassword={onForgotPassword}
                onCancelAccountForm={onCancelAccountForm}
              />
            )}
          </div>
        </div>
      </Card>

      {/* View My Plan CTA - appears when persona exists */}
      {assessment.persona.cluster && (
        <ViewMyPlanCTA personaCluster={assessment.persona.cluster} personaLabel={assessment.persona.label} />
      )}

      {/* Footer Actions */}
      <footer className="flex gap-4 pt-6 border-t border-border/30">
        <Button
          variant="outline"
          onClick={onBackToHome}
          className="flex-1 rounded-xl h-11"
        >
          Back to Home
        </Button>
        <Button 
          onClick={onViewProducts} 
          className="flex-1 rounded-xl h-11"
        >
          View Products
        </Button>
      </footer>
    </div>
  );
});

// ============ VIEW MY PLAN CTA ============

const ViewMyPlanCTA = ({ personaCluster, personaLabel }: { personaCluster: PersonaCluster; personaLabel: string }) => {
  const navigate = useNavigate();
  const slug = CLUSTER_TO_URL_SLUG[personaCluster] || personaCluster.replace("_", "-");
  
  return (
    <Card className="p-5 border-primary/20 bg-primary/[0.03] hover:bg-primary/[0.06] cursor-pointer transition-colors group"
      onClick={() => navigate(`/persona/${slug}`)}
    >
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-primary uppercase tracking-wider">Your Personalized Plan</p>
          <p className="font-semibold text-foreground">View my {personaLabel} plan</p>
          <p className="text-sm text-muted-foreground">
            See your complete persona breakdown, focus areas, and 14-night roadmap
          </p>
        </div>
        <ArrowRight className="w-5 h-5 text-primary opacity-60 group-hover:opacity-100 transition-opacity" />
      </div>
    </Card>
  );
};

// ============ ACCOUNT FORM ============

const AccountForm = ({
  isCheckingAccount,
  accountExists,
  email,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  isSubmitting,
  onAccountSubmit,
  onForgotPassword,
  onCancelAccountForm,
}: {
  isCheckingAccount: boolean;
  accountExists: boolean | null;
  email: string;
  password: string;
  setPassword: (p: string) => void;
  showPassword: boolean;
  setShowPassword: (s: boolean) => void;
  isSubmitting: boolean;
  onAccountSubmit: () => void;
  onForgotPassword: () => void;
  onCancelAccountForm: () => void;
}) => {
  if (isCheckingAccount) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">Checking account...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-700/40">
        <p className="text-sm font-medium text-foreground">
          {accountExists ? "Welcome back" : "Create your account"}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {accountExists ? `Sign in to continue (${email})` : `Set a password for ${email}`}
        </p>
      </div>
      
      <div className="relative">
        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type={showPassword ? "text" : "password"}
          placeholder={accountExists ? "Enter your password" : "Create a password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onAccountSubmit()}
          className="pl-12 pr-12 h-12 rounded-xl"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        >
          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
      
      {!accountExists && password && <PasswordStrengthIndicator password={password} />}
      
      <Button
        onClick={onAccountSubmit}
        disabled={isSubmitting || !password.trim()}
        className="w-full rounded-xl h-12"
        size="lg"
      >
        {isSubmitting ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Sparkles className="w-4 h-4 mr-2" />
        )}
        {accountExists ? "Sign In & Continue" : "Create Account & Continue"}
      </Button>
      
      {accountExists && (
        <button 
          onClick={onForgotPassword} 
          className="w-full text-sm text-primary hover:underline"
        >
          Forgot password?
        </button>
      )}
      
      <button
        onClick={onCancelAccountForm}
        className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        Cancel
      </button>
    </div>
  );
};

// ============ LEGACY RESULTS FALLBACK ============

const LegacyQuizResults = ({
  results,
  detectedIssues,
  visibleQuestionCount,
  showAccountForm,
  setShowAccountForm,
  accountExists,
  isCheckingAccount,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  isSubmitting,
  email,
  onUnlockSleepCoach,
  onAccountSubmit,
  onForgotPassword,
  onGoToSleepCoach,
  onBackToHome,
  onViewProducts,
  onCancelAccountForm,
}: {
  results: AnalysisResult;
  detectedIssues: string[];
  visibleQuestionCount: number;
  showAccountForm: boolean;
  setShowAccountForm: (show: boolean) => void;
  accountExists: boolean | null;
  isCheckingAccount: boolean;
  password: string;
  setPassword: (password: string) => void;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
  isSubmitting: boolean;
  email: string;
  onUnlockSleepCoach: () => void;
  onAccountSubmit: () => void;
  onForgotPassword: () => void;
  onGoToSleepCoach: () => void;
  onBackToHome: () => void;
  onViewProducts: () => void;
  onCancelAccountForm: () => void;
}) => {
  return (
    <div 
      className="space-y-8 max-w-2xl mx-auto"
      data-result-stage="legacy"
    >
      <header className="text-center pb-6 border-b border-border/30">
        <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
        <h1 className="text-2xl font-semibold mb-2">Your Sleep Assessment</h1>
        <p className="text-muted-foreground text-sm">
          Personalized analysis based on your {visibleQuestionCount} responses
        </p>
      </header>

      <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-700/40">
        <p className="text-foreground/85 leading-relaxed">
          {typeof results.assessment === 'string' ? results.assessment : 'Your personalized sleep analysis is ready.'}
        </p>
      </div>

      {detectedIssues.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            Areas for Improvement
          </h2>
          <div className="space-y-3">
            {detectedIssues.map((issue, idx) => {
              const presentation = convertToIssuePresentation(issue);
              return (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30"
                >
                  <p className="text-sm font-medium text-foreground">{presentation.plain}</p>
                  <p className="text-xs text-muted-foreground mt-1">{presentation.clinical}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Card className="p-6 bg-gradient-to-br from-primary/[0.04] via-background to-background border-primary/20">
        <div className="flex items-start gap-5">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Moon className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <h3 className="font-semibold text-lg mb-1">
                {results.profileCreated ? "Your AI Sleep Coach Is Ready" : "Unlock Your AI Sleep Coach"}
              </h3>
              <p className="text-muted-foreground text-sm">
                {results.profileCreated
                  ? "Access your personalized sleep improvement program."
                  : "Create a free account to access your personalized program."}
              </p>
            </div>

            {results.profileCreated ? (
              <Button onClick={onGoToSleepCoach} className="w-full rounded-xl h-12" size="lg">
                <Sparkles className="w-4 h-4 mr-2" />
                Continue to My Sleep Coach
              </Button>
            ) : !showAccountForm ? (
              <Button onClick={onUnlockSleepCoach} className="w-full rounded-xl h-12" size="lg">
                <Lock className="w-4 h-4 mr-2" />
                Unlock Sleep Coach
              </Button>
            ) : (
              <AccountForm
                isCheckingAccount={isCheckingAccount}
                accountExists={accountExists}
                email={email}
                password={password}
                setPassword={setPassword}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                isSubmitting={isSubmitting}
                onAccountSubmit={onAccountSubmit}
                onForgotPassword={onForgotPassword}
                onCancelAccountForm={onCancelAccountForm}
              />
            )}
          </div>
        </div>
      </Card>

      <footer className="flex gap-4 pt-6 border-t border-border/30">
        <Button variant="outline" onClick={onBackToHome} className="flex-1 rounded-xl h-11">
          Back to Home
        </Button>
        {!results.profileCreated && (
          <Button onClick={onViewProducts} className="flex-1 rounded-xl h-11">
            View Products
          </Button>
        )}
      </footer>
    </div>
  );
};

export default QuizResults;
