/**
 * Hero Section - Variant B (Maximum Conversion)
 * 
 * Aggressive conversion optimization with:
 * - Price anchoring & savings callouts
 * - Multiple urgency signals
 * - Social proof stacking
 * - Risk reversal near CTA
 * - FOMO triggers
 */

import { Button } from "@/components/ui/button";
import { Check, Shield, Moon, Truck, Loader2, Star, ImageIcon, ChevronDown, Clock, Zap, Users, Gift, BadgeCheck } from "lucide-react";
import { PaymentIcons } from "@/components/PaymentIcons";
import { PolicyAccordion } from "@/components/PolicyAccordion";
import { useState, useEffect, useRef, Suspense, lazy, useMemo } from "react";
import { useCartStore } from "@/stores/cartStore";
import { useShopifyProducts, useFreeGiftMaskProduct } from "@/hooks/useShopifyProducts";
import type { ShopifyProduct } from "@/lib/shopify";
import { toast } from "sonner";
import { trackPageVisit } from "@/lib/pinterest";
import { trackViewedProduct } from "@/lib/klaviyo";
import { useHeaderHeight } from "@/hooks/useHeaderHeight";
import { formatPrice } from "@/lib/formatPrice";
import { useIsEU } from "@/hooks/useCurrencySymbol";
import { useABVariant } from "@/hooks/useABVariant";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  StockIndicator,
  ViewerCount,
  SellingFastBanner,
  ScarcityBar,
} from "@/components/ab-testing/UrgencyElements";
import { CountdownTimerDisplay } from "@/components/CountdownTimer";

// Import assets - unique testimonial avatar for Variant B
import testimonialAvatar from "@/assets/testimonial-sophie-variantb.webp";

// Sleep mask color images from Shopify CDN
const sleepMaskColorImages: Record<string, string> = {
  "Navy": "https://cdn.shopify.com/s/files/1/0796/1595/1068/files/S49c23029579045cd9f6bcaa8e25c2a77W.jpg_960x960q75.jpg_-removebg-preview_01bcb148-bf70-4a87-b615-082583768bb7.webp?v=1767524632",
  "Turquoise": "https://cdn.shopify.com/s/files/1/0796/1595/1068/files/Sc454d234910c4a5c90707dc614beafa7g_jpg_960x960q75_jpg-removebg-preview.png?v=1768121444",
  "Pink": "https://cdn.shopify.com/s/files/1/0796/1595/1068/files/S119f40412e2749f995e462802ae7c8edI_jpg_960x960q75_jpg-removebg-preview.png?v=1768121444",
  "Gold": "https://cdn.shopify.com/s/files/1/0796/1595/1068/files/Sd762462a530248b885c92fe66780627dN.jpg_960x960q75.jpg_-removebg-preview.webp?v=1767524632",
  "Silver": "https://cdn.shopify.com/s/files/1/0796/1595/1068/files/S47f9fd96fa874cd7ad47cd25e894c01aI.jpg_960x960q75.jpg___1_-removebg-preview.webp?v=1764580767",
  "Black": "https://cdn.shopify.com/s/files/1/0796/1595/1068/files/eye-mask-gift-transparent-CP76Ahkm.webp?v=1764490860",
};
const defaultMaskImage = sleepMaskColorImages["Navy"];

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

// Recent purchase notification component
const RecentPurchaseBadge = () => {
  const [soldToday] = useState(() => Math.floor(Math.random() * 20) + 47); // 47-67 sold today
  
  return (
    <div className="inline-flex items-center gap-1.5 bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold animate-pulse">
      <Zap className="h-3 w-3" />
      <span>{soldToday} sold today</span>
    </div>
  );
};

