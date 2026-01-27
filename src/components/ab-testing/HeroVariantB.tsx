/**
 * Hero Section - Variant B (Price Test: Pillow Only at €59.99)
 * 
 * This variant tests a simpler offer:
 * - NO sleep mask included
 * - Price: €59.99 (pillow only)
 * - Clean, straightforward value proposition
 */

import { Button } from "@/components/ui/button";
import { Check, Shield, Truck, Loader2, Star, ImageIcon } from "lucide-react";
import { PaymentIcons } from "@/components/PaymentIcons";
import { PolicyAccordion } from "@/components/PolicyAccordion";
import { useState, useEffect, useRef, Suspense, lazy } from "react";
import { useCartStore } from "@/stores/cartStore";
import { useShopifyProducts } from "@/hooks/useShopifyProducts";
import { toast } from "sonner";
import { trackPageVisit } from "@/lib/pinterest";
import { trackViewContent as trackMetaViewContent } from "@/lib/meta-pixel";
import { trackViewedProduct } from "@/lib/klaviyo";
import { useHeaderHeight } from "@/hooks/useHeaderHeight";
import { formatPrice } from "@/lib/formatPrice";
import { trackATCClick } from "@/hooks/usePDPIntentTracking";
import { useIsEU } from "@/hooks/useCurrencySymbol";
import { mobileHeroConfig } from "@/config/mobileHeroConfig";
import pillowCoverImage from "@/assets/pillow-cover-included.webp";

// Lazy load the image carousel
const ProductImageCarousel = lazy(() => 
  import("@/components/ProductImageCarousel").then(mod => ({ default: mod.ProductImageCarousel }))
);

// Carousel loading fallback
const CarouselFallback = () => (
  <div className="w-full aspect-square bg-muted/30 rounded-xl flex items-center justify-center animate-pulse">
    <ImageIcon className="h-12 w-12 text-muted-foreground/40" />
  </div>
);

// VARIANT B OFFER CONFIG
const VARIANT_B_PRICE = 59.99;
const VARIANT_B_INCLUDES_MASK = false;

