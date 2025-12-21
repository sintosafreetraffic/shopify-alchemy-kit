import { CartDrawer } from "./CartDrawer";
import { NavLink } from "./NavLink";
import { Link } from "react-router-dom";
import logo from "@/assets/risebynight-logo-official.png";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/stores/uiStore";
import { useThrottledScroll } from "@/hooks/useThrottledScroll";
import { useIsMobile } from "@/hooks/use-mobile";

export const Header = () => {
  const { isVisible } = useThrottledScroll();
  const isMobile = useIsMobile();
  const { isMobileMenuOpen, setMobileMenuOpen } = useUIStore();

  // Mobile: always visible (no transform animations to prevent GPU glitches)
  // Desktop: hide/show on scroll
  const shouldHide = !isMobile && !isVisible;

  return (
    <header 
      data-header-main
      className={`fixed top-[36px] left-0 right-0 z-[75] border-b bg-background ${
        isMobile 
          ? '' // Mobile: no transitions, always visible
          : `transition-transform duration-300 ease-out ${shouldHide ? "-translate-y-[calc(100%+36px)]" : "translate-y-0"}`
      }`}
    >
      <div className="container mx-auto px-4 py-2 relative flex md:grid md:grid-cols-3 items-center">
        {/* Mobile Menu Button - Absolute Left on Mobile */}
        <div className="absolute left-4 md:static flex items-center md:hidden">
          <Sheet open={isMobileMenuOpen} onOpenChange={setMobileMenuOpen} modal={false}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="mr-2" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent 
              side="left" 
              className="w-[280px] z-[45] top-[77px] h-[calc(100vh-77px)] overflow-y-auto pb-6"
            >
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
                  to="/sleep-guides" 
                  className="text-lg text-foreground hover:text-primary transition-colors py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sleep Guides
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
                    to="/privacy-policy" 
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

        {/* Logo - Centered on Mobile, Left on Desktop */}
        <Link to="/" className="flex items-center justify-center md:justify-start hover:opacity-80 transition-opacity mx-auto md:mx-0 h-12 md:h-14">
          <img 
            src={logo} 
            alt="Rise By Night - Ergonomic Sleep Pillow" 
            width={240}
            height={48}
            style={{ width: 'auto', height: '48px', maxHeight: '48px' }}
            className="md:h-14 md:max-h-14 object-contain"
            loading="eager"
            fetchPriority="high"
            decoding="sync"
          />
        </Link>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center justify-center gap-4 lg:gap-8 mt-5 whitespace-nowrap">
          <NavLink to="/" className="text-base lg:text-lg text-foreground hover:text-primary transition-colors whitespace-nowrap">Home</NavLink>
          <NavLink to="/about" className="text-base lg:text-lg text-foreground hover:text-primary transition-colors whitespace-nowrap">About Us</NavLink>
          <NavLink to="/sleep-guides" className="text-base lg:text-lg text-foreground hover:text-primary transition-colors whitespace-nowrap">Sleep Guides</NavLink>
          <NavLink to="/track" className="text-base lg:text-lg text-foreground hover:text-primary transition-colors whitespace-nowrap">Track Order</NavLink>
        </nav>
        
        {/* Cart - Absolute Right on Mobile, Right on Desktop */}
        <div className="absolute right-4 md:static flex items-center justify-end md:ml-auto">
          <CartDrawer />
        </div>
      </div>
    </header>
  );
};
