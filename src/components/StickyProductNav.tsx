/**
 * Sticky Navigation Bar - CRO Enhancement
 * 
 * Appears on scroll-up with product info, price, and CTA.
 * Hidden when scrolling down or at the top of the page.
 */

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Loader2, CheckCircle, Star } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import { useABErgonomicPillow } from "@/hooks/useABProduct";
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
  const [isAdding, setIsAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const lastScrollY = useRef(0);
  const { addItem, setCartOpen } = useCartStore();
  const { product } = useABErgonomicPillow();
  const isEU = useIsEU();

  // Get variant and pricing
  const variant = product?.node.variants.edges[0]?.node;
  const productPrice = variant ? parseFloat(variant.price.amount) : 59.99;
  const shopifyCurrency = variant?.price.currencyCode || 'USD';
  const currencyCode = (isEU && shopifyCurrency === 'USD') ? 'EUR' : shopifyCurrency;
  const compareAtPrice = 199.99;

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const isScrollingUp = currentScrollY < lastScrollY.current;
      const isPastThreshold = currentScrollY > 400; // Show after scrolling 400px

      // Show on scroll-up when past threshold, hide otherwise
      setIsVisible(isScrollingUp && isPastThreshold);
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleAddToCart = async () => {
    if (onAddToCart) {
      onAddToCart();
      return;
    }

    if (!product || !variant) {
      toast.error("Product not available");
      return;
    }

    setIsAdding(true);
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

      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 2500);
    } catch (error) {
      console.error("Failed to add to cart:", error);
      toast.error("Failed to add to cart");
    } finally {
      setIsAdding(false);
    }
  };

  const displayTitle = productTitle || product?.node.title || "Ergonomic Cervical Pillow";
  const displayImage = productImage || product?.node.images?.edges?.[0]?.node?.url;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[90] bg-background/95 backdrop-blur-sm border-b shadow-sm transition-transform duration-300 ${
        isVisible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <div className="container mx-auto px-4 py-2 max-w-7xl">
        <div className="flex items-center justify-between gap-4">
          {/* Product Info */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {displayImage && (
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted/30 flex-shrink-0">
                <img
                  src={displayImage}
                  alt={displayTitle}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold truncate">{displayTitle}</h3>
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">6,247 reviews</span>
              </div>
            </div>
          </div>

          {/* Price & CTA */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Price - Hidden on mobile to save space */}
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-lg font-bold text-primary">
                {formatPrice(productPrice, currencyCode)}
              </span>
              <span className="text-sm line-through text-muted-foreground">
                {formatPrice(compareAtPrice, currencyCode)}
              </span>
              <span className="text-xs font-semibold text-primary-foreground bg-primary px-2 py-0.5 rounded">
                40% OFF
              </span>
            </div>

            {/* Add to Cart Button */}
            <Button
              size="sm"
              className="font-semibold"
              onClick={handleAddToCart}
              disabled={isAdding || !product}
            >
              {isAdding ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : justAdded ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Added</span>
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Add to Cart</span>
                  <span className="sm:hidden">Add</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
