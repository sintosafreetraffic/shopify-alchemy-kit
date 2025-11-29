import { UrgencyBanner } from "@/components/UrgencyBanner";
import { Guarantee } from "@/components/Guarantee";
import { StickyAddToCart } from "@/components/StickyAddToCart";
import { SleepMaskHero } from "@/components/SleepMaskHero";
import { SleepMaskFeatures } from "@/components/SleepMaskFeatures";
import { SleepMaskBenefits } from "@/components/SleepMaskBenefits";
import { SleepMaskPainRelief } from "@/components/SleepMaskPainRelief";
import { SleepMaskLookInside } from "@/components/SleepMaskLookInside";
import { ReviewsSection } from "@/components/ReviewsSection";
import { SleepMaskFAQ } from "@/components/SleepMaskFAQ";

const SleepMaskProduct = () => {
  return (
    <div className="min-h-screen bg-background">
      <UrgencyBanner />
      <SleepMaskHero />
      <SleepMaskFeatures />
      <SleepMaskBenefits />
      <SleepMaskPainRelief />
      <SleepMaskLookInside />
      <ReviewsSection />
      <SleepMaskFAQ />
      <Guarantee />
      <StickyAddToCart productType="sleep-mask" />
    </div>
  );
};

export default SleepMaskProduct;
