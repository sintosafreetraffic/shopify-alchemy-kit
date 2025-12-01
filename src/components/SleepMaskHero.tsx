import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Shield, Moon, Truck, Loader2, Star, Minus, Plus } from "lucide-react";
import { PolicyAccordion } from "./PolicyAccordion";
import { useState, useEffect } from "react";
import { useCartStore } from "@/stores/cartStore";
import { fetchProducts } from "@/lib/shopify";
import type { ShopifyProduct } from "@/lib/shopify";
import { toast } from "sonner";
import { SleepMaskImageCarousel } from "./SleepMaskImageCarousel";
import sleepMaskNavy from "@/assets/sleep-mask-navy.webp";
import sleepMaskTurquoise from "@/assets/sleep-mask-turquoise.webp";
import sleepMaskPink from "@/assets/sleep-mask-pink.webp";
import sleepMaskGold from "@/assets/sleep-mask-gold.webp";
import sleepMaskSilver from "@/assets/sleep-mask-silver.webp";
import sleepMaskBlack from "@/assets/sleep-mask-black.webp";

// Image mapping for colors
const colorImages: Record<string, string> = {
  "Navy": sleepMaskNavy,
  "Turquoise": sleepMaskTurquoise,
  "Pink": sleepMaskPink,
  "Gold": sleepMaskGold,
  "Silver": sleepMaskSilver,
  "Black": sleepMaskBlack,
};

