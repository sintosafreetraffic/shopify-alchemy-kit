/**
 * Recent Purchases Badge - CRO Social Proof
 * 
 * Displays "X bought in the last 24 hours" with realistic numbers.
 * Uses simulated data that varies slightly for authenticity.
 */

import { ShoppingBag } from "lucide-react";
import { useState, useEffect } from "react";

interface RecentPurchasesBadgeProps {
  className?: string;
  variant?: "default" | "compact";
}

export const RecentPurchasesBadge = ({ 
  className = "",
  variant = "default"
}: RecentPurchasesBadgeProps) => {
  // Start with a base count and add minor random variance
  const [purchaseCount, setPurchaseCount] = useState(() => {
    const baseCount = 47;
    return baseCount + Math.floor(Math.random() * 15);
  });

  useEffect(() => {
    // Occasionally update the count to appear real-time
    const interval = setInterval(() => {
      setPurchaseCount(prev => {
        // Increase by 1-3 occasionally (purchases)
        const increase = Math.random() > 0.6 ? Math.floor(Math.random() * 3) + 1 : 0;
        const newCount = prev + increase;
        // Keep between 40 and 85
        return Math.min(85, Math.max(40, newCount));
      });
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, []);

  if (variant === "compact") {
    return (
      <div className={`inline-flex items-center gap-1.5 text-xs text-muted-foreground ${className}`}>
        <ShoppingBag className="w-3 h-3" />
        <span>{purchaseCount} bought today</span>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 text-sm ${className}`}>
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
        <ShoppingBag className="w-4 h-4 text-primary" />
      </div>
      <div>
        <span className="font-semibold text-foreground">{purchaseCount}</span>
        <span className="text-muted-foreground"> bought in the last 24 hours</span>
      </div>
    </div>
  );
};
