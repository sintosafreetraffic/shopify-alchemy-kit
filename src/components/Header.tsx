import { CartDrawer } from "./CartDrawer";
import { NavLink } from "./NavLink";
import { Link } from "react-router-dom";
import logo from "@/assets/risebynight-logo-full.png";

export const Header = () => {
  return (
    <header className="border-b bg-background">
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
