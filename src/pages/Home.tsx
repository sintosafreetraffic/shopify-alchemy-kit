// Performance: Hero images use WebP with multi-resolution srcset and eager loading for LCP
// Below-fold components are lazy loaded to reduce initial bundle
import { Suspense, lazy } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, Heart, Sparkles, Shield, Users, Award } from "lucide-react";
import { Link } from "react-router-dom";
import OptimizedImage from "@/components/OptimizedImage";
import moonIcon from "@/assets/moon-icon-blue.png";

// New homepage sections
import {
  SleeperPersonaDiscovery,
  TransformationStories,
  SleepCoachTeaser,
  AmbassadorWall,
  UGCTestimonialGrid,
} from "@/components/home";

// Multi-resolution hero images for responsive loading
import heroDesktop1920 from "@/assets/hero-christmas-desktop.webp";
import heroDesktop1280 from "@/assets/hero-christmas-1280.webp";
import heroDesktop768 from "@/assets/hero-christmas-768.webp";
import heroMobile from "@/assets/hero-mobile-600.webp";

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
  return (
    <div className="min-h-screen">
      {/* Lifestyle Hero Image - Responsive with multi-resolution srcset */}
      <section className="relative w-full">
        <picture>
          {/* Mobile: portrait orientation, optimized for small screens */}
          <source media="(max-width: 767px)" srcSet={heroMobile} width={600} height={800} />
          {/* Tablet: medium desktop image */}
          <source media="(max-width: 1023px)" srcSet={heroDesktop768} width={768} height={432} />
          {/* Small desktop: 1280px variant */}
          <source media="(max-width: 1439px)" srcSet={heroDesktop1280} width={1280} height={720} />
          {/* Large desktop: full resolution */}
          <source media="(min-width: 1440px)" srcSet={heroDesktop1920} width={1920} height={1080} />
          {/* Fallback img with LCP optimization */}
          <img
            src={heroDesktop1280}
            alt="Peaceful sleep with Rise By Night"
            width={1280}
            height={720}
            loading="eager"
            fetchPriority="high"
            decoding="sync"
            className="w-full h-[60vh] md:h-[70vh] object-cover"
          />
        </picture>

        {/* Overlay content */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/40 flex items-end justify-center pb-12 md:pb-16 px-4">
          <div className="animate-fade-in text-center">
            <p className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-semibold text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
              Buy 1 Get 1 Free
            </p>
            <Link to="/product/ergonomic-pillow">
              <Button size="lg" className="mt-4 md:mt-6 text-base md:text-lg px-6 md:px-8 py-5 md:py-6">
                Get Yours Now
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Hero Section */}
      <section className="relative py-12 md:py-16 bg-gradient-to-b from-background via-primary/5 to-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold leading-tight tracking-tight">
              Transform Your Sleep,
              <br />
              <span className="text-primary">Transform Your Life</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Science-backed sleep solutions designed to help you wake refreshed, move freely, and perform at your
              best—every single day.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
              <Link to="/sleep-quiz">
                <Button size="lg" className="text-base md:text-lg px-8 py-6 rounded-full">
                  Take the Sleep Assessment <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link to="/product/ergonomic-pillow">
                <Button
                  variant="outline"
                  size="lg"
                  className="text-base md:text-lg px-8 py-6 rounded-full border-primary/30"
                >
                  Explore Products
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-12 md:py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-5xl font-bold mb-4">Our Mission</h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Poor sleep doesn't just leave you tired—it affects your health, productivity, mood, and overall quality
                of life. Millions struggle with chronic pain, restless nights, and wake up exhausted every morning. We
                believe this has to change. That's why we're urgently committed to creating innovative, science-backed
                sleep solutions that help everyone achieve the restorative sleep they desperately need.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-background p-6 rounded-lg border text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <Heart className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">Sleep Wellness</h3>
                <p className="text-muted-foreground">
                  We're passionate about improving sleep health through ergonomic design and premium materials that
                  support your body naturally.
                </p>
              </div>

              <div className="bg-background p-6 rounded-lg border text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">Innovation</h3>
                <p className="text-muted-foreground">
                  Combining cutting-edge sleep science with thoughtful design to create products that truly make a
                  difference in your rest.
                </p>
              </div>

              <div className="bg-background p-6 rounded-lg border text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <Shield className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">Quality Promise</h3>
                <p className="text-muted-foreground">
                  Every product is crafted with care, tested rigorously, and backed by our commitment to your
                  satisfaction and long-lasting quality.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Product Gallery - Lazy Loaded */}
      <Suspense fallback={<SectionFallback />}>
        <ProductGallery />
      </Suspense>

      {/* Sleeper Persona Discovery - Help visitors identify their type */}
      <SleeperPersonaDiscovery />

      {/* AI Sleep Coach Teaser */}
      <SleepCoachTeaser />

      {/* Why Choose Us */}
      <section className="py-12 md:py-16 bg-primary/5">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold mb-3">Why Rise By Night?</h2>
              <p className="text-xl text-muted-foreground">Join thousands who've transformed their sleep experience</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-background p-6 rounded-lg border">
                <Users className="w-12 h-12 text-primary mb-4" />
                <h3 className="text-2xl font-bold mb-3">15,000+ Happy Sleepers</h3>
                <p className="text-muted-foreground text-lg">
                  Our community of satisfied customers wakes up refreshed every morning, free from neck pain and
                  discomfort.
                </p>
              </div>

              <div className="bg-background p-6 rounded-lg border">
                <Award className="w-12 h-12 text-primary mb-4" />
                <h3 className="text-2xl font-bold mb-3">#1 Rated Products</h3>
                <p className="text-muted-foreground text-lg">
                  Scientifically tested and customer approved. Our products consistently receive top ratings for quality
                  and effectiveness.
                </p>
              </div>

              <div className="bg-background p-6 rounded-lg border">
                <img src={moonIcon} alt="" className="w-12 h-12 object-contain mb-4" />
                <h3 className="text-2xl font-bold mb-3">100-Night Trial</h3>
                <p className="text-muted-foreground text-lg">
                  Try our products risk-free for 100 nights. If you're not sleeping better, we'll refund you—no
                  questions asked.
                </p>
              </div>

              <div className="bg-background p-6 rounded-lg border">
                <Shield className="w-12 h-12 text-primary mb-4" />
                <h3 className="text-2xl font-bold mb-3">Guaranteed sleep improvement</h3>
                <p className="text-muted-foreground text-lg">
                  Experience better sleep quality from night one, or your money back—no questions asked.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Customer Experience Statistics */}
      <section className="py-12 md:py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold mb-3">What Our Customers Have Experienced</h2>
              <p className="text-base text-muted-foreground">Based on our survey of 1,750 people, both men and women.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-bold">Reduced Snoring & Disruptions</h3>
                  <span className="text-2xl font-bold text-primary">86%</span>
                </div>
                <Progress value={86} className="h-3" aria-label="86% reduced snoring and disruptions" />
                <p className="text-sm text-muted-foreground">
                  Reported less frequent snoring or nighttime disruptions.*
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-bold">Improved Sleep Quality</h3>
                  <span className="text-2xl font-bold text-primary">93%</span>
                </div>
                <Progress value={93} className="h-3" aria-label="93% improved sleep quality" />
                <p className="text-sm text-muted-foreground">
                  Experienced deeper, more restful sleep each night, without sleep apnea.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-bold">Relieved Chronic Neck Pain</h3>
                  <span className="text-2xl font-bold text-primary">96%</span>
                </div>
                <Progress value={96} className="h-3" aria-label="96% relieved chronic neck pain" />
                <p className="text-sm text-muted-foreground">
                  Felt significant relief from chronic neck pain after just the first night.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-bold">Enhanced Daily Focus</h3>
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
      <section className="py-14 md:py-20 bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <p className="text-sm uppercase tracking-widest opacity-70 mb-3">Personalized For You</p>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold mb-4 tracking-tight">
              Not Sure Where to Start?
            </h2>
            <p className="text-base md:text-lg mb-6 opacity-90 leading-relaxed max-w-xl mx-auto">
              Take our 5-minute Sleep Assessment to discover your sleeper type, get matched with the right products, and
              unlock your personalized AI Sleep Coach.
            </p>

            <Link to="/sleep-quiz">
              <Button size="lg" variant="secondary" className="text-lg px-10 py-6 rounded-full font-medium">
                Start the Sleep Assessment <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>

            <div className="mt-8 pt-6 border-t border-primary-foreground/20">
              <p className="text-sm font-medium opacity-80 tracking-wide">
                Free Shipping on $50+ • 100-Night Trial • 2-Year Warranty
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
