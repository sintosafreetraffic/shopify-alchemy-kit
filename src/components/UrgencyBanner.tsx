import { useEffect, useState } from "react";
import { useCartStore } from "@/stores/cartStore";

const messages = ["Free Shipping from 50$", "100 Day Risk-Free Trial"];

export const UrgencyBanner = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const isCartOpen = useCartStore((state) => state.isCartOpen);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % messages.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Mobile: sticky (in-flow, no compositor layer)
  // Desktop: fixed (with hide on cart open)
  return (
    <div
      data-header-banner
      className={`
        h-9 bg-black text-white text-center text-sm font-medium flex items-center justify-center
        sticky top-0 z-[80]
        md:fixed md:left-0 md:right-0
        ${isCartOpen ? "md:opacity-0 md:pointer-events-none" : "md:opacity-100"}
        md:transition-opacity md:duration-200
      `}
    >
      <div className="container mx-auto px-4">{messages[currentIndex]}</div>
    </div>
  );
};
