/**
 * Hero Section - Variant B (Price Test: Pillow Only at €59.99)
 * 
 * Uses a SEPARATE Shopify product for the €59.99 pillow-only offer.
 * - NO sleep mask included
 * - Simplified "Included" section (pillow cover only)
 */

import { Button } from "@/components/ui/button";
import { Check, Shield, Moon, Truck, Loader2, Star, ImageIcon, ChevronDown, Heart } from "lucide-react";
import { PaymentIcons } from "@/components/PaymentIcons";
import { PolicyAccordion } from "@/components/PolicyAccordion";
import { useState, useEffect, useRef, Suspense, lazy } from "react";
import { useCartStore } from "@/stores/cartStore";
import { useABErgonomicPillow } from "@/hooks/useABProduct";
import { toast } from "sonner";
import { trackPageVisit } from "@/lib/pinterest";
import { trackViewContent as trackMetaViewContent } from "@/lib/meta-pixel";
import { trackViewedProduct } from "@/lib/klaviyo";
import { useHeaderHeight } from "@/hooks/useHeaderHeight";
import { formatPrice } from "@/lib/formatPrice";
import { trackATCClick } from "@/hooks/usePDPIntentTracking";
import { useIsEU } from "@/hooks/useCurrencySymbol";
import { mobileHeroConfig } from "@/config/mobileHeroConfig";
import { useValentinesOffer } from "@/hooks/useValentinesOffer";
import { ValentinesHeroSection } from "@/components/ValentinesHeroSection";
import testimonialAvatar from "@/assets/testimonial-new-updated.webp";
import pillowCoverImage from "@/assets/pillow-cover-included.webp";

// Lazy load the image carousel to reduce initial bundle
const ProductImageCarousel = lazy(() => 
  import("@/components/ProductImageCarousel").then(mod => ({ default: mod.ProductImageCarousel }))
);

// Carousel loading fallback
const CarouselFallback = () => (
  <div className="w-full aspect-square bg-muted/30 rounded-xl flex items-center justify-center animate-pulse">
    <ImageIcon className="h-12 w-12 text-muted-foreground/40" />
  </div>
);

