import { CartDrawer } from "./CartDrawer";
import { NavLink } from "./NavLink";
import { Link } from "react-router-dom";
import logo from "@/assets/risebynight-logo-full.png";
import { useState, useEffect } from "react";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export const Header = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isAtTop, setIsAtTop] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Check if we're at the top
      setIsAtTop(currentScrollY < 10);

      // Show header when scrolling up, hide when scrolling down
      if (currentScrollY < 10) {
        setIsVisible(true);
      } else if (currentScrollY < lastScrollY) {
        // Scrolling up - show header
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY) {
        // Scrolling down - hide header immediately
        setIsVisible(false);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [lastScrollY]);

  return (
    <header 
      className={`${isAtTop ? 'relative' : 'fixed top-[36px]'} left-0 right-0 z-50 border-b bg-background transition-all duration-300 ${
        !isAtTop && !isVisible ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      <div className="container mx-auto px-4 py-2 flex md:grid md:grid-cols-3 items-center">
        {/* Mobile Menu Button - Left */}
        <div className="flex items-center md:hidden">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="mr-2">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] overflow-y-auto z-[45] top-[77px] h-[calc(100vh-77px)]">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              
              {/* Main Navigation */}
              <nav className="flex flex-col gap-4 mt-6">
                <NavLink 
                  to="/" 
                  className="text-lg text-foreground hover:text-primary transition-colors py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Home
                </NavLink>
                <NavLink 
                  to="/about" 
                  className="text-lg text-foreground hover:text-primary transition-colors py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  About Us
                </NavLink>
                <NavLink 
                  to="/track" 
                  className="text-lg text-foreground hover:text-primary transition-colors py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Track Your Order
                </NavLink>
              </nav>

              {/* Customer Service Section */}
              <div className="mt-6 pt-6 border-t">
                <h3 className="text-sm font-semibold text-foreground mb-3">Customer Service</h3>
                <nav className="flex flex-col gap-3">
                  <NavLink 
                    to="/shipping" 
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Shipping Information
                  </NavLink>
                  <NavLink 
                    to="/return-policy" 
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Return Policy
                  </NavLink>
                  <NavLink 
                    to="/terms" 
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Terms & Conditions
                  </NavLink>
                  <NavLink 
                    to="/privacy" 
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Privacy Policy
                  </NavLink>
                </nav>
              </div>

              {/* Quick Links Section */}
              <div className="mt-6 pt-6 border-t">
                <h3 className="text-sm font-semibold text-foreground mb-3">Quick Links</h3>
                <nav className="flex flex-col gap-3">
                  <NavLink 
                    to="/benefits" 
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Benefits
                  </NavLink>
                  <NavLink 
                    to="/reviews" 
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Reviews
                  </NavLink>
                  <NavLink 
                    to="/faq" 
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    FAQ
                  </NavLink>
                  <NavLink 
                    to="/guarantee" 
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Guarantee
                  </NavLink>
                </nav>
              </div>

              {/* Contact Information */}
              <div className="mt-6 pt-6 border-t">
                <h3 className="text-sm font-semibold text-foreground mb-3">Contact Us</h3>
                <div className="text-sm text-muted-foreground space-y-2">
                  <a 
                    href="mailto:support@risebynight.com" 
                    className="block hover:text-primary transition-colors"
                  >
                    support@risebynight.com
                  </a>
                  <p className="text-xs leading-relaxed">
                    Loofdakstraat 10, 3036JN, ROTTERDAM
                  </p>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Logo - Left on desktop, after menu button on mobile */}
        <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
          <img 
            src={logo} 
            alt="RiseByNight - Ergonomic Sleep Pillow" 
            className="h-10 md:h-12 w-auto object-contain"
          />
        </Link>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center justify-center gap-4 lg:gap-8 mt-3 whitespace-nowrap">
          <NavLink to="/" className="text-base lg:text-lg text-foreground hover:text-primary transition-colors whitespace-nowrap">Home</NavLink>
          <NavLink to="/about" className="text-base lg:text-lg text-foreground hover:text-primary transition-colors whitespace-nowrap">About Us</NavLink>
          <NavLink to="/track" className="text-base lg:text-lg text-foreground hover:text-primary transition-colors whitespace-nowrap">Track Your Order</NavLink>
        </nav>
        
        {/* Cart - Right */}
        <div className="flex items-center justify-end ml-auto">
          <CartDrawer />
        </div>
      </div>
    </header>
  );
};
