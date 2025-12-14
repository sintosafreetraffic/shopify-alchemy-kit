import { SleepBundleHero } from "@/components/SleepBundleHero";
import { SleepBundleFeatures } from "@/components/SleepBundleFeatures";
import { SleepBundleBenefits } from "@/components/SleepBundleBenefits";
import { SleepBundleFAQ } from "@/components/SleepBundleFAQ";
import { ReviewsSection } from "@/components/ReviewsSection";
import { GuaranteeSection } from "@/components/GuaranteeSection";
import { StickyAddToCart } from "@/components/StickyAddToCart";
import { ChiropractorEndorsement } from "@/components/ChiropractorEndorsement";

const SleepBundleProduct = () => {
  return (
    <div className="min-h-screen bg-background">
      <SleepBundleHero />
      <SleepBundleFeatures />
      <SleepBundleBenefits />
      <ChiropractorEndorsement />
      <ReviewsSection />
      <SleepBundleFAQ />
      <GuaranteeSection />
      <StickyAddToCart productType="sleep-bundle" />
    </div>
  );
};

export default SleepBundleProduct;
