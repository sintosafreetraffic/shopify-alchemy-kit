import { CartDrawer } from "./CartDrawer";
import { NavLink } from "./NavLink";
import { Link } from "react-router-dom";
import logo from "@/assets/risebynight-logo-full.png";
import { useState, useEffect } from "react";

export const Header = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isAtTop, setIsAtTop] = useState(true);

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
      <div className="container mx-auto px-4 py-2 grid grid-cols-3 items-center">
        <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
          <img 
            src={logo} 
            alt="RiseByNight - Ergonomic Sleep Pillow" 
            className="h-12 w-auto"
          />
        </Link>
        
        <nav className="hidden md:flex items-center justify-center gap-4 lg:gap-8 mt-3 whitespace-nowrap">
          <NavLink to="/" className="text-base lg:text-lg text-foreground hover:text-primary transition-colors whitespace-nowrap">Home</NavLink>
          <NavLink to="/about" className="text-base lg:text-lg text-foreground hover:text-primary transition-colors whitespace-nowrap">About Us</NavLink>
          <NavLink to="/track" className="text-base lg:text-lg text-foreground hover:text-primary transition-colors whitespace-nowrap">Track Your Order</NavLink>
        </nav>
        
        <div className="flex items-center justify-end">
          <CartDrawer />
        </div>
      </div>
    </header>
  );
};
