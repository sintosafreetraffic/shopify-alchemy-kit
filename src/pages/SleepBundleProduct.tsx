import { SleepBundleHero } from "@/components/SleepBundleHero";
import { SleepBundleFeatures } from "@/components/SleepBundleFeatures";
import { SleepBundleBenefits } from "@/components/SleepBundleBenefits";
import { SleepBundleFAQ } from "@/components/SleepBundleFAQ";
import { ReviewsSection } from "@/components/ReviewsSection";
import { Guarantee } from "@/components/Guarantee";
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
      <Guarantee />
      <StickyAddToCart productType="sleep-bundle" />
    </div>
  );
};

export default SleepBundleProduct;
