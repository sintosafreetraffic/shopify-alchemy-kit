import { useEffect, useState } from "react";

const messages = [
  "Free gift over $100",
  "Fast delivery within the U.S.",
  "120 Day Risk-Free Trial"
];

export const UrgencyBanner = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % messages.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-destructive text-destructive-foreground py-2 text-center text-sm font-medium sticky top-0 z-50">
      <div className="container mx-auto px-4 transition-all duration-500">
        {messages[currentIndex]}
      </div>
    </div>
  );
};
