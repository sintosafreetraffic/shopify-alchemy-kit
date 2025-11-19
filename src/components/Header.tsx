import { CartDrawer } from "./CartDrawer";
import logo from "@/assets/logo.png";

export const Header = () => {
  return (
    <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
      <div className="container mx-auto px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img 
            src={logo} 
            alt="RiseByNight - Ergonomic Sleep Pillow" 
            className="h-16 w-auto"
          />
        </div>
        <CartDrawer />
      </div>
    </header>
  );
};
