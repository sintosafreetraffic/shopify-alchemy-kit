// Performance: Below-fold components are lazy loaded to reduce initial bundle
// Products are prefetched for faster /products page navigation
import { Suspense, lazy, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, Users, Award, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import moonIcon from "@/assets/moon-icon-blue.png";
import HomeHero from "@/components/HomeHero";
import { fetchProducts, getBuyerCountrySync } from "@/lib/shopify";

// New homepage sections
import {
  SleeperPersonaDiscovery,
  TransformationStories,
  SleepCoachTeaser,
  AmbassadorWall,
  UGCTestimonialGrid,
  ScienceSection,
  MissionSection,
} from "@/components/home";

// Lazy load below-fold components
const ProductGallery = lazy(() =>
  import("@/components/ProductGallery").then((mod) => ({ default: mod.ProductGallery })),
);

// Fallback for lazy components
const SectionFallback = () => (
  <div className="py-16 flex items-center justify-center">
    <div className="animate-pulse text-muted-foreground">Loading...</div>
  </div>
);

export default function Home() {
  const queryClient = useQueryClient();

  // Prefetch products for faster /products page navigation
  useEffect(() => {
    const country = getBuyerCountrySync() ?? "unknown";
    queryClient.prefetchQuery({
      queryKey: ["shopify-products", country, 10, undefined],
      queryFn: () => fetchProducts(10),
      staleTime: 60 * 1000, // 1 minute
    });
  }, [queryClient]);

  return (
    <div className="min-h-screen">
      {/* Evergreen Quiz-First Hero */}
      <HomeHero />

      {/* Science Section - Target for "Why this works" link */}
      <ScienceSection />

      {/* Mission Section - Brand story and values */}
      <MissionSection />

      {/* Product Gallery - Lazy Loaded */}
      <Suspense fallback={<SectionFallback />}>
        <ProductGallery />
      </Suspense>

      {/* Sleeper Persona Discovery - Help visitors identify their type */}
      <SleeperPersonaDiscovery />

      {/* AI Sleep Coach Teaser */}
      <SleepCoachTeaser />

      {/* Why Choose Us */}
      <section className="py-8 md:py-12 bg-primary/5">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-6 md:mb-8">
              <h2 className="text-3xl md:text-4xl font-bold mb-3">Why Rise By Night?</h2>
              <p className="text-xl text-muted-foreground">Join thousands who've transformed their sleep experience</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4 md:gap-6">
              <div className="bg-background p-6 rounded-lg border">
                <div className="flex items-center gap-3 mb-3">
                  <Users className="w-10 h-10 text-primary flex-shrink-0" />
                  <h3 className="text-xl md:text-2xl font-bold">Thousands of Happy Sleepers</h3>
                </div>
                <p className="text-muted-foreground text-lg">
                  Our community of satisfied customers wakes up refreshed every morning, free from neck pain and
                  discomfort.
                </p>
              </div>

              <div className="bg-background p-6 rounded-lg border">
                <div className="flex items-center gap-3 mb-3">
                  <Award className="w-10 h-10 text-primary flex-shrink-0" />
                  <h3 className="text-xl md:text-2xl font-bold">#1 Rated Products</h3>
                </div>
                <p className="text-muted-foreground text-lg">
                  Scientifically tested and customer approved. Our products consistently receive top ratings for quality
                  and effectiveness.
                </p>
              </div>

              <div className="bg-background p-6 rounded-lg border">
                <div className="flex items-center gap-3 mb-3">
                  <img src={moonIcon} alt="" className="w-10 h-10 object-contain flex-shrink-0" />
                  <h3 className="text-xl md:text-2xl font-bold">100-Night Trial</h3>
                </div>
                <p className="text-muted-foreground text-lg">
                  Try our products risk-free for 100 nights. If you're not sleeping better, we'll refund you—no
                  questions asked.
                </p>
              </div>

              <div className="bg-background p-6 rounded-lg border">
                <div className="flex items-center gap-3 mb-3">
                  <Shield className="w-10 h-10 text-primary flex-shrink-0" />
                  <h3 className="text-xl md:text-2xl font-bold">Guaranteed sleep improvement</h3>
                </div>
                <p className="text-muted-foreground text-lg">
                  Experience better sleep quality from night one, or your money back—no questions asked.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Customer Experience Statistics */}
      <section className="py-8 md:py-12 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-6 md:mb-8">
              <h2 className="text-3xl md:text-4xl font-bold mb-3">What Our Customers Have Experienced</h2>
              <p className="text-base text-muted-foreground">Based on our survey of 1,750 people, both men and women.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-2 md:space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-bold">Reduced Snoring & Disruptions</h3>
                  <span className="text-2xl font-bold text-primary">86%</span>
                </div>
                <Progress value={86} className="h-3" aria-label="86% reduced snoring and disruptions" />
                <p className="text-sm text-muted-foreground">
                  Reported less frequent snoring or nighttime disruptions.*
                </p>
              </div>

              <div className="space-y-2 md:space-y-3">
                <div className="flex items-center justify-between mb-1 md:mb-2">
                  <h3 className="text-lg md:text-xl font-bold">Improved Sleep Quality</h3>
                  <span className="text-2xl font-bold text-primary">93%</span>
                </div>
                <Progress value={93} className="h-3" aria-label="93% improved sleep quality" />
                <p className="text-sm text-muted-foreground">
                  Experienced deeper, more restful sleep each night, without sleep apnea.
                </p>
              </div>

              <div className="space-y-2 md:space-y-3">
                <div className="flex items-center justify-between mb-1 md:mb-2">
                  <h3 className="text-lg md:text-xl font-bold">Relieved Chronic Neck Pain</h3>
                  <span className="text-2xl font-bold text-primary">96%</span>
                </div>
                <Progress value={96} className="h-3" aria-label="96% relieved chronic neck pain" />
                <p className="text-sm text-muted-foreground">
                  Felt significant relief from chronic neck pain after just the first night.
                </p>
              </div>

              <div className="space-y-2 md:space-y-3">
                <div className="flex items-center justify-between mb-1 md:mb-2">
                  <h3 className="text-lg md:text-xl font-bold">Enhanced Daily Focus</h3>
                  <span className="text-2xl font-bold text-primary">89%</span>
                </div>
                <Progress value={89} className="h-3" aria-label="89% enhanced daily focus" />
                <p className="text-sm text-muted-foreground">
                  Noticed a remarkable boost in focus and productivity throughout their day.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* UGC Testimonial Grid - Social Proof */}
      <UGCTestimonialGrid />

      {/* Transformation Stories */}
      <TransformationStories />

      {/* Ambassador Wall */}
      <AmbassadorWall />

      {/* Quiz CTA Section */}
      <section className="py-10 md:py-14 bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <p className="text-sm uppercase tracking-widest opacity-70 mb-3">Personalized For You</p>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold mb-4 tracking-tight">
              Not Sure Where to Start?
            </h2>
            <p className="text-base md:text-lg mb-6 opacity-90 leading-relaxed max-w-xl mx-auto">
              Take our short science-backed assessment to discover your sleeper type, get matched with the right products, and
              unlock your personalized AI Sleep Coach.
            </p>

            <Link to="/sleep-quiz">
              <Button size="lg" variant="secondary" className="text-lg px-10 py-6 rounded-full font-medium">
                Start the Sleep Assessment <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>

            <div className="mt-6 md:mt-8 pt-4 md:pt-6 border-t border-primary-foreground/20">
              <p className="text-sm font-medium opacity-80 tracking-wide">
                Free Shipping on €50+ • 100-Night Trial • 2-Year Warranty
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
