import type { ShopifyProduct } from "@/lib/shopify";

// Product handles for mapping - MUST match actual Shopify handles exactly
export const PRODUCT_HANDLES = {
  ERGONOMIC_PILLOW: 'risebynight-ergonomic-sleep-pillow',
  KNEE_PILLOW: 'risebynight-ergonomic-knee-pillow',
  SLEEP_MASK: 'risebynight-silk-deep-sleep-mask',
  BUNDLE: 'rise-by-night™-complete-sleep-bundle',
} as const;

// Complementary product mapping - what to recommend based on cart contents
// Priority order matters: first items are shown first
export const COMPLEMENTARY_MAP: Record<string, string[]> = {
  [PRODUCT_HANDLES.ERGONOMIC_PILLOW]: [PRODUCT_HANDLES.KNEE_PILLOW, PRODUCT_HANDLES.SLEEP_MASK],
  [PRODUCT_HANDLES.KNEE_PILLOW]: [PRODUCT_HANDLES.ERGONOMIC_PILLOW, PRODUCT_HANDLES.SLEEP_MASK],
  [PRODUCT_HANDLES.SLEEP_MASK]: [PRODUCT_HANDLES.ERGONOMIC_PILLOW, PRODUCT_HANDLES.KNEE_PILLOW],
  [PRODUCT_HANDLES.BUNDLE]: [], // Bundle already contains everything
};

// Social proof badges for specific products
export const SOCIAL_PROOF_BADGES: Record<string, { label: string; variant: 'popular' | 'value' | 'recommended' }> = {
  [PRODUCT_HANDLES.KNEE_PILLOW]: { label: 'Most Popular Add-On', variant: 'popular' },
  [PRODUCT_HANDLES.BUNDLE]: { label: 'Best Value', variant: 'value' },
  [PRODUCT_HANDLES.SLEEP_MASK]: { label: 'Recommended', variant: 'recommended' },
};

// Bundle definitions for "Complete the Set" prompts
export interface BundleDefinition {
  id: string;
  name: string;
  requiredHandles: string[]; // Products that trigger this bundle offer
  bundleHandle: string; // The actual bundle product
  discountPercent: number;
  minItemsToTrigger: number; // How many of the required items must be in cart
}

export const BUNDLE_DEFINITIONS: BundleDefinition[] = [
  {
    id: 'complete-sleep-set',
    name: 'Complete Sleep Set',
    requiredHandles: [PRODUCT_HANDLES.ERGONOMIC_PILLOW, PRODUCT_HANDLES.KNEE_PILLOW, PRODUCT_HANDLES.SLEEP_MASK],
    bundleHandle: PRODUCT_HANDLES.BUNDLE,
    discountPercent: 15,
    minItemsToTrigger: 1, // Show if user has at least 1 individual item
  },
];

/**
 * Get complementary product handles based on cart contents
 */
export function getComplementaryHandles(cartProducts: ShopifyProduct[]): string[] {
  const cartHandles = new Set(cartProducts.map(p => p.node.handle));
  const complementarySet = new Set<string>();
  
  // Collect all complementary products from cart items
  for (const product of cartProducts) {
    const complements = COMPLEMENTARY_MAP[product.node.handle] || [];
    for (const handle of complements) {
      // Only add if not already in cart
      if (!cartHandles.has(handle)) {
        complementarySet.add(handle);
      }
    }
  }
  
  return Array.from(complementarySet);
}

/**
 * Sort and filter recommendations based on cart contents
 * Returns products prioritized by complementary logic
 */
export function getSmartRecommendations(
  allProducts: ShopifyProduct[],
  cartProducts: ShopifyProduct[],
  limit: number = 3
): ShopifyProduct[] {
  const cartHandles = new Set(cartProducts.map(p => p.node.handle));
  const cartIds = new Set(cartProducts.map(p => p.node.id));
  
  // Filter out products already in cart and free gift products
  const availableProducts = allProducts.filter(p => 
    !cartIds.has(p.node.id) && 
    !p.node.title.toLowerCase().includes('free gift')
  );
  
  // Get complementary handles in priority order
  const complementaryHandles = getComplementaryHandles(cartProducts);
  
  // Score products: complementary items get priority
  const scoredProducts = availableProducts.map(product => {
    let score = 0;
    const handleIndex = complementaryHandles.indexOf(product.node.handle);
    
    if (handleIndex !== -1) {
      // Higher score for earlier items in complementary list (more relevant)
      score = 100 - handleIndex;
    }
    
    // Boost bundle if user has individual items
    if (product.node.handle === PRODUCT_HANDLES.BUNDLE && cartHandles.size > 0) {
      const individualHandles: string[] = [PRODUCT_HANDLES.ERGONOMIC_PILLOW, PRODUCT_HANDLES.KNEE_PILLOW, PRODUCT_HANDLES.SLEEP_MASK];
      const hasIndividualItems = cartProducts.some(p => 
        individualHandles.includes(p.node.handle)
      );
      if (!hasIndividualItems) {
        score += 50; // Boost bundle for users without individual items
      }
    }
    
    return { product, score };
  });
  
  // Sort by score (descending) and return top N
  return scoredProducts
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(sp => sp.product);
}

/**
 * Get social proof badge for a product
 */
export function getSocialProofBadge(productHandle: string): { label: string; variant: 'popular' | 'value' | 'recommended' } | null {
  return SOCIAL_PROOF_BADGES[productHandle] || null;
}

/**
 * Check if a bundle offer should be shown based on cart contents
 */
export function getBundleOffer(
  cartProducts: ShopifyProduct[],
  allProducts: ShopifyProduct[]
): { bundle: BundleDefinition; bundleProduct: ShopifyProduct; missingItems: string[] } | null {
  const cartHandles = new Set(cartProducts.map(p => p.node.handle));
  
  for (const bundleDef of BUNDLE_DEFINITIONS) {
    // Skip if bundle is already in cart
    if (cartHandles.has(bundleDef.bundleHandle)) {
      continue;
    }
    
    // Count how many of the required items are in cart
    const itemsInCart = bundleDef.requiredHandles.filter(h => cartHandles.has(h));
    const missingItems = bundleDef.requiredHandles.filter(h => !cartHandles.has(h));
    
    // Check if we should show the bundle offer
    if (itemsInCart.length >= bundleDef.minItemsToTrigger && missingItems.length > 0) {
      const bundleProduct = allProducts.find(p => p.node.handle === bundleDef.bundleHandle);
      
      if (bundleProduct) {
        return {
          bundle: bundleDef,
          bundleProduct,
          missingItems,
        };
      }
    }
  }
  
  return null;
}

/**
 * Get display name for a product handle
 */
export function getProductDisplayName(handle: string): string {
  const names: Record<string, string> = {
    [PRODUCT_HANDLES.ERGONOMIC_PILLOW]: 'Ergonomic Pillow',
    [PRODUCT_HANDLES.KNEE_PILLOW]: 'Knee Pillow',
    [PRODUCT_HANDLES.SLEEP_MASK]: 'Sleep Mask',
    [PRODUCT_HANDLES.BUNDLE]: 'Complete Bundle',
  };
  return names[handle] || handle;
}
