// Performance: Heavy sections with carousels are lazy-loaded
import { Suspense, lazy } from "react";
import { Hero } from "@/components/Hero";
import { ProductBenefitsSection } from "@/components/ProductBenefitsSection";
import { GuaranteeSection } from "@/components/GuaranteeSection";
import { Features } from "@/components/Features";
import { ProductFAQSection } from "@/components/ProductFAQSection";
import { LookInside } from "@/components/LookInside";
import { PainReliefSection } from "@/components/PainReliefSection";
import { ChiropractorEndorsement } from "@/components/ChiropractorEndorsement";
import { StickyAddToCart } from "@/components/StickyAddToCart";

// Lazy load sections with carousels to reduce initial bundle
const ReviewsSection = lazy(() => 
  import("@/components/ReviewsSection").then(mod => ({ default: mod.ReviewsSection }))
);
const VideoSection = lazy(() => 
  import("@/components/VideoSection").then(mod => ({ default: mod.VideoSection }))
);

// Fallback for lazy-loaded sections
const SectionFallback = () => (
  <div className="py-8 flex items-center justify-center text-sm text-muted-foreground">
    Loading...
  </div>
);

const ErgonomicPillowProduct = () => {
  return (
    <div className="min-h-screen bg-background">
      <Hero />
      <Features />
      <ProductBenefitsSection />
      <PainReliefSection />
      <ChiropractorEndorsement />
      <LookInside />
      <Suspense fallback={<SectionFallback />}>
        <ReviewsSection />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <VideoSection />
      </Suspense>
      <ProductFAQSection />
      <GuaranteeSection />
      <StickyAddToCart productType="ergonomic-pillow" />
    </div>
  );
};

export default ErgonomicPillowProduct;
