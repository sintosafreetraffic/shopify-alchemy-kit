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
          <Sheet open={isMobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="mr-2" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent 
              side="left" 
              className="w-[300px] z-[100] pt-12 overflow-y-auto"
            >
              <SheetHeader className="text-left mb-6">
                <SheetTitle className="text-xl font-semibold">Menu</SheetTitle>
              </SheetHeader>
              
              {/* Main Navigation */}
              <nav className="flex flex-col gap-1">
                <NavLink 
                  to="/" 
                  className="text-base font-medium text-foreground hover:text-primary hover:bg-muted/50 transition-colors py-3 px-2 rounded-md"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Home
                </NavLink>
                <NavLink 
                  to="/about" 
                  className="text-base font-medium text-foreground hover:text-primary hover:bg-muted/50 transition-colors py-3 px-2 rounded-md"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  About Us
                </NavLink>
                <NavLink 
                  to="/sleep-guides" 
                  className="text-base font-medium text-foreground hover:text-primary hover:bg-muted/50 transition-colors py-3 px-2 rounded-md"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sleep Guides
                </NavLink>
                <NavLink 
                  to="/track" 
                  className="text-base font-medium text-foreground hover:text-primary hover:bg-muted/50 transition-colors py-3 px-2 rounded-md"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Track Your Order
                </NavLink>
              </nav>

              {/* Support Links */}
              <div className="mt-8 pt-6 border-t border-border/50">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">Support</p>
                <nav className="flex flex-col gap-1">
                  <NavLink 
                    to="/shipping" 
                    className="text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors py-2.5 px-2 rounded-md"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Shipping Information
                  </NavLink>
                  <NavLink 
                    to="/return-policy" 
                    className="text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors py-2.5 px-2 rounded-md"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Return Policy
                  </NavLink>
                  <NavLink 
                    to="/faq" 
                    className="text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors py-2.5 px-2 rounded-md"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    FAQ
                  </NavLink>
                </nav>
              </div>

              {/* Contact */}
              <div className="mt-8 pt-6 border-t border-border/50">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">Contact</p>
                <a 
                  href="mailto:support@risebynight.com" 
                  className="text-sm text-primary hover:underline block px-2"
                >
                  support@risebynight.com
                </a>
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
        <nav className="hidden md:flex flex-nowrap items-center justify-center mt-5 space-x-8 lg:space-x-10 whitespace-nowrap">
          <NavLink to="/" className="text-base lg:text-lg text-foreground hover:text-primary transition-colors">Home</NavLink>
          <NavLink to="/about" className="text-base lg:text-lg text-foreground hover:text-primary transition-colors">About Us</NavLink>
          <NavLink to="/track" className="text-base lg:text-lg text-foreground hover:text-primary transition-colors">Track Your Order</NavLink>
        </nav>
        
        {/* Cart - Absolute Right on Mobile, Right on Desktop */}
        <div className="absolute right-4 md:static flex items-center justify-end md:ml-auto">
          <CartDrawer />
        </div>
      </div>
    </header>
  );
};
