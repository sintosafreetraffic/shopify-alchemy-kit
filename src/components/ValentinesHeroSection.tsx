/**
 * ValentinesHeroSection
 * 
 * Valentine's Day 1+1 couples deal section shown in Hero.
 * Adds quantity selector for couples deal and savings display.
 */

import { useState } from "react";
import { useValentinesOffer } from "@/hooks/useValentinesOffer";
import { ValentinesCountdown } from "./ValentinesCountdown";
import { Button } from "@/components/ui/button";
import { Heart, Package, Truck, Gift } from "lucide-react";
import { formatPrice } from "@/lib/formatPrice";

interface ValentinesHeroSectionProps {
  onAddSingle: () => void;
  onAddCouple: () => void;
  isAdding: boolean;
  currencyCode: string;
}

export const ValentinesHeroSection = ({
  onAddSingle,
  onAddCouple,
  isAdding,
  currencyCode,
}: ValentinesHeroSectionProps) => {
  const { isActive, pricing, messaging, urgency, style, deliveryText, isDeliveryDeadlinePassed } = useValentinesOffer();
  const [selectedQuantity, setSelectedQuantity] = useState<1 | 2>(2);

  if (!isActive) return null;

  const handleAdd = () => {
    if (selectedQuantity === 2) {
      onAddCouple();
    } else {
      onAddSingle();
    }
  };

  return (
    <div className="space-y-3 mb-4">
      {/* Valentine's headline */}
      <div 
        className="rounded-xl p-4 border"
        style={{ 
          backgroundColor: style.backgroundColor, 
          borderColor: style.borderColor 
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Heart className="w-5 h-5 fill-current" style={{ color: style.accentColor }} />
          <span className="font-bold text-base" style={{ color: style.accentColor }}>
            {messaging.heroHeadline}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          {messaging.heroSubheadline}
        </p>

        {/* Quantity selector */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {/* Single pillow option */}
          <button
            onClick={() => setSelectedQuantity(1)}
            className={`p-3 rounded-lg border-2 text-left transition-all ${
              selectedQuantity === 1 
                ? 'border-primary bg-primary/5' 
                : 'border-muted hover:border-muted-foreground/30'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Package className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">1 Pillow</span>
            </div>
            <p className="text-lg font-bold">
              {formatPrice(pricing.singlePrice, currencyCode)}
            </p>
          </button>

          {/* Couples deal option */}
          <button
            onClick={() => setSelectedQuantity(2)}
            className={`p-3 rounded-lg border-2 text-left transition-all relative overflow-hidden ${
              selectedQuantity === 2 
                ? 'border-pink-500 bg-pink-50 dark:bg-pink-950/30' 
                : 'border-muted hover:border-pink-300'
            }`}
          >
            {/* Best value badge */}
            <div 
              className="absolute top-0 right-0 text-[10px] font-bold text-white px-2 py-0.5 rounded-bl-lg"
              style={{ backgroundColor: style.accentColor }}
            >
              BEST VALUE
            </div>
            
            <div className="flex items-center gap-2 mb-1">
              <Gift className="w-4 h-4" style={{ color: style.accentColor }} />
              <span className="text-sm font-medium">2 Pillows</span>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-lg font-bold" style={{ color: style.accentColor }}>
                {formatPrice(pricing.couplesDealPrice, currencyCode)}
              </p>
              <span className="text-xs line-through text-muted-foreground">
                {formatPrice(pricing.regularTwoPrice, currencyCode)}
              </span>
            </div>
            <p className="text-xs font-semibold mt-0.5" style={{ color: style.accentColor }}>
              {messaging.savingsBadge}
            </p>
          </button>
        </div>

        {/* Stock indicator */}
        {urgency.showStock && (
          <p className="text-xs text-muted-foreground mb-2">
            📦 {urgency.stockText.replace('{count}', String(urgency.stockCount))}
          </p>
        )}

        {/* CTA Button */}
        <Button
          size="lg"
          className="w-full text-lg py-6 font-bold shadow-lg hover:shadow-xl transition-all touch-manipulation relative overflow-hidden group"
          style={{ 
            backgroundColor: selectedQuantity === 2 ? style.accentColor : undefined,
          }}
          onClick={handleAdd}
          disabled={isAdding}
        >
          {isAdding ? (
            "Adding..."
          ) : selectedQuantity === 2 ? (
            <>
              <Heart className="w-5 h-5 mr-2 fill-current" />
              {messaging.ctaText}
            </>
          ) : (
            messaging.singleCtaText
          )}
        </Button>

        {/* Delivery promise */}
        {!isDeliveryDeadlinePassed && (
          <div className="flex items-center justify-center gap-2 mt-2 text-xs text-muted-foreground">
            <Truck className="w-3.5 h-3.5" />
            <span>{deliveryText}</span>
          </div>
        )}

        {/* Countdown */}
        <div className="mt-3 flex justify-center">
          <ValentinesCountdown variant="inline" />
        </div>
      </div>
    </div>
  );
};
