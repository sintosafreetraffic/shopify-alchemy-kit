// Performance: Carousel is lazy-loaded to reduce initial bundle size
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Shield, Moon, Truck, Loader2, Star, Minus, Plus, ImageIcon } from "lucide-react";
import { PolicyAccordion } from "./PolicyAccordion";
import { useState, useEffect, useRef, Suspense, lazy } from "react";
import { useCartStore } from "@/stores/cartStore";
import { fetchProducts } from "@/lib/shopify";
import type { ShopifyProduct } from "@/lib/shopify";
import { toast } from "sonner";
import { trackPageVisit } from "@/lib/pinterest";
import { trackViewedProduct } from "@/lib/klaviyo";
import { formatPrice } from "@/lib/formatPrice";
import { useIsEU } from "@/hooks/useCurrencySymbol";
import sleepMaskNavy from "@/assets/sleep-mask-navy.webp";
import sleepMaskTurquoise from "@/assets/sleep-mask-turquoise.webp";
import sleepMaskPink from "@/assets/sleep-mask-pink.webp";
import sleepMaskGold from "@/assets/sleep-mask-gold.webp";
import sleepMaskSilver from "@/assets/sleep-mask-silver.webp";
import sleepMaskBlack from "@/assets/sleep-mask-black.webp";

// Lazy load the image carousel to reduce initial bundle
const SleepMaskImageCarousel = lazy(() => 
  import("./SleepMaskImageCarousel").then(mod => ({ default: mod.SleepMaskImageCarousel }))
);

