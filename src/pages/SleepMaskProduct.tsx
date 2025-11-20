import { UrgencyBanner } from "@/components/UrgencyBanner";
import { Guarantee } from "@/components/Guarantee";
import { StickyAddToCart } from "@/components/StickyAddToCart";
import { SleepMaskHero } from "@/components/SleepMaskHero";
import { SleepMaskFeatures } from "@/components/SleepMaskFeatures";
import { SleepMaskBenefits } from "@/components/SleepMaskBenefits";
import { ReviewsSection } from "@/components/ReviewsSection";

const SleepMaskProduct = () => {
  return (
    <div className="min-h-screen bg-background">
      <UrgencyBanner />
      <SleepMaskHero />
      <SleepMaskFeatures />
      <SleepMaskBenefits />
      <ReviewsSection />
      <Guarantee />
      <StickyAddToCart productType="sleep-mask" />
    </div>
  );
};

export default SleepMaskProduct;