export const HeroVariantB = () => {
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [selectedMaskColor, setSelectedMaskColor] = useState("Navy");
  const [isMobileMaskPickerOpen, setIsMobileMaskPickerOpen] = useState(false);
  const [isDesktopMaskPickerOpen, setIsDesktopMaskPickerOpen] = useState(false);
  const { addItem, setCartOpen, setFreeMaskSelections } = useCartStore();
  const hasTrackedView = useRef(false);
  const headerHeight = useHeaderHeight();
  const isEU = useIsEU();
  const { trackEvent } = useABVariant();

  // Use centralized cached product data
  const { data: products, isLoading: productsLoading } = useShopifyProducts(10);
  const product = products?.[0] || null;
  
  // Get free gift mask product for variant IDs and price
  const { data: freeGiftMaskProduct } = useFreeGiftMaskProduct();
  
  // Get sleep mask product for actual price display
  const sleepMaskProduct = products?.find(
    (p: ShopifyProduct) => p.node.handle === "risebynight-silk-deep-sleep-mask"
  );
  const sleepMaskVariant = sleepMaskProduct?.node.variants.edges[0]?.node;
  const sleepMaskPrice = sleepMaskVariant ? parseFloat(sleepMaskVariant.price.amount) : 29.99;
  const mainVariant = product?.node.variants.edges[0]?.node;
  const shopifySleepMaskCurrency = sleepMaskVariant?.price.currencyCode || mainVariant?.price.currencyCode || 'USD';
  const sleepMaskCurrency = (isEU && shopifySleepMaskCurrency === 'USD') ? 'EUR' : shopifySleepMaskCurrency;
  
  // Get mask variants for color selection
  const maskVariants = useMemo(() => {
    if (!freeGiftMaskProduct?.node.variants.edges) return [];
    return freeGiftMaskProduct.node.variants.edges.map((edge: any) => {
      const colorOption = edge.node.selectedOptions?.find((opt: any) => opt.name === 'Color');
      const color = colorOption?.value || edge.node.title;
      return {
        id: edge.node.id,
        title: edge.node.title,
        color: color,
        image: sleepMaskColorImages[color] || defaultMaskImage,
      };
    });
  }, [freeGiftMaskProduct]);
  
  // Get selected mask variant ID
  const selectedMaskVariantId = useMemo(() => {
    const variant = maskVariants.find(v => v.color === selectedMaskColor);
    return variant?.id || maskVariants[0]?.id;
  }, [maskVariants, selectedMaskColor]);

  // Track page view once
  useEffect(() => {
    if (!hasTrackedView.current && product) {
      trackPageVisit(product.node.id);
      trackViewedProduct({
        id: product.node.id,
        title: product.node.title,
        price: parseFloat(mainVariant?.price.amount || "0"),
        sku: mainVariant?.id || "",
        imageUrl: product.node.images?.edges?.[0]?.node?.url || "",
      });
      hasTrackedView.current = true;
    }
  }, [product, mainVariant?.price.amount, mainVariant?.id]);

  const handleAddToCart = async () => {
    if (!product || !mainVariant) return;
    
    setIsCheckingOut(true);
    
    try {
      // Track A/B event
      trackEvent('add_to_cart', parseFloat(mainVariant.price.amount), {
        productId: product.node.id,
        productTitle: product.node.title,
        variantId: mainVariant.id,
      });

      // Set free mask color selection
      if (selectedMaskVariantId) {
        setFreeMaskSelections([{
          variantId: selectedMaskVariantId,
          color: selectedMaskColor,
        }]);
      }

      // Add to cart (using the same cart interface as Hero.tsx)
      const cartItem = {
        product,
        variantId: mainVariant.id,
        variantTitle: mainVariant.title,
        price: mainVariant.price,
        compareAtPrice: mainVariant.compareAtPrice,
        quantity: 1,
        selectedOptions: mainVariant.selectedOptions || []
      };
      
      addItem(cartItem);

      setCartOpen(true);
      toast.success("Added to cart!", {
        description: `Added with ${selectedMaskColor} sleep mask.`,
        duration: 1500,
      });
    } catch (error) {
      console.error("Add to cart error:", error);
      toast.error("Failed to add to cart");
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (productsLoading || !product) {
    return (
      <section className="py-8 md:py-12 lg:py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-start">
            <CarouselFallback />
            <div className="space-y-6 animate-pulse">
              <div className="h-8 bg-muted rounded w-3/4" />
              <div className="h-4 bg-muted rounded w-full" />
              <div className="h-4 bg-muted rounded w-2/3" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  const price = parseFloat(mainVariant?.price.amount || "0");
  const comparePrice = parseFloat(mainVariant?.compareAtPrice?.amount || "0");
  const currency = mainVariant?.price.currencyCode || "USD";
  const hasDiscount = comparePrice > price;

  return (
    <section className="pt-4 md:pt-6 pb-6 md:pb-10 lg:pb-14 overflow-x-hidden">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Mobile Layout: Images first, then content - full width */}
        <div className="md:hidden space-y-4 w-full">
          {/* Product Images - Mobile */}
          <div className="relative w-full">
            <Suspense fallback={<CarouselFallback />}>
              <ProductImageCarousel />
            </Suspense>
          </div>
          
          {/* Product Info - Mobile */}
          <div className="space-y-3 w-full">
            {/* Urgency Banner + Sold Today */}
            <div className="flex items-center gap-2 flex-wrap">
              <SellingFastBanner />
              <RecentPurchaseBadge />
            </div>
            
            {/* Title */}
            <h1 className="text-2xl font-bold text-foreground">
              {product.node.title}
            </h1>

            {/* Rating */}
            <div 
              className="flex items-center gap-2 flex-wrap cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <span className="text-sm font-medium">4.8</span>
              <span className="text-xs text-muted-foreground">(6,247 reviews)</span>
              <span className="text-xs text-green-600 font-semibold">98% recommend</span>
            </div>

            {/* FOMO Urgency Panel - Mobile */}
            <div className="p-3 bg-white border border-border rounded-lg space-y-2 shadow-sm w-full">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-primary uppercase tracking-wide flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Special Offer
                </span>
                <CountdownTimerDisplay />
              </div>
              <div className="flex items-center justify-between gap-2">
                <StockIndicator />
                <ViewerCount />
              </div>
              <ScarcityBar />
            </div>

            {/* Price Block - Mobile */}
            <div className="p-3 bg-white border border-border rounded-lg shadow-sm w-full">
              {(() => {
                const displayCurrency = (isEU && currency === 'USD') ? 'EUR' : currency;
                const effectiveComparePrice = hasDiscount ? comparePrice : price * 1.25;
                const effectiveSavings = hasDiscount ? (comparePrice - price) : (price * 0.25);
                const totalValue = effectiveComparePrice + sleepMaskPrice;
                
                return (
                  <>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-2xl font-bold text-primary">
                        {formatPrice(price, displayCurrency)}
                      </span>
                      <span className="text-base text-muted-foreground line-through">
                        {formatPrice(effectiveComparePrice, displayCurrency)}
                      </span>
                      <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded">
                        SAVE {formatPrice(effectiveSavings, displayCurrency)}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
                      <Gift className="h-3 w-3 text-primary flex-shrink-0" />
                      <span>+ FREE Mask {formatPrice(sleepMaskPrice, displayCurrency)}</span>
                      <span className="font-bold text-foreground">= {formatPrice(totalValue, displayCurrency)} Value</span>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Free Gift - Mobile */}
            <div className="p-3 bg-white border border-border rounded-lg shadow-sm w-full">
              <div className="flex items-center gap-3">
                <Popover open={isMobileMaskPickerOpen} onOpenChange={setIsMobileMaskPickerOpen}>
                  <PopoverTrigger asChild>
                    <button type="button" className="relative flex-shrink-0">
                      <img
                        src={sleepMaskColorImages[selectedMaskColor] || defaultMaskImage}
                        alt={`${selectedMaskColor} Sleep Mask`}
                        className="w-14 h-14 object-contain"
                      />
                      <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-[9px] px-1 py-0.5 rounded-full font-medium flex items-center gap-0.5">
                        {selectedMaskColor} <ChevronDown className="h-2 w-2" />
                      </div>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-2 z-[100]" align="start">
                    <p className="text-xs font-medium mb-2">Choose mask color:</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {maskVariants.map((variant) => (
                        <button
                          key={variant.id}
                          type="button"
                          onClick={() => {
                            setSelectedMaskColor(variant.color);
                            setIsMobileMaskPickerOpen(false);
                          }}
                          className={`p-1.5 rounded-lg border-2 transition-all ${
                            selectedMaskColor === variant.color
                              ? "border-primary bg-primary/5"
                              : "border-transparent hover:border-muted"
                          }`}
                        >
                          <img src={variant.image} alt={variant.color} className="w-full aspect-square object-contain" />
                          <p className="text-[9px] text-center mt-0.5 font-medium truncate">{variant.color}</p>
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">🎁 FREE Silk Sleep Mask</p>
                  <p className="text-xs text-muted-foreground">Tap to choose color</p>
                </div>
              </div>
            </div>

            {/* Testimonial - Mobile */}
            <div className="flex items-center gap-2.5 p-2 bg-green-50/50 border border-green-100 rounded-lg w-full">
              <img src={testimonialAvatar} alt="Sophie" className="w-10 h-10 rounded-full object-cover flex-shrink-0 ring-2 ring-green-200" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 mb-0.5">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <BadgeCheck className="h-3 w-3 text-blue-500" />
                </div>
                <p className="text-[10px] text-muted-foreground italic leading-tight line-clamp-2">
                  "Woke up pain-free for the first time in years!"
                </p>
                <p className="text-[9px] text-muted-foreground">— Sophie K.</p>
              </div>
            </div>

            {/* CTA - Mobile */}
            <div className="space-y-2 w-full">
              <Button
                size="lg"
                className="w-full h-14 text-lg font-bold bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 shadow-lg"
                onClick={handleAddToCart}
                disabled={isCheckingOut}
              >
                {isCheckingOut ? (
                  <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Adding...</>
                ) : (
                  <span className="flex items-center gap-2">
                    <Gift className="h-5 w-5" />
                    Claim Pillow + FREE Gift
                  </span>
                )}
              </Button>
              <p className="text-center text-xs text-red-600 font-medium">
                ⚡ Offer expires at midnight
              </p>
              <div className="flex items-center justify-center gap-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> 100-Night Trial</span>
                <span className="flex items-center gap-1"><Truck className="h-3 w-3" /> Free Returns</span>
              </div>
            </div>

            {/* Trust Badges - Mobile */}
            <div className="grid grid-cols-3 gap-2 py-2 text-center bg-muted/20 rounded-lg w-full">
              <div className="flex flex-col items-center">
                <Users className="w-4 h-4 mb-0.5 text-blue-600" />
                <p className="text-xs font-bold">250K+</p>
                <p className="text-[8px] text-muted-foreground">Sleepers</p>
              </div>
              <div className="flex flex-col items-center">
                <Star className="w-4 h-4 mb-0.5 text-yellow-500 fill-yellow-500" />
                <p className="text-xs font-bold">4.8/5</p>
                <p className="text-[8px] text-muted-foreground">Rating</p>
              </div>
              <div className="flex flex-col items-center">
                <BadgeCheck className="w-4 h-4 mb-0.5 text-green-600" />
                <p className="text-xs font-bold">98%</p>
                <p className="text-[8px] text-muted-foreground">Recommend</p>
              </div>
            </div>

            <PaymentIcons />
            <PolicyAccordion />
          </div>
        </div>

        {/* Desktop Layout: Two columns */}
        <div className="hidden md:grid md:grid-cols-2 gap-6 lg:gap-10 items-start">
          {/* Product Images - Desktop */}
          <div className="relative">
            <Suspense fallback={<CarouselFallback />}>
              <ProductImageCarousel />
            </Suspense>
          </div>

          {/* Product Info - Desktop */}
          <div className="space-y-3 md:space-y-4">
            {/* Urgency Banner + Sold Today */}
            <div className="flex items-center gap-2 flex-wrap">
              <SellingFastBanner />
              <RecentPurchaseBadge />
            </div>
            
            {/* Title */}
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground">
              {product.node.title}
            </h1>

            {/* Rating - Updated to match review count */}
            <div 
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <span className="text-sm font-medium">4.8</span>
              <span className="text-sm text-muted-foreground">(6,247 verified reviews)</span>
              <span className="text-xs text-green-600 font-semibold">98% recommend</span>
            </div>

            {/* FOMO Urgency Panel - unified white background */}
            <div className="p-3 bg-white border border-border rounded-lg space-y-2 shadow-sm">
              {/* Today's Deal Header */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-primary uppercase tracking-wide flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Today's Special Offer
                </span>
                <CountdownTimerDisplay />
              </div>
              
              <div className="flex items-center justify-between gap-3">
                <StockIndicator />
                <ViewerCount />
              </div>
              <ScarcityBar />
            </div>

            {/* Price with Anchor & Savings - unified white background */}
            <div className="p-3 bg-white border border-border rounded-lg shadow-sm">
              {/* Use same currency for all values - respect EU override */}
              {(() => {
                const displayCurrency = (isEU && currency === 'USD') ? 'EUR' : currency;
                const effectiveComparePrice = hasDiscount ? comparePrice : price * 1.25;
                const effectiveSavings = hasDiscount ? (comparePrice - price) : (price * 0.25);
                // Total value = compare price + mask price (original value before discount + gift)
                const totalValue = effectiveComparePrice + sleepMaskPrice;
                
                return (
                  <>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-3xl md:text-4xl font-bold text-primary">
                        {formatPrice(price, displayCurrency)}
                      </span>
                      {/* Always show compare price */}
                      <span className="text-xl text-muted-foreground line-through">
                        {formatPrice(effectiveComparePrice, displayCurrency)}
                      </span>
                      <span className="bg-primary text-primary-foreground text-sm font-bold px-2 py-0.5 rounded">
                        SAVE {formatPrice(effectiveSavings, displayCurrency)}
                      </span>
                    </div>
                    {/* Value Stack - Total = Compare price + mask (what you'd normally pay) */}
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <Gift className="h-3.5 w-3.5 text-primary" />
                      <span>+ FREE Sleep Mask worth {formatPrice(sleepMaskPrice, displayCurrency)}</span>
                      <span className="font-bold text-foreground">= {formatPrice(totalValue, displayCurrency)} Total Value</span>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Free Gift - unified white background */}
            <div className="p-4 bg-white border border-border rounded-lg shadow-sm">
              <div className="flex items-center gap-4">
                <Popover open={isDesktopMaskPickerOpen} onOpenChange={setIsDesktopMaskPickerOpen}>
                  <PopoverTrigger asChild>
                    <button type="button" className="relative flex-shrink-0 group">
                      <img
                        src={sleepMaskColorImages[selectedMaskColor] || defaultMaskImage}
                        alt={`${selectedMaskColor} Sleep Mask`}
                        className="w-16 h-16 object-contain"
                      />
                      <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5">
                        {selectedMaskColor} <ChevronDown className="h-2.5 w-2.5" />
                      </div>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-3 z-[100]" align="start">
                    <p className="text-sm font-medium mb-2">Choose your free mask color:</p>
                    <div className="grid grid-cols-3 gap-2">
                      {maskVariants.map((variant) => (
                        <button
                          key={variant.id}
                          type="button"
                          onClick={() => {
                            setSelectedMaskColor(variant.color);
                            setIsDesktopMaskPickerOpen(false);
                          }}
                          className={`p-2 rounded-lg border-2 transition-all ${
                            selectedMaskColor === variant.color
                              ? "border-primary bg-primary/5"
                              : "border-transparent hover:border-muted"
                          }`}
                        >
                          <img
                            src={variant.image}
                            alt={variant.color}
                            className="w-full aspect-square object-contain"
                          />
                          <p className="text-[10px] text-center mt-1 font-medium truncate">
                            {variant.color}
                          </p>
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    🎁 FREE Silk Sleep Mask
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Worth {formatPrice(sleepMaskPrice, sleepMaskCurrency)} • Tap to choose color
                  </p>
                </div>
              </div>
            </div>

            {/* Compact Testimonial with Person Image - ABOVE fold for social proof */}
            <div className="flex items-center gap-3 p-2.5 bg-green-50/50 border border-green-100 rounded-lg">
              <img
                src={testimonialAvatar}
                alt="Sophie - Verified Buyer"
                className="w-11 h-11 rounded-full object-cover flex-shrink-0 ring-2 ring-green-200"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <BadgeCheck className="h-3.5 w-3.5 text-blue-500" />
                  <span className="text-[10px] text-green-600 font-medium">Verified Purchase</span>
                </div>
                <p className="text-xs text-muted-foreground italic leading-tight line-clamp-2">
                  "Finally sleeping through the night without neck pain!"
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">— Sophie K., New York</p>
              </div>
            </div>

            {/* CTA Block - Maximum Conversion */}
            <div className="space-y-2">
              {/* Main CTA Button */}
              <Button
                size="lg"
                className="w-full h-16 text-xl font-bold relative overflow-hidden group bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 shadow-lg shadow-green-500/25 animate-pulse"
                onClick={handleAddToCart}
                disabled={isCheckingOut}
              >
                {isCheckingOut ? (
                  <>
                    <Loader2 className="h-6 w-6 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <span className="flex items-center gap-2">
                    <Gift className="h-5 w-5" />
                    Claim Your Pillow + FREE Gift
                  </span>
                )}
              </Button>
              
              {/* Urgency Subtext */}
              <p className="text-center text-xs text-red-600 font-medium">
                ⚡ Offer expires at midnight • Free shipping included
              </p>
              
              {/* Risk Reversal */}
              <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Shield className="h-3 w-3" /> 100-Night Trial
                </span>
                <span className="flex items-center gap-1">
                  <Truck className="h-3 w-3" /> Free Returns
                </span>
                <span className="flex items-center gap-1">
                  <BadgeCheck className="h-3 w-3" /> 2-Year Warranty
                </span>
              </div>
            </div>

            {/* Trust Badges - Social Proof */}
            <div className="grid grid-cols-3 gap-2 py-3 border-y text-center bg-muted/20 rounded-lg">
              <div className="flex flex-col items-center">
                <Users className="w-5 h-5 mb-1 text-blue-600" />
                <p className="text-sm font-bold text-foreground">250K+</p>
                <p className="text-[9px] text-muted-foreground">Happy Sleepers</p>
              </div>
              <div className="flex flex-col items-center">
                <Star className="w-5 h-5 mb-1 text-yellow-500 fill-yellow-500" />
                <p className="text-sm font-bold text-foreground">4.8/5</p>
                <p className="text-[9px] text-muted-foreground">Average Rating</p>
              </div>
              <div className="flex flex-col items-center">
                <BadgeCheck className="w-5 h-5 mb-1 text-green-600" />
                <p className="text-sm font-bold text-foreground">98%</p>
                <p className="text-[9px] text-muted-foreground">Recommend</p>
              </div>
            </div>

            {/* Payment Icons */}
            <PaymentIcons />

            {/* Policy Accordion - Below fold */}
            <PolicyAccordion />
          </div>
        </div>
      </div>
    </section>
  );
};
