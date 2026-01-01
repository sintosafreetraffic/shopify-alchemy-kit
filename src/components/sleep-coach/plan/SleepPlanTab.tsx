/**
 * SleepPlanTab - Main container for the adaptive Sleep Plan UI
 * 
 * Premium Scandinavian aesthetic, science-backed sleep coaching
 * Consumes adaptive plan data and presents it beautifully
 */

import { useMemo, useCallback, useState } from "react";
import { PlanHero } from "./PlanHero";
import { TodayPlanCard } from "./TodayPlanCard";
import { WeeklySchedule } from "./WeeklySchedule";
import { PlanInsights } from "./PlanInsights";
import { PlanProgressStrip } from "./PlanProgressStrip";
import { DayDetailModal } from "./DayDetailModal";
import { Loader2 } from "lucide-react";
import { usePlanCompletion } from "@/hooks/usePlanCompletion";
import { useWeeklyProgression } from "@/hooks/useWeeklyProgression";

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
export interface AdaptivePlanContext {
  phase?: "foundation" | "stabilization" | "optimization" | "resilience";
  weekNumber?: number;
  detectedPatterns?: string[];
  patternEducation?: PatternInfo[];
  relevantTimelines?: TimelineInfo[];
  difficulty?: "simplified" | "standard" | "progressive";
  adherenceRate?: number;
}

// Full plan data shape
export interface SleepPlanData {
  // Plan ID for persistence
  id?: string;
  plan_id?: string;
  
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
  totalWeeks?: number;
  
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
  onRegeneratePlan?: (reason: RefreshReason) => void;
  onDayClick?: (dayName: string) => void;
}

