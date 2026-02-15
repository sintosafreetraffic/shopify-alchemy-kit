import { useState, useEffect } from 'react';
import { getBuyerCountry, getBuyerCountrySync } from '@/lib/buyerContext';
import type { CountryCode } from '@/lib/countryCode';

/**
 * Reactive hook for buyer country detection.
 * Returns cached country instantly, then updates when async detection completes.
 * Components using this will re-render with the correct country/currency.
 */
export function useBuyerCountry() {
  const [country, setCountry] = useState<CountryCode>(
    getBuyerCountrySync() || 'US'
  );

  useEffect(() => {
    let cancelled = false;
    getBuyerCountry().then((detected) => {
      if (!cancelled && detected !== country) {
        setCountry(detected);
      }
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { country };
}
