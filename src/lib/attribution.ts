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

// Meta localStorage fallback keys (for cross-session recovery)
const META_FBC_STORAGE_KEY = 'meta_fbc';
const META_FBP_STORAGE_KEY = 'meta_fbp';

// Google Click ID storage key
const GCLID_STORAGE_KEY = 'google_gclid';

// TBLS (The Big Landing Store) attribution keys
const TBLS_PAGE_ID_KEY = 'tbls_page_id';
const TBLS_PIN_ID_KEY = 'tbls_pin_id';
const TBLS_TEMPLATE_KEY = 'tbls_template';
const TBLS_SUBDOMAIN_KEY = 'tbls_subdomain';
const TBLS_CATEGORY_KEY = 'tbls_category';

// Cookie expiry: 30 days for most, 90 days for Meta (per their standard)
const COOKIE_MAX_AGE_DAYS = 30;
const META_COOKIE_MAX_AGE_DAYS = 90;

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
  // TBLS (The Big Landing Store) attribution
  tbls_page_id: string | null;
  tbls_pin_id: string | null;
  tbls_template: string | null;
  tbls_subdomain: string | null;
  tbls_category: string | null;
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
 * Get the parent domain for cross-subdomain cookie sharing
 * e.g., .risebynight.com from checkout.risebynight.com
 */
function getParentDomain(): string | null {
  try {
    const hostname = window.location.hostname;
    // Skip domain attribute for localhost or IP addresses
    if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
      return null;
    }
    // For lovable.app preview domains, skip domain attribute
    if (hostname.includes('lovable.app')) {
      return null;
    }
    // Extract parent domain (e.g., .risebynight.com)
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      return '.' + parts.slice(-2).join('.');
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Safely set a cookie with proper attributes
 * Uses parent domain for cross-subdomain sharing (checkout.risebynight.com can read cookies)
 */
function setCookie(name: string, value: string, maxAgeDays: number): void {
  try {
    if (typeof document === 'undefined') return;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + maxAgeDays);
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    const parentDomain = getParentDomain();
    const domainAttr = parentDomain ? `; domain=${parentDomain}` : '';
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expiryDate.toUTCString()}; path=/${domainAttr}; SameSite=Lax${secure}`;
  } catch {
    // Silent fail - tracking must not break page
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
  } catch {
    // Silent fail - tracking must not break page
  }
}

/**
 * Force-set storage (used for epik which must be set regardless)
 */
function setStorage(key: string, value: string): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, value);
  } catch {
    // Silent fail - tracking must not break page
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
    }
    
    // =========================================================================
    // META (FACEBOOK) COOKIE CAPTURE - CRITICAL FOR MATCH QUALITY
    // =========================================================================
    // Capture fbclid from URL and construct _fbc if cookie missing
    const fbclid = urlParams.get('fbclid');
    if (fbclid) {
      const existingFbc = getCookie(META_FBC_COOKIE);
      if (!existingFbc) {
        // Construct _fbc in Meta's format: fb.1.{timestamp_ms}.{fbclid}
        const constructedFbc = `fb.1.${Date.now()}.${fbclid}`;
        setCookie(META_FBC_COOKIE, constructedFbc, META_COOKIE_MAX_AGE_DAYS);
        setStorage(META_FBC_STORAGE_KEY, constructedFbc);
      }
    }
    
    // Always capture current Meta cookies to localStorage (for cross-session recovery)
    const currentFbc = getCookie(META_FBC_COOKIE);
    const currentFbp = getCookie(META_FBP_COOKIE);
    if (currentFbc) {
      setStorage(META_FBC_STORAGE_KEY, currentFbc);
    }
    if (currentFbp) {
      setStorage(META_FBP_STORAGE_KEY, currentFbp);
    }
    
    // Capture Google Click ID (gclid) from URL params
    const gclid = urlParams.get('gclid');
    if (gclid) {
      setStorageIfEmpty(GCLID_STORAGE_KEY, gclid);
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
    }
    
    // Capture landing page (first-touch only)
    const existingLanding = getStorage(LANDING_PAGE_KEY);
    if (!existingLanding) {
      setStorage(LANDING_PAGE_KEY, window.location.href);
    }
    
    // Capture UTMs (first-touch only)
    for (const key of UTM_KEYS) {
      const value = urlParams.get(key);
      if (value) {
        setStorageIfEmpty(key, value);
      }
    }
    
    // Capture TBLS (The Big Landing Store) attribution (first-touch only)
    // These params are added by TBLS landing pages to track revenue per page/pin
    const tblsPageId = urlParams.get('tbls_page') || urlParams.get('tbls_page_id');
    if (tblsPageId) {
      setStorageIfEmpty(TBLS_PAGE_ID_KEY, tblsPageId);
    }
    
    const tblsPinId = urlParams.get('tbls_pin') || urlParams.get('tbls_pin_id');
    if (tblsPinId) {
      setStorageIfEmpty(TBLS_PIN_ID_KEY, tblsPinId);
    }
    
    const tblsTemplate = urlParams.get('tbls_template');
    if (tblsTemplate) {
      setStorageIfEmpty(TBLS_TEMPLATE_KEY, tblsTemplate);
    }
    
    const tblsSubdomain = urlParams.get('tbls_subdomain');
    if (tblsSubdomain) {
      setStorageIfEmpty(TBLS_SUBDOMAIN_KEY, tblsSubdomain);
    }
    
    const tblsCategory = urlParams.get('tbls_category');
    if (tblsCategory) {
      setStorageIfEmpty(TBLS_CATEGORY_KEY, tblsCategory);
    }
  } catch {
    // Never throw - tracking failures must be silent
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
    
    // Meta cookies - prefer cookie, fallback to localStorage for cross-session recovery
    // Also check window globals set by early script in index.html
    const fbc = getCookie(META_FBC_COOKIE) || 
                getStorage(META_FBC_STORAGE_KEY) || 
                (typeof window !== 'undefined' ? (window as any).__metaFbc : null);
    const fbp = getCookie(META_FBP_COOKIE) || 
                getStorage(META_FBP_STORAGE_KEY) || 
                (typeof window !== 'undefined' ? (window as any).__metaFbp : null);
    
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
      // TBLS attribution
      tbls_page_id: getStorage(TBLS_PAGE_ID_KEY),
      tbls_pin_id: getStorage(TBLS_PIN_ID_KEY),
      tbls_template: getStorage(TBLS_TEMPLATE_KEY),
      tbls_subdomain: getStorage(TBLS_SUBDOMAIN_KEY),
      tbls_category: getStorage(TBLS_CATEGORY_KEY),
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
      tbls_page_id: null,
      tbls_pin_id: null,
      tbls_template: null,
      tbls_subdomain: null,
      tbls_category: null,
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
    
    // TBLS (The Big Landing Store) attribution for revenue-per-page tracking
    if (attribution.tbls_page_id) {
      attributes.push({ key: '_tbls_page_id', value: attribution.tbls_page_id });
    }
    if (attribution.tbls_pin_id) {
      attributes.push({ key: '_tbls_pin_id', value: attribution.tbls_pin_id });
    }
    if (attribution.tbls_template) {
      attributes.push({ key: '_tbls_template', value: attribution.tbls_template });
    }
    if (attribution.tbls_subdomain) {
      attributes.push({ key: '_tbls_subdomain', value: attribution.tbls_subdomain });
    }
    if (attribution.tbls_category) {
      attributes.push({ key: '_tbls_category', value: attribution.tbls_category });
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
