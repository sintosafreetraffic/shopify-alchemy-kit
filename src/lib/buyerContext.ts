/**
 * Buyer Context Service
 * 
 * Handles customer localization for multi-currency support.
 * Uses IP-based geolocation to determine buyer country for Shopify @inContext directive.
 * 
 * Architecture:
 * - Caches country detection in sessionStorage (fast subsequent loads)
 * - Falls back gracefully to US if detection fails
 * - Supports manual country override via localStorage
 * - All Eurozone countries → EUR pricing
 */

import { CountryCode, EUROZONE_COUNTRIES } from './countryCode';

const COUNTRY_CACHE_KEY = 'buyer_country_code';
const COUNTRY_OVERRIDE_KEY = 'buyer_country_override';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

// Force one re-validation per page load so users don’t get stuck on an old cached country.
let hasValidatedCachedCountryThisSession = false;

interface CachedCountry {
  code: CountryCode;
  timestamp: number;
}

/**
 * All supported countries for localization
 * Includes all Eurozone + key non-Euro markets
 */
const SUPPORTED_COUNTRIES: readonly string[] = [
  ...EUROZONE_COUNTRIES,
  'US', 'GB', 'CA', 'AU'
];

/**
 * Get manually set country override (for testing or user preference)
 */
export function getCountryOverride(): CountryCode | null {
  try {
    const override = localStorage.getItem(COUNTRY_OVERRIDE_KEY);
    if (override && SUPPORTED_COUNTRIES.includes(override as CountryCode)) {
      return override as CountryCode;
    }
  } catch {
    // Silent fail
  }
  return null;
}

/**
 * Set manual country override
 */
export function setCountryOverride(country: CountryCode | null): void {
  try {
    if (country) {
      localStorage.setItem(COUNTRY_OVERRIDE_KEY, country);
    } else {
      localStorage.removeItem(COUNTRY_OVERRIDE_KEY);
    }
    // Clear cache to force new context
    sessionStorage.removeItem(COUNTRY_CACHE_KEY);
  } catch {
    // Silent fail
  }
}

/**
 * Get cached country code
 */
function getCachedCountry(): CountryCode | null {
  try {
    const cached = sessionStorage.getItem(COUNTRY_CACHE_KEY);
    if (!cached) return null;
    
    const parsed: CachedCountry = JSON.parse(cached);
    const isExpired = Date.now() - parsed.timestamp > CACHE_TTL_MS;
    
    if (isExpired) {
      sessionStorage.removeItem(COUNTRY_CACHE_KEY);
      return null;
    }
    
    return parsed.code;
  } catch {
    return null;
  }
}

/**
 * Cache country code
 */
function cacheCountry(code: CountryCode): void {
  try {
    const cached: CachedCountry = {
      code,
      timestamp: Date.now(),
    };
    sessionStorage.setItem(COUNTRY_CACHE_KEY, JSON.stringify(cached));
  } catch {
    // Silent fail
  }
}

/**
 * Infer buyer country from browser settings (timezone, then language/locale)
 * Used as a fallback when IP detection is blocked (ad blockers, privacy tools).
 */
function inferCountryFromBrowser(): CountryCode | null {
  try {
    // Timezone first: often more reliable than language (many EU users browse in en-US/en-GB)
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const tzMap: Record<string, CountryCode> = {
      'Europe/Amsterdam': 'NL',
    };
    if (tzMap[tz]) return tzMap[tz];

    if (typeof navigator === 'undefined') return null;

    const candidates: string[] = Array.isArray(navigator.languages) && navigator.languages.length > 0
      ? navigator.languages
      : [navigator.language];

    for (const l of candidates) {
      const region = (l || '').split('-')[1]?.toUpperCase();
      if (region && SUPPORTED_COUNTRIES.includes(region as CountryCode)) {
        return region as CountryCode;
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Detect buyer country from IP using free geolocation APIs
 * Falls back to browser locale/timezone, then US if detection fails
 */
async function detectCountryFromIP(): Promise<CountryCode> {
  // 1) ipapi.co (text)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch('https://ipapi.co/country_code/', {
      signal: controller.signal,
      headers: { Accept: 'text/plain' },
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const countryCode = (await response.text()).trim().toUpperCase();
      if (SUPPORTED_COUNTRIES.includes(countryCode as CountryCode)) {
        return countryCode as CountryCode;
      }
    }
  } catch (error) {
    console.warn('[BuyerContext] ipapi.co failed:', error);
  }

  // 2) ipwho.is (json)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch('https://ipwho.is/', {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const json = await response.json();
      const countryCode = String(json?.country_code || '').trim().toUpperCase();
      if (SUPPORTED_COUNTRIES.includes(countryCode as CountryCode)) {
        return countryCode as CountryCode;
      }
    }
  } catch (error) {
    console.warn('[BuyerContext] ipwho.is failed:', error);
  }

  return inferCountryFromBrowser() ?? 'US';
}

/**
 * Get buyer country code for Shopify @inContext
 * Priority: Override > Cache (validated once per page load) > IP Detection > Default (US)
 */
export async function getBuyerCountry(): Promise<CountryCode> {
  // Check for manual override first
  const override = getCountryOverride();
  if (override) {
    return override;
  }

  // Check cache
  const cached = getCachedCountry();
  if (cached) {
    // If user location/locale changed (VPN, travel, etc.), avoid getting stuck.
    const inferred = inferCountryFromBrowser();
    if (inferred && inferred !== cached) {
      cacheCountry(inferred);
      hasValidatedCachedCountryThisSession = true;
      return inferred;
    }

    // Validate cached once per page load using IP-based detection.
    if (!hasValidatedCachedCountryThisSession) {
      hasValidatedCachedCountryThisSession = true;
      const detected = await detectCountryFromIP();
      if (detected && detected !== cached) {
        cacheCountry(detected);
        return detected;
      }
    }

    return cached;
  }

  // Detect from IP
  const detected = await detectCountryFromIP();
  cacheCountry(detected);
  hasValidatedCachedCountryThisSession = true;

  return detected;
}

/**
 * Get buyer country synchronously (from cache only)
 * Returns null if not yet detected
 */
export function getBuyerCountrySync(): CountryCode | null {
  return getCountryOverride() || getCachedCountry();
}

/**
 * Initialize buyer context on app load
 * Call this early in app initialization
 */
export async function initializeBuyerContext(): Promise<CountryCode> {
  const country = await getBuyerCountry();
  console.log('[BuyerContext] Initialized with country:', country);
  return country;
}
