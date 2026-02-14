// Performance: Heavy sections with carousels/videos are lazy-loaded
import { Suspense, lazy, useState, useMemo } from "react";
import { GuaranteeSection } from "@/components/GuaranteeSection";
import { StickyAddToCart } from "@/components/StickyAddToCart";
import { SleepMaskHero } from "@/components/SleepMaskHero";
import { SleepMaskFeatures } from "@/components/SleepMaskFeatures";
import { SleepMaskBenefits } from "@/components/SleepMaskBenefits";
import { SleepMaskPainRelief } from "@/components/SleepMaskPainRelief";
import { SleepMaskLookInside } from "@/components/SleepMaskLookInside";
import { SleepMaskFAQ } from "@/components/SleepMaskFAQ";
import { ReviewsWall, ReviewSubmissionForm } from "@/components/reviews";
import { useSEO, SEO_CONFIGS } from "@/hooks/useSEO";
import { ProductSchema, BreadcrumbSchema } from "@/components/seo/SEOSchemas";
import { useTrackProductView, STATIC_PRODUCT_DATA } from "@/hooks/useTrackProductView";
import { useShopifyProducts } from "@/hooks/useShopifyProducts";
import { formatPrice, parseLocalizedNumber } from "@/lib/formatPrice";
import sleepMaskHeroImg from "@/assets/sleep-mask-product-shot-new.png";

// Fallback for lazy-loaded sections
const SectionFallback = () => (
  <div className="py-8 flex items-center justify-center text-sm text-muted-foreground">
    Loading...
  </div>
);

const SleepMaskProduct = () => {
  useSEO(SEO_CONFIGS.sleepMask);
  const [showReviewForm, setShowReviewForm] = useState(false);

  // Fetch live Shopify data for dynamic pricing in Recently Viewed
  const { data: products } = useShopifyProducts();
  const trackingData = useMemo(() => {
    const maskProduct = products?.find(
      (p) => p.node.handle === "risebynight-3d-deep-sleep-mask" || 
             p.node.title.toLowerCase().includes('sleep mask')
    );
    if (maskProduct) {
      const variant = maskProduct.node.variants.edges[0]?.node;
      const currencyCode = variant?.price?.currencyCode || "USD";
      const rawPrice = parseLocalizedNumber(variant?.price?.amount || "24.99");
      return {
        id: "sleep-mask",
        handle: "sleep-mask",
        title: "Silk Sleep Mask",
        imageUrl: sleepMaskHeroImg,
        price: formatPrice(rawPrice, currencyCode),
        rawPrice,
        currencyCode,
      };
    }
    return STATIC_PRODUCT_DATA["sleep-mask"];
  }, [products]);

  useTrackProductView(trackingData);

  return (
    <div className="min-h-screen bg-background">
      <ProductSchema
        name="RiseByNight Silk Deep Sleep Mask"
        description="100% pure mulberry silk sleep mask that blocks 100% of light. Gentle on skin."
        url="/products/silk-sleep-mask"
        price="29.99"
        ratingValue={4.9}
        reviewCount={3200}
      />
      <SleepMaskHero />
      <SleepMaskFeatures />
      <SleepMaskBenefits />
      <SleepMaskPainRelief />
      <SleepMaskLookInside />
      
      {/* Customer Reviews Wall - fetches sleep-mask specific reviews */}
      <ReviewsWall 
        productHandle="sleep-mask"
        productName="3D Sleep Mask"
        onWriteReview={() => setShowReviewForm(true)} 
      />
      
      <SleepMaskFAQ />
      <GuaranteeSection />
      <StickyAddToCart productType="sleep-mask" />

      {/* Review Submission Modal */}
      <ReviewSubmissionForm
        open={showReviewForm}
        onOpenChange={setShowReviewForm}
        productHandle="sleep-mask"
      />
    </div>
  );
};

export default SleepMaskProduct;
