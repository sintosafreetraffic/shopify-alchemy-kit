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
      // Meta cookies for server-side CAPI enrichment
      meta_fbc: attribution.fbc || undefined,
      meta_fbp: attribution.fbp || undefined,
    };
    // Get Supabase URL from env
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      console.warn('[ContextTracking] VITE_SUPABASE_URL not configured');
      return;
    }
    
    // Fire and forget - don't await to avoid blocking
    // Use keepalive to ensure request completes during navigation
    fetch(`${supabaseUrl}/functions/v1/track-context`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      keepalive: true,
    })
      .then((response) => {
        if (!response.ok) {
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
    // Use keepalive to ensure request completes during navigation
    fetch(`${supabaseUrl}/functions/v1/track-context`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      keepalive: true,
    })
      .then((response) => {
        if (!response.ok) {
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
 * Send email to track-context for CAPI enrichment
 * Called when user identifies themselves (email popup, quiz, etc.)
 * This ensures CAPI events (checkout) have access to email hash
 * 
 * @param email - Raw email to be hashed server-side
 */
export async function captureEmail(email: string): Promise<void> {
  try {
    if (typeof window === 'undefined' || !email) return;
    
    const contextId = getContextId();
    if (!contextId) {
      console.warn('[ContextTracking] No context_id for email capture');
      return;
    }
    
    const consentStatus = getConsentStatus();
    
    const payload = {
      context_id: contextId,
      consent_status: consentStatus,
      email: email.trim().toLowerCase(),
    };
    
    console.log('[ContextTracking] Sending email to context:', {
      context_id: contextId,
      has_email: true,
    });
    
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      console.warn('[ContextTracking] VITE_SUPABASE_URL not configured');
      return;
    }
    
    // Fire and forget with keepalive
    fetch(`${supabaseUrl}/functions/v1/track-context`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      keepalive: true,
    })
      .then((response) => {
        if (!response.ok) {
          console.warn('[ContextTracking] Email capture response not ok:', response.status);
        }
      })
      .catch((error) => {
        console.warn('[ContextTracking] Email capture failed:', error);
      });
  } catch (e) {
    console.warn('[ContextTracking] captureEmail error:', e);
  }
}

// Track if Meta cookies have been successfully synced to DB
let metaCookiesSynced = false;
let fbpPollingInterval: ReturnType<typeof setInterval> | null = null;

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
    
    // EVENT-DRIVEN META COOKIE SYNC
    // 1. If fbclid exists in URL, _fbc was already constructed - sync immediately
    const urlParams = new URLSearchParams(window.location.search);
    const hasFbclid = urlParams.has('fbclid');
    
    if (hasFbclid) {
      // _fbc should already be constructed by attribution.ts - sync now
      syncMetaCookiesImmediate('fbclid_present');
    }
    
    // 2. Start polling for _fbp (created after pixel loads)
    startFbpPolling();
    
    // 3. Listen for fbq initialization (event-driven backup)
    listenForPixelLoad();
    
  } catch (e) {
    console.warn('[ContextTracking] init error:', e);
  }
}

/**
 * Sync Meta cookies to DB immediately (for fbclid cases)
 */
function syncMetaCookiesImmediate(reason: string): void {
  const attribution = getAttribution();
  if (attribution.fbc) {
    captureMetaCookiesOnly(reason);
  }
}

/**
 * Poll for _fbp cookie availability (created after pixel loads)
 * Stops once _fbp is found and synced, or after max attempts
 */
function startFbpPolling(): void {
  if (metaCookiesSynced) return;
  
  let attempts = 0;
  const maxAttempts = 15; // ~15 seconds max
  const pollInterval = 1000; // Check every 1s
  
  fbpPollingInterval = setInterval(() => {
    attempts++;
    
    const attribution = getAttribution();
    
    // Found _fbp - sync and stop
    if (attribution.fbp) {
      captureMetaCookiesOnly('fbp_found');
      metaCookiesSynced = true;
      if (fbpPollingInterval) {
        clearInterval(fbpPollingInterval);
        fbpPollingInterval = null;
      }
      return;
    }
    
    // Also sync if we have _fbc but haven't synced yet
    if (attribution.fbc && !metaCookiesSynced) {
      captureMetaCookiesOnly('fbc_found_during_poll');
    }
    
    // Max attempts reached
    if (attempts >= maxAttempts) {
      if (fbpPollingInterval) {
        clearInterval(fbpPollingInterval);
        fbpPollingInterval = null;
      }
      // Final sync attempt with whatever we have
      if ((attribution.fbc || attribution.fbp) && !metaCookiesSynced) {
        captureMetaCookiesOnly('max_attempts_final');
        metaCookiesSynced = true;
      }
    }
  }, pollInterval);
}

/**
 * Listen for Meta Pixel initialization (fbq ready)
 * Triggers sync when pixel is loaded
 */
function listenForPixelLoad(): void {
  if (typeof window === 'undefined') return;
  
  // Check if fbq is already loaded
  if (typeof (window as any).fbq === 'function') {
    // Pixel already loaded - check for cookies after short delay
    setTimeout(() => {
      if (!metaCookiesSynced) {
        const attribution = getAttribution();
        if (attribution.fbc || attribution.fbp) {
          captureMetaCookiesOnly('fbq_already_loaded');
          metaCookiesSynced = true;
        }
      }
    }, 500);
    return;
  }
  
  // Watch for fbq to become available
  let checkCount = 0;
  const maxChecks = 20; // 10 seconds
  const fbqWatcher = setInterval(() => {
    checkCount++;
    
    if (typeof (window as any).fbq === 'function') {
      clearInterval(fbqWatcher);
      // Pixel just loaded - cookies should be available soon
      setTimeout(() => {
        if (!metaCookiesSynced) {
          const attribution = getAttribution();
          if (attribution.fbc || attribution.fbp) {
            captureMetaCookiesOnly('fbq_loaded');
            metaCookiesSynced = true;
          }
        }
      }, 500);
    }
    
    if (checkCount >= maxChecks) {
      clearInterval(fbqWatcher);
    }
  }, 500);
}

/**
 * Lightweight capture specifically for Meta cookies
 * Called when _fbc/_fbp become available
 * Uses keepalive: true to survive navigation to checkout
 */
async function captureMetaCookiesOnly(reason?: string): Promise<void> {
  try {
    if (typeof window === 'undefined') return;
    
    const contextId = getContextId();
    if (!contextId) return;
    
    const attribution = getAttribution();
    
    // Only proceed if we have Meta cookies to sync
    if (!attribution.fbc && !attribution.fbp) return;
    
    const consentStatus = getConsentStatus();
    
    const payload = {
      context_id: contextId,
      consent_status: consentStatus,
      meta_fbc: attribution.fbc || undefined,
      meta_fbp: attribution.fbp || undefined,
    };
    
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) return;
    
    // Use keepalive to ensure request completes even during navigation
    fetch(`${supabaseUrl}/functions/v1/track-context`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Silent fail
  }
}
