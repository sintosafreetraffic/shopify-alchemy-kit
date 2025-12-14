/**
 * SpineScoreDisplay - Enhanced spine score visualization
 * 
 * Shows:
 * - Score with color-coded state (green/amber/red)
 * - 1-line explanation text
 * - Trend indicator
 * - Optional factor breakdown
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, Activity } from "lucide-react";
import { useState } from "react";

interface SpineScoreFactor {
  name: string;
  impact: number;
  description: string;
}

interface SpineScoreDisplayProps {
  score: number;
  trend: "improving" | "stable" | "declining";
  hint?: string; // AI-generated explanation
  factors?: SpineScoreFactor[];
  showBreakdown?: boolean;
}

function getScoreState(score: number): { color: string; label: string; bgClass: string } {
  if (score >= 70) {
    return { 
      color: "text-emerald-600", 
      label: "Good",
      bgClass: "bg-emerald-500"
    };
  }
  if (score >= 50) {
    return { 
      color: "text-amber-600", 
      label: "Fair",
      bgClass: "bg-amber-500"
    };
  }
  return { 
    color: "text-rose-600", 
    label: "Needs Attention",
    bgClass: "bg-rose-500"
  };
}

function getTrendIcon(trend: string) {
  switch (trend) {
    case "improving":
      return <TrendingUp className="h-4 w-4 text-emerald-600" />;
    case "declining":
      return <TrendingDown className="h-4 w-4 text-rose-600" />;
    default:
      return <Minus className="h-4 w-4 text-muted-foreground" />;
  }
}

const DEFAULT_HINT_BY_SCORE: Record<string, string> = {
  good: "Your sleep alignment and comfort are in a healthy range. Keep up your current routine!",
  fair: "Room for improvement. Focus on consistency and the recommendations in your plan.",
  needs_attention: "Several factors are affecting your sleep quality. Small daily changes can help.",
};

export function SpineScoreDisplay({
  score,
  trend,
  hint,
  factors,
  showBreakdown = true,
}: SpineScoreDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const state = getScoreState(score);
  
  // Use AI hint if provided, otherwise use default based on score
  const displayHint = hint || 
    (score >= 70 ? DEFAULT_HINT_BY_SCORE.good : 
     score >= 50 ? DEFAULT_HINT_BY_SCORE.fair : 
     DEFAULT_HINT_BY_SCORE.needs_attention);

  return (
    <Card className="border-border/50">
      <CardContent className="py-4 px-5">
        {/* Header row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <span className="font-medium">Spine Score</span>
          </div>
          <div className="flex items-center gap-2">
            {getTrendIcon(trend)}
            <Badge 
              variant="outline" 
              className={`font-semibold ${state.color} border-current/30`}
            >
              {score}/100
            </Badge>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="mb-3">
          <Progress 
            value={score} 
            className="h-2"
            // Custom indicator color based on score
          />
        </div>
        
        {/* Hint text */}
        <p className="text-sm text-muted-foreground mb-2">
          {displayHint}
        </p>
        
        {/* State badge */}
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className={state.color}>
            {state.label}
          </Badge>
          
          {/* Breakdown toggle */}
          {showBreakdown && factors && factors.length > 0 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {isExpanded ? "Hide" : "Show"} factors
              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          )}
        </div>
        
        {/* Factor breakdown */}
        {isExpanded && factors && factors.length > 0 && (
          <div className="mt-4 pt-3 border-t border-border/50 space-y-2">
            {factors.map((factor, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span 
                    className={`w-2 h-2 rounded-full ${
                      factor.impact > 0 ? "bg-emerald-500" : "bg-rose-500"
                    }`}
                  />
                  <span className="text-muted-foreground">{factor.name}</span>
                </div>
                <span className={factor.impact > 0 ? "text-emerald-600" : "text-rose-600"}>
                  {factor.impact > 0 ? "+" : ""}{factor.impact}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
