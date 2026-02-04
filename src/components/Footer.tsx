// Performance: Using OptimizedImage for lazy loading
import { useState } from "react";
import { Mail, MapPin, ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import moonIcon from "@/assets/moon-icon-blue.png";
import { FooterTrustBadges } from "./FooterTrustBadges";

export const Footer = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your email address");
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { error } = await supabase.functions.invoke("klaviyo-subscribe", {
        body: { 
          email, 
          source: "footer_newsletter" 
        },
      });

      if (error) throw error;
      
      toast.success("Thanks for subscribing! Check your inbox for sleep tips.");
      setEmail("");
    } catch (error) {
      console.error("Newsletter subscription error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <footer className="border-t bg-background text-foreground">
      {/* Newsletter Section */}
      <div className="bg-primary/5 border-b border-border/50">
        <div className="container mx-auto px-4 py-10">
          <div className="max-w-2xl mx-auto text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-primary uppercase tracking-wider">Exclusive Sleep Tips</span>
            </div>
            <h3 className="text-xl md:text-2xl font-semibold mb-2">Optimize Your Sleep Quality</h3>
            <p className="text-muted-foreground mb-6">
              Get science-backed tips, exclusive offers, and sleep optimization strategies delivered to your inbox.
            </p>
            <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1"
                disabled={isSubmitting}
              />
              <Button type="submit" disabled={isSubmitting} className="whitespace-nowrap">
                {isSubmitting ? "Subscribing..." : "Subscribe"}
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </form>
            <p className="text-xs text-muted-foreground mt-3">
              Join thousands of sleepers. Unsubscribe anytime.
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Column */}
          <div className="space-y-4">
            <img src={moonIcon} alt="Rise By Night" className="w-12 h-12 object-contain" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              Science-backed sleep solutions designed to help you wake refreshed and perform at your best.
            </p>
          </div>

          {/* Quick Links & Customer Service - Side by Side on Mobile */}
          <div className="grid grid-cols-2 gap-6 md:contents">
            {/* Quick Links */}
            <div>
              <h3 className="font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    to="/sleep-quiz"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Sleep Assessment
                  </Link>
                </li>
                <li>
                  <Link to="/benefits" className="text-muted-foreground hover:text-foreground transition-colors">
                    Benefits
                  </Link>
                </li>
                <li>
                  <Link to="/reviews" className="text-muted-foreground hover:text-foreground transition-colors">
                    Reviews
                  </Link>
                </li>
                <li>
                  <Link to="/faq" className="text-muted-foreground hover:text-foreground transition-colors">
                    FAQ
                  </Link>
                </li>
                <li>
                  <Link to="/guarantee" className="text-muted-foreground hover:text-foreground transition-colors">
                    Guarantee
                  </Link>
                </li>
                <li>
                  <Link to="/sleep-guides" className="text-muted-foreground hover:text-foreground transition-colors">
                    Sleep Guides
                  </Link>
                </li>
                <li>
                  <Link to="/collective" className="text-muted-foreground hover:text-foreground transition-colors">
                    Sleep Collective
                  </Link>
                </li>
                <li>
                  <Link to="/track" className="text-muted-foreground hover:text-foreground transition-colors">
                    Track Order
                  </Link>
                </li>
              </ul>
            </div>

            {/* Customer Service */}
            <div>
              <h3 className="font-semibold mb-4">Customer Service</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link to="/shipping" className="text-muted-foreground hover:text-foreground transition-colors">
                    Shipping Information
                  </Link>
                </li>
                <li>
                  <Link to="/return-policy" className="text-muted-foreground hover:text-foreground transition-colors">
                    Return Policy
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
                    Terms & Conditions
                  </Link>
                </li>
                <li>
                  <Link to="/privacy-policy" className="text-muted-foreground hover:text-foreground transition-colors">
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="font-semibold mb-4">Contact Us</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <Mail className="w-4 h-4 text-foreground shrink-0 mt-0.5" />
                <a
                  href="mailto:support@risebynight.com"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  support@risebynight.com
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-foreground shrink-0 mt-0.5" />
                <span className="text-muted-foreground">Loofdakstraat 10, 3036JN, ROTTERDAM</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Trust Badges Section */}
        <div className="border-t border-border mt-8 pt-8">
          <FooterTrustBadges />
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; 2025 Rise By Night. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};
