/**
 * Compare-At Price Ratio Map
 * 
 * Shopify only has compare-at prices configured for the US market.
 * For all other markets, the Storefront API returns null/0 for compareAtPrice.
 * 
 * Instead of hardcoding exchange rates, we use the ratio between
 * the USD compare-at price and the USD regular price. Since Shopify
 * correctly converts the regular price via @inContext for every country,
 * we multiply the localized regular price by this ratio to derive
 * the correct compare-at price in any currency.
 *
 * Ratios derived from Shopify Admin (USD):
 *   Ergonomic Pillow: $239.98 / $119.99 = 2.0
 *   Sleep Bundle (single): $190.00 / $149.99 ≈ 1.26675
 *   Sleep Bundle (double): $380.00 / $269.99 ≈ 1.40746
 */

interface ProductRatioConfig {
  /** Default ratio for all variants, or per-variant ratios by index */
  ratios: number | number[];
}

const PRODUCT_RATIO_MAP: Record<string, ProductRatioConfig> = {
  // Ergonomic Pillow (both handles)
  'risebynight-ergonomic-sleep-pillow': {
    ratios: 2.0,
  },
  'risebynight-ergonomic-sleep-pillow-copy': {
    ratios: 2.0,
  },
  // Sleep Bundle: index 0 = single (190/149.99), index 1 = double (380/269.99)
  'rise-by-night™-complete-sleep-bundle': {
    ratios: [190.00 / 149.99, 380.00 / 269.99],
  },
};

/**
 * Given a product handle and the localized regular price from Shopify,
 * returns the calculated compare-at price string, or null if no ratio is defined.
 * 
 * @param handle - Shopify product handle
 * @param localPrice - The localized regular price amount (string from Shopify API)
 * @param variantIndex - Which variant (default 0)
 * @returns The compare-at price as a string (e.g. "191.98"), or null
 */
export function getCompareAtFromRatio(
  handle: string,
  localPrice: string | undefined,
  variantIndex: number = 0
): string | null {
  if (!localPrice) return null;

  const config = PRODUCT_RATIO_MAP[handle];
  if (!config) return null;

  const price = parseFloat(localPrice);
  if (isNaN(price) || price <= 0) return null;

  const ratio = Array.isArray(config.ratios)
    ? config.ratios[variantIndex] ?? config.ratios[0]
    : config.ratios;

  if (!ratio || ratio <= 1) return null;

  const compareAt = price * ratio;
  // Round to 2 decimal places
  return compareAt.toFixed(2);
}
