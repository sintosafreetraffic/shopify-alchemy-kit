/**
 * Premium 5-Section Quiz Results Component
 * 
 * Displays structured SleepAssessment with calm, Scandinavian aesthetic.
 * Sections: Sleep Identity, Alignment & Pain, Environment, Products, Coach Preview
 */
import { memo, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
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
  AlertTriangle,
} from "lucide-react";
import PasswordStrengthIndicator from "@/components/PasswordStrengthIndicator";
import {
  type AnalysisResult,
  type QuizAnswers,
  type SleepAssessment,
  deriveDetectedIssues,
  convertToIssuePresentation,
} from "@/components/sleep-quiz";

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
}

// Score bar component
const ScoreBar = ({ label, score, inverted = false }: { label: string; score: number; inverted?: boolean }) => {
  const displayScore = inverted ? 100 - score : score;
  const getColor = (s: number) => {
    if (s >= 75) return "bg-emerald-500";
    if (s >= 50) return "bg-amber-500";
    return "bg-rose-400";
  };
  
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{displayScore}%</span>
      </div>
      <div className="h-2 bg-secondary/50 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${getColor(displayScore)}`}
          style={{ width: `${displayScore}%` }}
        />
      </div>
    </div>
  );
};

// Product display mapping
const PRODUCT_DISPLAY = {
  ergonomic_pillow: {
    name: "Rise By Night™ Ergonomic Sleep Pillow",
    route: "/product/ergonomic-pillow",
    description: "Contoured memory foam for cervical support",
  },
  knee_pillow: {
    name: "Rise By Night™ Ergonomic Knee Pillow",
    route: "/product/knee-pillow",
    description: "Hip alignment and lower back relief",
  },
  silk_mask: {
    name: "Rise By Night™ Silk Sleep Mask",
    route: "/product/sleep-mask",
    description: "Complete light blocking for deeper sleep",
  },
};

