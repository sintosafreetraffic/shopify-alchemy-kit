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

export type ABVariant = 'A' | 'B';

export interface ABConfig {
  enabled: boolean;
  testName: string;
  variants: {
    A: { name: string; description: string };
    B: { name: string; description: string };
  };
}

// Master A/B test configuration
export const AB_TEST_CONFIG: ABConfig = {
  enabled: true, // Set to false to disable all A/B testing
  testName: 'urgency_test_v1',
  variants: {
    A: { name: 'Control', description: 'Current product page' },
    B: { name: 'Urgency', description: 'High-urgency elements enabled' },
  },
};

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
  
  // 3. If no existing assignment, randomly assign 50/50
  if (!variant || (variant !== 'A' && variant !== 'B')) {
    variant = Math.random() < 0.5 ? 'A' : 'B';
    
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

function getSessionId(): string {
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

/**
 * Track an A/B test event to Supabase
 * Fire-and-forget, never blocks UI
 */
export async function trackABEvent(params: TrackABEventParams): Promise<void> {
  const { eventName, revenue, payload = {} } = params;
  
  const variant = getOrAssignVariant();
  const sessionId = getSessionId();
  
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
    } else {
      console.log(`[ABTesting] Event tracked: ${eventName} (Variant ${variant})`);
    }
  } catch (e) {
    console.warn('[ABTesting] Event tracking error:', e);
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
