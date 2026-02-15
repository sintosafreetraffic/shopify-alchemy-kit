/**
 * Ergonomic Pillow Product Page - BACKUP (Previous Version)
 * 
 * This is a preserved copy of the product page before Valentine's 1+1 offer.
 * Route: /products/ergonomic-pillow-previous-one
 * 
 * Restore this version by swapping it back to the main route if needed.
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
import { useABErgonomicPillow } from "@/hooks/useABProduct";
import { useCartStore } from "@/stores/cartStore";
import { useSEO, SEO_CONFIGS } from "@/hooks/useSEO";
import { ProductSchema } from "@/components/seo/SEOSchemas";

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

// Inline CTA Component
const InlineCTA = () => {
  const { product } = useABErgonomicPillow();
  const { addItem, setCartOpen } = useCartStore();
  const [isAdding, setIsAdding] = useState(false);

  const handleAddToCart = async () => {
    if (!product) return;
    setIsAdding(true);
    try {
      const variant = product.node.variants.edges[0].node;
      
      addItem({
        product,
        variantId: variant.id,
        variantTitle: variant.title,
        price: variant.price,
        compareAtPrice: variant.compareAtPrice,
        quantity: 1,
        selectedOptions: variant.selectedOptions || []
      });
      setCartOpen(true);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="py-6 md:py-8 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5">
      <div className="container mx-auto px-4 text-center">
        <h3 className="text-lg md:text-xl font-semibold mb-2">Ready to sleep better?</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
          Join thousands who wake up pain-free every morning.
        </p>
        <Button 
          size="lg" 
          className="rounded-full px-8"
          onClick={handleAddToCart}
          disabled={isAdding || !product}
        >
          {isAdding ? "Adding..." : "Add to Cart"}
        </Button>
      </div>
    </div>
  );
};

const ErgonomicPillowProductPrevious = () => {
  useSEO(SEO_CONFIGS.ergonomicPillow);
  const [showReviewForm, setShowReviewForm] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <ProductSchema
        name="RiseByNight Ergonomic Cervical Pillow"
        description="Doctor-recommended contour memory foam pillow for neck and shoulder pain relief. Rated 4.8★ by 1000+ verified customers."
        url="/products/ergonomic-pillow-previous-one"
        price="59.99"
        ratingValue={4.8}
        reviewCount={6247}
      />
      
      <HeroVariantB />
      
      <Features />
      <ChiropractorEndorsement />
      <ProductBenefitsSection />
      <PainReliefSection />
      
      {/* Inline CTA removed - redundant with sticky ATC and 1+1 deal */}
      
      <LookInside />

      <ReviewsWall 
        productHandle="ergonomic-pillow"
        productName="Ergonomic Cervical Pillow"
        onWriteReview={() => setShowReviewForm(true)} 
      />

      <Suspense fallback={<SectionFallback />}>
        <VideoSection />
      </Suspense>

      <Suspense fallback={<SectionFallback />}>
        <ReviewsSection />
      </Suspense>

      <ProductFAQSection />

      <QuizCTA />

      <GuaranteeSection />
      
      <StickyAddToCart productType="ergonomic-pillow" />

      <ReviewSubmissionForm
        open={showReviewForm}
        onOpenChange={setShowReviewForm}
        productHandle="ergonomic-pillow"
      />
    </div>
  );
};

export default ErgonomicPillowProductPrevious;
