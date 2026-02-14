/**
 * Currency-aware shipping thresholds and costs.
 * Maps each supported currency to its free-shipping threshold and flat shipping cost.
 */

export interface ShippingConfig {
  threshold: number;
  shippingCost: number;
  currencyCode: string;
}

const SHIPPING_CONFIGS: Record<string, { threshold: number; shippingCost: number }> = {
  USD: { threshold: 50, shippingCost: 14.99 },
  EUR: { threshold: 50, shippingCost: 14.99 },
  GBP: { threshold: 50, shippingCost: 14.99 },
  CAD: { threshold: 50, shippingCost: 14.99 },
  AUD: { threshold: 50, shippingCost: 14.99 },
  NZD: { threshold: 50, shippingCost: 14.99 },
  SEK: { threshold: 500, shippingCost: 149 },
  NOK: { threshold: 500, shippingCost: 149 },
  DKK: { threshold: 350, shippingCost: 99 },
};

const DEFAULT_CONFIG = { threshold: 50, shippingCost: 14.99 };

/**
 * Get the shipping config (threshold + cost) for a given currency code.
 */
export function getShippingConfig(currencyCode: string): ShippingConfig {
  const config = SHIPPING_CONFIGS[currencyCode] ?? DEFAULT_CONFIG;
  return { ...config, currencyCode };
}
