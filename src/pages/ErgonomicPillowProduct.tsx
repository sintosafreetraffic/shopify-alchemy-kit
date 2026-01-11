// Performance: Heavy sections with carousels are lazy-loaded
import { Suspense, lazy, useState } from "react";
import { Link } from "react-router-dom";
import { Hero } from "@/components/Hero";
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
import { ReviewsWall } from "@/components/reviews";

// Lazy load sections with carousels to reduce initial bundle
const VideoSection = lazy(() => import("@/components/VideoSection").then((mod) => ({ default: mod.VideoSection })));

// Fallback for lazy-loaded sections
const SectionFallback = () => (
  <div className="py-8 flex items-center justify-center text-sm text-muted-foreground">Loading...</div>
);

// Quiz CTA Component
const QuizCTA = ({ variant = "default" }: { variant?: "default" | "subtle" }) => (
  <div
    className={`py-4 md:py-6 lg:py-10 ${variant === "subtle" ? "bg-muted/20" : "bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5"}`}
  >
    <div className="container mx-auto px-4 text-center">
      <p className="text-xs md:text-sm text-muted-foreground mb-1">Not sure if this pillow is right for you?</p>
      <h3 className="text-base md:text-lg lg:text-xl font-semibold mb-2">Take the Science-Backed Assessment</h3>
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

const ErgonomicPillowProduct = () => {
  const [showReviewForm, setShowReviewForm] = useState(false);

  const handleWriteReview = () => {
    // TODO: Phase 3 - Open review submission modal
    setShowReviewForm(true);
    console.log("Open review form - to be implemented in Phase 3");
  };

  return (
    <div className="min-h-screen bg-background">
      <Hero />
      <Features />
      <ProductBenefitsSection />
      <PainReliefSection />
      <ChiropractorEndorsement />
      <LookInside />

      {/* Quiz CTA before reviews */}
      <QuizCTA />

      {/* Customer Reviews Wall */}
      <ReviewsWall 
        productHandle="ergonomic-pillow" 
        onWriteReview={handleWriteReview} 
      />

      <Suspense fallback={<SectionFallback />}>
        <VideoSection />
      </Suspense>

      {/* Quiz CTA after reviews */}
      <QuizCTA variant="subtle" />

      <ProductFAQSection />
      <GuaranteeSection />
      <StickyAddToCart productType="ergonomic-pillow" />
    </div>
  );
};

export default ErgonomicPillowProduct;
