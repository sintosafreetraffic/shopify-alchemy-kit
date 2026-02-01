/**
 * UrgencyBanner - Valentine's Sale Edition
 * 
 * Marquee scrolling banner with Valentine's messaging (right to left)
 */

import { useCartStore } from "@/stores/cartStore";
import { Heart } from "lucide-react";

export const UrgencyBanner = () => {
  const isCartOpen = useCartStore((state) => state.isCartOpen);

  const messages = [
    "💕 Valentine's Sale",
    "Buy 1 Get 1 Free",
    "💕 Valentine's Sale",
    "Buy 1 Get 1 Free",
  ];

  return (
    <div
      data-header-banner
      className={`fixed top-0 left-0 right-0 h-9 bg-gradient-to-r from-valentine-pink via-valentine-rose to-valentine-pink text-valentine-foreground text-sm font-semibold z-[80] flex items-center overflow-hidden transition-opacity ${
        isCartOpen ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="animate-marquee whitespace-nowrap flex items-center">
        {messages.map((msg, i) => (
          <span key={i} className="flex items-center gap-2 mx-10">
            <Heart className="w-4 h-4 fill-current" />
            <span>{msg}</span>
          </span>
        ))}
        {/* Duplicate for seamless loop */}
        {messages.map((msg, i) => (
          <span key={`dup-${i}`} className="flex items-center gap-2 mx-10">
            <Heart className="w-4 h-4 fill-current" />
            <span>{msg}</span>
          </span>
        ))}
      </div>
    </div>
  );
};
