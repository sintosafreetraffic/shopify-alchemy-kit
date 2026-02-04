/**
 * Quantity Tier Pricing - CRO AOV Booster
 * 
 * Shows tiered pricing for bulk purchases:
 * 1x - Regular price
 * 2x - Discounted per-unit
 * 3x - Best deal per-unit
 */

import { Check, Star, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/formatPrice";

interface QuantityTier {
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
  savings: number;
  savingsPercent: number;
  label: string;
  badge?: string;
  recommended?: boolean;
}

interface QuantityTierPricingProps {
  basePrice: number;
  currencyCode: string;
  selectedQuantity: number;
  onSelectQuantity: (quantity: number) => void;
  className?: string;
}

export const QuantityTierPricing = ({
  basePrice,
  currencyCode,
  selectedQuantity,
  onSelectQuantity,
  className = "",
}: QuantityTierPricingProps) => {
  // Define tiers with discounts
  const tiers: QuantityTier[] = [
    {
      quantity: 1,
      pricePerUnit: basePrice,
      totalPrice: basePrice,
      savings: 0,
      savingsPercent: 0,
      label: "1 Pillow",
      badge: undefined,
      recommended: false,
    },
    {
      quantity: 2,
      pricePerUnit: basePrice * 0.85, // 15% off per unit
      totalPrice: basePrice * 0.85 * 2,
      savings: basePrice * 0.15 * 2,
      savingsPercent: 15,
      label: "2 Pillows",
      badge: "Popular",
      recommended: true,
    },
    {
      quantity: 3,
      pricePerUnit: basePrice * 0.75, // 25% off per unit
      totalPrice: basePrice * 0.75 * 3,
      savings: basePrice * 0.25 * 3,
      savingsPercent: 25,
      label: "3 Pillows",
      badge: "Best Deal",
      recommended: false,
    },
  ];

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-sm font-medium text-muted-foreground">Choose quantity:</p>
      <div className="grid grid-cols-3 gap-2">
        {tiers.map((tier) => {
          const isSelected = selectedQuantity === tier.quantity;
          
          return (
            <button
              key={tier.quantity}
              onClick={() => onSelectQuantity(tier.quantity)}
              className={cn(
                "relative flex flex-col items-center p-3 rounded-xl border-2 transition-all text-center",
                isSelected
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-border hover:border-primary/50 bg-background",
                tier.recommended && !isSelected && "border-primary/30"
              )}
            >
              {/* Badge */}
              {tier.badge && (
                <span className={cn(
                  "absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap",
                  tier.badge === "Best Deal" 
                    ? "bg-primary text-primary-foreground"
                    : "bg-amber-500 text-white"
                )}>
                  {tier.badge === "Best Deal" && <Sparkles className="w-2.5 h-2.5 inline mr-0.5" />}
                  {tier.badge === "Popular" && <Star className="w-2.5 h-2.5 inline mr-0.5" />}
                  {tier.badge}
                </span>
              )}

              {/* Quantity */}
              <span className="text-lg font-bold">{tier.quantity}x</span>
              <span className="text-xs text-muted-foreground">{tier.label}</span>

              {/* Price per unit */}
              <div className="mt-2">
                <span className="text-sm font-semibold text-primary">
                  {formatPrice(tier.pricePerUnit, currencyCode)}
                </span>
                <span className="text-xs text-muted-foreground">/each</span>
              </div>

              {/* Savings */}
              {tier.savingsPercent > 0 && (
                <span className="text-xs text-green-600 dark:text-green-500 font-medium mt-1">
                  Save {tier.savingsPercent}%
                </span>
              )}

              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <Check className="w-4 h-4 text-primary" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Total display */}
      {selectedQuantity > 1 && (
        <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm">
          <span className="text-muted-foreground">
            Total for {selectedQuantity} pillows:
          </span>
          <span className="font-bold text-primary">
            {formatPrice(tiers.find(t => t.quantity === selectedQuantity)?.totalPrice || 0, currencyCode)}
          </span>
        </div>
      )}
    </div>
  );
};
