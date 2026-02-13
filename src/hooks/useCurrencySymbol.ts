/**
 * Currency Symbol Hook
 * 
 * Returns the appropriate currency symbol based on buyer's country.
 * Uses the full currency mapping from countryCode + formatPrice utilities.
 */

import { useState, useEffect } from 'react';
import { getBuyerCountry, getBuyerCountrySync } from '@/lib/buyerContext';
import { EUROZONE_COUNTRIES, getCurrencyForCountry } from '@/lib/countryCode';
import { getCurrencySymbol } from '@/lib/formatPrice';

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

export function getCurrencySymbolForCountry(country: string): string {
  return getCurrencySymbol(getCurrencyForCountry(country));
}

/**
 * Hook that returns the currency symbol based on buyer's location
 * Returns the actual symbol for the buyer's currency (£, €, A$, C$, etc.)
 */
export function useCurrencySymbol(): string {
  const cachedCountry = getBuyerCountrySync();
  const initialSymbol = cachedCountry ? getCurrencySymbolForCountry(cachedCountry) : '$';
  
  const [symbol, setSymbol] = useState<string>(initialSymbol);

  useEffect(() => {
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
