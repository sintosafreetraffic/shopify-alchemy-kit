/**
 * Persona Landing Page
 * 
 * Dynamic landing page for each persona cluster.
 * Route: /persona/:cluster (pain-sleeper, stress-sleeper, optimizer, recovery-sleeper)
 * 
 * Data flow:
 * 1. Check for cached assessment from quiz
 * 2. If no cache, use fallback static examples
 * 
 * NOTE: Human persona names (Jason, Mila, Leo, Riley) are INTERNAL ONLY.
 * This page uses customer-facing labels only.
 */

import { useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  ArrowRight, 
  Calendar, 
  CheckCircle, 
  Heart, 
  Moon, 
  Package, 
  Shield, 
  Sparkles, 
  Target, 
  Truck, 
  RotateCcw,
  Zap,
  Dumbbell,
  Brain,
  Compass,
} from "lucide-react";
import { 
  type PersonaCluster, 
  type SleepAssessment,
  type CoachReadinessLabel,
  PERSONA_DEFINITIONS, 
  MODULE_DEFINITIONS,
  CORE_NEED_MAP,
  getCoachReadinessLabel,
} from "@/components/sleep-quiz";
import { getCachedQuizResults } from "@/components/sleep-quiz/QuizCache";
import {
  URL_SLUG_TO_CLUSTER,
  PERSONA_FALLBACK_ASSESSMENTS,
  PERSONA_HERO_COPY,
  CORE_NEED_SENTENCES,
} from "@/data/personaLandingMocks";

// ============ PRODUCT DISPLAY ============

const PRODUCT_DISPLAY: Record<string, { name: string; route: string; description: string }> = {
  ergonomic_pillow: {
    name: "Rise By Night™ Ergonomic Sleep Pillow",
    route: "/products/ergonomic-pillow",
    description: "Contoured memory foam designed for cervical support",
  },
  knee_pillow: {
    name: "Rise By Night™ Ergonomic Knee Pillow",
    route: "/products/knee-pillow",
    description: "Hip alignment and lower back comfort for side sleepers",
  },
  silk_mask: {
    name: "Rise By Night™ Silk Sleep Mask",
    route: "/products/sleep-mask",
    description: "Complete light blocking for uninterrupted deep sleep",
  },
};

const BUNDLE_DISPLAY: Record<string, { name: string; description: string }> = {
  alignment_set: {
    name: "Alignment Set",
    description: "Complete spinal support from neck to hips",
  },
  deep_sleep_set: {
    name: "Deep Sleep Set",
    description: "Optimized support with complete darkness",
  },
  performance_set: {
    name: "Performance Set",
    description: "Full optimization for maximum recovery",
  },
};

// ============ PERSONA ICON MAPPING ============

const PERSONA_ICONS: Record<PersonaCluster, typeof Heart> = {
  pain_sleeper: Heart,
  stress_insomnia: Moon,
  optimizer: Zap,
  recovery_sleeper: Dumbbell,
};

// ============ MAIN COMPONENT ============

