import { useEffect, useState } from "react";
import { useCartStore } from "@/stores/cartStore";
import { useCurrencySymbol } from "@/hooks/useCurrencySymbol";
import { useValentinesOffer } from "@/hooks/useValentinesOffer";
import { ValentinesBanner } from "./ValentinesBanner";

export const UrgencyBanner = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const currencySymbol = useCurrencySymbol();
  const isCartOpen = useCartStore((state) => state.isCartOpen);
  const { isActive: isValentinesActive } = useValentinesOffer();

  const messages = [`Free Shipping from ${currencySymbol}50`, "100 Day Risk-Free Trial"];

  useEffect(() => {
    // Don't rotate if Valentine's banner is active
    if (isValentinesActive) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % messages.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [messages.length, isValentinesActive]);

  // Show Valentine's banner during offer period
  if (isValentinesActive) {
    return <ValentinesBanner />;
  }

  return (
    <div
      data-header-banner
      className={`fixed top-0 left-0 right-0 h-9 bg-black text-white text-center text-sm font-medium z-[80] flex items-center justify-center ${
        isCartOpen ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="container mx-auto px-4">{messages[currentIndex]}</div>
    </div>
  );
};
