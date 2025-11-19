import { Button } from "@/components/ui/button";
import { ArrowRight, Check, Star, Moon, Truck, RotateCcw, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import pillowMain from "@/assets/optisleep-pillow-main.png";
import comparisonChart from "@/assets/comparison-chart-new.png";
import testimonialImage from "@/assets/testimonial-new.png";
import reviewerErik from "@/assets/reviewer-erik.jpg";
import reviewerSofie from "@/assets/reviewer-sofie.jpg";
import reviewerHannah from "@/assets/reviewer-hannah.jpg";

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-12 md:py-20 bg-gradient-to-b from-background to-primary/5">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full">
                <Shield className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">The #1 Rated Orthopedic Pillow in the U.S.</span>
              </div>
              
              <h1 className="text-4xl md:text-6xl font-bold leading-tight">
                Wake Up Pain-Free with <span className="text-primary">RiseByNight</span>
              </h1>
              
              <p className="text-xl text-muted-foreground">
                Clinically proven ergonomic design that reduces neck pain and improves sleep quality. Join thousands who sleep better every night.
              </p>
              
              <div className="flex flex-wrap gap-4">
                <Link to="/product">
                  <Button size="lg" className="text-lg">
                    Shop Now <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link to="/product">
                  <Button size="lg" variant="outline" className="text-lg">
                    Learn More
                  </Button>
                </Link>
              </div>
              
              <div className="flex items-center gap-6 pt-4">
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-primary text-primary" />
                    ))}
                  </div>
                  <span className="font-semibold">4.8/5</span>
                </div>
                <div className="h-6 w-px bg-border" />
                <span className="text-muted-foreground">15,000+ Happy Sleepers</span>
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
              <img 
                src={pillowMain} 
                alt="RiseByNight Ergonomic Pillow" 
                className="relative z-10 w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-8 border-y bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="flex flex-col items-center gap-2">
              <Moon className="w-8 h-8 text-primary" />
              <h3 className="font-semibold">100 Nights Risk Free</h3>
              <p className="text-sm text-muted-foreground">Try it at home with no commitment</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Truck className="w-8 h-8 text-primary" />
              <h3 className="font-semibold">Free Shipping</h3>
              <p className="text-sm text-muted-foreground">Fast delivery to your door</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <RotateCcw className="w-8 h-8 text-primary" />
              <h3 className="font-semibold">Easy Returns</h3>
              <p className="text-sm text-muted-foreground">Hassle-free return process</p>
            </div>
          </div>
        </div>
      </section>

      {/* Key Benefits */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Why 15,000+ People Choose RiseByNight
            </h2>
            <p className="text-xl text-muted-foreground">
              Scientifically designed to solve your sleep problems
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                title: "Reduces Neck Pain",
                description: "Ergonomic contour design supports natural spinal alignment"
              },
              {
                title: "Cooling Technology",
                description: "Advanced gel layer prevents overheating and night sweats"
              },
              {
                title: "Lasts 3-5 Years",
                description: "High-density memory foam maintains its shape"
              },
              {
                title: "Better Sleep Quality",
                description: "Scientifically proven to improve overall sleep"
              }
            ].map((benefit, index) => (
              <div key={index} className="bg-card p-6 rounded-lg border">
                <Check className="w-8 h-8 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">{benefit.title}</h3>
                <p className="text-muted-foreground">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-16 md:py-24 bg-primary/5">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              RiseByNight vs Regular Pillows
            </h2>
            <p className="text-xl text-muted-foreground">
              See the difference that proper support makes
            </p>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <img 
              src={comparisonChart} 
              alt="RiseByNight vs Regular Pillows Comparison" 
              className="w-full rounded-lg shadow-lg"
            />
          </div>
          
          <div className="text-center mt-8">
            <Link to="/product">
              <Button size="lg" className="text-lg">
                Get RiseByNight Now <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Real People, Real Results
            </h2>
            <p className="text-xl text-muted-foreground">
              Join thousands who wake up refreshed every morning
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Erik",
                role: "Office Worker",
                image: reviewerErik,
                text: "My neck pain is completely gone. I sleep through the night now!"
              },
              {
                name: "Sofie",
                role: "Side Sleeper",
                image: reviewerSofie,
                text: "Finally found a pillow that doesn't hurt my shoulders. Life-changing!"
              },
              {
                name: "Hannah",
                role: "Busy Mom",
                text: "Best investment I've made. I wake up refreshed and ready for the day.",
                image: reviewerHannah
              }
            ].map((review, index) => (
              <div key={index} className="bg-card p-6 rounded-lg border">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-lg mb-4">"{review.text}"</p>
                <div className="flex items-center gap-3">
                  <img 
                    src={review.image} 
                    alt={review.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <p className="font-semibold">{review.name}</p>
                    <p className="text-sm text-muted-foreground">{review.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Limited Offer CTA */}
      <section className="py-16 md:py-24 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Limited Black Friday Offer
            </h2>
            <p className="text-xl mb-2 opacity-90">
              Buy 1 Get 1 FREE - Both for Just $89.99
            </p>
            <p className="text-lg mb-8 opacity-90">
              Plus Free Eye Mask Gift with 2-Pillow Bundle
            </p>
            
            <Link to="/product">
              <Button size="lg" variant="secondary" className="text-lg">
                Claim Your Deal Now <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            
            <div className="mt-8 flex items-center justify-center gap-6 text-sm opacity-90">
              <div className="flex items-center gap-2">
                <Moon className="w-4 h-4" />
                <span>100 Night Trial</span>
              </div>
              <div className="h-4 w-px bg-primary-foreground/30" />
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4" />
                <span>Free Shipping</span>
              </div>
              <div className="h-4 w-px bg-primary-foreground/30" />
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span>2 Year Warranty</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

