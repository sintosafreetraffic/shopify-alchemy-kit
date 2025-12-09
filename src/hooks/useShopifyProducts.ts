import { useQuery } from "@tanstack/react-query";
import { fetchProducts, ShopifyProduct } from "@/lib/shopify";

// Stale time: 5 minutes - products won't refetch for 5 minutes
const STALE_TIME = 5 * 60 * 1000;
// Cache time: 30 minutes - keep in cache even when stale
const GC_TIME = 30 * 60 * 1000;

/**
 * Centralized hook for fetching Shopify products with caching.
 * Uses React Query for stale-while-revalidate behavior.
 */
export function useShopifyProducts(limit = 50, query?: string) {
  return useQuery({
    queryKey: ["shopify-products", limit, query],
    queryFn: () => fetchProducts(limit, query),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Get a single product from the cached products list
 */
export function useShopifyProduct(productHandle: string) {
  const { data: products, ...rest } = useShopifyProducts();
  
  const product = products?.find(
    (p: ShopifyProduct) => p.node.handle === productHandle
  );

  return { data: product, ...rest };
}

/**
 * Get products excluding those in cart (for recommendations)
 */
export function useRecommendedProducts(excludeProductIds: string[], limit = 3) {
  const { data: products, ...rest } = useShopifyProducts();
  
  const filtered = products?.filter(
    (p: ShopifyProduct) => 
      !p.node.title.toLowerCase().includes('free gift') &&
      !excludeProductIds.includes(p.node.id)
  ).slice(0, limit) || [];

  return { data: filtered, ...rest };
}

/**
 * Extract variant prices from products for price lookups
 */
export function useProductPrices() {
  const { data: products, ...rest } = useShopifyProducts();
  
  const priceMap: Record<string, { price: string; compareAtPrice?: string }> = {};
  
  if (products) {
    products.forEach((product: ShopifyProduct) => {
      product.node.variants.edges.forEach(variantEdge => {
        const variant = variantEdge.node;
        priceMap[variant.id] = {
          price: variant.price.amount,
          compareAtPrice: variant.compareAtPrice?.amount
        };
      });
    });
  }

  return { data: priceMap, ...rest };
}
