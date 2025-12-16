/**
 * SleepPlanTab - Main container for the adaptive Sleep Plan UI
 * 
 * Premium Scandinavian aesthetic, science-backed sleep coaching
 * Consumes adaptive plan data and presents it beautifully
 */

import { useMemo, useCallback } from "react";
import { PlanHero } from "./PlanHero";
import { TodayPlanCard } from "./TodayPlanCard";
import { WeeklySchedule } from "./WeeklySchedule";
import { PlanInsights } from "./PlanInsights";
import { PlanProgressStrip } from "./PlanProgressStrip";
import { Loader2 } from "lucide-react";

// Types from coach-plan.ts
import type { TodayAction, RefreshReason } from "@/types/coach-plan";

// Day plan structure from adaptive engine
interface DayPlan {
  focus: string;
  morning_mobility: string;
  evening_wind_down: string;
  environment_adjustment: string;
  behavioral_focus: string;
  product_cue?: string;
}

interface WeekDays {
  monday?: DayPlan;
  tuesday?: DayPlan;
  wednesday?: DayPlan;
  thursday?: DayPlan;
  friday?: DayPlan;
  saturday?: DayPlan;
  sunday?: DayPlan;
}

interface PatternInfo {
  pattern: string;
  label: string;
  education: string;
  weekFocus: string;
}

interface TimelineInfo {
  category: string;
  typicalOnset: string;
  fullEffect: string;
  weeklyFocus: string;
}

// Adaptive plan context from engine
interface AdaptivePlanContext {
  phase?: "foundation" | "stabilization" | "optimization" | "resilience";
  weekNumber?: number;
  detectedPatterns?: string[];
  patternEducation?: PatternInfo[];
  relevantTimelines?: TimelineInfo[];
  difficulty?: "simplified" | "standard" | "progressive";
  adherenceRate?: number;
}

// Full plan data shape
interface SleepPlanData {
  // Core adaptive fields
  weekFocus?: string;
  weeklyPriorities?: string[];
  adaptiveSummary?: string;
  phase?: "foundation" | "stabilization" | "optimization" | "resilience";
  detectedPatterns?: string[];
  days?: WeekDays;
  
  // Legacy / supporting fields
  planHeadline?: string;
  whyThisPlan?: string;
  encouragement?: string;
  focusAreas?: string[];
  todayActions?: TodayAction[];
  spineScore?: number;
  spineScoreHint?: string;
  riskFocus?: string;
  
  // Metadata
  generatedAt?: string;
  validUntil?: string;
}

interface SleepPlanTabProps {
  plan: SleepPlanData | null;
  loading?: boolean;
  streakDays?: number;
  adaptiveContext?: AdaptivePlanContext;
  
  // Callbacks for user interactions
  onActionComplete?: (dayName: string, actionId: string, completed: boolean) => void;
  onDayReflection?: (dayName: string, note: string) => void;
  onRegeneratePlan?: (reason: RefreshReason) => void;
  onDayClick?: (dayName: string) => void;
  
  // Completion state (wire from parent)
  dayCompletion?: Record<string, "not_started" | "in_progress" | "completed">;
  completedActions?: string[];
}

// Get current day name
function getCurrentDayName(): string {
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  return days[new Date().getDay()];
}

// Format day name for display
function formatDayName(day: string): string {
  return day.charAt(0).toUpperCase() + day.slice(1);
}

