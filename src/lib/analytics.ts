/**
 * Minimal analytics helper for Sleep Coach tracking
 * Currently logs to console, ready for future integration
 */

export interface AnalyticsPayload {
  planId?: string | null;
  streakDays?: number;
  adherenceRate?: number;
  [key: string]: unknown;
}

export function trackEvent(name: string, payload?: AnalyticsPayload): void {
  // Log locally for debugging
  console.log(`[Analytics] ${name}`, payload);
  
  // Future: Send to analytics service
  // e.g., window.analytics?.track(name, payload);
}
