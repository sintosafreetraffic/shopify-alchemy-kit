import { useState } from "react";
import { SleepBundleHero } from "@/components/SleepBundleHero";
import { SleepBundleFeatures } from "@/components/SleepBundleFeatures";
import { SleepBundleBenefits } from "@/components/SleepBundleBenefits";
import { SleepBundleFAQ } from "@/components/SleepBundleFAQ";
import { GuaranteeSection } from "@/components/GuaranteeSection";
import { StickyAddToCart } from "@/components/StickyAddToCart";
import { ChiropractorEndorsement } from "@/components/ChiropractorEndorsement";
import { ReviewsWall, ReviewSubmissionForm } from "@/components/reviews";

const SleepBundleProduct = () => {
  const [showReviewForm, setShowReviewForm] = useState(false);

  return (
    <div className="min-h-screen bg-background">
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