export const HeroVariantB = () => {
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const { addItem, setCartOpen } = useCartStore();
  const hasTrackedView = useRef(false);
  const headerHeight = useHeaderHeight();
  const isEU = useIsEU();
  const valentinesOffer = useValentinesOffer();

  // Use A/B-aware product hook - automatically selects correct product for Variant B
  const { product, config, isLoading: productsLoading } = useABErgonomicPillow();
  
  // Get the first variant (Variant B product only has one variant)
  const variant = product?.node.variants.edges[0]?.node;

  // Track product view once when product is loaded
  useEffect(() => {
    if (product && variant && !hasTrackedView.current) {
      hasTrackedView.current = true;
      trackPageVisit(product.node.id);
      
      // Track Meta Pixel ViewContent
      const price = parseFloat(variant.price.amount || "0");
      const currency = variant.price.currencyCode || "EUR";
      trackMetaViewContent(product.node.id, product.node.title, price, currency);
      
      trackViewedProduct({
        id: product.node.id,
        title: product.node.title,
        price: price,
        sku: variant.id || "",
        imageUrl: product.node.images?.edges?.[0]?.node?.url || "",
      });
    }
  }, [product, variant]);

  const handleAddToCart = async (quantity: number = 1) => {
    if (!product || !variant) {
      toast.error("Product not available");
      return;
    }
    
    // Track A/B intent event - fire and forget (never blocks UI)
    trackATCClick();

    setIsCheckingOut(true);
    try {
      // VARIANT B: No free mask - just the pillow
      const cartItem = {
        product,
        variantId: variant.id,
        variantTitle: variant.title,
        price: variant.price,
        compareAtPrice: variant.compareAtPrice,
        quantity,
        selectedOptions: variant.selectedOptions || []
      };
      
      addItem(cartItem);

      const message = quantity === 2 ? "Valentine's Couple's Set added!" : "Added to cart!";
      const description = quantity === 2 ? "2 pillows added to your cart." : "1 pillow added to your cart.";
      const toastId = toast.success(message, {
        description,
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

  const handleAddSingle = () => handleAddToCart(1);
  const handleAddCouple = () => handleAddToCart(2);

  // Get product price from the Pillow Only variant
  const productPrice = variant ? parseFloat(variant.price.amount) : 59.99;
  const shopifyCurrency = variant?.price.currencyCode || 'USD';
  // Override to EUR for EU countries if Shopify returns USD
  const currencyCode = (isEU && shopifyCurrency === 'USD') ? 'EUR' : shopifyCurrency;

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
            
            {/* Mobile title - styled as heading but using p tag to avoid duplicate H1 */}
            <p className="text-lg font-bold leading-tight tracking-tight truncate mt-3" aria-label="Product title">
              Rise By Night™ Ergonomic Sleep Pillow
            </p>
            
            <p className="text-sm text-muted-foreground mt-0.5">
              The #1 Rated Ergonomic Pillow in the U.S.
            </p>
            
            {/* Mobile Price with Valentine's Badge */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <p className="text-2xl font-bold text-primary">{formatPrice(productPrice, currencyCode)}</p>
              {valentinesOffer.isActive && (
                <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-950/40 dark:to-rose-950/40 border border-pink-200 dark:border-pink-800 px-2.5 py-1 rounded-full">
                  <Heart className="w-3.5 h-3.5 text-pink-500 fill-pink-500" />
                  <span className="text-xs font-semibold text-pink-600 dark:text-pink-400">Valentine's Deal</span>
                </div>
              )}
            </div>
            
            {/* MOBILE CTA FIRST: Show CTA immediately after price when enabled */}
            {mobileHeroConfig.MOBILE_CTA_FIRST && (
              <div className="mt-3">
                <Button 
                  size="lg"
                  className="w-full text-lg py-6 font-bold shadow-lg hover:shadow-xl transition-all touch-manipulation animate-subtle-bounce bg-primary text-primary-foreground hover:bg-black hover:text-white relative overflow-hidden group" 
                  onClick={() => handleAddToCart(1)}
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
                
                <div className="flex gap-1 sm:gap-1.5 flex-nowrap">
                  <div className="inline-flex items-center gap-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-1 md:py-1.5 rounded-md text-[8px] sm:text-[9px] md:text-xs font-bold whitespace-nowrap">
                    ✓ 98% Customer Satisfaction
                  </div>
                  <div className="inline-flex items-center gap-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-1 md:py-1.5 rounded-md text-[8px] sm:text-[9px] md:text-xs font-bold whitespace-nowrap">
                    🔥 Frequently Purchased
                  </div>
                </div>
              </div>
            </div>

            <h1 className="hidden md:block text-lg md:text-xl lg:text-2xl font-bold leading-tight tracking-tight">
              Rise By Night™ Ergonomic Sleep Pillow
            </h1>
            
            <p className="hidden md:block text-sm md:text-base text-muted-foreground mb-2">
              The #1 Rated Ergonomic Pillow in the U.S.
            </p>

            {/* Price Display with Valentine's Badge - Desktop Only */}
            <div className="hidden md:flex items-center gap-3 mt-2 mb-3">
              <p className="text-xl md:text-2xl font-bold text-primary">{formatPrice(productPrice, currencyCode)}</p>
              {valentinesOffer.isActive && (
                <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-950/40 dark:to-rose-950/40 border border-pink-200 dark:border-pink-800 px-3 py-1.5 rounded-full shadow-sm">
                  <Heart className="w-4 h-4 text-pink-500 fill-pink-500" />
                  <span className="text-sm font-semibold text-pink-600 dark:text-pink-400">Valentine's Deal</span>
                </div>
              )}
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

            {/* Valentine's Day 1+1 Offer Section */}
            {valentinesOffer.isActive && (
              <ValentinesHeroSection
                onAddSingle={handleAddSingle}
                onAddCouple={handleAddCouple}
                isAdding={isCheckingOut}
                currencyCode={currencyCode}
                productPrice={productPrice}
              />
            )}

            {/* Included Items - Pillow Cover ONLY (no mask in Variant B) */}
            <div className={`rounded-xl py-3 px-3 sm:px-4 mb-4 border w-full max-w-full overflow-hidden ${valentinesOffer.isActive ? 'hidden' : ''}`} style={{ backgroundColor: 'rgba(59, 126, 237, 0.1)', borderColor: 'rgba(59, 126, 237, 0.3)' }}>
              <p className="text-xs font-semibold mb-2" style={{ color: '#3b7eed' }}>Included with your pillow</p>
              <div className="flex items-center gap-3">
                {/* Pillow Cover */}
                <div className="flex items-center gap-2 flex-1">
                  <div className="w-10 h-10 rounded flex items-center justify-center overflow-hidden flex-shrink-0" style={{ backgroundColor: 'rgba(59, 126, 237, 0.15)' }}>
                    <img src={pillowCoverImage} alt="Pillow cover" className="w-full h-full object-cover" />
                  </div>
                  <div className="text-left min-w-0">
                    <p className="text-xs font-medium" style={{ color: '#3b7eed' }}>Breathable Pillow Cover</p>
                    <p className="text-[10px]" style={{ color: 'rgba(59, 126, 237, 0.8)' }}>Premium quality, machine washable</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop CTA always shows, Mobile CTA only if MOBILE_CTA_FIRST is false */}
            <div className={`${mobileHeroConfig.MOBILE_CTA_FIRST ? "hidden md:block" : ""} ${valentinesOffer.isActive ? "hidden" : ""}`}>
              <Button 
                size="lg"
                className="w-full text-lg md:text-xl py-6 font-bold shadow-lg hover:shadow-xl transition-all touch-manipulation animate-subtle-bounce bg-primary text-primary-foreground hover:bg-black hover:text-white relative overflow-hidden group" 
                onClick={() => handleAddToCart(1)}
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
            </div>

            {/* Trust Band - Compact horizontal strip */}
            <div className="flex items-center justify-center gap-1.5 sm:gap-4 py-2 text-[8px] sm:text-[10px] text-muted-foreground flex-wrap max-w-full">
              <div className="flex items-center gap-1">
                <Check className="w-3 h-3 text-primary" />
                <span>100-Day Trial</span>
              </div>
              <div className="w-px h-3 bg-border" />
              <div className="flex items-center gap-1">
                <Check className="w-3 h-3 text-primary" />
                <span>Chiropractor Recommended</span>
              </div>
              <div className="w-px h-3 bg-border" />
              <div className="flex items-center gap-1">
                <Check className="w-3 h-3 text-primary" />
                <span>98% Satisfaction</span>
              </div>
            </div>

            {/* Policy Accordion - Desktop Only (inside right column) */}
            <div className="hidden md:block">
              <PolicyAccordion />
            </div>

          </div>
        </div>
      </div>
      
      {/* Policy Accordion - Mobile Only (full width) */}
      <div className="md:hidden">
        <PolicyAccordion />
      </div>
    </section>
  );
};
