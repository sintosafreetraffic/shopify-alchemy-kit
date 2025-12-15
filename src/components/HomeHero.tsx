import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

// Hero images
import heroDesktop from "@/assets/hero-christmas-desktop.webp";
import heroMobile from "@/assets/lifestyle-hero-mobile-new.webp";

// ============================================================================
// HERO HEADLINE VARIANTS (Future A/B Testing)
// ============================================================================
// Currently using: "science" variant as default for all users
// Future logic will swap based on persona detection after quiz completion
// ============================================================================
const HERO_HEADLINE_VARIANTS = {
  posture: "Wake Up Aligned. Sleep Without Morning Tension.",
  science: "Short Science, Long-Term Sleep Improvement.",
  recovery: "Sleep That Supports Your Recovery — Night After Night.",
} as const;

// Currently active variant (hardcoded for now)
const activeVariant = "science" as keyof typeof HERO_HEADLINE_VARIANTS;
const activeHeadline = HERO_HEADLINE_VARIANTS[activeVariant];

// ============================================================================
// Future persona-based headline variants (not wired yet):
// - Default / no persona / no quiz done -> Variant "science":
//   "Short Science, Long-Term Sleep Improvement."
// - pain_sleeper persona -> Variant "posture":
//   "Wake Up Aligned. Sleep Without Morning Tension."
// - recovery_sleeper persona -> Variant "recovery":
//   "Sleep That Supports Your Recovery — Night After Night."
// - stress_insomnia / optimizer personas can continue using the "science" variant
// ============================================================================

const HomeHero = () => {
  const navigate = useNavigate();

  const handleStartAssessment = () => {
    navigate("/sleep-quiz");
  };

  const handleScrollToScience = () => {
    document.getElementById("science")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      data-hero-slot="sleep-assessment-hero"
      data-hero-default-variant={activeVariant}
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
            className="w-full h-full object-cover"
            loading="eager"
            fetchPriority="high"
          />
        </picture>
        {/* Subtle overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40" />
      </div>

      {/* Content Section */}
      <div className="relative bg-[#F5F6F7] py-16 md:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight text-foreground leading-tight">
              {activeHeadline}
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed font-light">
              A short science-backed assessment that clarifies what your body needs to sleep better.
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
              Takes 5 minutes. Based on sleep science research.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomeHero;
