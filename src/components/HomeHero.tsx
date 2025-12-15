import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

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

/**
 * Minimal sleep alignment illustration
 * Abstract representation of spine/neck alignment during sleep
 */
const SleepAlignmentVisual = () => (
  <svg
    viewBox="0 0 400 300"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="w-full max-w-md h-auto opacity-80"
    aria-hidden="true"
  >
    {/* Pillow silhouette */}
    <path
      d="M80 180 Q200 140 320 180 Q340 200 320 220 Q200 240 80 220 Q60 200 80 180Z"
      fill="hsl(var(--muted))"
      stroke="hsl(var(--border))"
      strokeWidth="1"
    />
    
    {/* Head outline (abstract circle) */}
    <circle
      cx="200"
      cy="140"
      r="50"
      fill="none"
      stroke="hsl(var(--primary))"
      strokeWidth="1.5"
      strokeDasharray="4 2"
      opacity="0.6"
    />
    
    {/* Spine alignment curve */}
    <path
      d="M200 190 Q200 210 200 230 Q200 250 195 270"
      fill="none"
      stroke="hsl(var(--primary))"
      strokeWidth="2"
      strokeLinecap="round"
      opacity="0.7"
    />
    
    {/* Alignment indicator dots */}
    <circle cx="200" cy="190" r="4" fill="hsl(var(--primary))" opacity="0.5" />
    <circle cx="200" cy="220" r="3" fill="hsl(var(--primary))" opacity="0.4" />
    <circle cx="197" cy="250" r="3" fill="hsl(var(--primary))" opacity="0.3" />
    
    {/* Subtle grid lines for scientific feel */}
    <line x1="50" y1="150" x2="350" y2="150" stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.3" />
    <line x1="50" y1="200" x2="350" y2="200" stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.3" />
    <line x1="200" y1="80" x2="200" y2="280" stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.3" />
  </svg>
);

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
      className="relative w-full min-h-[85vh] flex items-center bg-[#F5F6F7]"
    >
      {/* Subtle background texture */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/30 pointer-events-none" />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Text Content */}
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-8">
            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight text-foreground leading-tight">
              {activeHeadline}
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl text-muted-foreground max-w-xl leading-relaxed font-light">
              A short science-backed assessment that clarifies what your body needs to sleep better.
            </p>

            {/* CTA Group */}
            <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
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
              Takes 3 minutes. Based on sleep science research.
            </p>
          </div>

          {/* Visual */}
          <div className="hidden lg:flex justify-center items-center">
            <div className="relative">
              <SleepAlignmentVisual />
              
              {/* Subtle label */}
              <span className="absolute bottom-0 right-0 text-xs text-muted-foreground/50 tracking-wide uppercase">
                Sleep Alignment
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomeHero;
