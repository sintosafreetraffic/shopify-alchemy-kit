// Performance: Heavy sections with carousels are lazy-loaded
import { Suspense, lazy } from "react";
import { GuaranteeSection } from "@/components/GuaranteeSection";
import { StickyAddToCart } from "@/components/StickyAddToCart";
import { KneePillowHero } from "@/components/KneePillowHero";
import { KneePillowFeatures } from "@/components/KneePillowFeatures";
import { KneePillowBenefits } from "@/components/KneePillowBenefits";
import { KneePillowPainRelief } from "@/components/KneePillowPainRelief";
import { KneePillowChiropractorEndorsement } from "@/components/KneePillowChiropractorEndorsement";
import { KneePillowLookInside } from "@/components/KneePillowLookInside";
import { KneePillowFAQ } from "@/components/KneePillowFAQ";

// Lazy load sections with carousels to reduce initial bundle
const ReviewsSection = lazy(() => 
  import("@/components/ReviewsSection").then(mod => ({ default: mod.ReviewsSection }))
);
const KneePillowVideoSection = lazy(() => 
  import("@/components/KneePillowVideoSection").then(mod => ({ default: mod.KneePillowVideoSection }))
);

// Fallback for lazy-loaded sections
const SectionFallback = () => (
  <div className="py-8 flex items-center justify-center text-sm text-muted-foreground">
    Loading...
  </div>
);

const KneePillowProduct = () => {
  return (
    <div className="min-h-screen bg-background">
      <KneePillowHero />
      <KneePillowFeatures />
      <KneePillowBenefits />
      <KneePillowPainRelief />
      <KneePillowChiropractorEndorsement />
      <KneePillowLookInside />
      <Suspense fallback={<SectionFallback />}>
        <ReviewsSection />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <KneePillowVideoSection />
      </Suspense>
      <KneePillowFAQ />
      <GuaranteeSection />
      <StickyAddToCart productType="knee-pillow" />
    </div>
  );
};

export default KneePillowProduct;
