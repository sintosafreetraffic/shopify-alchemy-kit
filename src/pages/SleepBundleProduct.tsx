import { useState } from "react";
import { SleepBundleHero } from "@/components/SleepBundleHero";
import { SleepBundleFeatures } from "@/components/SleepBundleFeatures";
import { SleepBundleBenefits } from "@/components/SleepBundleBenefits";
import { SleepBundleFAQ } from "@/components/SleepBundleFAQ";
import { GuaranteeSection } from "@/components/GuaranteeSection";
import { StickyAddToCart } from "@/components/StickyAddToCart";
import { ChiropractorEndorsement } from "@/components/ChiropractorEndorsement";
import { ReviewsWall } from "@/components/reviews";

const SleepBundleProduct = () => {
  const [showReviewForm, setShowReviewForm] = useState(false);

  const handleWriteReview = () => {
    // TODO: Phase 3 - Open review submission modal
    setShowReviewForm(true);
    console.log("Open review form - to be implemented in Phase 3");
  };

  return (
    <div className="min-h-screen bg-background">
      <SleepBundleHero />
      <SleepBundleFeatures />
      <SleepBundleBenefits />
      <ChiropractorEndorsement />
      <ReviewsWall 
        productHandle="sleep-bundle" 
        onWriteReview={handleWriteReview} 
      />
      <SleepBundleFAQ />
      <GuaranteeSection />
      <StickyAddToCart productType="sleep-bundle" />
    </div>
  );
};

export default SleepBundleProduct;
