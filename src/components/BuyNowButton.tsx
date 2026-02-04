/**
 * Buy Now Button - CRO Direct Checkout
 * 
 * Bypasses cart and goes directly to Shopify checkout.
 * Uses the existing checkout creation logic.
 */

import { Button } from "@/components/ui/button";
import { Loader2, Zap } from "lucide-react";
import { useState } from "react";
import { useCartStore } from "@/stores/cartStore";
import { createCheckoutWithResilience, openCheckoutUrl, isMobileDevice } from "@/lib/checkoutUtils";
import { toast } from "sonner";
import type { ShopifyProduct } from "@/lib/shopify";

interface BuyNowButtonProps {
  product: ShopifyProduct;
  variant: {
    id: string;
    title: string;
    price: { amount: string; currencyCode: string };
    compareAtPrice?: { amount: string; currencyCode: string } | null;
    selectedOptions?: Array<{ name: string; value: string }>;
  };
  quantity?: number;
  className?: string;
  size?: "default" | "sm" | "lg";
}

export const BuyNowButton = ({
  product,
  variant,
  quantity = 1,
  className = "",
  size = "default",
}: BuyNowButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleBuyNow = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    
    // Desktop: pre-open a blank tab synchronously
    const isMobile = isMobileDevice();
    const preopenedWindow = !isMobile ? window.open('about:blank', '_blank') : null;

    try {
      // Create a temporary cart item
      const cartItem = {
        product,
        variantId: variant.id,
        variantTitle: variant.title,
        price: variant.price,
        compareAtPrice: variant.compareAtPrice,
        quantity,
        selectedOptions: variant.selectedOptions || [],
      };

      // Create checkout directly
      const result = await createCheckoutWithResilience(
        [cartItem],
        [], // No free masks for direct checkout
        []  // No discount codes for now
      );

      if (result.success && result.checkoutUrl) {
        openCheckoutUrl(result.checkoutUrl, isMobile, preopenedWindow);
        
        if (!isMobile) {
          setIsLoading(false);
        }
      } else {
        if (preopenedWindow && !preopenedWindow.closed) preopenedWindow.close();
        toast.error("Checkout failed", {
          description: "Please try again or use Add to Cart.",
        });
        setIsLoading(false);
      }
    } catch (error) {
      if (preopenedWindow && !preopenedWindow.closed) preopenedWindow.close();
      console.error("Buy Now failed:", error);
      toast.error("Checkout failed", {
        description: "Please try again or use Add to Cart.",
      });
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleBuyNow}
      disabled={isLoading}
      variant="outline"
      size={size}
      className={`font-semibold ${className}`}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
      ) : (
        <Zap className="w-4 h-4 mr-2" />
      )}
      {isLoading ? "Loading..." : "Buy Now"}
    </Button>
  );
};
