/**
 * Shopify CountryCode types and currency mapping
 * 
 * Supports all Eurozone countries + key markets
 */

// All Eurozone country codes
export const EUROZONE_COUNTRIES = [
  'AT', // Austria
  'BE', // Belgium
  'HR', // Croatia
  'CY', // Cyprus
  'EE', // Estonia
  'FI', // Finland
  'FR', // France
  'DE', // Germany
  'GR', // Greece
  'IE', // Ireland
  'IT', // Italy
  'LV', // Latvia
  'LT', // Lithuania
  'LU', // Luxembourg
  'MT', // Malta
  'NL', // Netherlands
  'PT', // Portugal
  'SK', // Slovakia
  'SI', // Slovenia
  'ES', // Spain
] as const;

export type EurozoneCountryCode = typeof EUROZONE_COUNTRIES[number];

// Non-Euro markets we explicitly support
export type OtherCountryCode = 'US' | 'GB' | 'CA' | 'AU';

// All supported country codes
export type CountryCode = EurozoneCountryCode | OtherCountryCode;

/**
 * Get currency code for a country
 */
export function getCurrencyForCountry(country: string): string {
  if (EUROZONE_COUNTRIES.includes(country as EurozoneCountryCode)) {
    return 'EUR';
  }
  
  switch (country) {
    case 'GB': return 'GBP';
    case 'CA': return 'CAD';
    case 'AU': return 'AUD';
    case 'US':
    default: return 'USD';
  }
}

/**
 * Check if a country uses EUR
 */
export function isEurozoneCountry(country: string): boolean {
  return EUROZONE_COUNTRIES.includes(country as EurozoneCountryCode);
}

/**
 * Map country codes to display names
 */
export const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States',
  GB: 'United Kingdom',
  CA: 'Canada',
  AU: 'Australia',
  AT: 'Austria',
  BE: 'Belgium',
  HR: 'Croatia',
  CY: 'Cyprus',
  EE: 'Estonia',
  FI: 'Finland',
  FR: 'France',
  DE: 'Germany',
  GR: 'Greece',
  IE: 'Ireland',
  IT: 'Italy',
  LV: 'Latvia',
  LT: 'Lithuania',
  LU: 'Luxembourg',
  MT: 'Malta',
  NL: 'Netherlands',
  PT: 'Portugal',
  SK: 'Slovakia',
  SI: 'Slovenia',
  ES: 'Spain',
};
