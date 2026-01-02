/**
 * Analytics helper for Sleep Coach tracking
 * Sends events to Klaviyo via _learnq (client-side) and optionally to the server edge function
 */

import { supabase } from "@/integrations/supabase/client";

export interface AnalyticsPayload {
  planId?: string | null;
  streakDays?: number;
  adherenceRate?: number;
  email?: string;
  [key: string]: unknown;
}

// Event name prefix for our custom events
const EVENT_PREFIX = "RBN_";

/**
 * Initialize Klaviyo _learnq queue
 */
const initKlaviyoLearnq = (): boolean => {
  if (typeof window === "undefined") return false;
  window._learnq = window._learnq || [];
  return true;
};

/**
 * Track an event to Klaviyo
 * - Anonymous users: pushes to _learnq client-side queue
 * - Authenticated users with email: also sends to server for more reliable tracking
 */
export function trackEvent(name: string, payload?: AnalyticsPayload): void {
  const prefixedName = `${EVENT_PREFIX}${name}`;
  const eventPayload = {
    ...payload,
    timestamp: new Date().toISOString(),
    url: typeof window !== "undefined" ? window.location.href : undefined,
  };

  // Log locally for debugging
  console.log(`[Analytics] ${prefixedName}`, eventPayload);

  // Client-side Klaviyo tracking (works for all users)
  if (initKlaviyoLearnq()) {
    try {
      window._learnq!.push(["track", prefixedName, eventPayload]);
    } catch (error) {
      console.warn("[Analytics] Client-side Klaviyo tracking failed:", error);
    }
  }

  // Server-side tracking for authenticated users (more reliable, deduped)
  if (payload?.email) {
    sendServerEvent(prefixedName, payload.email, eventPayload).catch((error) => {
      // Silent fail - analytics should never break the app
      console.warn("[Analytics] Server-side tracking failed:", error);
    });
  }
}

/**
 * Send event to Klaviyo via edge function (for authenticated users)
 * This provides more reliable tracking and server-side deduplication
 */
async function sendServerEvent(
  eventName: string,
  email: string,
  properties: Record<string, unknown>
): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke("klaviyo-event", {
      body: {
        email,
        event_name: eventName,
        properties,
      },
    });

    if (error) {
      throw error;
    }
  } catch (error) {
    // Re-throw for caller to handle silently
    throw error;
  }
}

// ============================================================================
// Pre-defined Sleep Coach events for consistency
// ============================================================================

export function trackPlanViewed(planId: string, email?: string): void {
  trackEvent("PlanViewed", { planId, email });
}

export function trackDayOpened(planId: string, dayName: string, email?: string): void {
  trackEvent("DayOpened", { planId, dayName, email });
}

export function trackActionCompleted(
  planId: string,
  actionId: string,
  dayName: string,
  email?: string
): void {
  trackEvent("ActionCompleted", { planId, actionId, dayName, email });
}

export function trackStreakUpdated(
  streakDays: number,
  adherenceRate: number,
  email?: string
): void {
  trackEvent("StreakUpdated", { streakDays, adherenceRate, email });
}

export function trackPlanRefreshed(planId: string, reason: string, email?: string): void {
  trackEvent("PlanRefreshed", { planId, reason, email });
}

export function trackCoachOnboarded(email?: string): void {
  trackEvent("CoachOnboarded", { email });
}

export function trackFirstPlanGenerated(planId: string, email?: string): void {
  trackEvent("FirstPlanGenerated", { planId, email });
}
