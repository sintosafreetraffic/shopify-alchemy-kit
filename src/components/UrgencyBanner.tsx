/**
 * UrgencyBanner - Valentine's Sale Edition
 * 
 * Marquee scrolling banner with Valentine's messaging (right to left)
 */

import { useCartStore } from "@/stores/cartStore";
import { Heart, Truck, Gift } from "lucide-react";
import { useCurrencySymbol } from "@/hooks/useCurrencySymbol";

export const UrgencyBanner = () => {
  const isCartOpen = useCartStore((state) => state.isCartOpen);
  const currencySymbol = useCurrencySymbol();
  
  const shippingThreshold = currencySymbol === '€' ? '€50' : '$50';

  return (
    <div
      data-header-banner
      className={`fixed top-0 left-0 right-0 h-9 bg-gradient-to-r from-valentine-pink via-valentine-rose to-valentine-pink text-valentine-foreground text-sm font-semibold z-[80] flex items-center overflow-hidden transition-opacity ${
        isCartOpen ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="animate-marquee-seamless whitespace-nowrap flex items-center">
        {/* First copy */}
        <span className="inline-flex items-center gap-8 px-8">
          <span className="inline-flex items-center gap-2">
            <Heart className="w-4 h-4 fill-current" />
            <span>Valentine's Sale</span>
          </span>
          <span className="inline-flex items-center gap-2">
            <Gift className="w-4 h-4" />
            <span>Buy 1 Get 1 Free</span>
          </span>
          <span className="inline-flex items-center gap-2">
            <Truck className="w-4 h-4" />
            <span>Free Shipping above {shippingThreshold}</span>
          </span>
        </span>
        {/* Second copy for seamless loop */}
        <span className="inline-flex items-center gap-8 px-8">
          <span className="inline-flex items-center gap-2">
            <Heart className="w-4 h-4 fill-current" />
            <span>Valentine's Sale</span>
          </span>
          <span className="inline-flex items-center gap-2">
            <Gift className="w-4 h-4" />
            <span>Buy 1 Get 1 Free</span>
          </span>
          <span className="inline-flex items-center gap-2">
            <Truck className="w-4 h-4" />
            <span>Free Shipping above {shippingThreshold}</span>
          </span>
        </span>
      </div>
    </div>
  );
};
