// Performance: Heavy sections with carousels are lazy-loaded
import { Suspense, lazy, useState } from "react";
import { GuaranteeSection } from "@/components/GuaranteeSection";
import { StickyAddToCart } from "@/components/StickyAddToCart";
import { KneePillowHero } from "@/components/KneePillowHero";
import { KneePillowFeatures } from "@/components/KneePillowFeatures";
import { KneePillowBenefits } from "@/components/KneePillowBenefits";
import { KneePillowPainRelief } from "@/components/KneePillowPainRelief";
import { KneePillowChiropractorEndorsement } from "@/components/KneePillowChiropractorEndorsement";
import { KneePillowLookInside } from "@/components/KneePillowLookInside";
import { KneePillowFAQ } from "@/components/KneePillowFAQ";
import { ReviewsWall, ReviewSubmissionForm } from "@/components/reviews";

// Lazy load sections with carousels to reduce initial bundle
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
  const [showReviewForm, setShowReviewForm] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <KneePillowHero />
      <KneePillowFeatures />
      <KneePillowBenefits />
      <KneePillowPainRelief />
      <KneePillowChiropractorEndorsement />
      <KneePillowLookInside />
      
      {/* Customer Reviews Wall - fetches knee-pillow specific reviews */}
      <ReviewsWall 
        productHandle="knee-pillow"
        productName="Knee Pillow"
        onWriteReview={() => setShowReviewForm(true)} 
      />
      
      <Suspense fallback={<SectionFallback />}>
        <KneePillowVideoSection />
      </Suspense>
      <KneePillowFAQ />
      <GuaranteeSection />
      <StickyAddToCart productType="knee-pillow" />

      {/* Review Submission Modal */}
      <ReviewSubmissionForm
        open={showReviewForm}
        onOpenChange={setShowReviewForm}
        productHandle="knee-pillow"
      />
    </div>
  );
};

export default KneePillowProduct;
