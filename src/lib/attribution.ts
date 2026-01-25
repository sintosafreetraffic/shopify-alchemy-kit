/**
 * Attribution capture and retrieval utility
 * Central source of truth for Pinterest epik, UTM data, and A/B testing variant
 * 
 * Storage strategy:
 * - First-party cookie (_epik): SameSite=Lax, path=/, 30 day expiry
 * - localStorage: pinterest_epik, pinterest_landing_page, utm_* keys
 * - First-touch model: never overwrite existing values
 */

import { getContextId } from '@/lib/contextTracking';
import { getCurrentVariant, getSessionId as getABSessionId } from '@/lib/abTesting';

// Storage keys
const EPIK_COOKIE_NAME = '_epik';
const EPIK_STORAGE_KEY = 'pinterest_epik';
const LANDING_PAGE_KEY = 'pinterest_landing_page';
const REFERRAL_CODE_KEY = 'rbn_ref_code';
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;

// Meta (Facebook) cookie names - these are set by the Meta Pixel
const META_FBC_COOKIE = '_fbc';  // Click ID from ad clicks
const META_FBP_COOKIE = '_fbp';  // Browser ID (persistent)

// Google Click ID storage key
const GCLID_STORAGE_KEY = 'google_gclid';

// Cookie expiry: 30 days
const COOKIE_MAX_AGE_DAYS = 30;

export interface Attribution {
  epik: string | null;
  landing_page: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  ref_code: string | null;
  // Meta (Facebook) cookies for server-side tracking
  fbc: string | null;  // Meta click ID
  fbp: string | null;  // Meta browser ID
  // Google Click ID for Enhanced Conversions
  gclid: string | null;
}

/**
 * Safely read a cookie by name
 */
function getCookie(name: string): string | null {
  try {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
    return match ? decodeURIComponent(match[2]) : null;
  } catch {
    return null;
  }
}

/**
 * Safely set a cookie with proper attributes
 */
