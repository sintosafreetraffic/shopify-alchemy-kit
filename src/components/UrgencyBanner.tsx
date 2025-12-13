import { useEffect, useState } from "react";
import { useCartStore } from "@/stores/cartStore";

const messages = ["Free shipping from 50$", "100 Day Risk-Free Trial"];

export const UrgencyBanner = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const isCartOpen = useCartStore((state) => state.isCartOpen);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % messages.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Keep mounted but hide visually to prevent CLS when cart opens
  // Uses opacity + pointer-events instead of unmounting
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
