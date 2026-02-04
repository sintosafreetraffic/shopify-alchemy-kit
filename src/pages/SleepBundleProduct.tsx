import { useState } from "react";
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

const SleepBundleProduct = () => {
  useSEO(SEO_CONFIGS.sleepBundle);
  useTrackProductView(STATIC_PRODUCT_DATA["sleep-bundle"]);
  const [showReviewForm, setShowReviewForm] = useState(false);

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
