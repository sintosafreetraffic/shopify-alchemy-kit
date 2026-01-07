import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ShoppingCart, Minus, Plus, Trash2, Lock, Loader2, Moon, RotateCcw, Shield, Gift, Truck, ChevronDown, Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useCartStore } from "@/stores/cartStore";
import eyeMaskGift from "@/assets/eye-mask-gift-new.webp";
import kneePillowCart from "@/assets/knee-pillow-main-new.webp";
import completeSleepBundle from "@/assets/complete-sleep-bundle-updated.webp";
import sleepMaskNavy from "@/assets/sleep-mask-navy.webp";
import sleepMaskTurquoise from "@/assets/sleep-mask-turquoise.webp";
import sleepMaskPink from "@/assets/sleep-mask-pink.webp";
import sleepMaskGold from "@/assets/sleep-mask-gold.webp";
import sleepMaskSilver from "@/assets/sleep-mask-silver.webp";
import sleepMaskBlack from "@/assets/sleep-mask-black.webp";
import { useIsEU } from "@/hooks/useCurrencySymbol";

// Image mapping for sleep mask colors
const sleepMaskColorImages: Record<string, string> = {
  "Navy": sleepMaskNavy,
  "Turquoise": sleepMaskTurquoise,
  "Pink": sleepMaskPink,
  "Gold": sleepMaskGold,
  "Silver": sleepMaskSilver,
  "Black": sleepMaskBlack,
};
import { useRecommendedProducts, useProductPrices, useFreeGiftMaskProduct } from "@/hooks/useShopifyProducts";
import type { ShopifyProduct } from "@/lib/shopify";
import { toast } from "sonner";
import { ImageModal } from "./ImageModal";
import { CheckoutLoadingOverlay } from "./CheckoutLoadingOverlay";
import { useCheckoutStatus } from "@/hooks/useCheckoutStatus";
import { createCheckoutWithResilience, openCheckoutUrl, isMobileDevice } from "@/lib/checkoutUtils";
import { formatPrice, getCurrencySymbol } from "@/lib/formatPrice";