export const SleepMaskHero = () => {
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [product, setProduct] = useState<ShopifyProduct | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const { addItem } = useCartStore();

  useEffect(() => {
    const loadProduct = async () => {
      try {
        const products = await fetchProducts(10);
        const sleepMask = products.find(p => p.node.title.toLowerCase().includes('silk deep sleep mask') && !p.node.title.toLowerCase().includes('free gift'));
        if (sleepMask) {
          setProduct(sleepMask);
          // Set default color to the first available color
          const colorOption = sleepMask.node.options.find(opt => opt.name === "Color");
          if (colorOption && colorOption.values.length > 0) {
            setSelectedColor(colorOption.values[0]);
          }
        }
      } catch (error) {
        console.error("Error loading product:", error);
      }
    };
    loadProduct();
  }, []);

  const handleAddToCart = async () => {
    if (!product) {
      toast.error("Product not available");
      return;
    }

    setIsCheckingOut(true);
    try {
      // Find the variant that matches selected color and quantity
      const variant = product.node.variants.edges.find(v => {
        const colorMatch = v.node.selectedOptions.find(opt => opt.name === "Color")?.value === selectedColor;
        const quantityMatch = v.node.selectedOptions.find(opt => opt.name === "Quantity")?.value === `${quantity} Mask${quantity > 1 ? 's' : ''}`;
        return colorMatch && quantityMatch;
      })?.node;

      if (!variant) {
        toast.error("Selected variant not available");
        return;
      }
      
      const cartItem = {
        product,
        variantId: variant.id,
        variantTitle: variant.title,
        price: variant.price,
        compareAtPrice: variant.compareAtPrice,
        quantity: 1, // Quantity is in the variant itself
        selectedOptions: variant.selectedOptions
      };
      
      addItem(cartItem);
      const toastId = toast.success("Added to cart!", {
        description: `${selectedColor} deep sleep mask${quantity > 1 ? 's' : ''} added to your cart.`,
        cancel: {
          label: "✕",
          onClick: () => {
            toast.dismiss(toastId);
          }
        }
      });
      useCartStore.getState().setCartOpen(true);
    } catch (error) {
      console.error('Failed to add to cart:', error);
      toast.error("Failed to add to cart");
    } finally {
      setIsCheckingOut(false);
    }
  };

  // Get available colors from product
  const availableColors = product?.node.options.find(opt => opt.name === "Color")?.values || [];
  
  // Find the variant price for selected color and quantity
  const selectedVariant = product?.node.variants.edges.find(v => {
    const colorMatch = v.node.selectedOptions.find(opt => opt.name === "Color")?.value === selectedColor;
    const quantityMatch = v.node.selectedOptions.find(opt => opt.name === "Quantity")?.value === `${quantity} Mask${quantity > 1 ? 's' : ''}`;
    return colorMatch && quantityMatch;
  })?.node;

  const productPrice = selectedVariant ? parseFloat(selectedVariant.price.amount) : 29.99;
  const totalPrice = productPrice;

  return (
    <section className="pt-0 pb-3 md:pb-6 bg-background overflow-visible">
      <div className="container mx-auto px-4 max-w-7xl overflow-visible">
        {/* Mobile Layout: Carousel at top, then title */}
        <div className="md:hidden space-y-3 md:space-y-4 mb-4 md:mb-6">
          <SleepMaskImageCarousel />
          
          {/* Mobile Title Section */}
          <div className="space-y-0">
            {/* Enhanced Social Proof */}
            <div className="space-y-2 mb-3">
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-5 h-5 fill-primary text-primary"
                    />
                  ))}
                </div>
                <span className="text-lg font-semibold">4.9</span>
                <span className="text-muted-foreground">(3,200+ reviews)</span>
              </div>
            </div>
            
            <h1 className="text-lg font-bold leading-tight tracking-tight truncate mt-3">
              Rise By Night™ Silk Deep Sleep Mask
            </h1>
            
            <p className="text-sm text-muted-foreground mt-0.5">
              100% Pure Mulberry Silk - Blocks 100% Light
            </p>
          </div>
        </div>

        {/* Desktop Grid Layout */}
        <div className="grid md:grid-cols-2 gap-6 lg:gap-10 md:items-start">
          {/* Scrollable Product Images Column - Desktop Only */}
          <div className="hidden md:block relative order-2 md:order-1">
            <SleepMaskImageCarousel />
            <PolicyAccordion />
          </div>
          
          {/* Sticky Product Details Column */}
          <div className="space-y-2 order-1 md:order-2 md:sticky md:top-20 md:self-start">

            {/* Desktop Title Section */}
            <div className="hidden md:flex flex-col gap-3">
              <div className="space-y-3">
                <h1 className="text-3xl md:text-5xl font-bold leading-tight">
                  Rise By Night™ Silk Deep Sleep Mask
                </h1>
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className="w-5 h-5 fill-primary text-primary"
                      />
                    ))}
                  </div>
                  <span className="text-lg font-semibold">4.9</span>
                  <span className="text-muted-foreground">(3,200+ reviews)</span>
                </div>
                <p className="text-xl text-primary font-semibold">
                  100% Pure Mulberry Silk - Blocks 100% Light
                </p>
              </div>
            </div>

            {/* USPs */}
            <div className="space-y-2 pb-4 border-b">
              {[
                "100% pure mulberry silk - gentle on skin and eyelashes",
                "Contoured design prevents pressure on eyes",
                "Blocks out 100% of light for deeper sleep",
                "Adjustable elastic strap for perfect fit"
              ].map((usp, index) => (
                <div key={index} className="flex items-start gap-2">
                  <Check className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-[10px] sm:text-[11px] lg:text-xs xl:text-sm leading-tight">{usp}</span>
                </div>
              ))}
            </div>

            {/* Color Selection */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <h3 className="font-bold text-lg mb-3">Choose Color</h3>
              
              <div className="grid grid-cols-6 gap-3">
                {availableColors.map((colorName) => (
                  <button
                    key={colorName}
                    onClick={() => setSelectedColor(colorName)}
                    className={`relative w-full aspect-square rounded-lg border-2 transition-all overflow-hidden bg-background ${
                      selectedColor === colorName
                        ? "border-primary ring-2 ring-primary ring-offset-2"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {colorImages[colorName] ? (
                      <img 
                        src={colorImages[colorName]} 
                        alt={colorName}
                        className="w-full h-full object-contain p-1"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-xs font-medium text-center px-1">{colorName}</span>
                      </div>
                    )}
                    {selectedColor === colorName && (
                      <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                        <Check className="w-6 h-6 text-primary drop-shadow-md" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity Selection */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg">Quantity</h3>
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="text-2xl font-bold min-w-[3rem] text-center">{quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setQuantity(quantity + 1)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <span className="text-lg font-semibold">Total Price:</span>
                <span className="text-2xl font-bold text-primary">${totalPrice.toFixed(2)}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {quantity} mask{quantity > 1 ? 's' : ''} × ${(productPrice / quantity).toFixed(2)} each
              </p>
            </div>

            {/* Add to Cart Button */}
            <Button
              size="lg"
              className="w-full text-lg md:text-xl py-6 font-bold shadow-lg hover:shadow-xl transition-all touch-manipulation animate-subtle-bounce bg-black text-white hover:bg-primary relative overflow-hidden group"
              onClick={handleAddToCart}
              disabled={isCheckingOut || !product}
            >
              {isCheckingOut ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <span className="inline-block transition-all duration-300 group-hover:-translate-y-12 group-hover:opacity-0">
                    ADD TO CART
                  </span>
                  <span className="absolute inset-0 flex items-center justify-center translate-y-12 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                    ADD TO CART
                  </span>
                </>
              )}
            </Button>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center">
                <Truck className="w-6 h-6 text-primary mx-auto mb-1" />
                <p className="text-xs font-medium">Free Shipping</p>
              </div>
              <div className="text-center">
                <Moon className="w-6 h-6 text-primary mx-auto mb-1" />
                <p className="text-xs font-medium">100-Night Trial</p>
              </div>
              <div className="text-center">
                <Shield className="w-6 h-6 text-primary mx-auto mb-1" />
                <p className="text-xs font-medium">2-Year Warranty</p>
              </div>
            </div>

            {/* Mobile Policy Accordion */}
            <div className="md:hidden mt-6">
              <PolicyAccordion />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
