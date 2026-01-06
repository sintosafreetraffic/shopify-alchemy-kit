/**
 * Shopify CountryCode enum subset
 * 
 * Only includes countries we support in Shopify Markets
 * Add new countries here as markets are configured
 */
export type CountryCode = 
  | 'US'  // United States (default)
  | 'IE'  // Ireland (EUR)
  | 'GB'  // United Kingdom (GBP)
  | 'CA'  // Canada (CAD)
  | 'AU'; // Australia (AUD)

/**
 * Map country codes to currency codes for display
 */
export const COUNTRY_CURRENCY_MAP: Record<CountryCode, string> = {
  US: 'USD',
  IE: 'EUR',
  GB: 'GBP',
  CA: 'CAD',
  AU: 'AUD',
};

/**
 * Map country codes to display names
 */
export const COUNTRY_NAMES: Record<CountryCode, string> = {
  US: 'United States',
  IE: 'Ireland',
  GB: 'United Kingdom',
  CA: 'Canada',
  AU: 'Australia',
};
