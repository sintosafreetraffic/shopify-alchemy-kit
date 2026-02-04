// Performance: Heavy sections with carousels/videos are lazy-loaded
import { Suspense, lazy, useState } from "react";
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

// Fallback for lazy-loaded sections
const SectionFallback = () => (
  <div className="py-8 flex items-center justify-center text-sm text-muted-foreground">
    Loading...
  </div>
);

const SleepMaskProduct = () => {
  useSEO(SEO_CONFIGS.sleepMask);
  useTrackProductView(STATIC_PRODUCT_DATA["sleep-mask"]);
  const [showReviewForm, setShowReviewForm] = useState(false);

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
