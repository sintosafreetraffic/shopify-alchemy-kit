import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { UrgencyBanner } from "@/components/UrgencyBanner";
import { Benefits } from "@/components/Benefits";
import { VideoSection } from "@/components/VideoSection";
import { Guarantee } from "@/components/Guarantee";
import { Features } from "@/components/Features";
import { FAQ } from "@/components/FAQ";
import { ReviewsSection } from "@/components/ReviewsSection";
import { LookInside } from "@/components/LookInside";
import { PainReliefSection } from "@/components/PainReliefSection";
import { ChiropractorEndorsement } from "@/components/ChiropractorEndorsement";
import { StickyAddToCart } from "@/components/StickyAddToCart";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <UrgencyBanner />
      <Header />
      <Hero />
      <Features />
      <Benefits />
      <PainReliefSection />
      <ChiropractorEndorsement />
      <LookInside />
      <ReviewsSection />
      <VideoSection />
      <FAQ />
      <Guarantee />

      <Footer />

      <StickyAddToCart />
    </div>
  );
};

export default Index;
