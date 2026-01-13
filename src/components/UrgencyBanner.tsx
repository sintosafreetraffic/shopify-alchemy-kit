import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useCartStore } from "@/stores/cartStore";
import { useCurrencySymbol } from "@/hooks/useCurrencySymbol";
import { getOrAssignVariant } from "@/lib/abTesting";
import { UrgencyAnnouncementBar } from "@/components/ab-testing/UrgencyAnnouncementBar";

export const UrgencyBanner = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const currencySymbol = useCurrencySymbol();
  const isCartOpen = useCartStore((state) => state.isCartOpen);
  const location = useLocation();

  const messages = [`Free Shipping from ${currencySymbol}50`, "100 Day Risk-Free Trial"];

  // Check if on Variant B product page
  const isVariantBProductPage = 
    location.pathname === "/products/ergonomic-pillow" && 
    getOrAssignVariant() === "B";

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % messages.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [messages.length]);

  // Render Variant B announcement bar instead on Variant B pages
  if (isVariantBProductPage) {
    return <UrgencyAnnouncementBar />;
  }

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
