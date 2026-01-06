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
 * Detect buyer country from IP using free geolocation API
 * Falls back to US if detection fails
 */
async function detectCountryFromIP(): Promise<CountryCode> {
  try {
    // Use ipapi.co - reliable, free tier available, no API key needed
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout
    
    const response = await fetch('https://ipapi.co/country_code/', {
      signal: controller.signal,
      headers: { 'Accept': 'text/plain' },
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Geolocation failed: ${response.status}`);
    }
    
    const countryCode = (await response.text()).trim().toUpperCase();
    
    // Validate it's a supported country, otherwise default to US
    if (SUPPORTED_COUNTRIES.includes(countryCode as CountryCode)) {
      return countryCode as CountryCode;
    }
    
    // For unsupported countries, default to US pricing
    return 'US';
  } catch (error) {
    console.warn('[BuyerContext] Country detection failed, defaulting to US:', error);
    return 'US';
  }
}

/**
 * Get buyer country code for Shopify @inContext
 * Priority: Override > Cache > IP Detection > Default (US)
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
    return cached;
  }
  
  // Detect from IP
  const detected = await detectCountryFromIP();
  cacheCountry(detected);
  
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
