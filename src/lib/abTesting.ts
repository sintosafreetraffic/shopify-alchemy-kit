/**
 * A/B Testing System for RiseByNight
 * 
 * Phase 1: Core routing and tracking infrastructure
 * - Sticky 50/50 split via cookie
 * - Early assignment before render
 * - Consistent session tracking
 * - Multi-pixel integration
 */

import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// CONSTANTS
// ============================================================================

const AB_COOKIE_NAME = 'rbn_ab_variant';
const AB_COOKIE_DAYS = 7;
const AB_STORAGE_KEY = 'rbn_ab_variant';
const AB_SPLIT_KEY = 'rbn_ab_split'; // Traffic split percentage for Variant B (0-100)

export type ABVariant = 'A' | 'B';

export interface ABConfig {
  enabled: boolean;
  testName: string;
  splitPercentB: number; // Percentage of traffic to Variant B (0-100)
  variants: {
    A: { name: string; description: string };
    B: { name: string; description: string };
  };
}

// Master A/B test configuration (mutable for admin toggle)
// IMPORTANT: Use mutation (not reassignment) so all importers see the same object
export const AB_TEST_CONFIG: ABConfig = {
  enabled: true, // Set to false to disable all A/B testing
  testName: 'urgency_test_v1',
  splitPercentB: 50, // Default 50% to B (50/50 split)
  variants: {
    A: { name: 'Control', description: 'Current product page' },
    B: { name: 'Urgency', description: 'High-urgency elements enabled' },
  },
};

/**
 * Enable or disable the A/B test at runtime
 * Persists to localStorage for admin control
 */
export function setTestEnabled(enabled: boolean): void {
  AB_TEST_CONFIG.enabled = enabled;
  try {
    localStorage.setItem('rbn_ab_test_enabled', String(enabled));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Set the traffic split percentage for Variant B (0-100) - saves to DATABASE
 * E.g., 70 means 70% to B, 30% to A
 */
export async function setTrafficSplit(percentB: number): Promise<void> {
  const clampedPercent = Math.max(0, Math.min(100, percentB));
  AB_TEST_CONFIG.splitPercentB = clampedPercent;
  
  try {
    const { error } = await supabase
      .from('app_settings')
      .upsert({ 
        key: 'ab_traffic_split_percent_b', 
        value: clampedPercent,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });
    
    if (error) {
      console.error('[ABTesting] Failed to save traffic split to database:', error);
    } else {
      console.log(`[ABTesting] Traffic split saved to database: ${100 - clampedPercent}% A / ${clampedPercent}% B`);
    }
  } catch (e) {
    console.error('[ABTesting] Error saving traffic split:', e);
  }
}

/**
 * Get the current traffic split percentage for Variant B (from memory)
 */
export function getTrafficSplit(): number {
  return AB_TEST_CONFIG.splitPercentB;
}

/**
 * Fetch the traffic split from the database and update in-memory config
 * Call this on app initialization and when admin UI loads
 */
export async function fetchTrafficSplitFromDB(): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'ab_traffic_split_percent_b')
      .single();
    
    if (error) {
      console.warn('[ABTesting] Could not fetch traffic split from DB, using default:', error.message);
      return AB_TEST_CONFIG.splitPercentB;
    }
    
    const parsed = typeof data.value === 'number' ? data.value : parseInt(String(data.value), 10);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
      AB_TEST_CONFIG.splitPercentB = parsed;
      console.log(`[ABTesting] Loaded traffic split from database: ${100 - parsed}% A / ${parsed}% B`);
      return parsed;
    }
  } catch (e) {
    console.error('[ABTesting] Error fetching traffic split:', e);
  }
  return AB_TEST_CONFIG.splitPercentB;
}

// Initialize enabled state from localStorage on load (enabled toggle stays local for quick access)
// Traffic split is now fetched from database - see fetchTrafficSplitFromDB()
if (typeof window !== 'undefined') {
  try {
    const storedEnabled = localStorage.getItem('rbn_ab_test_enabled');
    if (storedEnabled !== null) {
      AB_TEST_CONFIG.enabled = storedEnabled === 'true';
    }
    // Fetch traffic split from database on module load
    fetchTrafficSplitFromDB();
  } catch {
    // Ignore
  }
}

// ============================================================================
// COOKIE UTILITIES
// ============================================================================

/**
 * Read a cookie by name
 */
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  try {
    const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
    return match ? decodeURIComponent(match[2]) : null;
  } catch {
    return null;
  }
}

