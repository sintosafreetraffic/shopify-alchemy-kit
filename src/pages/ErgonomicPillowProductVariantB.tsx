/**
 * Ergonomic Pillow Product Page - Variant B (Price Test: €59.99 Pillow Only)
 * 
 * Uses a SEPARATE Shopify product (handle: risebynight-ergonomic-sleep-pillow-copy)
 * at €59.99 with NO sleep mask included. The product selection is handled
 * site-wide via useABErgonomicPillow hook and abProductConfig.ts.
 * 
 * Traffic split is controlled via ab_traffic_split_percent_b in app_settings.
 */

import { Suspense, lazy, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { HeroVariantB } from "@/components/ab-testing/HeroVariantB";
import { setPillowFocusPreference } from "@/lib/pillowFocusPreference";
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
import { useTrackProductView, STATIC_PRODUCT_DATA } from "@/hooks/useTrackProductView";
import { AsSeenInLogos } from "@/components/home";
import { HowToUseSection } from "@/components/HowToUseSection";
import { StickyProductNav } from "@/components/StickyProductNav";
import { SocialMediaProof } from "@/components/SocialMediaProof";
import { PostATCUpsellModal } from "@/components/PostATCUpsellModal";
import { useUpsellStore } from "@/stores/upsellStore";

// Lazy load sections with carousels to reduce initial bundle
const VideoSection = lazy(() => import("@/components/VideoSection").then((mod) => ({ default: mod.VideoSection })));

// Fallback for lazy-loaded sections
const SectionFallback = () => (
  <div className="py-8 flex items-center justify-center text-sm text-muted-foreground">Loading...</div>
);

// Quiz CTA Component (same as Variant A)
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

// Inline CTA Component - captures users mid-page (uses A/B-aware product)
const InlineCTA = () => {
  const { product } = useABErgonomicPillow();
  const { addItem, setCartOpen } = useCartStore();
  const { openUpsell } = useUpsellStore();
  const [isAdding, setIsAdding] = useState(false);

  const handleAddToCart = async () => {
    if (!product) return;
    setIsAdding(true);
    try {
      // Product is already A/B-aware, just use first variant
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
      // Show upsell modal instead of cart drawer
      openUpsell(product.node.id);
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

const ErgonomicPillowProductVariantB = () => {
  useSEO(SEO_CONFIGS.ergonomicPillow);
  useTrackProductView(STATIC_PRODUCT_DATA["ergonomic-pillow"]);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const { isUpsellOpen, closeUpsell, triggerProductId } = useUpsellStore();

  // Capture neck pain preference on page load (first-touch model)
  useEffect(() => {
    setPillowFocusPreference('neck');
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Navigation - appears on scroll up */}
      <StickyProductNav />
      
      <ProductSchema
        name="RiseByNight Ergonomic Cervical Pillow"
        description="Doctor-recommended contour memory foam pillow for neck and shoulder pain relief. Rated 4.8★ by 1000+ verified customers."
        url="/products/ergonomic-pillow"
        price="59.99"
        ratingValue={4.8}
        reviewCount={6247}
      />
      
      {/* Variant B Hero - €59.99 pillow only, no mask */}
      <HeroVariantB />
      
      <Features />
      <ChiropractorEndorsement />
      
      {/* As Seen In - Authority logos for trust */}
      <AsSeenInLogos />
      
      <ProductBenefitsSection />
      <PainReliefSection />
      
      {/* Inline CTA after pain points */}
      <InlineCTA />
      
      {/* How to Use - 3 simple steps */}
      <HowToUseSection />
      
      <LookInside />

      {/* Customer Reviews Wall */}
      <ReviewsWall 
        productHandle="ergonomic-pillow"
        productName="Ergonomic Cervical Pillow"
        onWriteReview={() => setShowReviewForm(true)} 
      />
      
      {/* Social Media Proof - Customer posts */}
      <SocialMediaProof />

      {/* "See It In Action" video section - hidden per request */}
      {/* <Suspense fallback={<SectionFallback />}>
        <VideoSection />
      </Suspense> */}

      {/* Featured Customer Reviews Carousel - hidden per request */}
      {/* <Suspense fallback={<SectionFallback />}>
        <ReviewsSection />
      </Suspense> */}

      <ProductFAQSection />

      {/* Quiz CTA after FAQ */}
      <QuizCTA />

      <GuaranteeSection />
      
      {/* Sticky Add to Cart - Note: Variant B uses "Pillow Only" variant in Hero */}
      <StickyAddToCart productType="ergonomic-pillow" />

      {/* Review Submission Modal */}
      <ReviewSubmissionForm
        open={showReviewForm}
        onOpenChange={setShowReviewForm}
        productHandle="ergonomic-pillow"
      />
      
      {/* Post-ATC Upsell Modal */}
      <PostATCUpsellModal
        isOpen={isUpsellOpen}
        onClose={closeUpsell}
        triggerProductId={triggerProductId || undefined}
      />
    </div>
  );
};

export default ErgonomicPillowProductVariantB;
