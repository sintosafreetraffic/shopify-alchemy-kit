import { UrgencyBanner } from "@/components/UrgencyBanner";
import { Guarantee } from "@/components/Guarantee";
import { StickyAddToCart } from "@/components/StickyAddToCart";
import { KneePillowHero } from "@/components/KneePillowHero";
import { KneePillowFeatures } from "@/components/KneePillowFeatures";
import { KneePillowBenefits } from "@/components/KneePillowBenefits";
import { KneePillowPainRelief } from "@/components/KneePillowPainRelief";
import { KneePillowChiropractorEndorsement } from "@/components/KneePillowChiropractorEndorsement";
import { KneePillowLookInside } from "@/components/KneePillowLookInside";
import { ReviewsSection } from "@/components/ReviewsSection";
import { KneePillowVideoSection } from "@/components/KneePillowVideoSection";
import { KneePillowFAQ } from "@/components/KneePillowFAQ";

const KneePillowProduct = () => {
  return (
    <div className="min-h-screen bg-background">
      <UrgencyBanner />
      <KneePillowHero />
      <KneePillowFeatures />
      <KneePillowBenefits />
      <KneePillowPainRelief />
      <KneePillowChiropractorEndorsement />
      <KneePillowLookInside />
      <ReviewsSection />
      <KneePillowVideoSection />
      <KneePillowFAQ />
      <Guarantee />
      <StickyAddToCart productType="knee-pillow" />
    </div>
  );
};

export default KneePillowProduct;
