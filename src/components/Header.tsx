import { CartDrawer } from "./CartDrawer";
import { NavLink } from "./NavLink";
import logo from "@/assets/moon-logo.png";

export const Header = () => {
  return (
    <header className="border-b bg-background">
      <div className="container mx-auto px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img 
            src={logo} 
            alt="RiseByNight - Ergonomic Sleep Pillow" 
            className="h-20 w-auto"
          />
          <span className="text-3xl font-bold text-foreground -mt-2">RiseByNight</span>
        </div>
        
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