export const CartDrawer = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [shouldBounce, setShouldBounce] = useState(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [openColorPickerIndex, setOpenColorPickerIndex] = useState<number | null>(null);
  // Track selected colors for sleep mask recommendations (keyed by product ID)
  const [recommendationColors, setRecommendationColors] = useState<Record<string, string>>({});
  const isEU = useIsEU();
  
  const { 
    items, 
    isLoading, 
    updateQuantity, 
    removeItem, 
    createCheckout,
    addItem,
    setCartOpen,
    isCartOpen,
    freeMaskSelections,
    setFreeMaskSelections,
    updateFreeMaskColor
  } = useCartStore();
  
  const { 
    isCheckingOut, 
    checkoutStartTime, 
    startCheckout, 
    endCheckout 
  } = useCheckoutStatus();

  // Use cached product data for recommendations and prices
  const cartProductIds = useMemo(() => items.map(item => item.product.node.id), [items]);
  const { data: recommendedProducts = [] } = useRecommendedProducts(cartProductIds, 3);
  const { data: currentPrices = {} } = useProductPrices();
  const { data: freeGiftMaskProduct } = useFreeGiftMaskProduct();

  // Sync local state with store state
  useEffect(() => {
    setIsOpen(isCartOpen);
  }, [isCartOpen]);

  // Update store when local state changes
  useEffect(() => {
    setCartOpen(isOpen);
  }, [isOpen, setCartOpen]);

  // Bounce animation every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setShouldBounce(true);
      setTimeout(() => setShouldBounce(false), 600); // Duration of bounce animation
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Lock body scroll when cart is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = 'var(--removed-body-scroll-bar-size, 0px)';
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [isOpen]);
  
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  // Prefer fresh currency from Shopify (currentPrices) in case cart items were persisted from a previous region.
  // If in EU and Shopify returns USD, override to EUR for display
  const shopifyCurrency =
    (items[0] ? currentPrices[items[0].variantId]?.currencyCode : undefined) ||
    items[0]?.price.currencyCode ||
    'USD';
  const cartCurrency = isEU && shopifyCurrency === 'USD' ? 'EUR' : shopifyCurrency;

  // Use current prices from Shopify if available, fallback to stored prices
  const getItemPrice = (item: typeof items[0]) => {
    const currentPrice = currentPrices[item.variantId];
    return currentPrice ? parseFloat(currentPrice.price) : parseFloat(item.price.amount);
  };
  
  const getItemCompareAtPrice = (item: typeof items[0]) => {
    const currentPrice = currentPrices[item.variantId];
    if (currentPrice?.compareAtPrice) {
      return parseFloat(currentPrice.compareAtPrice);
    }
    return item.compareAtPrice ? parseFloat(item.compareAtPrice.amount) : null;
  };
  
  const subtotal = items.reduce((sum, item) => sum + (getItemPrice(item) * item.quantity), 0);
  
  // Calculate pillow items for free gift logic
  const ergonomicPillowItems = items.filter(item => 
    item.product.node.title.toLowerCase().includes('ergonomic sleep pillow')
  );
  const kneePillowItems = items.filter(item => 
    item.product.node.title.toLowerCase().includes('knee pillow') && 
    !item.product.node.title.toLowerCase().includes('free gift')
  );
  
  const totalErgonomicPillows = ergonomicPillowItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalKneePillows = kneePillowItems.reduce((sum, item) => sum + item.quantity, 0);
  
  // Free gifts logic: 
  // - Ergonomic pillow: 1 mask per pillow (included with each pillow)
  // - Knee pillow: 1 mask per pillow (included with each pillow, no more 1+1 deal)
  const ergonomicMasks = totalErgonomicPillows;
  const kneeMasks = totalKneePillows;
  const freeGifts = ergonomicMasks + kneeMasks;
  
  // No more BOGO discounts for any pillows
  const totalDiscount = 0;
  
  // Get sleep mask price from Shopify data for free gift value calculation
  const sleepMaskPrice = useMemo(() => {
    if (!freeGiftMaskProduct) return 29.99;
    const variant = freeGiftMaskProduct.node.variants.edges[0]?.node;
    return variant ? parseFloat(variant.price.amount) : 29.99;
  }, [freeGiftMaskProduct]);
  
  // FREEMASKSFORYOU discount: 100% off free gift masks (already calculated)
  const freeGiftValue = freeGifts * sleepMaskPrice;
  
  const totalPrice = subtotal - totalDiscount;
  
  // Shipping calculation
  const SHIPPING_COST = 14.99;
  const FREE_SHIPPING_THRESHOLD = 50;
  const shippingCost = totalPrice >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
  const finalTotal = totalPrice + shippingCost;

  // Get available mask variants for color selection
  const maskVariants = useMemo(() => {
    if (!freeGiftMaskProduct) return [];
    return freeGiftMaskProduct.node.variants.edges.map(edge => ({
      id: edge.node.id,
      color: edge.node.selectedOptions.find(opt => opt.name === 'Color')?.value || edge.node.title,
    }));
  }, [freeGiftMaskProduct]);

  // Initialize or adjust mask selections when freeGifts count changes
  useEffect(() => {
    if (freeGifts === 0) {
      if (freeMaskSelections.length > 0) {
        setFreeMaskSelections([]);
      }
      return;
    }
    
    // Get default variant (first one, usually Navy)
    const defaultVariant = maskVariants[0];
    if (!defaultVariant) return;
    
    // If we need more selections than we have, add defaults
    if (freeMaskSelections.length < freeGifts) {
      const newSelections = [...freeMaskSelections];
      while (newSelections.length < freeGifts) {
        newSelections.push({ variantId: defaultVariant.id, color: defaultVariant.color });
      }
      setFreeMaskSelections(newSelections);
    } 
    // If we have more selections than needed, trim
    else if (freeMaskSelections.length > freeGifts) {
      setFreeMaskSelections(freeMaskSelections.slice(0, freeGifts));
    }
  }, [freeGifts, maskVariants, freeMaskSelections.length, setFreeMaskSelections]);

  // Products are now fetched via useRecommendedProducts and useProductPrices hooks
  // which use centralized caching - no need for manual fetch on cart open

  const handleAddRecommendation = (product: ShopifyProduct, selectedColor?: string) => {
    // For sleep masks, use the selected color variant
    let variant = product.node.variants.edges[0]?.node;
    
    if (selectedColor && product.node.title.toLowerCase().includes('silk deep sleep mask')) {
      const colorVariant = product.node.variants.edges.find(v => 
        v.node.selectedOptions.some(opt => opt.name === 'Color' && opt.value === selectedColor) &&
        v.node.selectedOptions.some(opt => opt.name === 'Quantity' && opt.value === '1 Mask')
      )?.node;
      if (colorVariant) {
        variant = colorVariant;
      }
    }
    
    if (!variant) return;

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
      description: `${product.node.title} has been added to your cart.`,
      duration: 1500,
      cancel: {
        label: "✕",
        onClick: () => {
          toast.dismiss(toastId);
        }
      }
    });
  };

  const handleCheckout = async () => {
    // Prevent multiple simultaneous checkout attempts
    if (!startCheckout()) {
      return;
    }
    
    // Prevent checkout with empty cart
    if (items.length === 0) {
      endCheckout();
      return;
    }
    
    try {
      // Prepare checkout data (discount codes, free masks, etc.)
      const checkoutData = await createCheckout();
      
      if (!checkoutData) {
        endCheckout("Failed to prepare checkout");
        toast.error("Checkout Failed", {
          description: "Unable to prepare checkout. Please try again.",
        });
        return;
      }
      
      // Create checkout with timeout and retry logic
      const result = await createCheckoutWithResilience(
        checkoutData.items,
        checkoutData.freeMaskVariants,
        checkoutData.discountCodes
      );
      
      if (result.success && result.checkoutUrl) {
        // Open checkout URL with popup fallback
        const isMobile = isMobileDevice();
        openCheckoutUrl(result.checkoutUrl, isMobile);
        
        // Only end checkout and close drawer for desktop
        // Mobile will redirect, so keep loading state visible until page navigates away
        if (!isMobile) {
          setIsOpen(false);
          endCheckout();
        }
        // On mobile: intentionally don't call endCheckout() - loading stays visible until redirect completes
      } else {
        endCheckout(result.error);
        toast.error("We couldn't start checkout", {
          description: "Please try again — your cart is safe.",
        });
      }
    } catch (error) {
      console.error('Checkout failed:', error);
      endCheckout(error instanceof Error ? error.message : "Unknown error");
      toast.error("We couldn't start checkout", {
        description: "Please try again — your cart is safe.",
      });
    }
  };

  return (
    <>
      {/* Checkout Loading Overlay */}
      <CheckoutLoadingOverlay 
        isVisible={isCheckingOut} 
        startTime={checkoutStartTime} 
      />
      
      {/* Recommendations Panel - Attached to cart */}
      {isOpen && createPortal(
        <div 
          className="fixed top-0 bottom-0 right-[512px] w-80 bg-blue-100 border-r border-border z-[150] hidden lg:flex flex-col pointer-events-auto"
          data-recommendations-panel
        >
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            {recommendedProducts.map((product) => {
              const variant = product.node.variants.edges[0]?.node;
              const image = product.node.images.edges[0]?.node;
              const isSleepMask = product.node.title.toLowerCase().includes('silk deep sleep mask');
              const selectedColor = recommendationColors[product.node.id] || 'Navy';
              const displayImage = isSleepMask ? (sleepMaskColorImages[selectedColor] || sleepMaskNavy) :
                                   product.node.title.toLowerCase().includes('complete sleep bundle') ? completeSleepBundle : 
                                   image?.url;
              
              // Get available colors for sleep mask
              const colorOption = isSleepMask ? product.node.options?.find(opt => opt.name === 'Color') : null;
              const availableColors = colorOption?.values || [];
              
              return (
                <div
                  key={product.node.id}
                  className="border border-border rounded-lg p-3 bg-background hover:shadow-md transition-all"
                >
                   {displayImage && (
                    <div 
                      className="w-full aspect-square bg-secondary/20 rounded-md overflow-hidden mb-3 relative"
                    >
                      <img
                        src={displayImage}
                        alt={product.node.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                  )}
                  <h4 className="font-semibold text-sm leading-tight mb-2">
                    {product.node.title.replace('RiseByNight', 'Rise By Night™')}
                  </h4>
                  
                  {/* Color selector for sleep masks */}
                  {isSleepMask && availableColors.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-muted-foreground mb-1.5">Select color:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {availableColors.map((color) => (
                          <button
                            key={color}
                            onClick={() => setRecommendationColors(prev => ({ ...prev, [product.node.id]: color }))}
                            className={`w-8 h-8 rounded-md border-2 overflow-hidden transition-all ${
                              selectedColor === color 
                                ? 'border-primary ring-1 ring-primary ring-offset-1' 
                                : 'border-border hover:border-primary/50'
                            }`}
                            title={color}
                          >
                            <img 
                              src={sleepMaskColorImages[color] || sleepMaskNavy}
                              alt={color}
                              className="w-full h-full object-contain"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between gap-2">
                    {variant && (
                      <p className="text-lg font-bold text-primary">
                        {formatPrice(variant.price.amount, variant.price.currencyCode)}
                      </p>
                    )}
                    <Button
                      size="sm"
                      className="relative overflow-hidden group hover:bg-black transition-all"
                      onClick={() => handleAddRecommendation(product, isSleepMask ? selectedColor : undefined)}
                    >
                      <span className="inline-block transition-all duration-300 group-hover:-translate-y-8 group-hover:opacity-0">
                        ADD TO CART
                      </span>
                      <span className="absolute inset-0 flex items-center justify-center translate-y-8 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                        ADD TO CART
                      </span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>,
        document.body
      )}

      <Sheet open={isOpen} onOpenChange={setIsOpen} modal={false}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="relative" aria-label="Open shopping cart">
          <ShoppingCart className="h-5 w-5" />
          {totalItems > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
              {totalItems}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      
      <SheetContent 
        className="w-full sm:max-w-lg flex flex-col h-full overflow-x-hidden"
        onInteractOutside={(e) => {
          const target = e.target as HTMLElement;
          // Prevent closing when clicking on recommendations panel or toast notifications
          if (target.closest('[data-recommendations-panel]') || 
              target.closest('[data-sonner-toaster]') ||
              target.closest('[data-sonner-toast]')) {
            e.preventDefault();
          }
        }}
      >
        <SheetHeader className="flex-shrink-0">
          <SheetTitle>
            Shopping Cart {totalItems > 0 && <span className="text-sm font-normal text-muted-foreground">- {totalItems} item{totalItems !== 1 ? 's' : ''} in your cart</span>}
          </SheetTitle>
          <SheetDescription>
            {totalItems === 0 && "Your cart is empty"}
          </SheetDescription>
        </SheetHeader>
        
        <div className="flex flex-col flex-1 pt-0 min-h-0">
          {/* Free Shipping Progress Bar - Always Visible */}
          {items.length > 0 && (
            <div className="mb-1 px-1">
              <div className="space-y-2">
                {totalPrice >= FREE_SHIPPING_THRESHOLD ? (
                  <>
                    <div className="flex items-center gap-2 text-primary font-semibold text-sm justify-center">
                      <Truck className="w-4 h-4" />
                      <span>You have got free shipping!</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: '100%' }}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Add {formatPrice(FREE_SHIPPING_THRESHOLD - totalPrice, cartCurrency)} more for free shipping
                      </span>
                      <Truck className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min((totalPrice / FREE_SHIPPING_THRESHOLD) * 100, 100)}%` }}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
          
          {items.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Your cart is empty</p>
              </div>
            </div>
          ) : (
            <>
              {/* Scrollable Cart Items + Trust Badges + Pricing */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden pr-2 min-h-0 overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
                <div className="space-y-2">
                {/* Cart Items */}
                {items.map((item) => {
                    
                    // Get color-specific image for sleep mask
                    const getItemImage = () => {
                      if (item.product.node.title.toLowerCase().includes('complete sleep bundle')) {
                        return completeSleepBundle;
                      }
                      
                      if (item.product.node.title.toLowerCase().includes('knee pillow')) {
                        return kneePillowCart;
                      }
                      
                      if (item.product.node.title.toLowerCase().includes('silk deep sleep mask')) {
                        const colorOption = item.selectedOptions.find(opt => opt.name === 'Color');
                        if (colorOption && sleepMaskColorImages[colorOption.value]) {
                          return sleepMaskColorImages[colorOption.value];
                        }
                      }
                      
                      return item.product.node.images.edges[0]?.node.url;
                    };
                    
                    return (
                    <div key={item.variantId} className="flex gap-3 p-3 border rounded-lg bg-background">
                      {/* Product Image */}
                      <div className="w-20 h-20 bg-secondary/20 rounded-md overflow-hidden flex-shrink-0">
                        {item.product.node.images?.edges?.[0]?.node && (
                          <img
                            src={getItemImage()}
                            alt={item.product.node.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                        )}
                      </div>
                      
                      {/* Product Details */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h4 className="font-semibold text-sm leading-tight line-clamp-2">
                              {item.product.node.title.replace('RiseByNight', 'Rise By Night™')}
                            </h4>
                            {/* Color swatch for sleep masks */}
                            {item.product.node.title.toLowerCase().includes('silk deep sleep mask') && (() => {
                              const colorOption = item.selectedOptions.find(opt => opt.name === 'Color');
                              if (!colorOption) return null;
                              return (
                                <div className="flex items-center gap-1.5 mt-1">
                                  <div className="w-5 h-5 rounded-full border border-border overflow-hidden flex-shrink-0">
                                    {sleepMaskColorImages[colorOption.value] ? (
                                      <img 
                                        src={sleepMaskColorImages[colorOption.value]} 
                                        alt={colorOption.value}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full bg-muted" />
                                    )}
                                  </div>
                                  <span className="text-xs text-muted-foreground">{colorOption.value}</span>
                                </div>
                              );
                            })()}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 flex-shrink-0 -mt-0.5 -mr-0.5"
                            onClick={() => removeItem(item.variantId)}
                            aria-label={`Remove ${item.product.node.title} from cart`}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </div>
                        
                        {/* Price + Quantity row */}
                        <div className="flex items-center justify-between gap-2 mt-2">
                          <div className="flex flex-col min-w-0 flex-shrink">
                          {/* Simple price display - no more BOGO discounts */}
                            {getItemCompareAtPrice(item) ? (
                              <>
                                <span className="text-xs text-muted-foreground line-through whitespace-nowrap">
                                  {formatPrice(getItemCompareAtPrice(item)! * item.quantity, cartCurrency)}
                                </span>
                                <span className="font-bold text-sm text-primary whitespace-nowrap">
                                  {formatPrice(getItemPrice(item) * item.quantity, cartCurrency)}
                                </span>
                              </>
                            ) : (
                              <span className="font-bold text-sm text-primary whitespace-nowrap">
                                {formatPrice(getItemPrice(item) * item.quantity, cartCurrency)}
                              </span>
                            )}
                          </div>
                          
                          {/* Compact quantity controls */}
                          <div className="flex items-center border rounded-md h-7 flex-shrink-0">
                            <button
                              className="h-full px-2 hover:bg-secondary/50 transition-colors"
                              onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                            <button
                              className="h-full px-2 hover:bg-secondary/50 transition-colors"
                              onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                  })}
                  
                  {/* Included Items Section - Minimal, calm design */}
                  {freeGifts > 0 && (
                    <div className="border-t pt-3 mt-1">
                      <p className="text-xs text-muted-foreground mb-2">
                        Included with your pillow
                      </p>
                      <div className="space-y-1.5">
                        {Array.from({ length: freeGifts }).map((_, index) => {
                          const selection = freeMaskSelections[index];
                          const selectedColor = selection?.color || maskVariants[0]?.color || 'Navy';
                          const selectedImage = sleepMaskColorImages[selectedColor] || sleepMaskNavy;
                          
                          return (
                            <div key={index} className="flex items-center gap-2 py-1">
                              <img 
                                src={selectedImage} 
                                alt="Sleep Mask" 
                                className="w-8 h-8 object-contain flex-shrink-0 rounded"
                                loading="lazy"
                                decoding="async"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-foreground">
                                  Silk Sleep Mask
                                </p>
                              </div>
                              {openColorPickerIndex === index ? (
                                <Popover modal={true} open={true} onOpenChange={(open) => !open && setOpenColorPickerIndex(null)}>
                                  <PopoverTrigger asChild>
                                    <button 
                                      type="button"
                                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-secondary/50"
                                      aria-label={`Change color for mask ${index + 1}`}
                                    >
                                      <span className="capitalize">{selectedColor}</span>
                                      <ChevronDown className="w-3 h-3" />
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent 
                                    className="w-40 p-2 z-[200] bg-background border border-border shadow-lg" 
                                    align="end"
                                    sideOffset={4}
                                    onOpenAutoFocus={(e) => e.preventDefault()}
                                  >
                                    <div className="space-y-0.5">
                                      {maskVariants.map((variant) => (
                                        <button
                                          key={variant.id}
                                          type="button"
                                          onClick={() => {
                                            updateFreeMaskColor(index, variant.id, variant.color);
                                            setOpenColorPickerIndex(null);
                                          }}
                                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
                                            selection?.variantId === variant.id 
                                              ? 'bg-secondary text-foreground' 
                                              : 'hover:bg-secondary/50 text-muted-foreground'
                                          }`}
                                        >
                                          <div 
                                            className="w-4 h-4 rounded-full border border-border flex-shrink-0"
                                            style={{ 
                                              backgroundColor: variant.color === 'Navy' ? '#1e3a8a' :
                                                              variant.color === 'Turquoise' ? '#06b6d4' :
                                                              variant.color === 'Pink' ? '#ec4899' :
                                                              variant.color === 'Gold' ? '#fbbf24' :
                                                              variant.color === 'Silver' ? '#94a3b8' :
                                                              variant.color === 'Black' ? '#000000' : '#1e3a8a'
                                            }}
                                          />
                                          <span className="flex-1 text-left capitalize">{variant.color}</span>
                                          {selection?.variantId === variant.id && (
                                            <Check className="w-3 h-3 text-foreground" />
                                          )}
                                        </button>
                                      ))}
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              ) : (
                                <div className="flex items-center gap-1 text-xs text-foreground px-2 py-1">
                                  <div 
                                    className="w-4 h-4 rounded-full border border-border flex-shrink-0"
                                    style={{ 
                                      backgroundColor: selectedColor === 'Navy' ? '#1e3a8a' :
                                                      selectedColor === 'Turquoise' ? '#06b6d4' :
                                                      selectedColor === 'Pink' ? '#ec4899' :
                                                      selectedColor === 'Gold' ? '#fbbf24' :
                                                      selectedColor === 'Silver' ? '#94a3b8' :
                                                      selectedColor === 'Black' ? '#000000' : '#1e3a8a'
                                    }}
                                  />
                                  <span className="capitalize">{selectedColor}</span>
                                  <Check className="w-3 h-3 text-primary" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Mobile Recommendations */}
                  {recommendedProducts.length > 0 && (
                    <div className="pt-2 border-t mt-2 lg:hidden">
                      <h3 className="text-xs font-semibold mb-1.5 text-muted-foreground">You may also like</h3>
                      <div className="flex flex-col gap-2">
                        {recommendedProducts.map((product) => {
                          const variant = product.node.variants.edges[0]?.node;
                          const image = product.node.images.edges[0]?.node;
                          const isSleepMask = product.node.title.toLowerCase().includes('silk deep sleep mask');
                          const selectedColor = recommendationColors[product.node.id] || 'Navy';
                          const displayImage = isSleepMask ? (sleepMaskColorImages[selectedColor] || sleepMaskNavy) :
                                               product.node.title.toLowerCase().includes('complete sleep bundle') ? completeSleepBundle : 
                                               image?.url;
                          
                          // Get available colors for sleep mask
                          const colorOption = isSleepMask ? product.node.options?.find(opt => opt.name === 'Color') : null;
                          const availableColors = colorOption?.values || [];
                          
                          return (
                            <div 
                              key={product.node.id} 
                              className="border rounded p-2 bg-secondary/30"
                            >
                              <div className="flex items-center gap-2">
                                {displayImage && (
                                  <div className="w-12 h-12 flex-shrink-0 bg-background rounded overflow-hidden relative">
                                    <img
                                      src={displayImage}
                                      alt={product.node.title}
                                      className="w-full h-full object-cover"
                                      loading="lazy"
                                      decoding="async"
                                    />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-xs leading-tight line-clamp-1">
                                    {product.node.title.replace('RiseByNight', 'Rise By Night™')}
                                  </h4>
                                  {variant && (
                                    <p className="text-xs font-semibold text-primary">
                                      {formatPrice(variant.price.amount, variant.price.currencyCode)}
                                    </p>
                                  )}
                                </div>
                                <Button
                                  size="sm"
                                  className="h-7 px-3 text-xs bg-black text-white hover:bg-black/90"
                                  onClick={() => handleAddRecommendation(product, isSleepMask ? selectedColor : undefined)}
                                >
                                  ADD
                                </Button>
                              </div>
                              
                              {/* Color selector for sleep masks on mobile */}
                              {isSleepMask && availableColors.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-border/50">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[10px] text-muted-foreground">Color:</span>
                                    {availableColors.map((color) => (
                                      <button
                                        key={color}
                                        onClick={() => setRecommendationColors(prev => ({ ...prev, [product.node.id]: color }))}
                                        className={`w-6 h-6 rounded border-2 overflow-hidden transition-all ${
                                          selectedColor === color 
                                            ? 'border-primary ring-1 ring-primary' 
                                            : 'border-border hover:border-primary/50'
                                        }`}
                                        title={color}
                                      >
                                        <img 
                                          src={sleepMaskColorImages[color] || sleepMaskNavy}
                                          alt={color}
                                          className="w-full h-full object-contain"
                                        />
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Trust Badges + Pricing - Part of scrollable content */}
                <div className="space-y-2 pt-2 border-t mt-2 pb-2">
                  {/* Trust Badges */}
                <div className="grid grid-cols-3 gap-2 pb-1 mb-2">
                    <div className="flex flex-col items-center gap-1 text-center">
                      <Moon className="w-4 h-4 text-primary" />
                      <span className="text-xs font-medium">100-Night Trial</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 text-center">
                      <RotateCcw className="w-4 h-4 text-primary" />
                      <span className="text-xs font-medium">Easy Returns</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 text-center">
                      <Shield className="w-4 h-4 text-primary" />
                      <span className="text-xs font-medium">2-Year Warranty</span>
                    </div>
                  </div>

                  {/* Price Summary */}
                  <div className="space-y-1 pt-1">
                    {totalDiscount > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-green-600 dark:text-green-400">Savings</span>
                        <span className="text-green-600 dark:text-green-400 font-semibold">-{formatPrice(totalDiscount, cartCurrency)}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Shipping</span>
                      {shippingCost === 0 ? (
                        <span className="text-primary font-semibold">FREE</span>
                      ) : (
                        <span className="font-semibold">{formatPrice(shippingCost, cartCurrency)}</span>
                      )}
                    </div>
                    
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-base font-bold">Total</span>
                      <div className="text-lg font-bold text-primary">
                        {formatPrice(finalTotal, cartCurrency)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Fixed Checkout Section at Bottom */}
              <div className="flex-shrink-0 space-y-2 pt-2 border-t bg-background">
                <Button 
                  onClick={handleCheckout}
                  className={`w-full relative overflow-hidden group transition-all hover:bg-black ${shouldBounce ? 'animate-subtle-bounce' : ''}`}
                  size="default"
                  disabled={items.length === 0 || isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating Checkout...
                    </>
                  ) : (
                    <>
                      <span className="inline-flex items-center transition-all duration-300 group-hover:-translate-y-8 group-hover:opacity-0">
                        <Lock className="w-4 h-4 mr-2" />
                        CHECKOUT - {formatPrice(finalTotal, cartCurrency)}
                      </span>
                      <span className="absolute inset-0 flex items-center justify-center translate-y-8 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                        <Lock className="w-4 h-4 mr-2" />
                        CHECKOUT - {formatPrice(finalTotal, cartCurrency)}
                      </span>
                    </>
                  )}
                </Button>
                
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  {/* Visa */}
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-auto" width="48" height="30" viewBox="0 0 240 150" fill="none"><g clipPath="url(#visa__a)"><path fill="#000" d="M221.053 0H18.947C8.211 0 0 8.125 0 18.75v112.5C0 141.875 8.842 150 18.947 150h202.106c10.736 0 18.947-8.125 18.947-18.75V18.75C240 8.125 231.158 0 221.053 0Z" opacity=".07"></path><path fill="#fff" d="M221.333 6C228.3 6 234 11.646 234 18.546v112.909c0 6.9-5.7 12.545-12.667 12.545H18.667C11.7 144 6 138.355 6 131.455V18.545C6 11.646 11.7 6 18.667 6h202.666Z"></path><path fill="#142688" d="M178.737 63.789h-1.895c-2.526 6.315-4.421 9.473-6.316 18.947h12c-1.895-9.474-1.895-13.895-3.789-18.947Zm18.316 37.263h-10.737c-.632 0-.632 0-1.263-.632l-1.264-5.684-.631-1.263H168c-.632 0-1.263 0-1.263 1.263l-1.895 5.684c0 .632-.632.632-.632.632h-13.263l1.263-3.158 18.316-42.948c0-3.157 1.895-4.42 5.053-4.42h9.474c.631 0 1.263 0 1.263 1.262l8.842 41.053c.631 2.527 1.263 4.421 1.263 6.948.632.631.632.631.632 1.263Zm-84.632-1.895 2.526-11.368c.632 0 1.263.631 1.263.631 4.421 1.895 8.843 3.158 13.264 2.526 1.263 0 3.158-.631 4.421-1.263 3.158-1.263 3.158-4.42.631-6.947-1.263-1.263-3.158-1.895-5.052-3.158-2.527-1.263-5.053-2.526-6.948-4.421-7.579-6.316-5.052-15.158-.631-19.579 3.789-2.526 5.684-5.053 10.736-5.053 7.579 0 15.79 0 19.579 1.264h.632c-.632 3.789-1.263 6.947-2.526 10.736C147.158 61.262 144 60 140.842 60c-1.895 0-3.789 0-5.684.632-1.263 0-1.895.631-2.527 1.263-1.263 1.263-1.263 3.158 0 4.42l3.158 2.527c2.527 1.263 5.053 2.527 6.948 3.79 3.158 1.894 6.316 5.052 6.947 8.842 1.263 5.684-.631 10.737-5.684 14.526-3.158 2.526-4.421 3.79-8.842 3.79-8.842 0-15.79.631-21.474-1.264-.631 1.264-.631 1.263-1.263.632Zm-22.105 1.895c.631-4.421.631-4.421 1.263-6.316 3.158-13.895 6.316-28.421 8.842-42.316.632-1.263.632-1.895 1.895-1.895h11.368c-1.263 7.58-2.526 13.264-4.421 20.21-1.895 9.475-3.789 18.948-6.316 28.422 0 1.263-.631 1.263-1.894 1.263M31.579 51.788c0-.631 1.263-1.263 1.895-1.263h21.473c3.158 0 5.684 1.895 6.316 5.053l5.684 27.79c0 .631 0 .631.632 1.263 0-.632.631-.632.631-.632l13.264-32.21c-.632-.632 0-1.264.631-1.264h13.263c0 .632 0 .632-.631 1.264l-19.58 46.105c-.63 1.263-.63 1.894-1.262 2.526-.632.632-1.895 0-3.158 0h-9.474c-.631 0-1.263 0-1.263-1.263L49.895 59.999c-1.264-1.263-3.158-3.158-5.685-3.79-3.789-1.894-10.736-3.157-12-3.157l-.631-1.264Z"></path></g><defs><clipPath id="visa__a"><path fill="#fff" d="M0 0h240v150H0z"></path></clipPath></defs></svg>
                  
                  {/* Mastercard */}
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-auto" width="48" height="30" viewBox="0 0 240 150" fill="none"><g clipPath="url(#mastercard__a)"><path fill="#000" d="M221.053 0H18.947C8.211 0 0 8.125 0 18.75v112.5C0 141.875 8.842 150 18.947 150h202.106c10.736 0 18.947-8.125 18.947-18.75V18.75C240 8.125 231.158 0 221.053 0Z" opacity=".07"></path><path fill="#fff" d="M221.333 6C228.3 6 234 11.646 234 18.546v112.909c0 6.9-5.7 12.545-12.667 12.545H18.667C11.7 144 6 138.355 6 131.455V18.545C6 11.646 11.7 6 18.667 6h202.666Z"></path><path fill="#EB001B" d="M94.737 119.999c24.417 0 44.21-19.794 44.21-44.21 0-24.417-19.793-44.21-44.21-44.21s-44.21 19.793-44.21 44.21c0 24.416 19.793 44.21 44.21 44.21Z"></path><path fill="#F79E1B" d="M145.263 119.999c24.417 0 44.211-19.794 44.211-44.21 0-24.417-19.794-44.21-44.211-44.21-24.417 0-44.21 19.793-44.21 44.21 0 24.416 19.793 44.21 44.21 44.21Z"></path><path fill="#FF5F00" d="M138.947 75.79c0-15.159-7.578-28.422-18.947-36-11.368 8.21-18.947 21.473-18.947 36 0 14.525 7.579 28.42 18.947 35.999 11.369-7.579 18.947-20.842 18.947-36Z"></path></g><defs><clipPath id="mastercard__a"><path fill="#fff" d="M0 0h240v150H0z"></path></clipPath></defs></svg>
                  
                  {/* American Express */}
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-auto" width="48" height="30" viewBox="0 0 240 150" fill="none"><g clipPath="url(#amex__a)"><path fill="#000" d="M221.053 0H18.947C8.211 0 0 8.125 0 18.75v112.5C0 141.875 8.842 150 18.947 150h202.106c10.736 0 18.947-8.125 18.947-18.75V18.75C240 8.125 231.158 0 221.053 0Z" opacity=".07"></path><path fill="#006FCF" d="M221.333 6C228.3 6 234 11.646 234 18.546v112.909c0 6.9-5.7 12.545-12.667 12.545H18.667C11.7 144 6 138.355 6 131.455V18.545C6 11.646 11.7 6 18.667 6h202.666Z"></path><path fill="#fff" fillRule="evenodd" d="M50.179 114.631V80.559h37.918l4.068 5.046 4.203-5.046H234v31.722s-3.599 2.316-7.762 2.35h-76.21l-4.587-5.371v5.371h-15.03v-9.168s-2.053 1.279-6.492 1.279h-5.116v7.889H96.046l-4.062-5.154-4.125 5.154h-37.68ZM6 54.879l8.531-18.967h14.754l4.842 10.624V35.912h18.34l2.882 7.679 2.795-7.679h82.329v3.86s4.328-3.86 11.441-3.86l26.713.09 4.758 10.484V35.912h15.348l4.224 6.023v-6.023h15.489v34.072h-15.489l-4.048-6.042v6.042h-22.55l-2.268-5.37h-6.062l-2.231 5.37h-15.292c-6.121 0-10.033-3.781-10.033-3.781v3.781h-23.058l-4.576-5.37v5.37h-85.74l-2.266-5.37H18.79l-2.25 5.37H6V54.88Zm.044 10.746 11.507-25.513h8.723L37.77 65.626h-7.656L28 60.516H15.66l-2.123 5.109H6.044ZM25.57 54.977l-3.762-8.927-3.773 8.927h7.535Zm12.992 10.644V40.108l10.646.038L55.4 56.595l6.044-16.487h10.56v25.513h-6.688V46.822l-7.09 18.799H52.36l-7.11-18.799v18.799h-6.688Zm38.019 0V40.108h21.825v5.707H83.34v4.364h14.714v5.37H83.34v4.533h15.066v5.539H76.581Zm25.697.004V40.112h14.884c4.932 0 9.351 2.909 9.351 8.277 0 4.59-3.726 7.546-7.338 7.837l8.801 9.399h-8.173l-8.02-9.064h-2.816v9.064h-6.689Zm14.334-19.806h-7.645v5.371h7.744c1.341 0 3.069-.99 3.069-2.685 0-1.318-1.334-2.686-3.168-2.686Zm19.461 19.802h-6.83V40.108h6.83v25.513Zm16.193 0h-1.474c-7.133 0-11.463-5.359-11.463-12.652 0-7.473 4.282-12.86 13.289-12.86h7.392v6.042h-7.663c-3.656 0-6.242 2.72-6.242 6.881 0 4.941 2.957 7.016 7.217 7.016h1.76l-2.816 5.573Zm3.047.004 11.507-25.513h8.723l11.496 25.513h-7.657l-2.112-5.109h-12.343l-2.123 5.109h-7.491Zm19.526-10.648-3.762-8.927-3.773 8.927h7.535Zm12.981 10.644V40.108h8.504l10.857 16.03v-16.03h6.689v25.513h-8.229l-11.133-16.45v16.45h-6.688ZM54.755 110.267V84.755h21.826v5.707H61.514v4.364H76.23v5.371H61.514v4.531h15.067v5.539H54.755Zm106.945 0V84.755h21.825v5.707h-15.066v4.364h14.644v5.371h-14.644v4.531h15.066v5.539H161.7Zm-84.272 0 10.626-12.599-10.88-12.913h8.427l6.48 7.983 6.501-7.983h8.097L95.942 97.51l10.646 12.756h-8.425l-6.291-7.857-6.139 7.857h-8.305Zm29.955.004V84.759h14.774c6.062 0 9.603 3.726 9.603 8.581 0 5.861-4.515 8.875-10.472 8.875h-7.041v8.056h-6.864Zm14.279-19.742h-7.415v5.874h7.393c1.953 0 3.322-1.234 3.322-2.937 0-1.812-1.376-2.937-3.3-2.937Zm13.003 19.738V84.755h14.883c4.932 0 9.351 2.908 9.351 8.277 0 4.59-3.726 7.545-7.337 7.836l8.8 9.399h-8.173l-8.02-9.063h-2.816v9.063h-6.688Zm14.333-19.805h-7.645v5.37h7.744c1.341 0 3.07-.99 3.07-2.685 0-1.317-1.334-2.685-3.169-2.685Zm37.625 19.805v-5.539h13.386c1.98 0 2.838-1.02 2.838-2.14 0-1.072-.855-2.156-2.838-2.156h-6.049c-5.258 0-8.186-3.055-8.186-7.642 0-4.09 2.681-8.035 10.495-8.035h13.025l-2.817 5.74h-11.264c-2.154 0-2.817 1.078-2.817 2.107 0 1.057.82 2.224 2.465 2.224h6.336c5.861 0 8.405 3.17 8.405 7.322 0 4.463-2.835 8.119-8.724 8.119h-14.255Zm23.568 0v-5.539h13.386c1.98 0 2.838-1.02 2.838-2.14 0-1.072-.855-2.156-2.838-2.156h-6.049c-5.258 0-8.186-3.055-8.186-7.642 0-4.09 2.681-8.035 10.495-8.035h13.024l-2.816 5.74h-11.264c-2.154 0-2.817 1.078-2.817 2.107 0 1.057.819 2.224 2.465 2.224h6.336c5.861 0 8.404 3.17 8.404 7.322 0 4.463-2.834 8.119-8.723 8.119h-14.255Z" clipRule="evenodd"></path></g><defs><clipPath id="amex__a"><path fill="#fff" d="M0 0h240v150H0z"></path></clipPath></defs></svg>
                  
                  {/* PayPal */}
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-auto" width="48" height="30" viewBox="0 0 240 150" fill="none"><g clipPath="url(#paypal__a)"><path fill="#000" d="M221.053 0H18.947C8.211 0 0 8.125 0 18.75v112.5C0 141.875 8.842 150 18.947 150h202.106c10.736 0 18.947-8.125 18.947-18.75V18.75C240 8.125 231.158 0 221.053 0Z" opacity=".07"></path><path fill="#fff" d="M221.333 6C228.3 6 234 11.646 234 18.546v112.909c0 6.9-5.7 12.545-12.667 12.545H18.667C11.7 144 6 138.355 6 131.455V18.545C6 11.646 11.7 6 18.667 6h202.666Z"></path><g clipPath="url(#paypal__b)"><path fill="#003087" d="M81.554 60.799a.812.812 0 0 0-.808.674l-4.664 28.873a.721.721 0 0 0 .172.595.756.756 0 0 0 .576.259h5.531a.813.813 0 0 0 .808-.674l1.37-8.48a.812.812 0 0 1 .809-.674h5.029c5.876 0 10.864-4.184 11.775-9.855.919-5.719-3.658-10.706-10.145-10.718H81.553Zm5.377 6.445h4.024c3.313 0 4.391 1.908 4.05 4.018-.34 2.115-2.016 3.672-5.22 3.672h-4.096l1.242-7.69Zm26.471 1.963c-1.397.005-3.004.285-4.808 1.018-4.139 1.684-6.126 5.164-6.97 7.701 0 0-2.687 7.74 3.383 11.993 0 0 5.629 4.095 11.966-.252l-.11.68a.717.717 0 0 0 .173.594.77.77 0 0 0 .574.26h5.251a.812.812 0 0 0 .808-.675l3.195-19.773a.734.734 0 0 0-.431-.786.77.77 0 0 0-.316-.069h-5.251a.813.813 0 0 0-.809.675l-.171 1.064s-2.293-2.445-6.484-2.43Zm.172 6.245c.603 0 1.154.082 1.649.237 2.266.71 3.55 2.834 3.179 5.137-.459 2.836-2.841 4.924-5.897 4.924-.602 0-1.154-.08-1.649-.236-2.265-.71-3.558-2.835-3.186-5.138.458-2.835 2.848-4.924 5.904-4.924Z"></path><path fill="#0070E0" d="M157.172 60.799a.812.812 0 0 0-.808.674l-4.665 28.873a.734.734 0 0 0 .432.786.77.77 0 0 0 .317.068h5.531a.813.813 0 0 0 .808-.674l1.37-8.48a.813.813 0 0 1 .809-.674h5.029c5.876 0 10.863-4.184 11.774-9.855.919-5.719-3.658-10.706-10.145-10.718h-10.452Zm5.377 6.445h4.024c3.312 0 4.391 1.908 4.05 4.018-.341 2.115-2.016 3.672-5.221 3.672h-4.095l1.242-7.69Zm26.47 1.963c-1.396.005-3.004.285-4.808 1.018-4.139 1.684-6.126 5.164-6.97 7.701 0 0-2.686 7.74 3.384 11.993 0 0 5.628 4.095 11.965-.252l-.109.68a.719.719 0 0 0 .173.594.756.756 0 0 0 .575.259h5.251a.812.812 0 0 0 .808-.674l3.195-19.773a.72.72 0 0 0-.172-.596.773.773 0 0 0-.576-.26h-5.251a.812.812 0 0 0-.808.676l-.172 1.064s-2.294-2.445-6.485-2.43Zm.172 6.245a5.5 5.5 0 0 1 1.649.237c2.266.71 3.551 2.834 3.179 5.137-.459 2.836-2.841 4.924-5.896 4.924a5.51 5.51 0 0 1-1.65-.236c-2.265-.71-3.557-2.835-3.186-5.138.459-2.835 2.849-4.924 5.904-4.924Z"></path><path fill="#003087" d="M129.355 69.899a.603.603 0 0 0-.585.783l5.757 17.438-5.205 8.218c-.253.399.041.914.521.914h6.152a1.041 1.041 0 0 0 .875-.482l16.078-25.962c.247-.4-.048-.91-.525-.91h-6.152c-.178 0-.352.046-.507.132a1.01 1.01 0 0 0-.373.359l-6.329 10.43-3.212-10.353a.818.818 0 0 0-.784-.568l-5.711.001Z"></path><path fill="#0070E0" d="M208.449 60.799a.813.813 0 0 0-.808.674l-4.665 28.872a.726.726 0 0 0 .172.596.768.768 0 0 0 .576.26h5.531a.812.812 0 0 0 .808-.675l4.665-28.873a.717.717 0 0 0-.173-.595.757.757 0 0 0-.574-.26h-5.532Z"></path><path fill="#001C64" d="M35.44 60.799c-.357 0-.701.124-.972.35-.27.226-.45.54-.506.883l-2.455 15.2A1.485 1.485 0 0 1 32.984 76h7.195c7.241 0 13.385-5.156 14.508-12.143.084-.522.13-1.049.142-1.576-1.84-.942-4.002-1.481-6.37-1.481h-13.02Z"></path><path fill="#0070E0" d="M54.83 62.28a11.713 11.713 0 0 1-.142 1.575C53.565 70.843 47.42 76 40.18 76h-7.195c-.736 0-1.363.522-1.478 1.233L29.25 91.2l-1.414 8.762a1.159 1.159 0 0 0 .275.956 1.22 1.22 0 0 0 .924.416h7.81c.356-.001.7-.125.971-.351.271-.226.45-.539.506-.882l2.057-12.735a1.45 1.45 0 0 1 .507-.883 1.52 1.52 0 0 1 .972-.35h4.598c7.24 0 13.385-5.156 14.508-12.144.797-4.959-1.762-9.472-6.135-11.71Z"></path><path fill="#003087" d="M26.567 50.668c-.736 0-1.364.523-1.478 1.232l-6.128 37.93c-.116.72.454 1.372 1.2 1.372h9.088l2.257-13.968 2.455-15.2a1.45 1.45 0 0 1 .506-.883c.27-.226.615-.35.971-.35h13.019c2.37 0 4.53.54 6.37 1.48.126-6.361-5.251-11.613-12.645-11.613H26.567Z"></path></g></g><defs><clipPath id="paypal__a"><path fill="#fff" d="M0 0h240v150H0z"></path></clipPath><clipPath id="paypal__b"><path fill="#fff" d="M18.947 50.666h195.789v50.667H18.947z"></path></clipPath></defs></svg>
                  
                  {/* Apple Pay */}
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-auto" width="48" height="30" viewBox="0 0 240 150" fill="none"><path fill="#000" d="M216.865 0H23.135c-.807 0-1.616 0-2.421.004-.68.006-1.36.013-2.04.031-1.48.04-2.975.128-4.438.388a15.06 15.06 0 0 0-4.217 1.38 14.11 14.11 0 0 0-6.203 6.158 14.737 14.737 0 0 0-1.39 4.19c-.265 1.454-.352 2.936-.392 4.406a98.7 98.7 0 0 0-.031 2.024C2 19.379 2 20.18 2 20.983v108.034c0 .803 0 1.602.003 2.405a95.9 95.9 0 0 0 .031 2.024c.04 1.467.129 2.95.392 4.403a14.74 14.74 0 0 0 1.389 4.19 14.02 14.02 0 0 0 2.61 3.567 14.086 14.086 0 0 0 3.592 2.591c1.35.683 2.734 1.118 4.22 1.383 1.462.259 2.956.346 4.438.386.68.016 1.358.024 2.039.028.805.006 1.614.006 2.42.006h193.731c.806 0 1.614 0 2.42-.006a99.506 99.506 0 0 0 2.04-.028c1.479-.04 2.973-.127 4.439-.386a15.019 15.019 0 0 0 4.217-1.383 14.145 14.145 0 0 0 6.203-6.158c.688-1.341 1.124-2.714 1.388-4.19.265-1.453.351-2.936.391-4.403.018-.675.028-1.35.031-2.024.006-.803.006-1.602.006-2.405V20.985c0-.803 0-1.604-.006-2.406a85.253 85.253 0 0 0-.031-2.022c-.04-1.47-.126-2.952-.391-4.406a14.644 14.644 0 0 0-1.388-4.19 14.122 14.122 0 0 0-6.203-6.158 15.07 15.07 0 0 0-4.217-1.378c-1.466-.262-2.96-.349-4.439-.388-.68-.017-1.36-.028-2.04-.031C218.479 0 217.671 0 216.865 0Z"></path><path fill="#fff" d="m216.896 5 2.385.004c.645.004 1.291.012 1.94.029 1.131.03 2.451.092 3.684.311 1.069.191 1.968.481 2.829.917a9.079 9.079 0 0 1 3.999 3.974c.437.85.728 1.735.92 2.807.22 1.209.281 2.524.311 3.652.019.637.027 1.274.029 1.925.007.788.007 1.576.007 2.366v108.032c0 .79 0 1.577-.006 2.381a86.981 86.981 0 0 1-.028 1.911c-.032 1.127-.093 2.442-.315 3.665a9.67 9.67 0 0 1-.92 2.796 9.091 9.091 0 0 1-4.005 3.973c-.856.433-1.752.723-2.811.913-1.257.222-2.635.283-3.672.311-.651.015-1.3.025-1.966.027-.792.006-1.588.006-2.381.006H23.073c-.785 0-1.57 0-2.368-.006a103.07 103.07 0 0 1-1.926-.025c-1.06-.028-2.439-.091-3.685-.312a9.942 9.942 0 0 1-2.832-.92 9.03 9.03 0 0 1-2.314-1.67 9.005 9.005 0 0 1-1.68-2.297 9.779 9.779 0 0 1-.921-2.81c-.223-1.222-.286-2.531-.314-3.65a92.756 92.756 0 0 1-.029-1.918L7 129.514V20.489l.003-1.876c.003-.64.012-1.28.028-1.92.032-1.122.093-2.431.317-3.663a9.75 9.75 0 0 1 .921-2.804A9.007 9.007 0 0 1 9.952 7.93a9.106 9.106 0 0 1 2.317-1.67 9.98 9.98 0 0 1 2.824-.915c1.233-.22 2.555-.28 3.688-.311a98 98 0 0 1 1.931-.029L23.104 5h193.792Z"></path><path fill="#000" d="M63.85 51.168c2.01-2.51 3.37-5.882 3.012-9.326-2.938.146-6.523 1.938-8.6 4.451-1.864 2.152-3.513 5.664-3.084 8.964 3.298.286 6.594-1.648 8.673-4.089Zm2.975 4.734c-4.792-.286-8.864 2.718-11.15 2.718-2.29 0-5.793-2.575-9.582-2.505-4.93.072-9.505 2.861-12.009 7.295-5.147 8.87-1.359 22.03 3.648 29.254 2.43 3.576 5.36 7.509 9.22 7.368 3.647-.143 5.076-2.36 9.508-2.36 4.43 0 5.717 2.36 9.578 2.288 4.002-.071 6.506-3.576 8.936-7.152 2.79-4.077 3.93-8.01 4.001-8.225-.072-.072-7.719-3.006-7.79-11.803-.072-7.367 6.005-10.872 6.29-11.087-3.43-5.076-8.792-5.648-10.652-5.791m47.759-9.968c10.411 0 17.662 7.176 17.662 17.624 0 10.486-7.4 17.7-17.922 17.7h-11.527V99.59h-8.328V45.934h20.115Zm-11.787 28.333h9.556c7.252 0 11.378-3.904 11.378-10.671 0-6.767-4.127-10.634-11.341-10.634h-9.593v21.305Zm31.515 14.205c0-6.88 5.242-10.82 14.909-11.415l10.374-.633V73.45c0-4.349-2.862-6.729-7.956-6.729-4.203 0-7.253 2.156-7.882 5.465h-7.513c.225-6.953 6.768-12.01 15.618-12.01 9.518 0 15.728 4.983 15.728 12.718V99.59h-7.696v-6.433h-.186c-2.194 4.202-7.029 6.841-12.272 6.841-7.733 0-13.124-4.609-13.124-11.525Zm25.283-3.458v-3.012l-9.258.595c-5.207.335-7.919 2.267-7.919 5.65 0 3.273 2.825 5.393 7.25 5.393 5.65 0 9.927-3.608 9.927-8.626Zm15.071 28.926v-6.431c.521.073 1.784.147 2.454.147 3.68 0 5.763-1.559 7.028-5.577l.743-2.38-14.092-39.04h8.7l9.817 31.678h.186l9.816-31.679h8.478L193.18 101.67c-3.347 9.408-7.176 12.495-15.281 12.495-.633 0-2.678-.075-3.235-.225Z"></path></svg>
                  
                  {/* Klarna */}
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-auto" width="48" height="30" viewBox="0 0 240 150" fill="none"><g clipPath="url(#klarna__a)"><path fill="#FFB3C7" fillRule="evenodd" d="M221.053 0H18.947C8.211 0 0 8.125 0 18.75v112.5C0 141.875 8.842 150 18.947 150h202.106c10.736 0 18.947-8.125 18.947-18.75V18.75C240 8.125 231.158 0 221.053 0Z" clipRule="evenodd"></path><path fill="#FFB3C7" fillRule="evenodd" d="M221.333 6C228.3 6 234 11.646 234 18.546v112.909c0 6.9-5.7 12.545-12.667 12.545H18.667C11.7 144 6 138.355 6 131.455V18.545C6 11.646 11.7 6 18.667 6h202.666Z" clipRule="evenodd"></path><path fill="#0A0B09" d="M215.476 83.266c-3.076 0-5.571 2.527-5.571 5.634 0 3.114 2.495 5.64 5.571 5.64 3.082 0 5.577-2.526 5.577-5.64a5.61 5.61 0 0 0-5.577-5.634Zm-18.335-4.357c0-4.27-3.6-7.725-8.046-7.725-4.447 0-8.047 3.455-8.047 7.718s3.6 7.724 8.047 7.724c4.446 0 8.046-3.46 8.046-7.724v.007Zm.032-15.007h8.88v30h-8.88V91.99a15.452 15.452 0 0 1-8.805 2.747c-8.646 0-15.65-7.086-15.65-15.834 0-8.74 7.01-15.827 15.65-15.827 3.266 0 6.291 1.01 8.805 2.747v-1.92Zm-71.072 3.91v-3.91h-9.095v30h9.114V79.9c0-4.73 5.065-7.263 8.583-7.263h.101v-8.728c-3.6 0-6.922 1.56-8.703 3.903Zm-22.648 11.09c0-4.263-3.6-7.718-8.047-7.718-4.44 0-8.046 3.455-8.046 7.718s3.6 7.724 8.046 7.724c4.447 0 8.047-3.46 8.047-7.724Zm.031-15h8.88v30h-8.88V91.99a15.446 15.446 0 0 1-8.81 2.747c-8.64 0-15.65-7.086-15.65-15.834 0-8.74 7.01-15.827 15.65-15.827a15.4 15.4 0 0 1 8.804 2.747l.006-1.92Zm53.451-.808c-3.543 0-6.903 1.118-9.145 4.187v-3.379h-8.843v30h8.95V78.138c0-4.56 3.025-6.796 6.663-6.796 3.903 0 6.145 2.362 6.145 6.733v15.834h8.874v-19.08c0-6.986-5.495-11.735-12.644-11.735Zm-90.84 30.82h9.297V50.526h-9.297v43.39Zm-40.832 0h9.84V50.526h-9.84v43.39Zm34.421-43.389a34.717 34.717 0 0 1-10.06 24.632l13.603 18.758H51.07L36.283 73.527l3.815-2.892a25.012 25.012 0 0 0 9.96-20.11h9.625Z"></path></g><defs><clipPath id="klarna__a"><path fill="#fff" d="M0 0h240v150H0z"></path></clipPath></defs></svg>
                </div>
              </div>
            </>
          )}
        </div>
        </SheetContent>
      </Sheet>

      <ImageModal imageUrl={expandedImage} onClose={() => setExpandedImage(null)} />
    </>
  );
};
