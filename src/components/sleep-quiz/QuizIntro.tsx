import { Moon } from "lucide-react";

/**
 * QuizIntro - Displays the scientific, purpose-driven header for the Sleep Assessment.
 * No time estimates, step counts, or effort-based language.
 * Calm, premium, Scandinavian tone aligned with 2025 funnel:
 * science → identity → relevance → recommendations
 */
export function QuizIntro() {
  return (
    <div className="text-center mb-8">
      <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
        <Moon className="w-4 h-4" />
        Research-Based Assessment
      </div>
      <h1 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight">
        Short Science. Clear Sleep Insights.
      </h1>
      <p className="text-muted-foreground max-w-lg mx-auto leading-relaxed">
        This short, science-backed assessment helps us understand your sleep patterns across five foundations: posture, pain, environment, behavior, and nighttime recovery.
      </p>
      <p className="text-muted-foreground/80 max-w-md mx-auto mt-2 text-sm">
        Your responses shape a personalized sleep profile and tailored product recommendations.
      </p>
    </div>
  );
}

/**
 * QuizIntroCompleted - Displayed when a user has already completed the assessment.
 * Same calm, scientific tone.
 */
export function QuizIntroCompleted() {
  return (
    <div className="text-center mb-8">
      <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
        <Moon className="w-4 h-4" />
        Assessment Complete
      </div>
      <h1 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight">
        Your Sleep Profile is Ready
      </h1>
      <p className="text-muted-foreground max-w-md mx-auto">
        View your personalized results or take a fresh assessment to update your profile.
      </p>
    </div>
  );
}
