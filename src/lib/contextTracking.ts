/**
 * Context Tracking for Pinterest CAPI enrichment
 * 
 * Captures and persists a durable context_id that flows through checkout
 * to Shopify webhook, enabling IP/UA enrichment for Pinterest match rate.
 * 
 * Storage strategy:
 * - Primary: localStorage 'rbn_context_id'
 * - Fallback: cookie 'rbn_context_id' (30-day expiry, SameSite=Lax, Path=/)
 * 
 * Session rate limiting:
 * - Uses sessionStorage flag to avoid redundant calls
 * - Exception: always capture when URL has attribution params
 */

import { getAttribution, hasAttributionParams, getEpik } from './attribution';
import { getConsentStatus } from './consent';

// Storage keys
const CONTEXT_ID_STORAGE_KEY = 'rbn_context_id';
const CONTEXT_SENT_FLAG = 'rbn_context_sent';
const COOKIE_MAX_AGE_DAYS = 30;

/**
 * Read context_id from cookie
 */
export function getContextIdFromCookie(): string | null {
  try {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(new RegExp(`(^| )${CONTEXT_ID_STORAGE_KEY}=([^;]+)`));
    return match ? decodeURIComponent(match[2]) : null;
  } catch {
    return null;
  }
}

/**
 * Set context_id cookie with proper attributes
 * Path=/ ensures accessibility across all routes
 */