/**
 * Set a cookie with specified expiry
 */
function setCookie(name: string, value: string, days: number): void {
  if (typeof document === 'undefined') return;
  try {
    const maxAge = days * 24 * 60 * 60; // days in seconds
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/; SameSite=Lax${secure}`;
  } catch (e) {
    console.warn('[ABTesting] Cookie write failed:', e);
  }
}

// ============================================================================
// VARIANT ASSIGNMENT
// ============================================================================

/**
 * Get or assign A/B variant (called EARLY before any render)
 * Uses cookie for persistence, localStorage as backup
 * 
 * CRITICAL: This function is synchronous and must not cause flicker
 */
export function getOrAssignVariant(): ABVariant {
  // If A/B testing disabled, always return A
  if (!AB_TEST_CONFIG.enabled) {
    return 'A';
  }

  // 1. Check cookie first (primary source)
  let variant = getCookie(AB_COOKIE_NAME) as ABVariant | null;
  
  // 2. Fallback to localStorage
  if (!variant && typeof localStorage !== 'undefined') {
    try {
      variant = localStorage.getItem(AB_STORAGE_KEY) as ABVariant | null;
    } catch {
      // localStorage might be blocked
    }
  }
  
  // 3. If no existing assignment, randomly assign based on split percentage
  if (!variant || (variant !== 'A' && variant !== 'B')) {
    // splitPercentB is % to B, so random < (splitPercentB/100) goes to B
    variant = Math.random() < (AB_TEST_CONFIG.splitPercentB / 100) ? 'B' : 'A';
    
    // Persist to both storage mechanisms
    setCookie(AB_COOKIE_NAME, variant, AB_COOKIE_DAYS);
    try {
      localStorage.setItem(AB_STORAGE_KEY, variant);
    } catch {
      // localStorage might be blocked
    }
    
    console.log(`[ABTesting] New variant assigned: ${variant}`);
  }
  
  return variant;
}

/**
 * Force a specific variant (for testing/debugging)
 */
export function forceVariant(variant: ABVariant): void {
  setCookie(AB_COOKIE_NAME, variant, AB_COOKIE_DAYS);
  try {
    localStorage.setItem(AB_STORAGE_KEY, variant);
  } catch {
    // Ignore
  }
  console.log(`[ABTesting] Variant forced to: ${variant}`);
}

/**
 * Clear variant assignment (for testing)
 */
export function clearVariant(): void {
  // Clear cookie
  if (typeof document !== 'undefined') {
    document.cookie = `${AB_COOKIE_NAME}=; Max-Age=0; Path=/`;
  }
  // Clear localStorage
  try {
    localStorage.removeItem(AB_STORAGE_KEY);
  } catch {
    // Ignore
  }
  console.log('[ABTesting] Variant cleared');
}

/**
 * Get current variant without assigning (for reading only)
 */
export function getCurrentVariant(): ABVariant | null {
  const cookie = getCookie(AB_COOKIE_NAME) as ABVariant | null;
  if (cookie === 'A' || cookie === 'B') return cookie;
  
  try {
    const stored = localStorage.getItem(AB_STORAGE_KEY) as ABVariant | null;
    if (stored === 'A' || stored === 'B') return stored;
  } catch {
    // Ignore
  }
  
  return null;
}

// ============================================================================
// SESSION ID (reuse existing analytics session)
// ============================================================================

export function getSessionId(): string {
  try {
    let sessionId = sessionStorage.getItem('analytics_session_id');
    if (!sessionId) {
      sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      sessionStorage.setItem('analytics_session_id', sessionId);
    }
    return sessionId;
  } catch {
    return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}

// ============================================================================
// EVENT TRACKING
// ============================================================================

export type ABEventName = 
  | 'page_view'
  | 'add_to_cart'
  | 'initiate_checkout'
  | 'checkout_started'
  | 'purchase';

interface TrackABEventParams {
  eventName: ABEventName;
  revenue?: number;
  payload?: Record<string, unknown>;
}

// Track which events have been sent this session to prevent duplicates
const trackedEventsThisSession = new Set<string>();

/**
 * Track an A/B test event to Supabase
 * Fire-and-forget, never blocks UI
 * Deduplicates events per session to prevent double-tracking
 */
export async function trackABEvent(params: TrackABEventParams): Promise<void> {
  const { eventName, revenue, payload = {} } = params;
  
  const variant = getOrAssignVariant();
  const sessionId = getSessionId();
  
  // Create a unique key for this event type in this session
  // We allow multiple add_to_cart events (different products) but dedupe same-source calls
  const source = (payload as Record<string, unknown>).source || 'unknown';
  const productId = (payload as Record<string, unknown>).productId || '';
  const dedupeKey = `${sessionId}:${eventName}:${source}:${productId}`;
  
  // Skip if we've already tracked this exact event
  if (trackedEventsThisSession.has(dedupeKey)) {
    console.log(`[ABTesting] Skipping duplicate event: ${eventName} (source: ${source})`);
    return;
  }
  
  trackedEventsThisSession.add(dedupeKey);
  
  try {
    const { error } = await supabase
      .from('ab_events')
      .insert({
        event_name: eventName,
        session_id: sessionId,
        ab_variant: variant,
        revenue: revenue ?? null,
        payload: {
          ...payload,
          url: window.location.href,
          referrer: document.referrer || null,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        },
      });
    
    if (error) {
      console.warn('[ABTesting] Failed to track event:', error.message);
      // Remove from tracked set so it can be retried
      trackedEventsThisSession.delete(dedupeKey);
    } else {
      console.log(`[ABTesting] Event tracked: ${eventName} (Variant ${variant})`);
    }
  } catch (e) {
    console.warn('[ABTesting] Event tracking error:', e);
    trackedEventsThisSession.delete(dedupeKey);
  }
}

// ============================================================================
// PIXEL INTEGRATION HELPERS
// ============================================================================

/**
 * Get content_category value for Meta Pixel
 * Format: "AB_A" or "AB_B"
 */
export function getMetaPixelVariant(): string {
  const variant = getOrAssignVariant();
  return `AB_${variant}`;
}

/**
 * Get variant properties for TikTok Pixel
 */
export function getTikTokVariantProperties(): Record<string, string> {
  const variant = getOrAssignVariant();
  return {
    ab_variant: variant,
    ab_test: AB_TEST_CONFIG.testName,
  };
}

/**
 * Get variant data for Pinterest
 * Should be merged with existing pinterest_context
 */
export function getPinterestVariantData(): Record<string, string> {
  const variant = getOrAssignVariant();
  return {
    ab_variant: variant,
    ab_test: AB_TEST_CONFIG.testName,
  };
}

/**
 * Set Clarity custom tag for A/B variant
 */
export function setClarityVariantTag(): void {
  try {
    if (typeof window !== 'undefined' && typeof (window as any).clarity === 'function') {
      const variant = getOrAssignVariant();
      (window as any).clarity('set', 'ab_variant', variant);
      (window as any).clarity('set', 'ab_test', AB_TEST_CONFIG.testName);
      console.log(`[ABTesting] Clarity tag set: ${variant}`);
    }
  } catch (e) {
    console.warn('[ABTesting] Clarity tag failed:', e);
  }
}

// ============================================================================
// DEBUG UTILITIES
// ============================================================================

export interface ABDebugInfo {
  enabled: boolean;
  testName: string;
  splitPercentB: number;
  currentVariant: ABVariant | null;
  sessionId: string;
  cookieValue: string | null;
  localStorageValue: string | null;
}

/**
 * Get debug information about current A/B test state
 */
export function getABDebugInfo(): ABDebugInfo {
  return {
    enabled: AB_TEST_CONFIG.enabled,
    testName: AB_TEST_CONFIG.testName,
    splitPercentB: AB_TEST_CONFIG.splitPercentB,
    currentVariant: getCurrentVariant(),
    sessionId: getSessionId(),
    cookieValue: getCookie(AB_COOKIE_NAME),
    localStorageValue: (() => {
      try {
        return localStorage.getItem(AB_STORAGE_KEY);
      } catch {
        return null;
      }
    })(),
  };
}

// ============================================================================
// EARLY INITIALIZATION
// ============================================================================

/**
 * Initialize A/B testing on app load
 * Called very early to ensure variant is assigned before any render
 */
export function initABTesting(): ABVariant {
  const variant = getOrAssignVariant();
  
  // Set Clarity tag immediately
  setClarityVariantTag();
  
  // Log for debugging
  if (typeof window !== 'undefined') {
    (window as any).__abVariant = variant;
    (window as any).__abDebug = getABDebugInfo;
  }
  
  return variant;
}
