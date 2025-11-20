import { CartDrawer } from "./CartDrawer";
import { NavLink } from "./NavLink";
import { Link } from "react-router-dom";
import logo from "@/assets/new-logo.png";

export const Header = () => {
  return (
    <header className="border-b bg-background">
      <div className="container mx-auto px-4 py-2 flex items-center justify-between">
        <Link to="/product" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <img 
            src={logo} 
            alt="RiseByNight - Ergonomic Sleep Pillow" 
            className="h-14 w-auto"
          />
          <span className="text-lg text-foreground -mt-2 leading-tight flex flex-col items-start">
            <span className="pl-2">Rise</span>
            <span className="self-center">by</span>
            <span>Night</span>
          </span>
        </Link>
        
        <nav className="hidden md:flex items-center gap-8 mt-3">
          <NavLink to="/" className="text-lg text-foreground hover:text-primary transition-colors">Home</NavLink>
          <NavLink to="/about" className="text-lg text-foreground hover:text-primary transition-colors">About Us</NavLink>
          <NavLink to="/track" className="text-lg text-foreground hover:text-primary transition-colors">Track Your Order</NavLink>
        </nav>
        
        <div className="flex items-center">
          <CartDrawer />
        </div>
      </div>
    </header>
  );
};
