/**
 * Ergonomic Pillow Product Page - Variant B (Urgency Enhanced)
 * 
 * This is the high-urgency version of the product page for A/B testing.
 * Includes all urgency elements configured in variant_b_urgency.json
 * 
 * IMPORTANT: This component must mirror Variant A's core functionality
 * but adds urgency/scarcity elements. Changes to core product logic
 * should be made in both variants.
 */

import { Suspense, lazy, useState } from "react";
import { Link } from "react-router-dom";
import { HeroVariantB } from "@/components/ab-testing/HeroVariantB";
import { ProductBenefitsSection } from "@/components/ProductBenefitsSection";
import { GuaranteeSection } from "@/components/GuaranteeSection";
import { Features } from "@/components/Features";
import { ProductFAQSection } from "@/components/ProductFAQSection";
import { LookInside } from "@/components/LookInside";
import { PainReliefSection } from "@/components/PainReliefSection";
import { ChiropractorEndorsement } from "@/components/ChiropractorEndorsement";
import { StickyAddToCart } from "@/components/StickyAddToCart";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { ReviewsWall, ReviewSubmissionForm } from "@/components/reviews";
import { ReviewsSection } from "@/components/ReviewsSection";
import { SocialProofToast, MorningPuffinessSection } from "@/components/ab-testing/UrgencyElements";

// Lazy load sections with carousels to reduce initial bundle
const VideoSection = lazy(() => 
  import("@/components/VideoSection").then((mod) => ({ default: mod.VideoSection }))
);

// Fallback for lazy-loaded sections
const SectionFallback = () => (
  <div className="py-8 flex items-center justify-center text-sm text-muted-foreground">
    Loading...
  </div>
);

// Quiz CTA Component
const QuizCTA = ({ variant = "default" }: { variant?: "default" | "subtle" }) => (
  <div
    className={`py-4 md:py-6 lg:py-10 ${
      variant === "subtle" 
        ? "bg-muted/20" 
        : "bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5"
    }`}
  >
    <div className="container mx-auto px-4 text-center">
      <p className="text-xs md:text-sm text-muted-foreground mb-1">
        Not sure if this pillow is right for you?
      </p>
      <h3 className="text-base md:text-lg lg:text-xl font-semibold mb-2">
        Take the Science-Backed Assessment
      </h3>
      <p className="text-xs md:text-sm text-muted-foreground mb-3 max-w-md mx-auto">
        Discover your sleeper type and get personalized recommendations.
      </p>
      <Link to="/sleep-quiz">
        <Button size="default" className="rounded-full px-6 h-9 md:h-10 text-sm">
          Start the Assessment <ArrowRight className="w-3 h-3 md:w-4 md:h-4 ml-1.5" />
        </Button>
      </Link>
    </div>
  </div>
);

const ErgonomicPillowProductVariantB = () => {
  const [showReviewForm, setShowReviewForm] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Variant B Hero with urgency elements */}
      <HeroVariantB />
      
      <Features />
      
      {/* Morning Puffiness Section - Variant B specific */}
      <section className="py-8 md:py-12 bg-muted/20">
        <div className="container mx-auto px-4">
          <MorningPuffinessSection className="max-w-2xl mx-auto" />
        </div>
      </section>
      
      <ProductBenefitsSection />
      <PainReliefSection />
      <ChiropractorEndorsement />
      <LookInside />

      {/* Customer Reviews Wall */}
      <ReviewsWall 
        productHandle="ergonomic-pillow"
        productName="Ergonomic Cervical Pillow"
        onWriteReview={() => setShowReviewForm(true)} 
      />

      <Suspense fallback={<SectionFallback />}>
        <VideoSection />
      </Suspense>

      {/* Featured Customer Reviews Carousel */}
      <Suspense fallback={<SectionFallback />}>
        <ReviewsSection />
      </Suspense>

      <ProductFAQSection />

      {/* Quiz CTA after FAQ */}
      <QuizCTA />

      <GuaranteeSection />
      <StickyAddToCart productType="ergonomic-pillow" />

      {/* Review Submission Modal */}
      <ReviewSubmissionForm
        open={showReviewForm}
        onOpenChange={setShowReviewForm}
        productHandle="ergonomic-pillow"
      />

      {/* Social Proof Toast - Variant B specific */}
      <SocialProofToast />
    </div>
  );
};

export default ErgonomicPillowProductVariantB;
