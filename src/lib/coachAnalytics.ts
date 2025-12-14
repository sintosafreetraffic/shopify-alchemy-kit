/**
 * Coach Plan Analytics
 * 
 * Deterministic tracking for AI Coach plan interactions.
 * All events include persona, readiness, and spine score context.
 */

import type { PersonaCluster } from "@/types/coach-plan";

// ============ SESSION ID HELPER ============

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "server";
  
  const storageKey = "rbn_analytics_session_id";
  let sessionId = sessionStorage.getItem(storageKey);
  
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    sessionStorage.setItem(storageKey, sessionId);
  }
  
  return sessionId;
}

// ============ SPINE SCORE BUCKET ============

export type SpineScoreBucket = "0-49" | "50-69" | "70+";

function getSpineScoreBucket(score: number): SpineScoreBucket {
  if (score >= 70) return "70+";
  if (score >= 50) return "50-69";
  return "0-49";
}

// ============ COACH EVENT TYPES ============

interface CoachEventBase {
  session_id: string;
  timestamp: string;
  persona_cluster: PersonaCluster | null;
  coach_readiness_label: string | null;
  spine_score_bucket: SpineScoreBucket | null;
}

interface CoachPlanViewedEvent extends CoachEventBase {
  type: "coach_plan_viewed";
  plan_id: string;
  plan_age_days: number;
  has_today_actions: boolean;
}

interface CoachPlanDayOpenedEvent extends CoachEventBase {
  type: "coach_plan_day_opened";
  plan_id: string;
  day_index: number; // 1-7
}

interface CoachTodayActionsMarkedEvent extends CoachEventBase {
  type: "coach_today_actions_marked_done";
  plan_id: string;
  actions_completed: number;
  total_actions: number;
}

interface CoachPlanRefreshedEvent extends CoachEventBase {
  type: "coach_plan_refreshed";
  refresh_reason: string;
  previous_spine_score: number | null;
  new_spine_score: number | null;
}

type CoachEvent = 
  | CoachPlanViewedEvent 
  | CoachPlanDayOpenedEvent 
  | CoachTodayActionsMarkedEvent
  | CoachPlanRefreshedEvent;

// ============ DEDUPLICATION ============

const viewedPlansThisSession = new Set<string>();

// ============ SEND EVENT ============

async function sendCoachEvent(event: CoachEvent): Promise<void> {
  // Log locally in dev
  if (import.meta.env.DEV) {
    console.log("[CoachAnalytics]", event.type, event);
  }

  // Send to Supabase persona-analytics (reuse existing endpoint)
  try {
    await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/persona-analytics`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "",
      },
      body: JSON.stringify({ events: [event] }),
    });
  } catch (e) {
    // Silent fail - analytics should never break UX
    if (import.meta.env.DEV) {
      console.warn("[CoachAnalytics] Failed to send event:", e);
    }
  }
}

// ============ PUBLIC API ============

interface CoachContext {
  personaCluster: PersonaCluster | null;
  coachReadinessLabel: string | null;
  spineScore: number | null;
}

/**
 * Track when user views their coach plan (once per session per plan)
 */
export function trackCoachPlanViewed(
  planId: string,
  planAgedays: number,
  hasTodayActions: boolean,
  context: CoachContext
): void {
  // Deduplicate - only track once per session per plan
  if (viewedPlansThisSession.has(planId)) return;
  viewedPlansThisSession.add(planId);

  sendCoachEvent({
    type: "coach_plan_viewed",
    plan_id: planId,
    plan_age_days: planAgedays,
    has_today_actions: hasTodayActions,
    session_id: getOrCreateSessionId(),
    timestamp: new Date().toISOString(),
    persona_cluster: context.personaCluster,
    coach_readiness_label: context.coachReadinessLabel,
    spine_score_bucket: context.spineScore !== null ? getSpineScoreBucket(context.spineScore) : null,
  });
}

/**
 * Track when user opens a specific day in the schedule
 */
export function trackCoachPlanDayOpened(
  planId: string,
  dayIndex: number,
  context: CoachContext
): void {
  sendCoachEvent({
    type: "coach_plan_day_opened",
    plan_id: planId,
    day_index: dayIndex,
    session_id: getOrCreateSessionId(),
    timestamp: new Date().toISOString(),
    persona_cluster: context.personaCluster,
    coach_readiness_label: context.coachReadinessLabel,
    spine_score_bucket: context.spineScore !== null ? getSpineScoreBucket(context.spineScore) : null,
  });
}

/**
 * Track when user marks today actions as done
 */
export function trackCoachTodayActionsMarked(
  planId: string,
  actionsCompleted: number,
  totalActions: number,
  context: CoachContext
): void {
  sendCoachEvent({
    type: "coach_today_actions_marked_done",
    plan_id: planId,
    actions_completed: actionsCompleted,
    total_actions: totalActions,
    session_id: getOrCreateSessionId(),
    timestamp: new Date().toISOString(),
    persona_cluster: context.personaCluster,
    coach_readiness_label: context.coachReadinessLabel,
    spine_score_bucket: context.spineScore !== null ? getSpineScoreBucket(context.spineScore) : null,
  });
}

/**
 * Track when a plan is refreshed/regenerated
 */
export function trackCoachPlanRefreshed(
  refreshReason: string,
  previousSpineScore: number | null,
  newSpineScore: number | null,
  context: CoachContext
): void {
  sendCoachEvent({
    type: "coach_plan_refreshed",
    refresh_reason: refreshReason,
    previous_spine_score: previousSpineScore,
    new_spine_score: newSpineScore,
    session_id: getOrCreateSessionId(),
    timestamp: new Date().toISOString(),
    persona_cluster: context.personaCluster,
    coach_readiness_label: context.coachReadinessLabel,
    spine_score_bucket: context.spineScore !== null ? getSpineScoreBucket(context.spineScore) : null,
  });
}

/**
 * Clear viewed plans cache (call on logout/session end)
 */
export function clearCoachAnalyticsSession(): void {
  viewedPlansThisSession.clear();
}
