import { useEffect } from "react";
import { addToRecentlyViewed } from "@/components/home/RecentlyViewedItems";

// Import product hero images for static tracking
import ergonomicPillowHero from "@/assets/ergonomic-pillow-hero.webp";
import kneePillowHero from "@/assets/knee-pillow-main-hero.webp";
import sleepMaskHero from "@/assets/sleep-mask-product-shot.webp";
import sleepBundleHero from "@/assets/complete-sleep-bundle-new.webp";

interface ProductViewData {
  id: string;
  handle: string;
  title: string;
  imageUrl: string;
  price: string;
  compareAtPrice?: string;
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
      compareAtPrice: product.compareAtPrice,
      isValentinesDeal: product.isValentinesDeal,
    });
  }, [product?.id]); // Only track when product ID changes
};

/**
 * Static product data for tracking (when not fetching from Shopify)
 * Maps internal handles to display data
 * Images use imported assets for proper bundling
 */
export const STATIC_PRODUCT_DATA: Record<string, ProductViewData> = {
  "ergonomic-pillow": {
    id: "ergonomic-pillow",
    handle: "ergonomic-pillow",
    title: "Ergonomic Sleep Pillow",
    imageUrl: ergonomicPillowHero,
    price: "119.99",
    compareAtPrice: "199.99",
    isValentinesDeal: true,
  },
  "knee-pillow": {
    id: "knee-pillow",
    handle: "knee-pillow",
    title: "Ergonomic Knee Pillow",
    imageUrl: kneePillowHero,
    price: "39.99",
  },
  "sleep-mask": {
    id: "sleep-mask",
    handle: "sleep-mask",
    title: "Silk Sleep Mask",
    imageUrl: sleepMaskHero,
    price: "24.99",
  },
  "sleep-bundle": {
    id: "sleep-bundle",
    handle: "sleep-bundle",
    title: "Complete Sleep Bundle",
    imageUrl: sleepBundleHero,
    price: "109.99",
    compareAtPrice: "199.99",
  },
};
