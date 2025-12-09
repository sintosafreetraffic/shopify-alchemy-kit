import logo from "@/assets/moon-icon.png";
import { Mail, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

export const Footer = () => {
  return (
    <footer className="border-t bg-white text-foreground">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Column */}
          <div className="space-y-4">
            <img 
              src={logo} 
              alt="Rise By Night" 
              width={48}
              height={48}
              className="h-12 w-auto"
              loading="lazy"
              decoding="async"
            />
            <p className="text-sm text-muted-foreground">
              Transform your sleep with the #1 rated ergonomic pillow. Scientifically proven to reduce neck pain and help you wake up refreshed every morning.
            </p>
          </div>

          {/* Quick Links & Customer Service - Side by Side on Mobile */}
          <div className="grid grid-cols-2 gap-6 md:contents">
            {/* Quick Links */}
            <div>
              <h3 className="font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link to="/sleep-quiz" className="text-muted-foreground hover:text-foreground transition-colors">
                    Sleep Quiz
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
                <a href="mailto:support@risebynight.com" className="text-muted-foreground hover:text-foreground transition-colors">
                  support@risebynight.com
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-foreground shrink-0 mt-0.5" />
                <span className="text-muted-foreground">
                  Loofdakstraat 10, 3036JN, ROTTERDAM
                </span>
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
