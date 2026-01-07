/**
 * Currency Symbol Hook
 * 
 * Returns the appropriate currency symbol based on buyer's country.
 * EU countries → € (Euro)
 * All other countries → $ (USD default)
 */

import { useState, useEffect } from 'react';
import { getBuyerCountry, getBuyerCountrySync } from '@/lib/buyerContext';
import { EUROZONE_COUNTRIES } from '@/lib/countryCode';

// Extended EU list (includes non-Eurozone EU members that should still see EUR)
const EU_COUNTRIES = [
  ...EUROZONE_COUNTRIES,
  'BG', // Bulgaria
  'CZ', // Czech Republic
  'DK', // Denmark
  'HU', // Hungary
  'PL', // Poland
  'RO', // Romania
  'SE', // Sweden
];

export function isEUCountry(country: string): boolean {
  return EU_COUNTRIES.includes(country);
}

export function getCurrencySymbolForCountry(country: string): '€' | '$' {
  return isEUCountry(country) ? '€' : '$';
}

/**
 * Hook that returns the currency symbol based on buyer's location
 * Returns '$' by default, '€' for EU countries
 */
export function useCurrencySymbol(): '€' | '$' {
  // Try to get cached country synchronously for faster initial render
  const cachedCountry = getBuyerCountrySync();
  const initialSymbol = cachedCountry ? getCurrencySymbolForCountry(cachedCountry) : '$';
  
  const [symbol, setSymbol] = useState<'€' | '$'>(initialSymbol);

  useEffect(() => {
    // Only fetch if we don't have a cached value
    if (!cachedCountry) {
      getBuyerCountry().then((country) => {
        setSymbol(getCurrencySymbolForCountry(country));
      });
    }
  }, [cachedCountry]);

  return symbol;
}

/**
 * Hook that returns whether the buyer is in an EU country
 */
export function useIsEU(): boolean {
  const cachedCountry = getBuyerCountrySync();
  const initialIsEU = cachedCountry ? isEUCountry(cachedCountry) : false;
  
  const [isEU, setIsEU] = useState(initialIsEU);

  useEffect(() => {
    if (!cachedCountry) {
      getBuyerCountry().then((country) => {
        setIsEU(isEUCountry(country));
      });
    }
  }, [cachedCountry]);

  return isEU;
}
