// Performance: Heavy sections with carousels/videos are lazy-loaded
import { Suspense, lazy } from "react";
import { UrgencyBanner } from "@/components/UrgencyBanner";
import { Guarantee } from "@/components/Guarantee";
import { StickyAddToCart } from "@/components/StickyAddToCart";
import { SleepMaskHero } from "@/components/SleepMaskHero";
import { SleepMaskFeatures } from "@/components/SleepMaskFeatures";
import { SleepMaskBenefits } from "@/components/SleepMaskBenefits";
import { SleepMaskPainRelief } from "@/components/SleepMaskPainRelief";
import { SleepMaskLookInside } from "@/components/SleepMaskLookInside";
import { SleepMaskFAQ } from "@/components/SleepMaskFAQ";

// Lazy load sections with carousels/videos to reduce initial bundle
const ReviewsSection = lazy(() => 
  import("@/components/ReviewsSection").then(mod => ({ default: mod.ReviewsSection }))
);
const SleepMaskVideoSection = lazy(() => 
  import("@/components/SleepMaskVideoSection").then(mod => ({ default: mod.SleepMaskVideoSection }))
);

// Fallback for lazy-loaded sections
const SectionFallback = () => (
  <div className="py-8 flex items-center justify-center text-sm text-muted-foreground">
    Loading...
  </div>
);

const SleepMaskProduct = () => {
  return (
    <div className="min-h-screen bg-background">
      <UrgencyBanner />
      <SleepMaskHero />
      <SleepMaskFeatures />
      <SleepMaskBenefits />
      <SleepMaskPainRelief />
      <SleepMaskLookInside />
      <Suspense fallback={<SectionFallback />}>
        <ReviewsSection />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <SleepMaskVideoSection />
      </Suspense>
      <SleepMaskFAQ />
      <Guarantee />
      <StickyAddToCart productType="sleep-mask" />
    </div>
  );
};

export default SleepMaskProduct;
