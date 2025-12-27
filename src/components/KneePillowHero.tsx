// Performance: Using cached products hook and WebP images
// Carousel is lazy-loaded to reduce initial bundle size
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Shield, Moon, Truck, Loader2, Star, ImageIcon } from "lucide-react";
import { PolicyAccordion } from "./PolicyAccordion";
import { useState, useEffect, useRef, Suspense, lazy } from "react";
import { useCartStore } from "@/stores/cartStore";
import { useShopifyProducts } from "@/hooks/useShopifyProducts";
import type { ShopifyProduct } from "@/lib/shopify";
import { toast } from "sonner";
import { trackPageVisit } from "@/lib/pinterest";
import { trackViewedProduct } from "@/lib/klaviyo";
import { CountdownTimerDisplay } from "./CountdownTimer";


// Lazy load the image carousel to reduce initial bundle
const KneePillowImageCarousel = lazy(() => 
  import("./KneePillowImageCarousel").then(mod => ({ default: mod.KneePillowImageCarousel }))
);

// Carousel loading fallback
const CarouselFallback = () => (
  <div className="w-full aspect-square bg-muted/30 rounded-xl flex items-center justify-center animate-pulse">
    <ImageIcon className="h-12 w-12 text-muted-foreground/40" />
  </div>
);

