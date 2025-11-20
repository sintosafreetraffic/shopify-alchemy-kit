import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, Moon, Heart, Sparkles, Shield, Users, Award } from "lucide-react";
import { Link } from "react-router-dom";
import { ProductGallery } from "@/components/ProductGallery";
import heroLogo from "@/assets/moon-logo-yellow-transparent.png";

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 bg-gradient-to-b from-background via-primary/5 to-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center justify-center w-24 h-24 mb-4">
              <img src={heroLogo} alt="RiseByNight" className="w-full h-full" />
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight">
              Transform Your Sleep,<br />
              <span className="text-primary">Transform Your Life</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
              At RiseByNight, we're dedicated to helping people achieve the restorative sleep they deserve. Through innovative design and premium materials, we create sleep solutions that make a real difference.
            </p>
            
            <div className="flex flex-wrap justify-center gap-4 pt-4">
              <Link to="/product">
                <Button size="lg" className="text-lg px-8">
                  Explore Our Products <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-5xl font-bold mb-4">Our Mission</h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Poor sleep doesn't just leave you tired—it affects your health, productivity, mood, and overall quality of life. Millions struggle with chronic pain, restless nights, and wake up exhausted every morning. We believe this has to change. That's why we're urgently committed to creating innovative, science-backed sleep solutions that help everyone achieve the restorative sleep they desperately need.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-background p-8 rounded-lg border text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <Heart className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">Sleep Wellness</h3>
                <p className="text-muted-foreground">
                  We're passionate about improving sleep health through ergonomic design and premium materials that support your body naturally.
                </p>
              </div>

              <div className="bg-background p-8 rounded-lg border text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">Innovation</h3>
                <p className="text-muted-foreground">
                  Combining cutting-edge sleep science with thoughtful design to create products that truly make a difference in your rest.
                </p>
              </div>

              <div className="bg-background p-8 rounded-lg border text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <Shield className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">Quality Promise</h3>
                <p className="text-muted-foreground">
                  Every product is crafted with care, tested rigorously, and backed by our commitment to your satisfaction and long-lasting quality.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Product Gallery */}
      <ProductGallery />

      {/* Why Choose Us */}
      <section className="py-16 md:py-24 bg-primary/5">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-5xl font-bold mb-4">Why RiseByNight?</h2>
              <p className="text-xl text-muted-foreground">
                Join thousands who've transformed their sleep experience
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-background p-8 rounded-lg border">
                <Users className="w-12 h-12 text-primary mb-4" />
                <h3 className="text-2xl font-bold mb-3">15,000+ Happy Sleepers</h3>
                <p className="text-muted-foreground text-lg">
                  Our community of satisfied customers wakes up refreshed every morning, free from neck pain and discomfort.
                </p>
              </div>

              <div className="bg-background p-8 rounded-lg border">
                <Award className="w-12 h-12 text-primary mb-4" />
                <h3 className="text-2xl font-bold mb-3">#1 Rated Products</h3>
                <p className="text-muted-foreground text-lg">
                  Clinically tested and customer approved. Our products consistently receive top ratings for quality and effectiveness.
                </p>
              </div>

              <div className="bg-background p-8 rounded-lg border">
                <Moon className="w-12 h-12 text-primary mb-4" />
                <h3 className="text-2xl font-bold mb-3">100-Night Trial</h3>
                <p className="text-muted-foreground text-lg">
                  Try our products risk-free for 100 nights. If you're not sleeping better, we'll refund you—no questions asked.
                </p>
              </div>

              <div className="bg-background p-8 rounded-lg border">
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
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-5xl font-bold mb-4">
                What Our Customers Have Experienced
              </h2>
              <p className="text-lg text-muted-foreground">
                Based on our survey of 1,750 people, both men and women.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-bold">Reduced Snoring & Disruptions</h3>
                  <span className="text-2xl font-bold text-primary">86%</span>
                </div>
                <Progress value={86} className="h-3" />
                <p className="text-sm text-muted-foreground">
                  Reported less frequent snoring or nighttime disruptions.*
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-bold">Improved Sleep Quality</h3>
                  <span className="text-2xl font-bold text-primary">93%</span>
                </div>
                <Progress value={93} className="h-3" />
                <p className="text-sm text-muted-foreground">
                  Experienced deeper, more restful sleep each night, without sleep apnea.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-bold">Relieved Chronic Neck Pain</h3>
                  <span className="text-2xl font-bold text-primary">96%</span>
                </div>
                <Progress value={96} className="h-3" />
                <p className="text-sm text-muted-foreground">
                  Felt significant relief from chronic neck pain after just the first night.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-bold">Enhanced Daily Focus</h3>
                  <span className="text-2xl font-bold text-primary">89%</span>
                </div>
                <Progress value={89} className="h-3" />
                <p className="text-sm text-muted-foreground">
                  Noticed a remarkable boost in focus and productivity throughout their day.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Ready for Better Sleep?
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Join our community and discover the difference quality sleep makes in your life.
            </p>
            
            <Link to="/product">
              <Button size="lg" variant="secondary" className="text-lg px-8">
                Shop Our Products <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            
            <div className="mt-8 pt-8 border-t border-primary-foreground/20">
              <p className="text-sm opacity-75 mb-2">Free Shipping • 100-Night Trial • 2-Year Warranty</p>
              <p className="text-xs opacity-60">Limited Black Friday Offer: Buy 1 Get 1 FREE on select products</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

