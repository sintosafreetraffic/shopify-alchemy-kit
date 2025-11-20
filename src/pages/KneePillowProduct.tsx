import { UrgencyBanner } from "@/components/UrgencyBanner";
import { Guarantee } from "@/components/Guarantee";
import { StickyAddToCart } from "@/components/StickyAddToCart";
import { KneePillowHero } from "@/components/KneePillowHero";
import { KneePillowFeatures } from "@/components/KneePillowFeatures";
import { KneePillowPainRelief } from "@/components/KneePillowPainRelief";
import { KneePillowFAQ } from "@/components/KneePillowFAQ";
import { ReviewsSection } from "@/components/ReviewsSection";

const KneePillowProduct = () => {
  return (
    <div className="min-h-screen bg-background">
      <UrgencyBanner />
      <KneePillowHero />
      <KneePillowFeatures />
      <KneePillowPainRelief />
      <ReviewsSection />
      <KneePillowFAQ />
      <Guarantee />
      <StickyAddToCart productType="knee-pillow" />
    </div>
  );
};

export default KneePillowProduct;
