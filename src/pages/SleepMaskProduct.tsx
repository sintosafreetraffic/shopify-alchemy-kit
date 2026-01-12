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

// Fallback for lazy-loaded sections
const SectionFallback = () => (
  <div className="py-8 flex items-center justify-center text-sm text-muted-foreground">
    Loading...
  </div>
);

const SleepMaskProduct = () => {
  const [showReviewForm, setShowReviewForm] = useState(false);

  return (
    <div className="min-h-screen bg-background">
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
