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

      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; 2025 OptiSleep. All rights reserved.</p>
        </div>
      </footer>

      <StickyAddToCart />
    </div>
  );
};

export default Index;
