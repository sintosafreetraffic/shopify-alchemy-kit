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
import { useSEO, SEO_CONFIGS } from "@/hooks/useSEO";
import { ProductSchema, BreadcrumbSchema } from "@/components/seo/SEOSchemas";
import { useTrackProductView, STATIC_PRODUCT_DATA } from "@/hooks/useTrackProductView";

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
  useSEO(SEO_CONFIGS.kneePillow);
  useTrackProductView(STATIC_PRODUCT_DATA["knee-pillow"]);
  const [showReviewForm, setShowReviewForm] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <ProductSchema
        name="RiseByNight Ergonomic Knee Pillow"
        description="Orthopedic knee pillow for hip and spine alignment. Relieves sciatica and lower back pain."
        url="/products/knee-pillow"
        price="39.99"
        ratingValue={4.7}
        reviewCount={5100}
      />
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
