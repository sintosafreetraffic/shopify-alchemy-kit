import { Heart, Moon, Target, Users, Award, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function AboutUs() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-full bg-primary/10 mb-6">
            <Moon className="w-8 h-8 md:w-10 md:h-10 text-primary" />
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            We Believe Everyone Deserves Better Sleep
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            At RiseByNight, we're on a mission to transform the way people sleep. Because quality sleep isn't a luxury—it's a fundamental right that powers longevity, performance, and quality of life.
          </p>
        </div>
      </section>

      {/* Mission Statement */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-semibold">
                <Target className="w-4 h-4" />
                OUR MISSION
              </div>
              
              <h2 className="text-3xl md:text-5xl font-bold">
                Making Quality Sleep Accessible to Everyone
              </h2>
              
              <p className="text-lg text-muted-foreground">
                We witnessed too many people struggling with poor sleep, suffering through neck pain, restless nights, and waking up exhausted. We knew there had to be a better way.
              </p>
              
              <p className="text-lg text-muted-foreground">
                That's why we created RiseByNight—to design sleep solutions that actually work, backed by science, and accessible to everyone who needs them.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-card border rounded-xl p-6 text-center space-y-2">
                <div className="text-4xl font-bold text-primary">30,000+</div>
                <p className="text-sm text-muted-foreground">Happy Customers</p>
              </div>
              
              <div className="bg-card border rounded-xl p-6 text-center space-y-2">
                <div className="text-4xl font-bold text-primary">96%</div>
                <p className="text-sm text-muted-foreground">Relief from Neck Pain</p>
              </div>
              
              <div className="bg-card border rounded-xl p-6 text-center space-y-2">
                <div className="text-4xl font-bold text-primary">93%</div>
                <p className="text-sm text-muted-foreground">Better Sleep Quality</p>
              </div>
              
              <div className="bg-card border rounded-xl p-6 text-center space-y-2">
                <div className="text-4xl font-bold text-primary">100</div>
                <p className="text-sm text-muted-foreground">Night Risk-Free Trial</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Sleep Matters */}
      <section className="py-16 md:py-24 bg-primary/5">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Why Sleep Is Everything
          </h2>
          
          <p className="text-xl text-muted-foreground mb-12 max-w-3xl mx-auto">
            Quality sleep isn't just about feeling rested—it's the foundation of a healthy, successful, fulfilling life.
          </p>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-background border rounded-xl p-8 space-y-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                <Heart className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-2xl font-bold">Longevity</h3>
              <p className="text-muted-foreground">
                Quality sleep strengthens your immune system, reduces disease risk, and adds years to your life. It's the ultimate anti-aging tool.
              </p>
            </div>
            
            <div className="bg-background border rounded-xl p-8 space-y-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                <Award className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-2xl font-bold">Performance</h3>
              <p className="text-muted-foreground">
                Better sleep means sharper focus, faster reaction time, improved memory, and peak physical performance. Sleep is your competitive advantage.
              </p>
            </div>
            
            <div className="bg-background border rounded-xl p-8 space-y-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-2xl font-bold">Quality of Life</h3>
              <p className="text-muted-foreground">
                Wake up energized, enjoy better mood, stronger relationships, and the mental clarity to truly enjoy every moment of your day.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Our Story</h2>
            <p className="text-xl text-muted-foreground">
              From personal struggle to global solution
            </p>
          </div>
          
          <div className="space-y-8 text-lg text-muted-foreground">
            <p>
              RiseByNight was born from a simple observation: millions of people suffer needlessly from poor sleep, yet most solutions on the market either don't work or are prohibitively expensive.
            </p>
            
            <p>
              We spent years researching sleep science, consulting with chiropractors and sleep specialists, and testing dozens of prototypes. Our goal was clear—create products that combine cutting-edge ergonomic design with premium materials, all at a price that makes sense.
            </p>
            
            <p>
              Today, we've helped over 30,000 people transform their sleep. But we're just getting started. Our vision is a world where everyone has access to the quality sleep they need to thrive.
            </p>
            
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-8 text-center">
              <p className="text-2xl font-bold text-foreground mb-2">
                "Quality sleep should be accessible to everyone, not a luxury for the few."
              </p>
              <p className="text-sm text-muted-foreground">— RiseByNight Founders</p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Commitment */}
      <section className="py-16 md:py-24 bg-primary/5">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Our Commitment to You</h2>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-background border rounded-xl p-6 space-y-3">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                <Award className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-bold">Premium Quality</h3>
              <p className="text-sm text-muted-foreground">
                Medical-grade materials, rigorously tested, built to last 3-5 years.
              </p>
            </div>
            
            <div className="bg-background border rounded-xl p-6 space-y-3">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-bold">Science-Backed Design</h3>
              <p className="text-sm text-muted-foreground">
                Every product designed with input from sleep specialists and chiropractors.
              </p>
            </div>
            
            <div className="bg-background border rounded-xl p-6 space-y-3">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                <Heart className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-bold">Customer First</h3>
              <p className="text-sm text-muted-foreground">
                100-night trial, 2-year warranty, and responsive customer support.
              </p>
            </div>
            
            <div className="bg-background border rounded-xl p-6 space-y-3">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                <Globe className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-bold">Global Impact</h3>
              <p className="text-sm text-muted-foreground">
                Free worldwide shipping, helping people sleep better everywhere.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-primary to-primary/80 text-primary-foreground">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Ready to Transform Your Sleep?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join 30,000+ people who've already discovered the difference quality sleep makes.
          </p>
          
          <Link to="/product/ergonomic-pillow">
            <Button size="lg" variant="secondary" className="text-lg px-8">
              Shop Our Bestseller
            </Button>
          </Link>
          
          <div className="mt-8 pt-8 border-t border-primary-foreground/20">
            <p className="text-sm opacity-75">
              100-Night Risk-Free Trial • Free Worldwide Shipping • 2-Year Warranty
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
