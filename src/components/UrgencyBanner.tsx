import { useEffect, useState } from "react";
import { useCartStore } from "@/stores/cartStore";

const messages = ["Free shipping within the U.S. over $50", "100 Day Risk-Free Trial"];

export const UrgencyBanner = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const isCartOpen = useCartStore((state) => state.isCartOpen);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % messages.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  if (isCartOpen) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-black text-white py-2 text-center text-sm font-medium z-[80]">
      <div className="container mx-auto px-4 transition-all duration-500">{messages[currentIndex]}</div>
    </div>
  );
};