// Carousel loading fallback
const CarouselFallback = () => (
  <div className="w-full aspect-square bg-muted/30 rounded-xl flex items-center justify-center animate-pulse">
    <ImageIcon className="h-12 w-12 text-muted-foreground/40" />
  </div>
);

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
  const [isColorPickerVisible, setIsColorPickerVisible] = useState(true);
  const [product, setProduct] = useState<ShopifyProduct | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const isEU = useIsEU();
  const { addItem } = useCartStore();
  const hasTrackedView = useRef(false);

  useEffect(() => {
    const loadProduct = async () => {
      try {
        const products = await fetchProducts(10);
        const sleepMask = products.find(p => p.node.title.toLowerCase().includes('silk deep sleep mask') && !p.node.title.toLowerCase().includes('free gift'));
        if (sleepMask) {
          setProduct(sleepMask);
          // Track Pinterest PageVisit with product ID
          trackPageVisit(sleepMask.node.id);
          
          // Track Klaviyo Viewed Product (only once per page load)
          if (!hasTrackedView.current) {
            hasTrackedView.current = true;
            trackViewedProduct({
              id: sleepMask.node.id,
              title: sleepMask.node.title,
              price: parseFloat(sleepMask.node.variants.edges[0]?.node.price.amount || "0"),
              sku: sleepMask.node.variants.edges[0]?.node.id || "",
              imageUrl: sleepMask.node.images?.edges?.[0]?.node?.url || "",
            });
          }
          
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
      // Always use the "1 Mask" variant and set cart quantity
      const variant = product.node.variants.edges.find(v => {
        const colorMatch = v.node.selectedOptions.find(opt => opt.name === "Color")?.value === selectedColor;
        const quantityMatch = v.node.selectedOptions.find(opt => opt.name === "Quantity")?.value === "1 Mask";
        return colorMatch && quantityMatch;
      })?.node;

      if (!variant) {
        toast.error("Selected color not available");
        return;
      }
      
      const cartItem = {
        product,
        variantId: variant.id,
        variantTitle: `${selectedColor} / 1 Mask`,
        price: variant.price,
        compareAtPrice: variant.compareAtPrice,
        quantity: quantity, // Use the selected quantity
        selectedOptions: variant.selectedOptions
      };
      
      addItem(cartItem);
      const toastId = toast.success("Added to cart!", {
        description: `${selectedColor} deep sleep mask${quantity > 1 ? 's' : ''} added to your cart.`,
        duration: 1500,
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
  
  // Find the base price per mask (using "1 Mask" variant)
  const basePriceVariant = product?.node.variants.edges.find(v => {
    const colorMatch = v.node.selectedOptions.find(opt => opt.name === "Color")?.value === selectedColor;
    const quantityMatch = v.node.selectedOptions.find(opt => opt.name === "Quantity")?.value === "1 Mask";
    return colorMatch && quantityMatch;
  })?.node;

  const pricePerMask = basePriceVariant ? parseFloat(basePriceVariant.price.amount) : 29.99;
  const shopifyCurrency = basePriceVariant?.price.currencyCode || 'USD';
  // Override to EUR for EU countries if Shopify returns USD
  const currencyCode = (isEU && shopifyCurrency === 'USD') ? 'EUR' : shopifyCurrency;
  const totalPrice = pricePerMask * quantity;

  return (
    <section className="pt-[60px] md:pt-[68px] pb-3 md:pb-6 bg-background overflow-visible">
      <div className="container mx-auto px-4 max-w-7xl overflow-visible">
        {/* Mobile Layout: Carousel at top, then title */}
        <div className="md:hidden space-y-3 md:space-y-4 mb-4 md:mb-6">
          <Suspense fallback={<CarouselFallback />}>
            <SleepMaskImageCarousel />
          </Suspense>
          
          {/* Mobile Title Section */}
          <div className="space-y-0">
            {/* Enhanced Social Proof */}
            <div className="space-y-2 mb-3">
              <div 
                className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-5 h-5 fill-yellow-500 text-yellow-500"
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
            <Suspense fallback={<CarouselFallback />}>
              <SleepMaskImageCarousel />
            </Suspense>
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
                <div 
                  className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className="w-5 h-5 fill-yellow-500 text-yellow-500"
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
            <div className="space-y-2 mt-2 mb-2 md:mt-2 md:mb-4">
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0 mt-0.5" />
                <p className="text-[10px] sm:text-[11px] lg:text-xs xl:text-sm leading-tight"><span className="font-semibold">100% pure silk</span> – Gentle on skin and eyelashes</p>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0 mt-0.5" />
                <p className="text-[10px] sm:text-[11px] lg:text-xs xl:text-sm leading-tight"><span className="font-semibold">Contoured design</span> – Prevents pressure on eyes</p>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0 mt-0.5" />
                <p className="text-[10px] sm:text-[11px] lg:text-xs xl:text-sm leading-tight"><span className="font-semibold">Total darkness</span> – Blocks out 100% of light for deeper sleep</p>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0 mt-0.5" />
                <p className="text-[10px] sm:text-[11px] lg:text-xs xl:text-sm leading-tight"><span className="font-semibold">Perfect fit</span> – Adjustable elastic strap stays secure</p>
              </div>
            </div>

            {/* Color Selection */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              {isColorPickerVisible ? (
                <>
                  <h3 className="font-bold text-lg mb-1">Choose Color</h3>
                  <p className="text-sm text-muted-foreground mb-3">Select your preferred color</p>
                  
                  <div className="grid grid-cols-6 gap-3">
                    {availableColors.map((colorName) => (
                      <div key={colorName} className="flex flex-col items-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedColor(colorName);
                            setIsColorPickerVisible(false);
                          }}
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
                        </button>
                        <span className={`text-[10px] font-medium text-center ${selectedColor === colorName ? 'text-primary' : 'text-muted-foreground'}`}>
                          {colorName}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg border-2 border-primary overflow-hidden bg-background">
                      {colorImages[selectedColor] && (
                        <img 
                          src={colorImages[selectedColor]} 
                          alt={selectedColor}
                          className="w-full h-full object-contain p-1"
                        />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-lg">Color: {selectedColor}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Check className="w-4 h-4 text-primary" />
                        Selected
                      </p>
                    </div>
                  </div>
                </div>
              )}
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
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="text-2xl font-bold min-w-[3rem] text-center" aria-live="polite">{quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setQuantity(quantity + 1)}
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <span className="text-lg font-semibold">Total Price:</span>
                <span className="text-2xl font-bold text-primary">{formatPrice(totalPrice, currencyCode)}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {quantity} mask{quantity > 1 ? 's' : ''} × {formatPrice(pricePerMask, currencyCode)} each
              </p>
            </div>

            {/* Add to Cart Button */}
            <Button
              size="lg"
              className="w-full text-lg md:text-xl py-6 font-bold shadow-lg hover:shadow-xl transition-all touch-manipulation animate-subtle-bounce bg-primary text-primary-foreground hover:bg-black hover:text-white relative overflow-hidden group"
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