export function SleepPlanTab({
  plan,
  loading = false,
  streakDays = 0,
  adaptiveContext,
  onActionComplete,
  onDayReflection,
  onRegeneratePlan,
  onDayClick,
  dayCompletion = {},
  completedActions = [],
}: SleepPlanTabProps) {
  // Current day
  const currentDay = useMemo(() => getCurrentDayName(), []);
  
  // Get today's plan
  const todayPlan = useMemo(() => {
    if (!plan?.days) return undefined;
    return plan.days[currentDay as keyof WeekDays];
  }, [plan?.days, currentDay]);

  // Merge context
  const mergedContext = useMemo(() => ({
    phase: adaptiveContext?.phase || plan?.phase || "foundation",
    weekNumber: adaptiveContext?.weekNumber || 1,
    detectedPatterns: adaptiveContext?.detectedPatterns || plan?.detectedPatterns || [],
    patternEducation: adaptiveContext?.patternEducation || [],
    relevantTimelines: adaptiveContext?.relevantTimelines || [],
    adherenceRate: adaptiveContext?.adherenceRate,
  }), [adaptiveContext, plan]);

  // Handle day click
  const handleDayClick = useCallback((dayName: string) => {
    onDayClick?.(dayName);
  }, [onDayClick]);

  // Loading state
  if (loading) {
    return (
      <div 
        className="flex flex-col items-center justify-center py-20 rounded-3xl"
        style={{ backgroundColor: '#F7F7F6' }}
      >
        <Loader2 
          className="h-10 w-10 animate-spin mb-4"
          style={{ color: 'rgba(60, 131, 246, 0.6)' }}
        />
        <p 
          className="text-sm"
          style={{ color: '#6F6A66' }}
        >
          Generating your adaptive sleep plan...
        </p>
      </div>
    );
  }

  // Empty state
  if (!plan) {
    return (
      <div 
        className="flex flex-col items-center justify-center py-20 rounded-3xl"
        style={{ backgroundColor: '#F7F7F6' }}
      >
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="mb-4">
          <path d="M42 24.79A18 18 0 1122.42 6 14 14 0 0042 24.79z" stroke="#8E98A3" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
        </svg>
        <h3 
          className="text-lg font-medium mb-2"
          style={{ color: '#2D2B29' }}
        >
          No sleep plan yet
        </h3>
        <p 
          className="text-sm text-center max-w-sm mb-6"
          style={{ color: '#6F6A66' }}
        >
          Your personalized 7-night plan will be generated based on your assessment and sleep logs.
        </p>
        <button
          onClick={() => onRegeneratePlan?.("no_plan")}
          className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
          style={{ 
            backgroundColor: 'rgba(60, 131, 246, 0.85)',
            color: '#FFFFFF',
          }}
        >
          Generate My Plan
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Section 1: Plan Hero */}
      <PlanHero
        planHeadline={plan.planHeadline}
        weekFocus={plan.weekFocus}
        spineScore={plan.spineScore}
        spineScoreHint={plan.spineScoreHint}
        phase={mergedContext.phase}
        weekNumber={mergedContext.weekNumber}
        adaptiveSummary={plan.adaptiveSummary}
      />

      {/* Section 2: Progress Strip */}
      <PlanProgressStrip
        weekNumber={mergedContext.weekNumber}
        adherenceRate={mergedContext.adherenceRate}
        streakDays={streakDays}
        phase={mergedContext.phase}
      />

      {/* Section 3: Today's Focus */}
      <TodayPlanCard
        todayActions={plan.todayActions}
        todayPlan={todayPlan}
        dayName={formatDayName(currentDay)}
        onActionComplete={onActionComplete}
        onReflectionSubmit={onDayReflection}
        completedActions={completedActions}
      />

      {/* Section 4: Weekly Schedule */}
      {plan.days && (
        <WeeklySchedule
          days={plan.days}
          completion={dayCompletion}
          currentDay={currentDay}
          onDayClick={handleDayClick}
        />
      )}

      {/* Section 5: Insights Panel */}
      <PlanInsights
        detectedPatterns={mergedContext.detectedPatterns}
        patternEducation={mergedContext.patternEducation}
        relevantTimelines={mergedContext.relevantTimelines}
        adaptiveSummary={plan.adaptiveSummary}
      />

      {/* Footer */}
      <div 
        className="text-center pt-6 border-t"
        style={{ borderColor: 'rgba(167, 180, 194, 0.15)' }}
      >
        <p 
          className="text-xs"
          style={{ color: '#A7A29C' }}
        >
          This plan adapts weekly based on your logs and patterns. 
          {plan.generatedAt && ` Last updated: ${new Date(plan.generatedAt).toLocaleDateString()}`}
        </p>
        {onRegeneratePlan && (
          <button
            onClick={() => onRegeneratePlan("manual")}
            className="mt-3 text-xs font-medium transition-colors"
            style={{ color: 'rgba(60, 131, 246, 0.75)' }}
          >
            Refresh plan manually
          </button>
        )}
      </div>
    </div>
  );
}
