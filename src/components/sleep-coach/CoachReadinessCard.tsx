/**
 * CoachReadinessCard Component
 * 
 * Displays the user's coach readiness status with supportive, non-judgmental messaging.
 * Uses calm, Scandinavian aesthetic matching the brand tone.
 * 
 * v10: Initial implementation with readiness score, label, and rationale.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Compass, CheckCircle, Loader } from "lucide-react";
import type { CoachReadinessLabel } from "@/components/sleep-quiz/QuizTypes";
import { getCoachReadinessLabel } from "@/components/sleep-quiz/QuizTypes";

interface CoachReadinessCardProps {
  score?: number;
  label?: CoachReadinessLabel;
  rationale?: string;
  compact?: boolean;
}

// Color mapping for readiness levels (supportive, non-judgmental)
const READINESS_COLORS: Record<CoachReadinessLabel, { 
  bg: string; 
  badgeBg: string; 
  text: string;
  border: string;
}> = {
  "Early Stage": {
    bg: "from-amber-50/50 via-background to-background dark:from-amber-950/20",
    badgeBg: "bg-amber-100 dark:bg-amber-900/50",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-200/50 dark:border-amber-800/30",
  },
  "Developing": {
    bg: "from-blue-50/50 via-background to-background dark:from-blue-950/20",
    badgeBg: "bg-blue-100 dark:bg-blue-900/50",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-200/50 dark:border-blue-800/30",
  },
  "Ready": {
    bg: "from-emerald-50/50 via-background to-background dark:from-emerald-950/20",
    badgeBg: "bg-emerald-100 dark:bg-emerald-900/50",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-200/50 dark:border-emerald-800/30",
  },
};

// Icon mapping for readiness levels
const READINESS_ICONS: Record<CoachReadinessLabel, typeof Compass> = {
  "Early Stage": Compass,
  "Developing": Loader,
  "Ready": CheckCircle,
};

// Default supportive rationale if none provided
const DEFAULT_RATIONALE: Record<CoachReadinessLabel, string> = {
  "Early Stage": "You're in the early stage of building a stable sleep foundation. The coach will focus on establishing core habits first.",
  "Developing": "Your sleep patterns are developing nicely. The coach can help you refine and build on your current progress.",
  "Ready": "You have a strong sleep foundation. The coach can help you optimize and maintain your excellent sleep habits.",
};

export function CoachReadinessCard({
  score,
  label,
  rationale,
  compact = false,
}: CoachReadinessCardProps) {
  // Determine label from score if not provided
  const displayLabel = label || (score !== undefined ? getCoachReadinessLabel(score) : "Early Stage");
  const displayRationale = rationale || DEFAULT_RATIONALE[displayLabel];
  const colors = READINESS_COLORS[displayLabel];
  const IconComponent = READINESS_ICONS[displayLabel];

  if (compact) {
    // Compact version for inline display
    return (
      <div className={`p-3 rounded-xl ${colors.badgeBg} ${colors.border} border flex items-center gap-3`}>
        <div className={`w-8 h-8 rounded-lg bg-background/60 flex items-center justify-center flex-shrink-0`}>
          <IconComponent className={`w-4 h-4 ${colors.text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">Coach Readiness</span>
            <Badge 
              variant="secondary" 
              className={`text-xs font-medium ${colors.badgeBg} ${colors.text}`}
            >
              {displayLabel}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {displayRationale}
          </p>
        </div>
      </div>
    );
  }

  return (
    <Card className={`${colors.border} bg-gradient-to-br ${colors.bg}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${colors.badgeBg} flex items-center justify-center flex-shrink-0`}>
            <IconComponent className={`w-5 h-5 ${colors.text}`} />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base flex items-center gap-2 flex-wrap">
              <span>Coach Readiness</span>
              <Badge 
                variant="secondary" 
                className={`text-xs font-medium ${colors.badgeBg} ${colors.text}`}
              >
                {displayLabel}
              </Badge>
            </CardTitle>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <p className="text-sm text-foreground/85 leading-relaxed">
          {displayRationale}
        </p>
        
        {/* Score indicator (optional, subtle) */}
        {score !== undefined && (
          <div className="mt-3 pt-3 border-t border-slate-200/40 dark:border-slate-700/30">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Foundation Progress</span>
              <span>{score}%</span>
            </div>
            <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden mt-1">
              <div 
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                  score >= 70 ? "bg-emerald-500/80" : score >= 40 ? "bg-blue-500/70" : "bg-amber-500/70"
                }`}
                style={{ width: `${score}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
