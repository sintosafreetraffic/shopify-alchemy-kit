// Performance: Using WebP images with lazy loading for below-fold content
// Carousel is lazy-loaded to reduce initial bundle size
import { Button } from "@/components/ui/button";
import { Check, Shield, Moon, Truck, Loader2, Star, ImageIcon, ChevronDown, Heart, Package, ShieldCheck } from "lucide-react";
import { PaymentIcons } from "./PaymentIcons";
import { PolicyAccordion } from "./PolicyAccordion";
import { useState, useEffect, useRef, Suspense, lazy, useMemo } from "react";
import { addDays, format } from 'date-fns';
import { useCartStore } from "@/stores/cartStore";
import { useShopifyProducts, useFreeGiftMaskProduct } from "@/hooks/useShopifyProducts";
import type { ShopifyProduct } from "@/lib/shopify";
import { toast } from "sonner";
import { trackPageVisit } from "@/lib/pinterest";
import { trackViewContent as trackMetaViewContent } from "@/lib/meta-pixel";
import { trackViewedProduct } from "@/lib/klaviyo";
import { useHeaderHeight } from "@/hooks/useHeaderHeight";
import { formatPrice } from "@/lib/formatPrice";
import { trackATCClick } from "@/hooks/usePDPIntentTracking";
// trackABEvent moved to cartStore for centralized ATC tracking
import { getCurrencyForCountry } from "@/lib/countryCode";
import { getBuyerCountrySync } from "@/lib/buyerContext";
import { COUNTRY_NAMES } from "@/lib/countryCode";


import { mobileHeroConfig } from "@/config/mobileHeroConfig";
import { useValentinesOffer } from "@/hooks/useValentinesOffer";
import { ValentinesHeroSection } from "./ValentinesHeroSection";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
// Using WebP variants for better compression
import testimonialAvatar from "@/assets/testimonial-new-updated.webp";
import eyeMaskGift from "@/assets/eye-mask-gift-new.webp";
import moonIcon from "@/assets/moon-icon-blue.png";
import consumerChoiceBadge from "@/assets/consumer-choice-badge-transparent.png";
import pillowCoverImage from "@/assets/pillow-cover-included.webp";

// Sleep mask color images from Shopify CDN (transparent backgrounds)
const sleepMaskColorImages: Record<string, string> = {
  "Navy": "https://cdn.shopify.com/s/files/1/0796/1595/1068/files/S49c23029579045cd9f6bcaa8e25c2a77W.jpg_960x960q75.jpg_-removebg-preview_01bcb148-bf70-4a87-b615-082583768bb7.webp?v=1767524632",
  "Turquoise": "https://cdn.shopify.com/s/files/1/0796/1595/1068/files/Sc454d234910c4a5c90707dc614beafa7g_jpg_960x960q75_jpg-removebg-preview.png?v=1768121444",
  "Pink": "https://cdn.shopify.com/s/files/1/0796/1595/1068/files/S119f40412e2749f995e462802ae7c8edI_jpg_960x960q75_jpg-removebg-preview.png?v=1768121444",
  "Gold": "https://cdn.shopify.com/s/files/1/0796/1595/1068/files/Sd762462a530248b885c92fe66780627dN.jpg_960x960q75.jpg_-removebg-preview.webp?v=1767524632",
  "Silver": "https://cdn.shopify.com/s/files/1/0796/1595/1068/files/S47f9fd96fa874cd7ad47cd25e894c01aI.jpg_960x960q75.jpg___1_-removebg-preview.webp?v=1764580767",
  "Black": "https://cdn.shopify.com/s/files/1/0796/1595/1068/files/eye-mask-gift-transparent-CP76Ahkm.webp?v=1764490860",
};
const defaultMaskImage = sleepMaskColorImages["Navy"];

// Lazy load the image carousel to reduce initial bundle
const ProductImageCarousel = lazy(() => 
  import("./ProductImageCarousel").then(mod => ({ default: mod.ProductImageCarousel }))
);
const MiniReviewsCarousel = lazy(() => 
  import("./MiniReviewsCarousel").then(mod => ({ default: mod.MiniReviewsCarousel }))
);