export function setContextIdCookie(contextId: string): void {
  try {
    if (typeof document === 'undefined') return;
    const maxAge = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60; // 30 days in seconds
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${CONTEXT_ID_STORAGE_KEY}=${encodeURIComponent(contextId)}; Max-Age=${maxAge}; Path=/; SameSite=Lax${secure}`;
  } catch (e) {
    console.warn('[ContextTracking] Cookie write failed:', e);
  }
}

/**
 * Generate a unique context ID
 * Primary: crypto.randomUUID()
 * Fallback: timestamp + random string
 */
function generateContextId(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch {
    // Fallback if crypto.randomUUID is not available
  }
  
  // Fallback: timestamp base36 + random base36
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

/**
 * Get or create a durable context ID
 * Checks localStorage first, then cookie, generates if neither exists
 * Persists to both storage mechanisms for resilience
 */
export function getOrCreateContextId(): string | null {
  try {
    if (typeof window === 'undefined') return null;
    
    // Try localStorage first
    let contextId = localStorage.getItem(CONTEXT_ID_STORAGE_KEY);
    
    // Fallback to cookie
    if (!contextId) {
      contextId = getContextIdFromCookie();
      // If found in cookie but not localStorage, sync to localStorage
      if (contextId) {
        try {
          localStorage.setItem(CONTEXT_ID_STORAGE_KEY, contextId);
        } catch {
          // localStorage might be full or blocked
        }
      }
    }
    
    // Generate new if neither exists
    if (!contextId) {
      contextId = generateContextId();
      
      // Persist to both storage mechanisms
      try {
        localStorage.setItem(CONTEXT_ID_STORAGE_KEY, contextId);
      } catch {
        // localStorage might be full or blocked
      }
      setContextIdCookie(contextId);
      
      console.log('[ContextTracking] New context_id generated:', contextId);
    }
    
    return contextId;
  } catch (e) {
    console.warn('[ContextTracking] getOrCreateContextId failed:', e);
    return null;
  }
}

/**
 * Get context_id if it exists (without creating one)
 * Used for diagnostics and checkout attribute building
 */
export function getContextId(): string | null {
  try {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(CONTEXT_ID_STORAGE_KEY) || getContextIdFromCookie();
  } catch {
    return null;
  }
}

/**
 * Check if context has already been sent this session
 */
function hasContextBeenSent(): boolean {
  try {
    return sessionStorage.getItem(CONTEXT_SENT_FLAG) === '1';
  } catch {
    return false;
  }
}

/**
 * Mark context as sent for this session
 */
function markContextSent(): void {
  try {
    sessionStorage.setItem(CONTEXT_SENT_FLAG, '1');
  } catch {
    // sessionStorage might be blocked
  }
}

/**
 * Capture and send context to edge function
 * 
 * Rate limiting:
 * - Skip if already sent this session AND no new attribution params
 * - Always send if URL has attribution params (user may have new epik)
 * 
 * Silent fail - never throws
 */
export async function captureContext(): Promise<void> {
  try {
    if (typeof window === 'undefined') return;
    
    const hasNewAttribution = hasAttributionParams();
    
    // Skip if already sent this session and no new attribution
    if (hasContextBeenSent() && !hasNewAttribution) {
      console.debug('[ContextTracking] Skipping - already sent this session');
      return;
    }
    
    // Get or create context ID
    const contextId = getOrCreateContextId();
    if (!contextId) {
      console.warn('[ContextTracking] Failed to get/create context_id');
      return;
    }
    
    // Get consent status
    const consentStatus = getConsentStatus();
    
    // Get attribution data
    const attribution = getAttribution();
    const epik = getEpik();
    
    // Build payload
    const payload = {
      context_id: contextId,
      consent_status: consentStatus,
      epik: epik || undefined,
      landing_page: attribution.landing_page || undefined,
      utm_source: attribution.utm_source || undefined,
      utm_medium: attribution.utm_medium || undefined,
      utm_campaign: attribution.utm_campaign || undefined,
      utm_content: attribution.utm_content || undefined,
      utm_term: attribution.utm_term || undefined,
      referrer: typeof document !== 'undefined' ? document.referrer || undefined : undefined,
    };
    
    console.log('[ContextTracking] Sending context:', {
      context_id: contextId,
      consent_status: consentStatus,
      has_epik: !!epik,
      has_utm_source: !!attribution.utm_source,
    });
    
    // Get Supabase URL from env
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      console.warn('[ContextTracking] VITE_SUPABASE_URL not configured');
      return;
    }
    
    // Fire and forget - don't await to avoid blocking
    fetch(`${supabaseUrl}/functions/v1/track-context`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
      .then((response) => {
        if (response.ok) {
          console.log('[ContextTracking] ✅ Context captured successfully');
        } else {
          console.warn('[ContextTracking] Response not ok:', response.status);
        }
      })
      .catch((error) => {
        // Silent fail
        console.warn('[ContextTracking] Capture failed (non-blocking):', error);
      });
    
    // Mark as sent regardless of response (to avoid spamming)
    markContextSent();
    
  } catch (e) {
    // Never throw - tracking failures must be silent
    console.warn('[ContextTracking] captureContext error:', e);
  }
}

/**
 * Capture context specifically for consent changes.
 * BYPASSES the session rate-limit flag to ensure IP/UA is immediately captured/cleared.
 * 
 * @param options.bypassRateLimit - Always true for consent changes
 */
export async function captureContextOnConsentChange(options?: { bypassRateLimit?: boolean }): Promise<void> {
  try {
    if (typeof window === 'undefined') return;
    
    // Get or create context ID
    const contextId = getOrCreateContextId();
    if (!contextId) {
      console.warn('[ContextTracking] Failed to get/create context_id for consent change');
      return;
    }
    
    // Get current consent status
    const consentStatus = getConsentStatus();
    
    // Get attribution data
    const attribution = getAttribution();
    const epik = getEpik();
    
    // Build payload
    const payload = {
      context_id: contextId,
      consent_status: consentStatus,
      epik: epik || undefined,
      landing_page: attribution.landing_page || undefined,
      utm_source: attribution.utm_source || undefined,
      utm_medium: attribution.utm_medium || undefined,
      utm_campaign: attribution.utm_campaign || undefined,
      utm_content: attribution.utm_content || undefined,
      utm_term: attribution.utm_term || undefined,
      referrer: typeof document !== 'undefined' ? document.referrer || undefined : undefined,
    };
    
    console.log('[ContextTracking] Consent change capture:', {
      context_id: contextId,
      consent_status: consentStatus,
      reason: 'consent_change',
      bypass_rate_limit: options?.bypassRateLimit ?? true,
    });
    
    // Get Supabase URL from env
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      console.warn('[ContextTracking] VITE_SUPABASE_URL not configured');
      return;
    }
    
    // Fire and forget - don't await to avoid blocking UI
    fetch(`${supabaseUrl}/functions/v1/track-context`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
      .then((response) => {
        if (response.ok) {
          console.log('[ContextTracking] ✅ Consent change context captured');
        } else {
          console.warn('[ContextTracking] Consent change capture response not ok:', response.status);
        }
      })
      .catch((error) => {
        // Silent fail
        console.warn('[ContextTracking] Consent change capture failed (non-blocking):', error);
      });
    
    // NOTE: We do NOT mark context as sent here - consent changes should always go through
    // This bypasses the rate limit intentionally
    
  } catch (e) {
    // Never throw - tracking failures must be silent
    console.warn('[ContextTracking] captureContextOnConsentChange error:', e);
  }
}

/**
 * Initialize context tracking on app load
 * Should be called once on app init
 */
export function initializeContextTracking(): void {
  try {
    // Ensure context_id exists
    getOrCreateContextId();
    
    // Capture context on init
    captureContext();
  } catch (e) {
    console.warn('[ContextTracking] init error:', e);
  }
}