// Day order for navigation
const DAY_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

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
  streakDays: propStreakDays = 0,
  adaptiveContext,
  onRegeneratePlan,
  onDayClick,
}: SleepPlanTabProps) {
  // Modal state
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  
  // Derive planId robustly
  const planId = useMemo(() => {
    if (!plan) return null;
    // Try multiple possible ID fields
    const planAny = plan as Record<string, unknown>;
    return (plan.id || plan.plan_id || planAny.id || planAny.plan_id || null) as string | null;
  }, [plan]);
  
  // Use completion hook
  const {
    completedActions,
    dayCompletion,
    reflections,
    adherenceRate,
    streakDays: hookStreakDays,
    weekNumber,
    loading: completionLoading,
    error: completionError,
    toggleAction,
    saveReflection,
  } = usePlanCompletion({ planId, enabled: !!planId });
  
  // Use weekly progression hook
  const {
    isRegenerating,
    daysRemaining,
  } = useWeeklyProgression({
    adherenceRate,
    weekNumber,
    planValidUntil: plan?.validUntil,
    onRegeneratePlan: (reason) => onRegeneratePlan?.(reason as RefreshReason),
    enabled: !!planId && !!onRegeneratePlan,
  });
  
  // Combined loading state
  const isLoading = loading || completionLoading || isRegenerating;
  
  // Use hook values when available, fallback to props/context
  const effectiveStreakDays = hookStreakDays > 0 ? hookStreakDays : propStreakDays;
  const effectiveAdherenceRate = adherenceRate > 0 ? adherenceRate : adaptiveContext?.adherenceRate;
  const effectiveWeekNumber = weekNumber > 0 ? weekNumber : adaptiveContext?.weekNumber || 1;
  
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
    weekNumber: effectiveWeekNumber,
    detectedPatterns: adaptiveContext?.detectedPatterns || plan?.detectedPatterns || [],
    patternEducation: adaptiveContext?.patternEducation || [],
    relevantTimelines: adaptiveContext?.relevantTimelines || [],
    adherenceRate: effectiveAdherenceRate,
  }), [adaptiveContext, plan, effectiveWeekNumber, effectiveAdherenceRate]);

  // Handle day click - open modal
  const handleDayClick = useCallback((dayName: string) => {
    setSelectedDay(dayName.toLowerCase());
    onDayClick?.(dayName);
  }, [onDayClick]);

  // Handle modal close
  const handleModalClose = useCallback(() => {
    setSelectedDay(null);
  }, []);

  // Handle modal navigation
  const handleModalNavigate = useCallback((direction: "prev" | "next") => {
    if (!selectedDay) return;
    
    const currentIndex = DAY_ORDER.indexOf(selectedDay.toLowerCase());
    if (currentIndex === -1) return;
    
    const newIndex = direction === "prev" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex >= 0 && newIndex < DAY_ORDER.length) {
      setSelectedDay(DAY_ORDER[newIndex]);
    }
  }, [selectedDay]);

  // Get selected day plan
  const selectedDayPlan = useMemo(() => {
    if (!selectedDay || !plan?.days) return null;
    return plan.days[selectedDay as keyof WeekDays] || null;
  }, [selectedDay, plan?.days]);

  // Navigation availability
  const canNavigatePrev = useMemo(() => {
    if (!selectedDay) return false;
    const currentIndex = DAY_ORDER.indexOf(selectedDay.toLowerCase());
    return currentIndex > 0;
  }, [selectedDay]);

  const canNavigateNext = useMemo(() => {
    if (!selectedDay) return false;
    const currentIndex = DAY_ORDER.indexOf(selectedDay.toLowerCase());
    return currentIndex < DAY_ORDER.length - 1;
  }, [selectedDay]);

  // Loading state
  if (isLoading) {
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
          {isRegenerating ? "Preparing your next week" : "Generating your adaptive sleep plan"}
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
      {/* Medical Disclaimer Banner */}
      <div 
        className="px-4 py-2.5 rounded-xl text-center"
        style={{ 
          backgroundColor: 'rgba(167, 180, 194, 0.08)',
          borderLeft: '3px solid rgba(167, 180, 194, 0.3)',
        }}
      >
        <p 
          className="text-xs"
          style={{ color: '#8E98A3' }}
        >
          For educational purposes only. Not medical advice.
        </p>
      </div>

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
        streakDays={effectiveStreakDays}
        phase={mergedContext.phase}
        totalWeeks={plan.totalWeeks ?? 12}
      />
      
      {/* Days remaining indicator */}
      {daysRemaining > 0 && daysRemaining <= 7 && (
        <p 
          className="text-xs text-center"
          style={{ color: '#A7A29C' }}
        >
          {daysRemaining} {daysRemaining === 1 ? 'night' : 'nights'} remaining in this week
        </p>
      )}
      
      {/* Completion error - subtle inline message */}
      {completionError && (
        <p 
          className="text-xs text-center"
          style={{ color: '#A7A29C' }}
        >
          We couldn't load your latest completion data. Your plan is still available.
        </p>
      )}

      {/* Section 3: Today's Focus */}
      <TodayPlanCard
        todayActions={plan.todayActions}
        todayPlan={todayPlan}
        dayName={formatDayName(currentDay)}
        completedActions={completedActions}
        onActionComplete={(dayName, actionId, completed) => {
          toggleAction(dayName, actionId, completed);
        }}
        onReflectionSubmit={(dayName, note) => {
          saveReflection(dayName, note);
        }}
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
          new Date().getDay() === 0 ? (
            <button
              onClick={() => onRegeneratePlan("manual")}
              className="mt-3 text-xs font-medium transition-colors"
              style={{ color: 'rgba(60, 131, 246, 0.75)' }}
            >
              Generate next week's plan
            </button>
          ) : (
            <p 
              className="mt-3 text-xs"
              style={{ color: '#A7A29C' }}
            >
              New plans available on Sundays
            </p>
          )
        )}
      </div>

      {/* Day Detail Modal */}
      <DayDetailModal
        isOpen={!!selectedDay}
        onClose={handleModalClose}
        dayName={selectedDay || ""}
        dayPlan={selectedDayPlan}
        completedActions={completedActions}
        reflection={selectedDay ? reflections[selectedDay.toLowerCase()] : undefined}
        onToggleAction={toggleAction}
        onSaveReflection={saveReflection}
        onNavigate={handleModalNavigate}
        canNavigatePrev={canNavigatePrev}
        canNavigateNext={canNavigateNext}
        dayStatus={selectedDay ? dayCompletion[selectedDay.toLowerCase()] : undefined}
      />
    </div>
  );
}