// Calculate delivery date (5 days from now)
const getDeliveryDate = () => {
  const deliveryDate = addDays(new Date(), 5);
  return format(deliveryDate, 'MMM d');
};

// Carousel loading fallback - matches exact dimensions to prevent CLS
// Mobile: full-width square image | Desktop: 1200x900 aspect ratio (4:3)
const CarouselFallback = () => (
  <>
    {/* Mobile fallback - square aspect ratio */}
    <div className="md:hidden w-full aspect-square bg-muted/30 flex items-center justify-center">
      <ImageIcon className="h-12 w-12 text-muted-foreground/40" />
    </div>
    {/* Desktop fallback - 4:3 aspect ratio matching actual images */}
    <div className="hidden md:flex w-full aspect-[4/3] bg-muted/30 rounded-xl items-center justify-center">
      <ImageIcon className="h-12 w-12 text-muted-foreground/40" />
    </div>
  </>
);

export const Hero = () => {
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [selectedMaskColor, setSelectedMaskColor] = useState("Navy");
  const [isMaskColorPickerOpen, setIsMaskColorPickerOpen] = useState(false);
  const { addItem, setCartOpen, setFreeMaskSelections } = useCartStore();
  const hasTrackedView = useRef(false);
  const headerHeight = useHeaderHeight();
  const valentinesOffer = useValentinesOffer();
  const buyerCountry = getBuyerCountrySync() || 'US';
  const buyerCurrency = getCurrencyForCountry(buyerCountry);
  const buyerCountryName = COUNTRY_NAMES[buyerCountry] || 'your country';


  // Use centralized cached product data
  const { data: products, isLoading: productsLoading } = useShopifyProducts(10);
  const product = products?.[0] || null;
  
  // Get free gift mask product for variant IDs and price
  const { data: freeGiftMaskProduct } = useFreeGiftMaskProduct();
  
  // Get sleep mask product for actual price display (localized via @inContext in fetchProducts)
  const sleepMaskProduct = products?.find(
    (p: ShopifyProduct) => p.node.handle === "risebynight-silk-deep-sleep-mask"
  );
  const sleepMaskVariant = sleepMaskProduct?.node.variants.edges[0]?.node;
  const sleepMaskPrice = sleepMaskVariant ? parseFloat(sleepMaskVariant.price.amount) : 29.99;
  // Use currency from main product variant since they share the same localized context
  const mainVariant = product?.node.variants.edges[0]?.node;
  const shopifySleepMaskCurrency = sleepMaskVariant?.price.currencyCode || mainVariant?.price.currencyCode || 'USD';
  const sleepMaskCurrency = shopifySleepMaskCurrency === 'USD' ? buyerCurrency : shopifySleepMaskCurrency;
  
  // Get mask variants for color selection
  const maskVariants = useMemo(() => {
    if (!freeGiftMaskProduct) return [];
    return freeGiftMaskProduct.node.variants.edges.map(edge => ({
      id: edge.node.id,
      color: edge.node.selectedOptions.find(opt => opt.name === 'Color')?.value || edge.node.title,
    }));
  }, [freeGiftMaskProduct]);
  
  // Get selected mask image
  const selectedMaskImage = sleepMaskColorImages[selectedMaskColor] || defaultMaskImage;

  // Track product view once when product is loaded
  useEffect(() => {
    if (product && !hasTrackedView.current) {
      hasTrackedView.current = true;
      trackPageVisit(product.node.id);
      
      // Track Meta Pixel ViewContent
      const price = parseFloat(product.node.variants.edges[0]?.node.price.amount || "0");
      const currency = product.node.variants.edges[0]?.node.price.currencyCode || "EUR";
      trackMetaViewContent(product.node.id, product.node.title, price, currency);
      
      trackViewedProduct({
        id: product.node.id,
        title: product.node.title,
        price: price,
        sku: product.node.variants.edges[0]?.node.id || "",
        imageUrl: product.node.images?.edges?.[0]?.node?.url || "",
      });
    }
  }, [product]);

  const handleAddToCart = async (quantity: number = 1) => {
    if (!product) {
      toast.error("Product not available");
      return;
    }

    const variant = product.node.variants.edges[0]?.node;
    
    // Track A/B intent event - fire and forget (never blocks UI)
    trackATCClick();
    
    // Note: trackABEvent for ab_funnel_comparison is now handled centrally in cartStore.addItem()

    setIsCheckingOut(true);
    try {
      const variant = product.node.variants.edges[0].node;
      
      // Set the free mask selection before adding to cart
      const selectedMaskVariant = maskVariants.find(v => v.color === selectedMaskColor);
      if (selectedMaskVariant) {
        // For Valentine's couples deal, set mask selections for both pillows
        if (quantity === 2) {
          setFreeMaskSelections([
            { variantId: selectedMaskVariant.id, color: selectedMaskColor },
            { variantId: selectedMaskVariant.id, color: selectedMaskColor }
          ]);
        } else {
          setFreeMaskSelections([{ variantId: selectedMaskVariant.id, color: selectedMaskColor }]);
        }
      }
      
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
      
      const message = quantity === 2 
        ? "Valentine's Couple's Set added!" 
        : "Added to cart!";
      const savingsAmount = quantity === 2 && compareAtPrice > 0
        ? formatPrice((compareAtPrice - productPrice) * 2, currencyCode)
        : null;
      const description = quantity === 2
        ? `2 pillows added with ${selectedMaskColor} sleep masks.${savingsAmount ? ` You save ${savingsAmount}!` : ''}`
        : `${quantity} pillow added with ${selectedMaskColor} sleep mask.`;
      
      const toastId = toast.success(message, {
        description,
        duration: 2000,
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

  // Handlers for Valentine's section
  const handleAddSingle = () => handleAddToCart(1);
  const handleAddCouple = () => handleAddToCart(2);

  // Get product price from Shopify data
  const variant = product?.node.variants.edges[0]?.node;
  const productPrice = variant ? parseFloat(variant.price.amount) : 59.99;
  const shopifyCurrency = variant?.price.currencyCode || 'USD';
  const currencyCode = shopifyCurrency === 'USD' ? buyerCurrency : shopifyCurrency;
  
  // Dynamic compare-at price from Shopify (localized via @inContext)
  const compareAtPrice = variant?.compareAtPrice?.amount ? parseFloat(variant.compareAtPrice.amount) : 199.99;

  return (
    <section className="pb-3 md:pb-6 bg-background overflow-x-hidden" style={{ paddingTop: Math.max(headerHeight - 80, 0) }}>
      <div className="container mx-auto px-4 max-w-7xl overflow-x-hidden">
        {/* Mobile Layout: Carousel at top, then title */}
        <div className="md:hidden space-y-3 md:space-y-4 mb-0 md:mb-6">
          <Suspense fallback={<CarouselFallback />}>
            <ProductImageCarousel />
          </Suspense>
          <Suspense fallback={<div className="h-32 bg-muted/30 rounded-xl animate-pulse" />}>
            <MiniReviewsCarousel productHandle="ergonomic-pillow" autoPlayInterval={10000} buyerCountry={buyerCountry} />
          </Suspense>
          {/* Mobile Title Section - min heights prevent CLS */}
          <div className="space-y-0">
            {/* Enhanced Social Proof - min height prevents CLS */}
            <div className="space-y-2 mb-3 min-h-[52px]">
              <div 
                className="flex items-center gap-2 flex-wrap cursor-pointer hover:opacity-80 transition-opacity min-h-[20px]"
                onClick={() => {
                  const el = document.getElementById('reviews-wall');
                  if (el) {
                    const y = el.getBoundingClientRect().top + window.scrollY - 80;
                    window.scrollTo({ top: y, behavior: 'smooth' });
                  }
                }}
              >
                <div className="flex" style={{ width: '100px', height: '20px' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="w-5 h-5 fill-[hsl(var(--star))] text-[hsl(var(--star))]" />
                  ))}
                </div>
                <span className="text-sm font-semibold">6,247 verified product reviews</span>
              </div>
              
            </div>
            
            {/* Mobile title - styled as heading but using p tag to avoid duplicate H1 */}
            <p className="text-lg font-bold leading-tight tracking-tight mt-3" aria-label="Product title">
              Rise By Night™ Neck Pain Relief Pillow
            </p>
            
            <p className="text-sm text-muted-foreground mt-0.5">
              Specifically designed for side sleepers
            </p>
            
            {/* Mobile Price with Discount Badge - fixed height prevents CLS when price loads */}
            <div className="flex items-center gap-2 mt-2 flex-wrap h-[52px]">
              <p className="text-2xl font-bold text-primary">{formatPrice(productPrice, currencyCode)}</p>
            </div>
            
            {/* MOBILE CTA FIRST: Show CTA immediately after price when enabled */}
            {mobileHeroConfig.MOBILE_CTA_FIRST && (
              <div className="mt-3">
                <Button 
                  size="lg"
                  className="w-full text-lg py-6 font-bold shadow-lg hover:shadow-xl transition-all touch-manipulation animate-attention-pulse bg-primary text-primary-foreground hover:bg-black hover:text-white relative overflow-hidden group" 
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
          <div className="hidden md:block relative order-2 md:order-1 space-y-4">
            <Suspense fallback={<CarouselFallback />}>
              <ProductImageCarousel />
            </Suspense>
            <Suspense fallback={<div className="h-32 bg-muted/30 rounded-xl animate-pulse" />}>
              <MiniReviewsCarousel productHandle="ergonomic-pillow" autoPlayInterval={10000} buyerCountry={buyerCountry} />
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
                  onClick={() => {
                    const el = document.getElementById('reviews-wall');
                    if (el) {
                      const y = el.getBoundingClientRect().top + window.scrollY - 80;
                      window.scrollTo({ top: y, behavior: 'smooth' });
                    }
                  }}
                >
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="w-5 h-5 fill-[hsl(var(--star))] text-[hsl(var(--star))]" />
                    ))}
                  </div>
                  <span className="text-base font-semibold">6,247 verified product reviews</span>
                </div>
                
              </div>
            </div>

            <h1 className="hidden md:block text-lg md:text-xl lg:text-2xl font-bold leading-tight tracking-tight">
              Rise By Night™ Neck Pain Relief Pillow
            </h1>
            
            <p className="hidden md:block text-sm md:text-base text-muted-foreground mb-2">
              Specifically designed for side sleepers
            </p>

            {/* Price Display with Discount Badge - Desktop Only */}
            <div className="hidden md:flex items-center gap-3 mt-2 mb-3">
              <p className="text-xl md:text-2xl font-bold text-primary">{formatPrice(productPrice, currencyCode)}</p>
            </div>

            {/* USPs Section */}
            <div className="space-y-2 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-amber-400 shrink-0" />
                <p className="text-xs sm:text-sm lg:text-sm xl:text-base leading-tight text-amber-600 font-medium">Only 3 left at this price!</p>
              </div>
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-muted-foreground shrink-0" />
                <p className="text-xs sm:text-sm lg:text-sm xl:text-base leading-tight">Free shipping in {buyerCountry === 'NL' ? 'the ' : ''}<span className="font-semibold">{buyerCountryName}</span></p>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-muted-foreground shrink-0" />
                <p className="text-xs sm:text-sm lg:text-sm xl:text-base leading-tight">100 days money-back guarantee</p>
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
                compareAtPrice={compareAtPrice}
              />
            )}

            {/* Included Items - Combined Section (hidden during Valentine's offer) */}
            <div className={`rounded-xl py-3 px-3 sm:px-4 mb-4 border w-full max-w-full overflow-hidden ${valentinesOffer.isActive ? 'hidden' : ''}`} style={{ backgroundColor: 'rgba(59, 126, 237, 0.1)', borderColor: 'rgba(59, 126, 237, 0.3)' }}>
              <p className="text-xs font-semibold mb-2" style={{ color: '#3b7eed' }}>Included with your pillow</p>
              <div className="flex items-center gap-3">
                {/* Pillow Cover */}
                <div className="flex items-center gap-2 flex-1">
                  <div className="w-10 h-10 rounded flex items-center justify-center overflow-hidden flex-shrink-0" style={{ backgroundColor: 'rgba(59, 126, 237, 0.15)' }}>
                    <img src={pillowCoverImage} alt="Pillow cover" className="w-full h-full object-cover" />
                  </div>
                  <div className="text-left min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: '#3b7eed' }}>Pillow Cover</p>
                    <p className="text-[10px]" style={{ color: 'rgba(59, 126, 237, 0.8)' }}>Breathable</p>
                  </div>
                </div>
                
                {/* Divider */}
                <div className="w-px h-8" style={{ backgroundColor: 'rgba(59, 126, 237, 0.3)' }} />
                
                {/* Sleep Mask with Color Selector */}
                <div className="flex items-center gap-2 flex-1">
                  <img 
                    src={selectedMaskImage} 
                    alt={`${selectedMaskColor} sleep mask`} 
                    className="w-10 h-10 object-contain rounded flex-shrink-0" 
                    loading="lazy" 
                    decoding="async" 
                  />
                  <div className="text-left min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: '#3b7eed' }}>Sleep Mask</p>
                    <p className="text-[10px]" style={{ color: 'rgba(59, 126, 237, 0.8)' }}>{formatPrice(sleepMaskPrice, sleepMaskCurrency)} value</p>
                  </div>
                </div>
                
                {/* Color Picker - Controlled Popover that closes after selection */}
                <Popover open={isMaskColorPickerOpen} onOpenChange={setIsMaskColorPickerOpen}>
                  <PopoverTrigger asChild>
                    <button 
                      type="button"
                      className="flex items-center gap-1 text-xs font-medium transition-colors px-2 py-1 rounded-lg cursor-pointer"
                      style={{ color: '#3b7eed', backgroundColor: 'rgba(59, 126, 237, 0.15)' }}
                      aria-label={`Change mask color, currently ${selectedMaskColor}`}
                    >
                      <img 
                        src={sleepMaskColorImages[selectedMaskColor] || defaultMaskImage} 
                        alt={selectedMaskColor}
                        className="w-5 h-5 object-contain rounded"
                      />
                      <span className="capitalize hidden sm:inline">{selectedMaskColor}</span>
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent 
                    className="w-44 p-2 z-[200] bg-background border border-border shadow-lg" 
                    align="end"
                    sideOffset={4}
                  >
                    <div className="space-y-0.5">
                      {maskVariants.map((variant) => (
                        <button
                          key={variant.id}
                          type="button"
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                            selectedMaskColor === variant.color
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'hover:bg-secondary text-foreground'
                          }`}
                          onClick={() => {
                            setSelectedMaskColor(variant.color);
                            setIsMaskColorPickerOpen(false);
                          }}
                        >
                          <img 
                            src={sleepMaskColorImages[variant.color] || defaultMaskImage} 
                            alt={variant.color}
                            className="w-6 h-6 object-contain rounded"
                          />
                          <span className="capitalize">{variant.color}</span>
                          {selectedMaskColor === variant.color && (
                            <Check className="w-4 h-4 ml-auto text-primary" />
                          )}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Desktop CTA - hidden during Valentine's offer (has its own CTA) */}
            <div className={`${mobileHeroConfig.MOBILE_CTA_FIRST ? "hidden md:block" : ""} ${valentinesOffer.isActive ? "hidden" : ""}`}>
              <Button 
                size="lg"
                className="w-full text-lg md:text-xl py-6 font-bold shadow-lg hover:shadow-xl transition-all touch-manipulation animate-attention-pulse bg-primary text-primary-foreground hover:bg-black hover:text-white relative overflow-hidden group" 
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


          </div>
        </div>
        
        {/* Policy Accordion - Full Width on Desktop */}
        <div className="hidden md:block mt-8">
          <PolicyAccordion />
        </div>
      </div>
      
      {/* Policy Accordion - Mobile Only (full width) */}
      <div className="md:hidden">
        <PolicyAccordion />
      </div>
    </section>
  );
};
