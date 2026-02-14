import { useEffect } from "react";
import { addToRecentlyViewed } from "@/components/home/RecentlyViewedItems";
import { formatPrice } from "@/lib/formatPrice";

// Import product hero images for static tracking
import ergonomicPillowHero from "@/assets/ergonomic-pillow-hero.webp";
import kneePillowHero from "@/assets/knee-pillow-main-hero.webp";
import sleepMaskHero from "@/assets/sleep-mask-product-shot-new.png";
import sleepBundleHero from "@/assets/complete-sleep-bundle-new.webp";

interface ProductViewData {
  id: string;
  handle: string;
  title: string;
  imageUrl: string;
  price: string;
  rawPrice?: number;
  currencyCode?: string;
  compareAtPrice?: string;
  rawCompareAtPrice?: number;
  isValentinesDeal?: boolean;
}

/**
 * Hook to track product views for "Recently Viewed" feature
 * Call this on any product page to record the visit
 * 
 * @param product - Product data to track
 */
export const useTrackProductView = (product: ProductViewData | null) => {
  useEffect(() => {
    if (!product) return;
    
    addToRecentlyViewed({
      id: product.id,
      handle: product.handle,
      title: product.title,
      imageUrl: product.imageUrl,
      price: product.price,
      rawPrice: product.rawPrice,
      currencyCode: product.currencyCode,
      compareAtPrice: product.compareAtPrice,
      rawCompareAtPrice: product.rawCompareAtPrice,
      isValentinesDeal: product.isValentinesDeal,
    });
  }, [product?.id]); // Only track when product ID changes
};

/**
 * Static product data for tracking (when not fetching from Shopify)
 * Maps internal handles to display data
 * Images use imported assets for proper bundling
 * Uses formatPrice for proper currency formatting
 */
export function getStaticProductData(handle: string, currencyCode: string = 'USD'): ProductViewData | null {
  const data: Record<string, Omit<ProductViewData, 'price' | 'compareAtPrice'> & { basePrice: number; baseCompareAtPrice?: number }> = {
    "ergonomic-pillow": {
      id: "ergonomic-pillow",
      handle: "ergonomic-pillow",
      title: "Ergonomic Sleep Pillow",
      imageUrl: ergonomicPillowHero,
      basePrice: 59.99,
      isValentinesDeal: true,
    },
    "knee-pillow": {
      id: "knee-pillow",
      handle: "knee-pillow",
      title: "Ergonomic Knee Pillow",
      imageUrl: kneePillowHero,
      basePrice: 39.99,
    },
    "sleep-mask": {
      id: "sleep-mask",
      handle: "sleep-mask",
      title: "Silk Sleep Mask",
      imageUrl: sleepMaskHero,
      basePrice: 24.99,
    },
    "sleep-bundle": {
      id: "sleep-bundle",
      handle: "sleep-bundle",
      title: "Complete Sleep Bundle",
      imageUrl: sleepBundleHero,
      basePrice: 149.99,
      baseCompareAtPrice: 190.00,
    },
  };

  const entry = data[handle];
  if (!entry) return null;

  return {
    id: entry.id,
    handle: entry.handle,
    title: entry.title,
    imageUrl: entry.imageUrl,
    price: formatPrice(entry.basePrice, currencyCode),
    rawPrice: entry.basePrice,
    currencyCode,
    compareAtPrice: entry.baseCompareAtPrice ? formatPrice(entry.baseCompareAtPrice, currencyCode) : undefined,
    rawCompareAtPrice: entry.baseCompareAtPrice,
    isValentinesDeal: entry.isValentinesDeal,
  };
}

