/**
 * Sticky Navigation Bar - CRO Enhancement
 * 
 * Appears on scroll-up with product info, price, and CTA.
 * Hidden when scrolling down or at the top of the page.
 * Updated: Shows 1+1 Deal with two CTA buttons for pillow products.
 */

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Loader2, CheckCircle, Star } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import { useABErgonomicPillow } from "@/hooks/useABProduct";
import { useValentinesOffer } from "@/hooks/useValentinesOffer";
import { formatPrice } from "@/lib/formatPrice";
import { useIsEU } from "@/hooks/useCurrencySymbol";
import { toast } from "sonner";

interface StickyProductNavProps {
  productTitle?: string;
  productImage?: string;
  onAddToCart?: () => void;
}

export const StickyProductNav = ({
  productTitle,
  productImage,
  onAddToCart,
}: StickyProductNavProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAddingSingle, setIsAddingSingle] = useState(false);
  const [isAddingDeal, setIsAddingDeal] = useState(false);
  const [justAddedSingle, setJustAddedSingle] = useState(false);
  const [justAddedDeal, setJustAddedDeal] = useState(false);
  const lastScrollY = useRef(0);
  const { addItem, setCartOpen } = useCartStore();
  const { product } = useABErgonomicPillow();
  const valentinesOffer = useValentinesOffer();
  const isEU = useIsEU();

  // Get variant and pricing for single pillow
  const variant = product?.node.variants.edges[0]?.node;
  const productPrice = variant ? parseFloat(variant.price.amount) : 59.99;
  const shopifyCurrency = variant?.price.currencyCode || 'USD';
  const currencyCode = (isEU && shopifyCurrency === 'USD') ? 'EUR' : shopifyCurrency;

  // BOGO deal: 2 pillows for the price shown (same product, quantity 2)
  const bogoPrice = productPrice; // Same price for 2 pillows

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const isScrollingUp = currentScrollY < lastScrollY.current;
      const isPastThreshold = currentScrollY > 400;

      setIsVisible(isScrollingUp && isPastThreshold);
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleAddSingle = async () => {
    if (onAddToCart) {
      onAddToCart();
      return;
    }

    if (!product || !variant) {
      toast.error("Product not available");
      return;
    }

    setIsAddingSingle(true);
    try {
      addItem({
        product,
        variantId: variant.id,
        variantTitle: variant.title,
        price: variant.price,
        compareAtPrice: variant.compareAtPrice,
        quantity: 1,
        selectedOptions: variant.selectedOptions || [],
      });

      toast.success("Added to cart!", {
        description: "1 pillow added to your cart.",
        duration: 1500,
      });
      setCartOpen(true);

      setJustAddedSingle(true);
      setTimeout(() => setJustAddedSingle(false), 2500);
    } catch (error) {
      console.error("Failed to add to cart:", error);
      toast.error("Failed to add to cart");
    } finally {
      setIsAddingSingle(false);
    }
  };

  const handleAddDeal = async () => {
    if (!product || !variant) {
      toast.error("Deal not available");
      return;
    }

    setIsAddingDeal(true);
    try {
      // Add 2 pillows for the 1+1 deal
      addItem({
        product,
        variantId: variant.id,
        variantTitle: variant.title,
        price: variant.price,
        compareAtPrice: variant.compareAtPrice,
        quantity: 2,
        selectedOptions: variant.selectedOptions || [],
      });

      toast.success("1+1 Deal added!", {
        description: "2 pillows added to your cart.",
        duration: 1500,
      });
      setCartOpen(true);

      setJustAddedDeal(true);
      setTimeout(() => setJustAddedDeal(false), 2500);
    } catch (error) {
      console.error("Failed to add deal:", error);
      toast.error("Failed to add deal");
    } finally {
      setIsAddingDeal(false);
    }
  };

  const displayTitle = productTitle || "RiseByNight Ergonomic Sleep Pillow";
  const displayImage = productImage || product?.node.images?.edges?.[0]?.node?.url;

  return (
    <div
      className={`fixed top-[92px] left-0 right-0 z-[90] bg-background/95 backdrop-blur-sm border-b shadow-sm transition-transform duration-300 ${
        isVisible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <div className="container mx-auto px-3 sm:px-4 py-2 max-w-7xl">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Product Image - visible on all screens */}
          {displayImage && (
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg overflow-hidden bg-muted/30 flex-shrink-0">
              <img
                src={displayImage}
                alt={displayTitle}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          )}

          {/* Star ratings - compact on mobile */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className="w-3 h-3 fill-[hsl(var(--star))] text-[hsl(var(--star))]" />
              ))}
            </div>
            <span className="text-[10px] sm:text-xs text-muted-foreground">6,247</span>
          </div>

          {/* CTAs - take remaining space */}
          <div className="flex items-center gap-1.5 sm:gap-2 ml-auto flex-shrink-0">
            {/* Single Pillow Button */}
            <Button
              size="sm"
              variant="default"
              className="font-semibold text-[11px] sm:text-xs h-8 px-2.5 sm:px-3"
              onClick={handleAddSingle}
              disabled={isAddingSingle || !product}
            >
              {isAddingSingle ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : justAddedSingle ? (
                <CheckCircle className="w-3.5 h-3.5" />
              ) : (
                <>
                  <ShoppingCart className="w-3.5 h-3.5 mr-1" />
                  {formatPrice(productPrice, currencyCode)}
                </>
              )}
            </Button>

            {/* 1+1 Deal Button - Pink */}
            {valentinesOffer.isActive && (
              <Button
                size="sm"
                className="font-semibold text-[11px] sm:text-xs bg-pink-500 hover:bg-pink-600 text-white h-8 px-2.5 sm:px-3"
                onClick={handleAddDeal}
                disabled={isAddingDeal || !product}
              >
                {isAddingDeal ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : justAddedDeal ? (
                  <CheckCircle className="w-3.5 h-3.5" />
                ) : (
                  <>
                    <ShoppingCart className="w-3.5 h-3.5 mr-1" />
                    <span>1+1 {formatPrice(bogoPrice, currencyCode)}</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
