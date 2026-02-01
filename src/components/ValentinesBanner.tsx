/**
 * ValentinesBanner
 * 
 * Replaces UrgencyBanner during Valentine's offer period.
 * Shows couples deal messaging with countdown.
 */

import { useValentinesOffer, useValentinesCountdown } from "@/hooks/useValentinesOffer";
import { useCartStore } from "@/stores/cartStore";
import { Heart } from "lucide-react";

export const ValentinesBanner = () => {
  const { isActive, messaging, style } = useValentinesOffer();
  const countdown = useValentinesCountdown();
  const isCartOpen = useCartStore((state) => state.isCartOpen);

  if (!isActive) return null;

  const countdownText = countdown.days > 0 
    ? `${countdown.days}d ${countdown.hours}h left`
    : countdown.hours > 0 
    ? `${countdown.hours}h ${countdown.minutes}m left`
    : `${countdown.minutes}m ${countdown.seconds}s left`;

  return (
    <div
      data-header-banner
      className={`fixed top-0 left-0 right-0 h-9 text-white text-center text-sm font-medium z-[80] flex items-center justify-center transition-opacity ${
        isCartOpen ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{ 
        background: `linear-gradient(135deg, #be185d 0%, ${style.accentColor} 50%, #be185d 100%)` 
      }}
    >
      <div className="container mx-auto px-4 flex items-center justify-center gap-2">
        <Heart className="w-4 h-4 fill-current animate-pulse" />
        <span className="hidden sm:inline">{messaging.bannerText}</span>
        <span className="sm:hidden">💝 2 Pillows, Save €30</span>
        <span className="text-xs opacity-90 ml-1">• {countdownText}</span>
      </div>
    </div>
  );
};
