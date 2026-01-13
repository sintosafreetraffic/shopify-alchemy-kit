/**
 * Ergonomic Pillow Product Page - Variant B (Maximum Conversion)
 * 
 * Aggressive conversion optimization with:
 * - Urgency announcement bar
 * - Exit intent popup
 * - Enhanced social proof
 * - Multiple CTAs throughout the page
 */

import { Suspense, lazy, useState } from "react";
import { Link } from "react-router-dom";
import { HeroVariantB } from "@/components/ab-testing/HeroVariantB";
import { ProductBenefitsSection } from "@/components/ProductBenefitsSection";
import { GuaranteeSection } from "@/components/GuaranteeSection";
import { useHeaderHeight } from "@/hooks/useHeaderHeight";
import { Features } from "@/components/Features";
import { ProductFAQSection } from "@/components/ProductFAQSection";
import { LookInside } from "@/components/LookInside";
import { PainReliefSection } from "@/components/PainReliefSection";
import { ChiropractorEndorsement } from "@/components/ChiropractorEndorsement";
import { StickyAddToCart } from "@/components/StickyAddToCart";
import { Button } from "@/components/ui/button";
import { ArrowRight, Gift, ShoppingCart } from "lucide-react";
import { ReviewsWall, ReviewSubmissionForm } from "@/components/reviews";
import { ReviewsSection } from "@/components/ReviewsSection";
import { SocialProofToast, MorningPuffinessSection } from "@/components/ab-testing/UrgencyElements";
import { UrgencyAnnouncementBar } from "@/components/ab-testing/UrgencyAnnouncementBar";
import { ExitIntentPopup } from "@/components/ab-testing/ExitIntentPopup";
import { CountdownTimerDisplay } from "@/components/CountdownTimer";
import { useCartStore } from "@/stores/cartStore";

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

// Inline CTA - used between sections
const InlineCTA = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  return (
    <div className="py-6 bg-gradient-to-r from-green-50 to-emerald-50 border-y border-green-200">
      <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-center gap-4">
        <div className="text-center md:text-left">
          <p className="text-sm font-semibold text-green-800">
            🎁 Limited Time: FREE Sleep Mask Included
          </p>
          <p className="text-xs text-green-600">
            Order now and save + get free shipping
          </p>
        </div>
        <Button 
          onClick={scrollToTop}
          className="bg-green-600 hover:bg-green-500 text-white font-bold px-6"
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          Claim Your Pillow Now
        </Button>
      </div>
    </div>
  );
};

// Quiz CTA Component - with urgency twist
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

// Final CTA before guarantee
const FinalCTA = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  return (
    <section className="py-10 bg-gradient-to-r from-red-600 via-red-500 to-orange-500 text-white">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-2xl md:text-3xl font-bold mb-2">
          Don't Wake Up With Neck Pain Tomorrow
        </h2>
        <p className="text-white/90 mb-4 max-w-xl mx-auto">
          Join 250,000+ happy sleepers who transformed their sleep with our ergonomic pillow.
        </p>
        <div className="flex flex-col items-center gap-3">
          <Button 
            size="lg"
            onClick={scrollToTop}
            className="bg-white text-red-600 hover:bg-gray-100 font-bold text-lg px-8 h-14"
          >
            <Gift className="h-5 w-5 mr-2" />
            Claim Your Pillow + FREE Gift
          </Button>
          <div className="flex items-center gap-2 text-sm text-white/80">
            <span>⏰ Offer ends in:</span>
            <CountdownTimerDisplay />
          </div>
        </div>
      </div>
    </section>
  );
};

const ErgonomicPillowProductVariantB = () => {
  const [showReviewForm, setShowReviewForm] = useState(false);
  const { setCartOpen } = useCartStore();
  const headerHeight = useHeaderHeight();

  return (
    <div className="min-h-screen bg-background" style={{ paddingTop: Math.max(headerHeight - 40, 0) }}>
      {/* Urgency Announcement Bar - Top of page with proper spacing */}
      <UrgencyAnnouncementBar />
      
      {/* Variant B Hero with urgency elements */}
      <HeroVariantB />
      
      <Features />
      
      {/* Inline CTA after features */}
      <InlineCTA />
      
      {/* Morning Puffiness Section - Variant B specific */}
      <section className="py-8 md:py-12 bg-muted/20">
        <div className="container mx-auto px-4">
          <MorningPuffinessSection className="max-w-2xl mx-auto" />
        </div>
      </section>
      
      <ProductBenefitsSection />
      <PainReliefSection />
      
      {/* Inline CTA after pain relief */}
      <InlineCTA />
      
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
      
      {/* Final CTA with strong urgency */}
      <FinalCTA />

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
      
      {/* Exit Intent Popup */}
      <ExitIntentPopup onClaim={() => setCartOpen(true)} />
    </div>
  );
};

export default ErgonomicPillowProductVariantB;
