/**
 * A/B Test Product Configuration
 * 
 * Centralized config for site-wide product switching based on A/B variant.
 * Variant B uses a separate Shopify product (€59.99 pillow only, no mask).
 */

import { getCurrentVariant, getOrAssignVariant } from './abTesting';

// Product handles for each variant
// NOTE: A/B test concluded – now permanently using Variant B (€59.99 pillow only)
// Both handles point to the pillow-only product for backward compatibility
export const AB_PRODUCT_HANDLES = {
  A: 'risebynight-ergonomic-sleep-pillow-copy', // Permanent: €59.99, pillow only
  B: 'risebynight-ergonomic-sleep-pillow-copy', // Permanent: €59.99, pillow only
} as const;

// Product configuration per variant
// NOTE: A/B test concluded – both variants now use pillow-only config
export const AB_PRODUCT_CONFIG = {
  A: {
    handle: 'risebynight-ergonomic-sleep-pillow-copy',
    includesMask: false,
    price: 119.99,
    description: '1 Pillow',
    discountCode: null,
  },
  B: {
    handle: 'risebynight-ergonomic-sleep-pillow-copy',
    includesMask: false,
    price: 119.99,
    description: '1 Pillow',
    discountCode: null,
  },
} as const;

/**
 * Get the ergonomic pillow product handle based on current A/B variant
 */
export function getErgonomicPillowHandle(): string {
  const variant = getCurrentVariant() || getOrAssignVariant();
  return AB_PRODUCT_HANDLES[variant];
}

/**
 * Get the full product config for current A/B variant
 */
export function getErgonomicPillowConfig() {
  const variant = getCurrentVariant() || getOrAssignVariant();
  return AB_PRODUCT_CONFIG[variant];
}

/**
 * Check if current variant includes free mask
 */
export function variantIncludesMask(): boolean {
  const variant = getCurrentVariant() || getOrAssignVariant();
  return AB_PRODUCT_CONFIG[variant].includesMask;
}

/**
 * Get discount codes for checkout based on current variant
 */
export function getVariantDiscountCodes(hasErgonomicPillow: boolean): string[] {
  const config = getErgonomicPillowConfig();
  if (hasErgonomicPillow && config.discountCode) {
    return [config.discountCode];
  }
  return [];
}
