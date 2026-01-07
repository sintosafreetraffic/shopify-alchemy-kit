import { useEffect, useState } from "react";
import { useCartStore } from "@/stores/cartStore";
import { getBuyerCountry } from "@/lib/buyerContext";

const EU_COUNTRIES = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'];

export const UrgencyBanner = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isEU, setIsEU] = useState(false);
  const isCartOpen = useCartStore((state) => state.isCartOpen);

  useEffect(() => {
    getBuyerCountry().then((country) => {
      setIsEU(EU_COUNTRIES.includes(country));
    });
  }, []);

  const currencySymbol = isEU ? "€" : "$";
  const messages = [`Free Shipping from ${currencySymbol}50`, "100 Day Risk-Free Trial"];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % messages.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <div
      data-header-banner
      className={`fixed top-0 left-0 right-0 h-9 bg-black text-white text-center text-sm font-medium z-[80] flex items-center justify-center will-change-[opacity] transition-opacity duration-200 ${
        isCartOpen ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="container mx-auto px-4">{messages[currentIndex]}</div>
    </div>
  );
};
