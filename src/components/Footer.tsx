// Performance: Using OptimizedImage for lazy loading
import { Mail, MapPin, ArrowRight } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import moonIcon from "@/assets/moon-icon-blue.png";

export const Footer = () => {
  const location = useLocation();
  const isHomePage = location.pathname === "/";

  return (
    <footer className="border-t bg-background text-foreground">
      {/* Quiz CTA Banner - Only show on home page */}
      {isHomePage && (
        <div className="bg-muted/30 border-b border-border/50">
          <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 max-w-4xl mx-auto">
              <div className="text-center md:text-left">
                <p className="font-semibold text-foreground mb-1">Discover Your Sleeper Type</p>
                <p className="text-sm text-muted-foreground">
                  Take our short science-backed assessment and get personalized sleep recommendations.
                </p>
              </div>
              <Link to="/sleep-quiz">
                <Button size="sm" className="rounded-full px-6">
                  Take the Assessment <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

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
                  <Link to="/collective" className="text-muted-foreground hover:text-foreground transition-colors">
                    Sleep Collective
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

        {/* Bottom Bar */}
        <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; 2025 Rise By Night. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};
