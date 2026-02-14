import { useState, useMemo } from "react";
import { SleepBundleHero } from "@/components/SleepBundleHero";
import { SleepBundleFeatures } from "@/components/SleepBundleFeatures";
import { SleepBundleBenefits } from "@/components/SleepBundleBenefits";
import { SleepBundleFAQ } from "@/components/SleepBundleFAQ";
import { GuaranteeSection } from "@/components/GuaranteeSection";
import { StickyAddToCart } from "@/components/StickyAddToCart";
import { ChiropractorEndorsement } from "@/components/ChiropractorEndorsement";
import { ReviewsWall, ReviewSubmissionForm } from "@/components/reviews";
import { useSEO, SEO_CONFIGS } from "@/hooks/useSEO";
import { ProductSchema, BreadcrumbSchema } from "@/components/seo/SEOSchemas";
import { useTrackProductView, STATIC_PRODUCT_DATA } from "@/hooks/useTrackProductView";
import { useShopifyProducts } from "@/hooks/useShopifyProducts";
import { formatPrice } from "@/lib/formatPrice";
import sleepBundleHero from "@/assets/complete-sleep-bundle-new.webp";

const SleepBundleProduct = () => {
  useSEO(SEO_CONFIGS.sleepBundle);
  const [showReviewForm, setShowReviewForm] = useState(false);

  // Fetch live Shopify data for dynamic pricing in Recently Viewed
  const { data: products } = useShopifyProducts();
  const trackingData = useMemo(() => {
    const bundleProduct = products?.find(
      (p) => p.node.handle === "rise-by-night™-complete-sleep-bundle"
    );
    if (bundleProduct) {
      const variant = bundleProduct.node.variants.edges[0]?.node;
      const currencyCode = variant?.price?.currencyCode || "USD";
      return {
        id: "sleep-bundle",
        handle: "sleep-bundle",
        title: "Complete Sleep Bundle",
        imageUrl: sleepBundleHero,
        price: formatPrice(variant?.price?.amount || "149.99", currencyCode),
        rawPrice: parseFloat(variant?.price?.amount || "149.99"),
        currencyCode,
        compareAtPrice: variant?.compareAtPrice?.amount
          ? formatPrice(variant.compareAtPrice.amount, currencyCode)
          : undefined,
        rawCompareAtPrice: variant?.compareAtPrice?.amount
          ? parseFloat(variant.compareAtPrice.amount)
          : undefined,
      };
    }
    return STATIC_PRODUCT_DATA["sleep-bundle"];
  }, [products]);

  useTrackProductView(trackingData);

  return (
    <div className="min-h-screen bg-background">
      <ProductSchema
        name="RiseByNight Complete Sleep Bundle"
        description="Everything you need for perfect sleep. Save vs buying separately."
        url="/products/sleep-bundle"
        price="109.99"
        ratingValue={4.9}
        reviewCount={2100}
      />
      <SleepBundleHero />
      <SleepBundleFeatures />
      <SleepBundleBenefits />
      <ChiropractorEndorsement />
      <ReviewsWall 
        productHandle="sleep-bundle"
        productName="Complete Sleep Bundle"
        onWriteReview={() => setShowReviewForm(true)} 
      />
      <SleepBundleFAQ />
      <GuaranteeSection />
      <StickyAddToCart productType="sleep-bundle" />

      {/* Review Submission Modal */}
      <ReviewSubmissionForm
        open={showReviewForm}
        onOpenChange={setShowReviewForm}
        productHandle="sleep-bundle"
      />
    </div>
  );
};

export default SleepBundleProduct;