function setCookie(name: string, value: string, maxAgeDays: number): void {
  try {
    if (typeof document === 'undefined') return;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + maxAgeDays);
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax${secure}`;
  } catch (e) {
    console.warn('[Attribution] Cookie write failed:', e);
  }
}

/**
 * Safely read from localStorage
 */
function getStorage(key: string): string | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Safely write to localStorage (first-touch: don't overwrite)
 */
function setStorageIfEmpty(key: string, value: string): void {
  try {
    if (typeof localStorage === 'undefined') return;
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, value);
    }
  } catch (e) {
    console.warn('[Attribution] localStorage write failed:', e);
  }
}

/**
 * Force-set storage (used for epik which must be set regardless)
 */
function setStorage(key: string, value: string): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn('[Attribution] localStorage write failed:', e);
  }
}

/**
 * Capture Pinterest click ID (_ep or epik parameter)
 * Should be called on landing and on route changes if query contains _ep
 * 
 * Storage: both cookie AND localStorage for resilience
 * First-touch: landing page only set once
 */
export function captureAttribution(): void {
  try {
    if (typeof window === 'undefined') return;

    const urlParams = new URLSearchParams(window.location.search);
    
    // Capture epik from URL params
    const epik = urlParams.get('_ep') || urlParams.get('epik');
    
    if (epik) {
      // Always update epik (latest click takes precedence for Pinterest)
      setCookie(EPIK_COOKIE_NAME, epik, COOKIE_MAX_AGE_DAYS);
      setStorage(EPIK_STORAGE_KEY, epik);
      console.log('[Attribution] Pinterest click ID captured:', epik);
    }
    
    // Capture Google Click ID (gclid) from URL params
    const gclid = urlParams.get('gclid');
    if (gclid) {
      setStorageIfEmpty(GCLID_STORAGE_KEY, gclid);
      console.log('[Attribution] Google Click ID captured:', gclid);
    }
    
    // Capture affiliate referral code (first-touch: don't overwrite)
    // This is CRITICAL for affiliate commission tracking
    const refCode = urlParams.get('ref');
    if (refCode) {
      setStorageIfEmpty(REFERRAL_CODE_KEY, refCode);
      // Also store in sessionStorage for auth flow compatibility
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('referral_code', refCode);
      }
      console.log('[Attribution] Affiliate referral code captured:', refCode);
    }
    
    // Capture landing page (first-touch only)
    const existingLanding = getStorage(LANDING_PAGE_KEY);
    if (!existingLanding) {
      setStorage(LANDING_PAGE_KEY, window.location.href);
      console.log('[Attribution] Landing page captured:', window.location.href);
    }
    
    // Capture UTMs (first-touch only)
    for (const key of UTM_KEYS) {
      const value = urlParams.get(key);
      if (value) {
        setStorageIfEmpty(key, value);
      }
    }
  } catch (e) {
    // Never throw - tracking failures must be silent
    console.warn('[Attribution] Capture failed:', e);
  }
}

/**
 * Check if URL contains Pinterest attribution params
 */
export function hasAttributionParams(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    const urlParams = new URLSearchParams(window.location.search);
    return !!(urlParams.get('_ep') || urlParams.get('epik'));
  } catch {
    return false;
  }
}

/**
 * Get all attribution data with fallbacks
 * Priority: cookie -> localStorage for epik
 */
export function getAttribution(): Attribution {
  try {
    // epik: prefer cookie, fallback to localStorage
    const epik = getCookie(EPIK_COOKIE_NAME) || getStorage(EPIK_STORAGE_KEY);
    
    // ref_code: prefer localStorage, fallback to sessionStorage
    let refCode = getStorage(REFERRAL_CODE_KEY);
    if (!refCode && typeof sessionStorage !== 'undefined') {
      refCode = sessionStorage.getItem('referral_code');
    }
    
    // Meta cookies - these are set by Meta Pixel and needed for server-side matching
    const fbc = getCookie(META_FBC_COOKIE);
    const fbp = getCookie(META_FBP_COOKIE);
    
    // Google Click ID from localStorage
    const gclid = getStorage(GCLID_STORAGE_KEY);
    
    return {
      epik,
      landing_page: getStorage(LANDING_PAGE_KEY),
      utm_source: getStorage('utm_source'),
      utm_medium: getStorage('utm_medium'),
      utm_campaign: getStorage('utm_campaign'),
      utm_content: getStorage('utm_content'),
      utm_term: getStorage('utm_term'),
      ref_code: refCode,
      fbc,
      fbp,
      gclid,
    };
  } catch {
    // Return empty attribution on any error
    return {
      epik: null,
      landing_page: null,
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      utm_content: null,
      utm_term: null,
      ref_code: null,
      fbc: null,
      fbp: null,
      gclid: null,
    };
  }
}
export function getEpik(): string | null {
  try {
    return getCookie(EPIK_COOKIE_NAME) || getStorage(EPIK_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Build cart attributes array for Shopify checkout
 * Returns array of {key, value} objects for cart attributes
 * 
 * CRITICAL: Always includes rbn_context_id for Pinterest CAPI enrichment
 * Failure to get context_id should NEVER block checkout
 */
export function getAttributionForCheckout(): Array<{ key: string; value: string }> {
  try {
    const attribution = getAttribution();
    const attributes: Array<{ key: string; value: string }> = [];
    
    // Add context_id for Pinterest CAPI enrichment (first, most important)
    try {
      const contextId = getContextId();
      if (contextId) {
        attributes.push({ key: 'rbn_context_id', value: contextId });
      }
    } catch {
      // Never block checkout if context_id fails
    }
    
    // CRITICAL: Add A/B test variant and session for conversion tracking
    // This enables purchase attribution to the correct A/B variant
    try {
      const abVariant = getCurrentVariant();
      if (abVariant) {
        attributes.push({ key: 'rbn_ab_variant', value: abVariant });
      }
      const abSessionId = getABSessionId();
      if (abSessionId) {
        attributes.push({ key: 'rbn_ab_session_id', value: abSessionId });
      }
    } catch {
      // Never block checkout if A/B tracking fails
    }
    
    // CRITICAL: Add affiliate referral code for commission tracking
    // This enables 40-60% of affiliate-attributable sales
    if (attribution.ref_code) {
      attributes.push({ key: 'rbn_ref_code', value: attribution.ref_code });
      console.log('[Attribution] Affiliate ref_code added to checkout:', attribution.ref_code);
    }
    
    if (attribution.epik) {
      // Primary key for webhook extraction
      attributes.push({ key: '_pinterest_click_id', value: attribution.epik });
      // Legacy keys for backward compatibility
      attributes.push({ key: '_ep', value: attribution.epik });
      attributes.push({ key: 'pinterest_click_id', value: attribution.epik });
    }
    
    if (attribution.landing_page) {
      attributes.push({ key: '_pinterest_landing_page', value: attribution.landing_page });
      attributes.push({ key: 'pinterest_landing_page', value: attribution.landing_page });
    }
    
    if (attribution.utm_source) {
      attributes.push({ key: '_utm_source', value: attribution.utm_source });
    }
    
    if (attribution.utm_medium) {
      attributes.push({ key: '_utm_medium', value: attribution.utm_medium });
    }
    
    if (attribution.utm_campaign) {
      attributes.push({ key: '_utm_campaign', value: attribution.utm_campaign });
    }
    
    if (attribution.utm_content) {
      attributes.push({ key: '_utm_content', value: attribution.utm_content });
    }
    
    if (attribution.utm_term) {
      attributes.push({ key: '_utm_term', value: attribution.utm_term });
    }
    
    // Add referrer if available
    if (typeof document !== 'undefined' && document.referrer) {
      attributes.push({ key: '_referrer', value: document.referrer });
    }
    
    // Meta (Facebook) cookies for server-side Conversions API
    if (attribution.fbc) {
      attributes.push({ key: '_fbc', value: attribution.fbc });
    }
    if (attribution.fbp) {
      attributes.push({ key: '_fbp', value: attribution.fbp });
    }
    
    // Google Click ID for Enhanced Conversions
    if (attribution.gclid) {
      attributes.push({ key: '_gclid', value: attribution.gclid });
    }
    
    return attributes;
  } catch {
    // Return empty array on any error - never block checkout
    return [];
  }
}

/**
 * Get affiliate referral code only (for dashboard displays)
 */
export function getRefCode(): string | null {
  try {
    return getStorage(REFERRAL_CODE_KEY) || 
      (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('referral_code') : null);
  } catch {
    return null;
  }
}