export default function PersonaLandingPage() {
  const { cluster: slugParam } = useParams<{ cluster: string }>();
  const navigate = useNavigate();

  // Map URL slug to persona cluster
  const personaCluster = useMemo<PersonaCluster | null>(() => {
    if (!slugParam) return null;
    return URL_SLUG_TO_CLUSTER[slugParam] || null;
  }, [slugParam]);

  // Redirect to quiz if invalid cluster
  useEffect(() => {
    if (slugParam && !personaCluster) {
      navigate("/sleep-quiz", { replace: true });
    }
  }, [slugParam, personaCluster, navigate]);

  // Get assessment data (cached or fallback)
  const { assessment, isFromCache } = useMemo(() => {
    if (!personaCluster) {
      return { assessment: null, isFromCache: false };
    }

    // Check for cached quiz results
    const cached = getCachedQuizResults();
    if (cached?.assessment && typeof cached.assessment === "object" && "persona" in cached.assessment) {
      const cachedAssessment = cached.assessment as SleepAssessment;
      // Verify the cached assessment matches this persona
      if (cachedAssessment.persona.cluster === personaCluster) {
        return { assessment: cachedAssessment, isFromCache: true };
      }
    }

    // Use fallback data
    return { 
      assessment: PERSONA_FALLBACK_ASSESSMENTS[personaCluster], 
      isFromCache: false 
    };
  }, [personaCluster]);

  // Early return if no valid cluster
  if (!personaCluster || !assessment) {
    return null;
  }

  const personaDef = PERSONA_DEFINITIONS[personaCluster];
  const heroCopy = PERSONA_HERO_COPY[personaCluster];
  const coreNeedSentence = CORE_NEED_SENTENCES[personaCluster];
  const PersonaIcon = PERSONA_ICONS[personaCluster];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="py-12 md:py-20 px-4 bg-gradient-to-b from-primary/[0.03] to-background">
        <div className="container mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
            <PersonaIcon className="w-8 h-8 text-primary" />
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4 tracking-tight">
            {heroCopy.headline}
          </h1>
          
          <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            {heroCopy.subtext}
          </p>

          {!isFromCache && (
            <p className="text-sm text-muted-foreground/60 mt-4">
              Showing example plan • <Link to="/sleep-quiz" className="text-primary hover:underline">Take the assessment</Link> for your personalized results
            </p>
          )}
        </div>
      </section>

      <div className="container mx-auto max-w-3xl px-4 pb-16 space-y-12">
        {/* Section: Why You Sleep This Way */}
        <section className="space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-violet-50 dark:bg-violet-950/40 flex items-center justify-center flex-shrink-0">
              <Brain className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h2 className="font-semibold text-lg text-foreground">Why You Sleep This Way</h2>
              <p className="text-sm text-primary font-medium">{personaDef.label}</p>
            </div>
          </div>

          <Card className="p-5 border-violet-200/50 dark:border-violet-800/30 bg-violet-50/30 dark:bg-violet-950/20">
            <p className="text-foreground/85 leading-relaxed mb-4">
              {personaDef.description}
            </p>
            
            <div className="pt-4 border-t border-violet-200/40 dark:border-violet-700/30">
              <p className="text-xs font-medium text-muted-foreground mb-1">Why this matches you</p>
              <p className="text-sm text-foreground/80 leading-relaxed">
                {assessment.persona.rationale}
              </p>
            </div>

            <div className="mt-4 pt-4 border-t border-violet-200/40 dark:border-violet-700/30">
              <p className="text-sm text-violet-700 dark:text-violet-300 font-medium">
                {coreNeedSentence}
              </p>
            </div>
          </Card>
        </section>

        {/* Section: Focus Areas */}
        <section className="space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center flex-shrink-0">
              <Target className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="font-semibold text-lg text-foreground">Your Focus Areas</h2>
              <p className="text-sm text-muted-foreground">Personalized modules for your sleep profile</p>
            </div>
          </div>

          <div className="grid gap-3">
            {assessment.persona.recommended_modules.map((moduleNum) => {
              const moduleInfo = MODULE_DEFINITIONS[moduleNum];
              return (
                <Card 
                  key={moduleNum}
                  className="p-4 border-emerald-200/50 dark:border-emerald-800/30 bg-emerald-50/30 dark:bg-emerald-950/20"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                        {moduleNum}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {moduleInfo?.name || `Module ${moduleNum}`}
                      </p>
                      {moduleInfo?.description && (
                        <p className="text-sm text-muted-foreground">
                          {moduleInfo.description}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Section: Recommended Setup */}
        <section className="space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center flex-shrink-0">
              <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="font-semibold text-lg text-foreground">Recommended Setup</h2>
              <p className="text-sm text-muted-foreground">Products matched to your needs</p>
            </div>
          </div>

          <div className="space-y-3">
            {/* Primary Product */}
            <Card 
              className="p-5 border-primary/20 bg-primary/[0.03] hover:bg-primary/[0.06] cursor-pointer transition-colors group"
              onClick={() => navigate(PRODUCT_DISPLAY[assessment.productRecommendations.primary_product]?.route || "/products/ergonomic-pillow")}
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-primary uppercase tracking-wider">Primary</p>
                  <p className="font-semibold text-foreground">
                    {PRODUCT_DISPLAY[assessment.productRecommendations.primary_product]?.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {PRODUCT_DISPLAY[assessment.productRecommendations.primary_product]?.description}
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-primary opacity-60 group-hover:opacity-100 transition-opacity" />
              </div>
            </Card>

            {/* Secondary Product */}
            {assessment.productRecommendations.secondary_product && PRODUCT_DISPLAY[assessment.productRecommendations.secondary_product] && (
              <Card 
                className="p-5 border-border/50 hover:border-primary/30 cursor-pointer transition-colors group"
                onClick={() => navigate(PRODUCT_DISPLAY[assessment.productRecommendations.secondary_product!]?.route || "/")}
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Add-on</p>
                    <p className="font-medium text-foreground">
                      {PRODUCT_DISPLAY[assessment.productRecommendations.secondary_product].name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {PRODUCT_DISPLAY[assessment.productRecommendations.secondary_product].description}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity" />
                </div>
              </Card>
            )}

            {/* Bundle */}
            {assessment.productRecommendations.recommended_bundle && BUNDLE_DISPLAY[assessment.productRecommendations.recommended_bundle] && (
              <Card className="p-5 border-emerald-200/60 dark:border-emerald-800/40 bg-emerald-50/50 dark:bg-emerald-950/20">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
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

          {/* Persona reasoning */}
          <Card className="p-4 bg-slate-50/80 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-700/40">
            <p className="text-sm text-foreground/80 leading-relaxed italic">
              {assessment.productRecommendations.persona_reasoning}
            </p>
          </Card>
        </section>

        {/* Section: Where You Are Now (Coach Readiness) - only show with real data */}
        {isFromCache && assessment.coach_readiness_score !== undefined && (
          <section className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center flex-shrink-0">
                <Compass className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="font-semibold text-lg text-foreground">Where You Are Now</h2>
                <p className="text-sm text-muted-foreground">Your current foundation for coaching</p>
              </div>
            </div>

            <Card className={`p-5 ${
              getCoachReadinessLabel(assessment.coach_readiness_score) === "Ready" 
                ? "border-emerald-200/50 dark:border-emerald-800/30 bg-emerald-50/30 dark:bg-emerald-950/20"
                : getCoachReadinessLabel(assessment.coach_readiness_score) === "Developing"
                  ? "border-blue-200/50 dark:border-blue-800/30 bg-blue-50/30 dark:bg-blue-950/20"
                  : "border-amber-200/50 dark:border-amber-800/30 bg-amber-50/30 dark:bg-amber-950/20"
            }`}>
              <div className="flex items-center gap-3 mb-3">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  getCoachReadinessLabel(assessment.coach_readiness_score) === "Ready"
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400"
                    : getCoachReadinessLabel(assessment.coach_readiness_score) === "Developing"
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400"
                }`}>
                  {assessment.coach_readiness_label || getCoachReadinessLabel(assessment.coach_readiness_score)}
                </span>
              </div>
              <p className="text-sm text-foreground/85 leading-relaxed">
                {assessment.coach_readiness_rationale || 
                  (getCoachReadinessLabel(assessment.coach_readiness_score) === "Ready"
                    ? "You have a strong sleep foundation. The coach can help you optimize and maintain your excellent sleep habits."
                    : getCoachReadinessLabel(assessment.coach_readiness_score) === "Developing"
                      ? "Your sleep patterns are developing nicely. The coach can help you refine and build on your current progress."
                      : "You're in the early stage of building a stable sleep foundation. The coach will focus on establishing core habits first."
                  )
                }
              </p>
            </Card>
          </section>
        )}

        {/* Section: 14-Night Plan */}
        <section className="space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="font-semibold text-lg text-foreground">Your 14-Night Plan</h2>
              <p className="text-sm text-muted-foreground">Preview of your personalized program</p>
            </div>
          </div>

          <div className="space-y-3">
            <Card className="p-5 border-slate-200/60 dark:border-slate-700/40 bg-slate-50/80 dark:bg-slate-900/40">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <p className="text-xs font-semibold text-primary uppercase tracking-wider">Days 1–3: Setup</p>
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed">
                {assessment.coachPreview.day_1_3}
              </p>
            </Card>

            <Card className="p-5 border-slate-200/60 dark:border-slate-700/40 bg-slate-50/80 dark:bg-slate-900/40">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Days 4–7: Adjustment</p>
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed">
                {assessment.coachPreview.day_4_7}
              </p>
            </Card>

            <Card className="p-5 border-slate-200/60 dark:border-slate-700/40 bg-slate-50/80 dark:bg-slate-900/40">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Days 7–14: Consolidation</p>
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed">
                {assessment.coachPreview.day_7_14}
              </p>
            </Card>
          </div>
        </section>

        {/* Section: Trust / Guarantee */}
        <section className="py-8 px-4 bg-primary/5 rounded-2xl">
          <div className="grid md:grid-cols-3 gap-6 text-center">
            <div className="space-y-2">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-2">
                <Truck className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold">Free Shipping</h3>
              <p className="text-sm text-muted-foreground">On pillow orders within the U.S.</p>
            </div>
            
            <div className="space-y-2">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-2">
                <Moon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold">100 nights risk free</h3>
              <p className="text-sm text-muted-foreground">Try it risk-free for 100 nights</p>
            </div>
            
            <div className="space-y-2">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-2">
                <RotateCcw className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold">Easy Returns</h3>
              <p className="text-sm text-muted-foreground">Hassle-free return process</p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <Card className="p-6 bg-gradient-to-br from-primary/[0.04] via-background to-background border-primary/20">
          <div className="flex items-start gap-5">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="font-semibold text-lg text-foreground mb-1">
                  Start Your Sleep Improvement Journey
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {isFromCache 
                    ? "Access your full personalized program with daily guidance."
                    : "Take the Sleep Assessment to unlock your personalized plan."
                  }
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                {isFromCache ? (
                  <Button
                    onClick={() => navigate("/sleep-coach")}
                    className="rounded-xl h-12 flex-1"
                    size="lg"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Go to Sleep Coach
                  </Button>
                ) : (
                  <Button
                    onClick={() => navigate("/sleep-quiz")}
                    className="rounded-xl h-12 flex-1"
                    size="lg"
                  >
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Take the Assessment
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => navigate("/product/ergonomic-pillow")}
                  className="rounded-xl h-12 flex-1"
                  size="lg"
                >
                  View Products
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
