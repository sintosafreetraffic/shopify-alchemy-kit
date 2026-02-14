/**
 * Hook that returns currency-aware shipping threshold and cost.
 * Combines buyer country detection with the shipping config utility.
 */

import { useState, useEffect } from 'react';
import { getBuyerCountry, getBuyerCountrySync } from '@/lib/buyerContext';
import { getCurrencyForCountry } from '@/lib/countryCode';
import { getShippingConfig, type ShippingConfig } from '@/lib/shippingThresholds';
import { getCurrencySymbol } from '@/lib/formatPrice';

export interface ShippingConfigWithSymbol extends ShippingConfig {
  currencySymbol: string;
  /** Formatted string like "€50" or "500 kr" */
  formattedThreshold: string;
}

function buildConfig(country: string): ShippingConfigWithSymbol {
  const currencyCode = getCurrencyForCountry(country);
  const config = getShippingConfig(currencyCode);
  const currencySymbol = getCurrencySymbol(currencyCode);

  // Scandinavian currencies use suffix "kr", others use prefix symbol
  const isScandinavia = ['SEK', 'NOK', 'DKK'].includes(currencyCode);
  const formattedThreshold = isScandinavia
    ? `${config.threshold} ${currencySymbol}`
    : `${currencySymbol}${config.threshold}`;

  return { ...config, currencySymbol, formattedThreshold };
}

const DEFAULT_COUNTRY = 'US';

export function useShippingConfig(): ShippingConfigWithSymbol {
  const cachedCountry = getBuyerCountrySync();
  const [config, setConfig] = useState<ShippingConfigWithSymbol>(
    buildConfig(cachedCountry ?? DEFAULT_COUNTRY)
  );

  useEffect(() => {
    if (!cachedCountry) {
      getBuyerCountry().then((country) => {
        setConfig(buildConfig(country));
      });
    }
  }, [cachedCountry]);

  return config;
}