export const KneePillowHero = () => {
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const { addItem, setCartOpen } = useCartStore();
  const hasTrackedView = useRef(false);

  // Use centralized cached product data
  const { data: products, isLoading: productsLoading } = useShopifyProducts(10);
  const product = products?.find(p => p.node.title.toLowerCase().includes('knee')) || null;

  // Track product view once when product is loaded
  useEffect(() => {
    if (product && !hasTrackedView.current) {
      hasTrackedView.current = true;
      trackPageVisit(product.node.id);
      trackViewedProduct({
        id: product.node.id,
        title: product.node.title,
        price: parseFloat(product.node.variants.edges[0]?.node.price.amount || "0"),
        sku: product.node.variants.edges[0]?.node.id || "",
        imageUrl: product.node.images?.edges?.[0]?.node?.url || "",
      });
    }
  }, [product]);

  const handleAddToCart = async () => {
    if (!product) {
      toast.error("Product not available");
      return;
    }

    setIsCheckingOut(true);
    try {
      const variant = product.node.variants.edges[0].node;
      
      const cartItem = {
        product,
        variantId: variant.id,
        variantTitle: variant.title,
        price: variant.price,
        compareAtPrice: variant.compareAtPrice,
        quantity: 1,
        selectedOptions: variant.selectedOptions || []
      };
      
      addItem(cartItem);
      const toastId = toast.success("Added to cart!", {
        description: `1 pillow added to your cart.`,
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

  // Fixed price for knee pillow
  const productPrice = 39.99;

  return (
    <section className="pt-0 pb-3 md:pb-6 bg-background overflow-visible">
      <div className="container mx-auto px-4 max-w-7xl overflow-visible">
        {/* Mobile Layout: Carousel at top, then title */}
        <div className="md:hidden space-y-3 md:space-y-4 mb-4 md:mb-6">
          <Suspense fallback={<CarouselFallback />}>
            <KneePillowImageCarousel />
          </Suspense>
          
          {/* Mobile Title Section */}
          <div className="space-y-0">
            {/* Enhanced Social Proof */}
            <div className="space-y-2 mb-3">
              <div 
                className="flex items-center gap-2 flex-wrap cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="w-5 h-5 fill-yellow-500 text-yellow-500" />
                  ))}
                </div>
                <span className="text-sm font-semibold">5,100+ verified reviews</span>
              </div>
              
              <div className="flex gap-1 flex-nowrap overflow-x-auto scrollbar-hide -mx-4 px-4">
                <div className="inline-flex items-center gap-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 px-2 py-1 rounded-md text-[10px] font-bold whitespace-nowrap flex-shrink-0">
                  ✓ 98% Customer Satisfaction
                </div>
                <div className="inline-flex items-center gap-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded-md text-[10px] font-bold whitespace-nowrap flex-shrink-0">
                  🔥 Frequently Purchased
                </div>
              </div>
            </div>
            
            <h1 className="text-lg font-bold leading-tight tracking-tight truncate mt-3">
              Rise By Night™ Ergonomic Knee Pillow
            </h1>
            
            <p className="text-sm text-muted-foreground mt-0.5">
              Perfect Support for Side Sleepers
            </p>
          </div>
        </div>

        {/* Desktop Grid Layout */}
        <div className="grid md:grid-cols-2 gap-6 lg:gap-10 md:items-start">
          {/* Scrollable Product Images Column - Desktop Only */}
          <div className="hidden md:block relative order-2 md:order-1">
            <Suspense fallback={<CarouselFallback />}>
              <KneePillowImageCarousel />
            </Suspense>
          </div>
          
          {/* Sticky Product Details Column */}
          <div className="space-y-2 order-1 md:order-2 md:sticky md:top-20 md:self-start">

            {/* Desktop Title Section */}
            <div className="hidden md:flex flex-col gap-3">
              {/* Enhanced Social Proof */}
              <div className="space-y-2">
                <div 
                  className="flex items-center gap-3 flex-wrap cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="w-5 h-5 fill-yellow-500 text-yellow-500" />
                    ))}
                  </div>
                  <span className="text-base font-semibold">5,100+ verified reviews</span>
                </div>
                
                <div className="flex gap-1 sm:gap-1.5 flex-nowrap overflow-x-auto scrollbar-hide">
                  <div className="inline-flex items-center gap-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-1 md:py-1.5 rounded-md text-[9px] sm:text-[10px] md:text-xs font-bold whitespace-nowrap flex-shrink-0">
                    ✓ 98% Customer Satisfaction
                  </div>
                  <div className="inline-flex items-center gap-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-1 md:py-1.5 rounded-md text-[9px] sm:text-[10px] md:text-xs font-bold whitespace-nowrap flex-shrink-0">
                    🔥 Frequently Purchased
                  </div>
                </div>
              </div>
            </div>

            <h1 className="hidden md:block text-lg md:text-xl lg:text-2xl font-bold leading-tight tracking-tight truncate">
              Rise By Night™ Ergonomic Knee Pillow
            </h1>
            
            <p className="hidden md:block text-sm md:text-base text-muted-foreground mb-0">
              Perfect Support for Side Sleepers
            </p>

            {/* Price Display - Above USPs */}
            <div className="flex items-center gap-3 mt-2 mb-3">
              <p className="text-xl md:text-2xl font-bold">${productPrice.toFixed(2)}</p>
            </div>

            {/* Benefit-Focused USPs Section */}
            <div className="space-y-2 mb-2 md:mb-4">
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0 mt-0.5" />
                <p className="text-[10px] sm:text-[11px] lg:text-xs xl:text-sm leading-tight"><span className="font-semibold">Perfect alignment</span> - Aligns hips and spine for proper posture</p>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0 mt-0.5" />
                <p className="text-[10px] sm:text-[11px] lg:text-xs xl:text-sm leading-tight"><span className="font-semibold">Pain relief</span> - Reduces lower back and hip pain</p>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0 mt-0.5" />
                <p className="text-[10px] sm:text-[11px] lg:text-xs xl:text-sm leading-tight"><span className="font-semibold">Custom comfort</span> - Memory foam conforms to leg shape</p>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0 mt-0.5" />
                <p className="text-[10px] sm:text-[11px] lg:text-xs xl:text-sm leading-tight"><span className="font-semibold">Stays secure</span> - Adjustable strap keeps it in place</p>
              </div>
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

            <div className="grid grid-cols-3 gap-3 py-3 border-t text-center">
              <div className="flex flex-col items-center">
                <Shield className="w-5 h-5 mb-1.5 text-primary" />
                <p className="text-xs font-medium leading-tight">2-Year Warranty</p>
              </div>
              <div className="flex flex-col items-center">
                <Moon className="w-5 h-5 mb-1.5 text-primary" />
                <p className="text-xs font-medium leading-tight">100 nights risk free trial</p>
              </div>
              <div className="flex flex-col items-center">
                <Truck className="w-5 h-5 mb-1.5 text-primary" />
                <p className="text-xs font-medium leading-tight">Easy Returns</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <PolicyAccordion />
    </section>
  );
};
