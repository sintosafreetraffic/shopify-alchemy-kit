/**
 * UrgencyBanner - Valentine's Sale Edition
 * 
 * Marquee scrolling banner with Valentine's messaging (right to left)
 */

import { useCartStore } from "@/stores/cartStore";
import { Heart } from "lucide-react";

export const UrgencyBanner = () => {
  const isCartOpen = useCartStore((state) => state.isCartOpen);

  const bannerText = "Valentine's Sale • Buy 1 Get 1 Free";

  return (
    <div
      data-header-banner
      className={`fixed top-0 left-0 right-0 h-9 bg-gradient-to-r from-valentine-pink via-valentine-rose to-valentine-pink text-valentine-foreground text-sm font-semibold z-[80] flex items-center overflow-hidden transition-opacity ${
        isCartOpen ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="animate-marquee-rtl whitespace-nowrap flex items-center">
        <span className="inline-flex items-center gap-2 px-10">
          <Heart className="w-4 h-4 fill-current" />
          <span>{bannerText}</span>
        </span>
      </div>
    </div>
  );
};
