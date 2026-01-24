import { useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { getPersonaCookie, type PersonaCluster } from "@/lib/personaCookie";
import { supabase } from "@/integrations/supabase/client";
import { getSessionId } from "@/lib/abTesting";

// Hero images
import heroDesktop from "@/assets/hero-cloud-sleep.webp";
import heroMobile from "@/assets/hero-cloud-sleep.webp";

// ============================================================================
// HERO HEADLINE VARIANTS (Persona-based A/B Testing)
// ============================================================================
const HERO_HEADLINE_VARIANTS = {
  posture: "Wake Up Aligned. Sleep Without Morning Tension.",
  science: "Short Science, Long-Term Sleep Improvement.",
  recovery: "Sleep That Supports Your Recovery — Night After Night.",
  calm: "Create the Calm Your Mind Needs to Sleep.",
} as const;

type HeadlineVariant = keyof typeof HERO_HEADLINE_VARIANTS;

// Map persona clusters to headline variants
const PERSONA_TO_VARIANT: Record<NonNullable<PersonaCluster>, HeadlineVariant> = {
  pain_sleeper: "posture",
  recovery_sleeper: "recovery",
  stress_insomnia: "calm",
  optimizer: "science",
};

/**
 * Get the appropriate headline variant based on persona cookie
 * Falls back to "science" for new/unknown users
 */
function getHeadlineVariant(): { variant: HeadlineVariant; persona: PersonaCluster } {
  const persona = getPersonaCookie();
  if (persona && persona in PERSONA_TO_VARIANT) {
    return { variant: PERSONA_TO_VARIANT[persona], persona };
  }
  return { variant: "science", persona: null };
}

/**
 * Track hero variant exposure to persona-analytics
 */
async function trackHeroVariantExposure(variant: HeadlineVariant, persona: PersonaCluster): Promise<void> {
  try {
    await supabase.functions.invoke("persona-analytics", {
      body: {
        events: [{
          event_type: "hero_variant_exposure",
          variant,
          persona_cluster: persona,
          page_path: typeof window !== "undefined" ? window.location.pathname : "/",
        }],
        session_id: getSessionId(),
      },
    });
  } catch {
    // Silent fail - analytics should never break the app
  }
}

// Uses unified session ID from abTesting.ts (imported at top)
const HomeHero = () => {
  const navigate = useNavigate();
  const hasTracked = useRef(false);

  // Determine headline variant based on persona cookie (memoized)
  const { activeVariant, activeHeadline, persona } = useMemo(() => {
    const { variant, persona } = getHeadlineVariant();
    return {
      activeVariant: variant,
      activeHeadline: HERO_HEADLINE_VARIANTS[variant],
      persona,
    };
  }, []);

  // Track variant exposure once per page load
  useEffect(() => {
    if (hasTracked.current) return;
    hasTracked.current = true;
    trackHeroVariantExposure(activeVariant, persona);
  }, [activeVariant, persona]);

  const handleStartAssessment = () => {
    navigate("/sleep-quiz");
  };

  const handleScrollToScience = () => {
    document.getElementById("science")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      data-hero-slot="sleep-assessment-hero"
      data-hero-variant={activeVariant}
      className="relative w-full"
    >
      {/* Hero Image */}
      <div className="relative w-full h-[50vh] md:h-[60vh] overflow-hidden">
        <picture>
          <source media="(max-width: 767px)" srcSet={heroMobile} />
          <source media="(min-width: 768px)" srcSet={heroDesktop} />
          <img
            src={heroDesktop}
            alt="Peaceful sleep environment"
            className="w-full h-full object-cover object-top"
            loading="eager"
            fetchPriority="high"
          />
        </picture>
        {/* Subtle overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40" />
        
        {/* Hero CTA Button */}
        <div className="absolute inset-x-0 bottom-8 md:bottom-12 flex justify-center">
          <Button
            onClick={() => navigate("/products/ergonomic-pillow")}
            size="lg"
            className="h-14 px-10 text-base font-medium rounded-full bg-white/95 text-foreground hover:bg-white shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm"
          >
            Improve Your Sleep
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content Section */}
      <div className="relative bg-[#F5F6F7] py-8 md:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-5 md:space-y-8">
            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight text-foreground leading-tight">
              {activeHeadline}
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed font-light">
              A short, science-backed assessment that helps us understand your sleep patterns across five foundations: posture, pain, environment, behavior, and nighttime recovery.
            </p>

            {/* CTA Group */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              {/* Primary CTA */}
              <Button
                onClick={handleStartAssessment}
                size="lg"
                className="h-14 px-8 text-base font-medium rounded-full shadow-sm hover:shadow-md transition-all duration-300"
              >
                Start Your Sleep Assessment
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              {/* Secondary Link */}
              <button
                onClick={handleScrollToScience}
                className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors duration-200 flex items-center gap-1 group"
              >
                Why this works
                <span className="group-hover:translate-x-0.5 transition-transform duration-200">→</span>
              </button>
            </div>

            {/* Supporting Micro-copy */}
            <p className="text-sm text-muted-foreground/70 font-light">
              Your responses shape a personalized sleep profile and tailored product recommendations.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomeHero;
