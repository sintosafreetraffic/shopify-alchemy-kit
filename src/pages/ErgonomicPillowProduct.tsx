// Performance: Heavy sections with carousels are lazy-loaded
import { Suspense, lazy } from "react";
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

// Lazy load sections with carousels to reduce initial bundle
const ReviewsSection = lazy(() =>
  import("@/components/ReviewsSection").then((mod) => ({ default: mod.ReviewsSection })),
);
const VideoSection = lazy(() => import("@/components/VideoSection").then((mod) => ({ default: mod.VideoSection })));

// Fallback for lazy-loaded sections
const SectionFallback = () => (
  <div className="py-8 flex items-center justify-center text-sm text-muted-foreground">Loading...</div>
);

// Quiz CTA Component
const QuizCTA = ({ variant = "default" }: { variant?: "default" | "subtle" }) => (
  <div
    className={`py-10 md:py-14 ${variant === "subtle" ? "bg-muted/20" : "bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5"}`}
  >
    <div className="container mx-auto px-4 text-center">
      <p className="text-sm text-muted-foreground mb-2">Not sure if this pillow is right for you?</p>
      <h3 className="text-xl md:text-2xl font-semibold mb-4">Take the Short Science-Backed Assessment</h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto text-sm">
        Discover your sleeper type and get personalized product recommendations.
      </p>
      <Link to="/sleep-quiz">
        <Button size="lg" className="rounded-full px-8">
          Start the Assessment <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </Link>
    </div>
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

      {/* Quiz CTA before reviews */}
      <QuizCTA />

      <Suspense fallback={<SectionFallback />}>
        <ReviewsSection />
      </Suspense>
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
