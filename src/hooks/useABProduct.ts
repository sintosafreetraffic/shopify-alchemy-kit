/**
 * Hook to get the correct ergonomic pillow product based on A/B variant
 * 
 * This ensures site-wide consistency - home page, product page, sticky cart,
 * and all other components use the same product for the assigned variant.
 */

import { useMemo } from 'react';
import { useShopifyProducts } from './useShopifyProducts';
import { getCurrentVariant, getOrAssignVariant } from '@/lib/abTesting';
import { AB_PRODUCT_HANDLES, AB_PRODUCT_CONFIG } from '@/lib/abProductConfig';
import type { ShopifyProduct } from '@/lib/shopify';

type ABProductConfigType = typeof AB_PRODUCT_CONFIG.A | typeof AB_PRODUCT_CONFIG.B;

export interface ABProductResult {
  product: ShopifyProduct | null;
  variant: 'A' | 'B';
  config: ABProductConfigType;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Get the ergonomic pillow product based on current A/B variant assignment.
 * Automatically selects the correct product handle for the user's variant.
 */
export function useABErgonomicPillow(): ABProductResult {
  const { data: products, isLoading, error } = useShopifyProducts(20);
  
  const abVariant = getCurrentVariant() || getOrAssignVariant();
  const config = AB_PRODUCT_CONFIG[abVariant];
  const targetHandle = AB_PRODUCT_HANDLES[abVariant];
  
  const product = useMemo(() => {
    if (!products) return null;
    
    // Find the product matching the A/B variant's handle
    const found = products.find(
      (p: ShopifyProduct) => p.node.handle === targetHandle
    );
    
    // Fallback: if variant B product not found, use variant A product
    if (!found && abVariant === 'B') {
      console.warn('[useABProduct] Variant B product not found, falling back to A');
      return products.find(
        (p: ShopifyProduct) => p.node.handle === AB_PRODUCT_HANDLES.A
      ) || null;
    }
    
    return found || null;
  }, [products, targetHandle, abVariant]);
  
  return {
    product,
    variant: abVariant,
    config,
    isLoading,
    error: error as Error | null,
  };
}

/**
 * Check if user is in Variant B (for conditional rendering)
 */
export function useIsVariantB(): boolean {
  const variant = getCurrentVariant() || getOrAssignVariant();
  return variant === 'B';
}
