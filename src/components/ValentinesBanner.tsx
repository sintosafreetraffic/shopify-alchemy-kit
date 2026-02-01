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

  const countdownText = countdown.hours > 0 
    ? `${countdown.hours}h ${countdown.minutes}m left`
    : `${countdown.minutes}m ${countdown.seconds}s left`;

  const bannerContent = (
    <>
      <Heart className="w-4 h-4 fill-current inline-block mx-2" />
      <span>{messaging.bannerText}</span>
      <span className="mx-2">•</span>
      <span className="text-xs opacity-90">{countdownText}</span>
      <Heart className="w-4 h-4 fill-current inline-block mx-2" />
    </>
  );

  return (
    <div
      data-header-banner
      className={`fixed top-0 left-0 right-0 h-9 text-white text-sm font-medium z-[80] overflow-hidden transition-opacity ${
        isCartOpen ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{ 
        background: `linear-gradient(135deg, #be185d 0%, ${style.accentColor} 50%, #be185d 100%)` 
      }}
    >
      <div className="h-full flex items-center animate-marquee whitespace-nowrap">
        <span className="inline-flex items-center px-4">{bannerContent}</span>
        <span className="inline-flex items-center px-4">{bannerContent}</span>
        <span className="inline-flex items-center px-4">{bannerContent}</span>
        <span className="inline-flex items-center px-4">{bannerContent}</span>
      </div>
    </div>
  );
};
