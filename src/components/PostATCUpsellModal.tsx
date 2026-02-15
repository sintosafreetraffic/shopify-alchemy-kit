/**
 * Post-ATC Upsell Modal - CRO AOV Booster
 * 
 * Shows an upsell offer after adding item to cart.
 * Offers a complementary product at a discount.
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, X, ShoppingBag, Sparkles, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import { useCartStore } from "@/stores/cartStore";
import { useShopifyProducts } from "@/hooks/useShopifyProducts";
import { formatPrice } from "@/lib/formatPrice";
import { useBuyerCountry } from "@/hooks/useBuyerCountry";
import { getCurrencyForCountry } from "@/lib/countryCode";
import { toast } from "sonner";
import kneePillowImage from "@/assets/knee-pillow-main-new.webp";
import sleepMaskImage from "@/assets/sleep-mask-navy.webp";

interface PostATCUpsellModalProps {
  isOpen: boolean;
  onClose: () => void;
  triggerProductId?: string;
}

export const PostATCUpsellModal = ({
  isOpen,
  onClose,
  triggerProductId,
}: PostATCUpsellModalProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [countdown, setCountdown] = useState(300); // 5 minutes
  const { addItem, setCartOpen, items } = useCartStore();
  const { data: products = [] } = useShopifyProducts(10);
  const { country: buyerCountry } = useBuyerCountry();
  const buyerCurrency = getCurrencyForCountry(buyerCountry);

  // Find upsell product (knee pillow or sleep mask based on what's not in cart)
  const cartHasKneePillow = items.some(item => 
    item.product.node.title.toLowerCase().includes('knee')
  );
  const cartHasSleepMask = items.some(item => 
    item.product.node.title.toLowerCase().includes('mask')
  );

  // Choose upsell based on what's missing
  const upsellProduct = products.find(p => {
    if (!cartHasKneePillow && p.node.title.toLowerCase().includes('knee')) return true;
    if (!cartHasSleepMask && p.node.title.toLowerCase().includes('silk deep sleep mask')) return true;
    return false;
  });

  const isKneePillow = upsellProduct?.node.title.toLowerCase().includes('knee');
  const upsellImage = isKneePillow ? kneePillowImage : sleepMaskImage;
  
  // Pricing
  const variant = upsellProduct?.node.variants.edges[0]?.node;
  const originalPrice = variant ? parseFloat(variant.price.amount) : 39.99;
  const discountPercent = 20;
  const discountedPrice = originalPrice * (1 - discountPercent / 100);
  const shopifyCurrency = variant?.price.currencyCode || 'USD';
  const currencyCode = shopifyCurrency === 'USD' ? buyerCurrency : shopifyCurrency;

  // Countdown timer
  useEffect(() => {
    if (!isOpen) {
      setCountdown(300);
      return;
    }

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, onClose]);

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAddUpsell = async () => {
    if (!upsellProduct || !variant) return;

    setIsAdding(true);
    try {
      addItem({
        product: upsellProduct,
        variantId: variant.id,
        variantTitle: variant.title,
        price: { 
          amount: discountedPrice.toFixed(2), 
          currencyCode 
        },
        compareAtPrice: variant.compareAtPrice,
        quantity: 1,
        selectedOptions: variant.selectedOptions || [],
      });

      toast.success("Added to cart!", {
        description: `${upsellProduct.node.title} added with ${discountPercent}% off!`,
        duration: 1500,
      });
      onClose();
      setCartOpen(true);
    } catch (error) {
      console.error("Failed to add upsell:", error);
      toast.error("Failed to add item");
    } finally {
      setIsAdding(false);
    }
  };

  if (!upsellProduct) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Wait! Special One-Time Offer
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4" />
            Offer expires in {formatCountdown(countdown)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Product Card */}
          <div className="flex gap-4 p-4 border rounded-xl bg-muted/30">
            <div className="w-24 h-24 rounded-lg overflow-hidden bg-background flex-shrink-0">
              <img
                src={upsellImage}
                alt={upsellProduct.node.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm line-clamp-2">
                {upsellProduct.node.title}
              </h4>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {isKneePillow 
                  ? "Align your spine while you sleep. Perfect pairing with your pillow."
                  : "Block 100% of light for deeper sleep. Premium mulberry silk."}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-lg font-bold text-primary">
                  {formatPrice(discountedPrice, currencyCode)}
                </span>
                <span className="text-sm line-through text-muted-foreground">
                  {formatPrice(originalPrice, currencyCode)}
                </span>
                <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                  {discountPercent}% OFF
                </span>
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Check className="w-4 h-4 text-affirmative flex-shrink-0" />
              <span>Complete your sleep setup</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Check className="w-4 h-4 text-affirmative flex-shrink-0" />
              <span>Same fast, free shipping</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Check className="w-4 h-4 text-affirmative flex-shrink-0" />
              <span>100-day money-back guarantee</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <Button 
            onClick={handleAddUpsell} 
            disabled={isAdding}
            className="w-full"
            size="lg"
          >
            <ShoppingBag className="w-4 h-4 mr-2" />
            {isAdding ? "Adding..." : `Yes! Add for ${formatPrice(discountedPrice, currencyCode)}`}
          </Button>
          <Button 
            variant="ghost" 
            onClick={onClose}
            className="w-full text-muted-foreground"
          >
            <X className="w-4 h-4 mr-2" />
            No thanks, continue to cart
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