export const HeroVariantB = () => {
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const { addItem, setCartOpen } = useCartStore();
  const hasTrackedView = useRef(false);
  const headerHeight = useHeaderHeight();
  const isEU = useIsEU();

  // Use centralized cached product data
  const { data: products, isLoading: productsLoading } = useShopifyProducts(10);
  const product = products?.[0] || null;
  
  // Get main variant for currency info (but we override the price)
  const mainVariant = product?.node.variants.edges[0]?.node;
  const shopifyCurrency = mainVariant?.price.currencyCode || 'USD';
  // Override to EUR for EU countries if Shopify returns USD
  const currencyCode = (isEU && shopifyCurrency === 'USD') ? 'EUR' : shopifyCurrency;

  // Track product view once when product is loaded
  useEffect(() => {
    if (product && !hasTrackedView.current) {
      hasTrackedView.current = true;
      trackPageVisit(product.node.id);
      
      // Track Meta Pixel ViewContent with Variant B price
      trackMetaViewContent(product.node.id, product.node.title, VARIANT_B_PRICE, currencyCode);
      
      trackViewedProduct({
        id: product.node.id,
        title: product.node.title,
        price: VARIANT_B_PRICE,
        sku: mainVariant?.id || "",
        imageUrl: product.node.images?.edges?.[0]?.node?.url || "",
      });
    }
  }, [product, currencyCode, mainVariant?.id]);

  const handleAddToCart = async () => {
    if (!product) {
      toast.error("Product not available");
      return;
    }

    const variant = product.node.variants.edges[0]?.node;
    
    // Track A/B intent event - fire and forget
    trackATCClick();

    setIsCheckingOut(true);
    try {
      // VARIANT B: No free mask, use the Variant B price
      const cartItem = {
        product,
        variantId: variant.id,
        variantTitle: variant.title,
        // Note: We use the actual Shopify price here for checkout
        // The visual display shows €59.99, but checkout uses Shopify's price
        // This ensures proper fulfillment - price difference is handled via discount codes
        price: variant.price,
        compareAtPrice: variant.compareAtPrice,
        quantity: 1,
        selectedOptions: variant.selectedOptions || []
      };
      
      addItem(cartItem);
      const toastId = toast.success("Added to cart!", {
        description: "1 pillow added to your cart.",
        duration: 1500,
        cancel: {
          label: "✕",
          onClick: () => {
            toast.dismiss(toastId);
          }
        }
      });
      setCartOpen(true);
    } catch (error) {
      console.error('Failed to add to cart:', error);
      toast.error("Failed to add to cart");
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <section className="pb-3 md:pb-6 bg-background overflow-x-hidden" style={{ paddingTop: Math.max(headerHeight - 80, 0) }}>
      <div className="container mx-auto px-4 max-w-7xl overflow-x-hidden">
        {/* Mobile Layout: Carousel at top, then title */}
        <div className="md:hidden space-y-3 md:space-y-4 mb-0 md:mb-6">
          <Suspense fallback={<CarouselFallback />}>
            <ProductImageCarousel />
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
                <span className="text-sm font-semibold">6,247 verified product reviews</span>
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
            
            {/* Mobile title */}
            <p className="text-lg font-bold leading-tight tracking-tight truncate mt-3" aria-label="Product title">
              Rise By Night™ Ergonomic Sleep Pillow
            </p>
            
            <p className="text-sm text-muted-foreground mt-0.5">
              The #1 Rated Ergonomic Pillow in the U.S.
            </p>
            
            {/* Mobile Price - Variant B: €59.99 pillow only */}
            <p className="text-2xl font-bold mt-2 text-primary">{formatPrice(VARIANT_B_PRICE, currencyCode)}</p>
            
            {/* MOBILE CTA FIRST: Show CTA immediately after price when enabled */}
            {mobileHeroConfig.MOBILE_CTA_FIRST && (
              <div className="mt-3">
                <Button 
                  size="lg"
                  className="w-full text-lg py-6 font-bold shadow-lg hover:shadow-xl transition-all touch-manipulation animate-subtle-bounce bg-primary text-primary-foreground hover:bg-black hover:text-white relative overflow-hidden group" 
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
                
                {/* Mobile Payment Icons - compact */}
                <div className="pt-2">
                  <PaymentIcons />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Grid Layout */}
        <div className="grid md:grid-cols-2 gap-6 lg:gap-10 items-start">
          {/* Scrollable Product Images Column - Desktop Only */}
          <div className="hidden md:block relative order-2 md:order-1">
            <Suspense fallback={<CarouselFallback />}>
              <ProductImageCarousel />
            </Suspense>
          </div>
          
          {/* Sticky Product Details Column */}
          <div className="space-y-2 order-1 md:order-2 md:sticky md:top-4 self-start">

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
                  <span className="text-base font-semibold">6,247 verified product reviews</span>
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
              Rise By Night™ Ergonomic Sleep Pillow
            </h1>
            
            <p className="hidden md:block text-sm md:text-base text-muted-foreground mb-2">
              The #1 Rated Ergonomic Pillow in the U.S.
            </p>

            {/* Price Display - Desktop Only - Variant B: €59.99 */}
            <div className="hidden md:flex items-center gap-3 mt-2 mb-3">
              <p className="text-xl md:text-2xl font-bold text-primary">{formatPrice(VARIANT_B_PRICE, currencyCode)}</p>
            </div>

            {/* Benefit-Focused USPs Section - 3 Categories */}
            <div className="space-y-2 mb-3">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 sm:w-5 sm:h-5 text-primary shrink-0" />
                <p className="text-xs sm:text-sm lg:text-sm xl:text-base leading-tight"><span className="font-semibold">Neck, back, shoulder, jaw & arm relief</span> – Ergonomic contours eliminate pressure points</p>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 sm:w-5 sm:h-5 text-primary shrink-0" />
                <p className="text-xs sm:text-sm lg:text-sm xl:text-base leading-tight"><span className="font-semibold">Deeper sleep, energized mornings</span> – Stay comfortable all night so your body fully recovers</p>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 sm:w-5 sm:h-5 text-primary shrink-0" />
                <p className="text-xs sm:text-sm lg:text-sm xl:text-base leading-tight"><span className="font-semibold">Clearer, younger-looking skin</span> – Proper alignment reduces puffiness and protects delicate skin</p>
              </div>
            </div>

            {/* Included Items - Pillow Cover ONLY (no mask in Variant B) */}
            <div className="rounded-xl py-3 px-3 sm:px-4 mb-4 border w-full max-w-full overflow-hidden" style={{ backgroundColor: 'rgba(59, 126, 237, 0.1)', borderColor: 'rgba(59, 126, 237, 0.3)' }}>
              <p className="text-xs font-semibold mb-2" style={{ color: '#3b7eed' }}>Included with your pillow</p>
              <div className="flex items-center gap-3">
                {/* Pillow Cover */}
                <div className="flex items-center gap-2 flex-1">
                  <div className="w-10 h-10 rounded flex items-center justify-center overflow-hidden flex-shrink-0" style={{ backgroundColor: 'rgba(59, 126, 237, 0.15)' }}>
                    <img src={pillowCoverImage} alt="Pillow cover" className="w-full h-full object-cover" />
                  </div>
                  <div className="text-left min-w-0">
                    <p className="text-xs font-medium" style={{ color: '#3b7eed' }}>Breathable Pillow Cover</p>
                    <p className="text-[10px]" style={{ color: 'rgba(59, 126, 237, 0.8)' }}>Premium quality, washable</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-2 md:gap-4 pb-3 text-center">
              <div className="flex flex-col items-center">
                <Shield className="w-5 h-5 mb-1 text-primary" />
                <p className="text-xs font-medium">100-Day Trial</p>
              </div>
              <div className="flex flex-col items-center">
                <Truck className="w-5 h-5 mb-1 text-primary" />
                <p className="text-xs font-medium">Free Shipping</p>
              </div>
              <div className="flex flex-col items-center">
                <Check className="w-5 h-5 mb-1 text-primary" />
                <p className="text-xs font-medium">Easy Returns</p>
              </div>
            </div>

            {/* ADD TO CART BUTTON */}
            {!mobileHeroConfig.MOBILE_CTA_FIRST && (
              <Button 
                size="lg"
                className="w-full md:hidden text-lg py-6 font-bold shadow-lg hover:shadow-xl transition-all touch-manipulation animate-subtle-bounce bg-primary text-primary-foreground hover:bg-black hover:text-white relative overflow-hidden group" 
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
            )}
            
            {/* Desktop CTA */}
            <Button 
              size="lg"
              className="hidden md:flex w-full text-lg py-6 font-bold shadow-lg hover:shadow-xl transition-all animate-subtle-bounce bg-primary text-primary-foreground hover:bg-black hover:text-white relative overflow-hidden group" 
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
            
            {/* Payment Icons */}
            <div className="pt-2">
              <PaymentIcons />
            </div>

            {/* Policy Accordion */}
            <div className="pt-2">
              <PolicyAccordion />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