const BUNDLE_DISPLAY: Record<string, { name: string; description: string }> = {
  alignment_set: {
    name: "Side Sleeper Alignment Set",
    description: "Complete spinal alignment from neck to hips",
  },
  deep_sleep_set: {
    name: "Deep Sleep Ritual Set",
    description: "Optimized support plus complete darkness",
  },
  performance_set: {
    name: "Performance Sleep Set",
    description: "Full sleep optimization for maximum recovery",
  },
};

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
}: QuizResultsProps) {
  
  // Extract structured assessment if available, otherwise use legacy
  const assessment = useMemo<SleepAssessment | null>(() => {
    if (typeof results.assessment === 'object' && 'sleepIdentity' in results.assessment) {
      return results.assessment;
    }
    return null;
  }, [results.assessment]);

  // Fallback to legacy display if no structured assessment
  const detectedIssues = results.detectedIssues || deriveDetectedIssues(answers);

  // If no structured assessment, render legacy view
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center pb-6 border-b border-border/50">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <CheckCircle className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight mb-2">Your Sleep Assessment</h2>
        <p className="text-muted-foreground text-sm">
          Analysis based on {visibleQuestionCount} responses
        </p>
      </div>

      {/* Section 1: Sleep Identity */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <User className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Your Sleep Identity</h3>
            <p className="text-sm text-muted-foreground">{assessment.sleepIdentity.label}</p>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
          <p className="text-foreground/90 leading-relaxed text-sm">
            {assessment.sleepIdentity.description}
          </p>
        </div>
      </section>

      {/* Section 2: Alignment & Neck Support */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
            <Bed className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <h3 className="font-semibold text-lg">Alignment & Neck Support</h3>
        </div>
        
        <div className="space-y-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
          <ScoreBar 
            label="Alignment Risk" 
            score={assessment.scores.alignment_risk_score} 
            inverted={true}
          />
          <ScoreBar 
            label="Neck Support Quality" 
            score={assessment.scores.neck_support_score} 
          />
          <ScoreBar 
            label="Sleep Stability" 
            score={assessment.scores.sleep_stability_score} 
          />
        </div>

        {assessment.scores.alignment_risk_score > 40 && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-200">
              {assessment.persona.rationale}
            </p>
          </div>
        )}
      </section>

      {/* Section 3: Environment & Sleep Stability */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
            <Thermometer className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="font-semibold text-lg">Environment & Sleep Quality</h3>
        </div>

        <div className="space-y-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
          <ScoreBar 
            label="Environment Score" 
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

        {assessment.environmentFindings.keyIssues.length > 0 && (
          <div className="space-y-2">
            {assessment.environmentFindings.keyIssues.map((issue, idx) => (
              <div 
                key={idx} 
                className="flex items-start gap-3 p-3 rounded-lg bg-slate-100 dark:bg-slate-800/50"
              >
                <Sun className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <p className="text-sm text-foreground/80">{issue}</p>
              </div>
            ))}
          </div>
        )}

        <p className="text-sm text-muted-foreground px-1">
          {assessment.environmentFindings.summary}
        </p>
      </section>

      {/* Section 4: Your Recommended Setup */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
            <Package className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="font-semibold text-lg">Your Recommended Setup</h3>
        </div>

        <div className="space-y-3">
          {/* Primary Product */}
          <Card 
            className="p-4 border-primary/30 bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors"
            onClick={onViewProducts}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-primary uppercase tracking-wide mb-1">Primary</p>
                <p className="font-semibold">{PRODUCT_DISPLAY[assessment.productRecommendations.primary_product].name}</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {PRODUCT_DISPLAY[assessment.productRecommendations.primary_product].description}
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-primary" />
            </div>
          </Card>

          {/* Secondary Product */}
          {assessment.productRecommendations.secondary_product && (
            <Card className="p-4 border-border/50 hover:border-primary/30 cursor-pointer transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Recommended Add-on</p>
                  <p className="font-medium">{PRODUCT_DISPLAY[assessment.productRecommendations.secondary_product].name}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {PRODUCT_DISPLAY[assessment.productRecommendations.secondary_product].description}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </Card>
          )}

          {/* Bundle Recommendation */}
          {assessment.productRecommendations.recommended_bundle && BUNDLE_DISPLAY[assessment.productRecommendations.recommended_bundle] && (
            <Card className="p-4 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30">
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wide mb-1">
                Best Value Bundle
              </p>
              <p className="font-semibold text-emerald-800 dark:text-emerald-300">
                {BUNDLE_DISPLAY[assessment.productRecommendations.recommended_bundle].name}
              </p>
              <p className="text-sm text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">
                {BUNDLE_DISPLAY[assessment.productRecommendations.recommended_bundle].description}
              </p>
            </Card>
          )}
        </div>

        <p className="text-sm text-muted-foreground px-1 italic">
          {assessment.productRecommendations.reasoning}
        </p>
      </section>

      {/* Section 5: Sleep Coach Preview */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          </div>
          <h3 className="font-semibold text-lg">Your AI Sleep Coach Plan</h3>
        </div>

        <div className="space-y-3">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">Days 1–3: Setup</p>
            <p className="text-sm text-foreground/80">{assessment.coachPreview.day_1_3}</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-2">Days 4–7: Adjustment</p>
            <p className="text-sm text-foreground/80">{assessment.coachPreview.day_4_7}</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-2">Days 7–14: Consolidation</p>
            <p className="text-sm text-foreground/80">{assessment.coachPreview.day_7_14}</p>
          </div>
        </div>
      </section>

      {/* Sleep Coach CTA */}
      <Card className="p-6 bg-gradient-to-br from-primary/5 via-background to-background border-primary/30">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Moon className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-lg mb-2">
              {results.profileCreated || results.profileUpdated
                ? "Your AI Sleep Coach Is Ready"
                : "Unlock Your AI Sleep Coach"}
            </h4>
            <p className="text-muted-foreground text-sm mb-4">
              {results.profileCreated || results.profileUpdated
                ? "Access your full personalized 14-day sleep improvement plan."
                : "Create a free account to access your complete personalized plan."}
            </p>

            {results.profileCreated || results.profileUpdated ? (
              <Button
                onClick={onGoToSleepCoach}
                className="w-full rounded-lg"
                size="lg"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Continue to My Sleep Coach
              </Button>
            ) : !showAccountForm ? (
              <Button
                onClick={onUnlockSleepCoach}
                className="w-full rounded-lg"
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

      {/* Footer Actions */}
      <div className="flex gap-4 pt-4 border-t border-border/50">
        <Button
          variant="outline"
          onClick={onBackToHome}
          className="flex-1 rounded-lg"
        >
          Back to Home
        </Button>
        <Button onClick={onViewProducts} className="flex-1 rounded-lg">
          View Products
        </Button>
      </div>
    </div>
  );
});

// Account form extracted for cleanliness
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
      <div className="p-3 rounded-lg bg-secondary/50 border border-border">
        <p className="text-sm font-medium">
          {accountExists ? "Welcome back!" : "Create your account"}
        </p>
        <p className="text-xs text-muted-foreground">
          {accountExists ? `Enter your password (${email})` : `Enter a password (${email})`}
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
          className="pl-12 pr-12 h-12"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
      {!accountExists && password && <PasswordStrengthIndicator password={password} />}
      <Button
        onClick={onAccountSubmit}
        disabled={isSubmitting || !password.trim()}
        className="w-full rounded-lg"
        size="lg"
      >
        {isSubmitting ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Sparkles className="w-4 h-4 mr-2" />
        )}
        {accountExists ? "Login & Access Sleep Coach" : "Create Account & Continue"}
      </Button>
      {accountExists && (
        <button onClick={onForgotPassword} className="w-full text-sm text-primary hover:underline">
          Forgot password?
        </button>
      )}
      <button
        onClick={onCancelAccountForm}
        className="w-full text-sm text-muted-foreground hover:text-foreground"
      >
        Cancel
      </button>
    </div>
  );
};

// Legacy results fallback
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
    <div className="space-y-6">
      <div className="text-center pb-4 border-b border-border">
        <CheckCircle className="w-12 h-12 text-success mx-auto mb-3" />
        <h2 className="text-2xl font-bold mb-2">Your Sleep Assessment</h2>
        <p className="text-muted-foreground">
          Personalized analysis based on your {visibleQuestionCount} responses
        </p>
      </div>

      <div className="p-4 rounded-xl bg-secondary/30 border border-border">
        <p className="text-foreground leading-relaxed">
          {typeof results.assessment === 'string' ? results.assessment : 'Your personalized sleep analysis is ready.'}
        </p>
      </div>

      {detectedIssues.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Areas for Improvement
          </h3>
          <div className="space-y-2">
            {detectedIssues.map((issue, idx) => {
              const presentation = convertToIssuePresentation(issue);
              return (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
                >
                  <p className="text-sm font-medium text-foreground">{presentation.plain}</p>
                  <p className="text-xs text-muted-foreground mt-1 italic">{presentation.clinical}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Card className="p-6 bg-gradient-to-br from-primary/5 via-background to-background border-primary/30">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Moon className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-lg mb-2">
              {results.profileCreated ? "Your AI Sleep Coach Is Ready" : "Unlock Your AI Sleep Coach"}
            </h4>
            <p className="text-muted-foreground text-sm mb-4">
              {results.profileCreated
                ? "Access your personalized 7-day sleep improvement plan."
                : "Create a free account to access your personalized plan."}
            </p>

            {results.profileCreated ? (
              <Button onClick={onGoToSleepCoach} className="w-full rounded-lg" size="lg">
                <Sparkles className="w-4 h-4 mr-2" />
                Continue to My Sleep Coach
              </Button>
            ) : !showAccountForm ? (
              <Button onClick={onUnlockSleepCoach} className="w-full rounded-lg" size="lg">
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

      <div className="flex gap-4 pt-4 border-t border-border">
        <Button variant="outline" onClick={onBackToHome} className="flex-1 rounded-lg">
          Back to Home
        </Button>
        {!results.profileCreated && (
          <Button onClick={onViewProducts} className="flex-1 rounded-lg">
            View Products
          </Button>
        )}
      </div>
    </div>
  );
};

export default QuizResults;