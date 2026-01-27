import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useCartStore } from "@/stores/cartStore";
import { useUIStore } from "@/stores/uiStore";
import { useSleepMaskColorStore } from "@/stores/sleepMaskColorStore";
import { fetchProducts } from "@/lib/shopify";
import { getErgonomicPillowHandle } from "@/lib/abProductConfig";
import type { ShopifyProduct } from "@/lib/shopify";
import { toast } from "sonner";
import { ShoppingCart, Loader2, Plus, Minus, Check } from "lucide-react";
import eyeMaskGift from "@/assets/eye-mask-gift-new.webp";
import { trackStickyATCClick } from "@/hooks/usePDPIntentTracking";
// trackABEvent moved to cartStore for centralized ATC tracking
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/formatPrice";
import { useIsEU } from "@/hooks/useCurrencySymbol";
import sleepMaskNavy from "@/assets/sleep-mask-navy.webp";
import sleepMaskTurquoise from "@/assets/sleep-mask-turquoise.webp";
import sleepMaskPink from "@/assets/sleep-mask-pink.webp";
import sleepMaskGold from "@/assets/sleep-mask-gold.webp";
import sleepMaskSilver from "@/assets/sleep-mask-silver.webp";
import sleepMaskBlack from "@/assets/sleep-mask-black.webp";
import { useIsMobile } from "@/hooks/use-mobile";
import { getCurrentVariant } from "@/lib/abTesting";

const colors = [
  { name: "Navy", value: "navy", hex: "#1e3a8a", image: sleepMaskNavy },
  { name: "Turquoise", value: "turquoise", hex: "#06b6d4", image: sleepMaskTurquoise },
  { name: "Pink", value: "pink", hex: "#ec4899", image: sleepMaskPink },
  { name: "Gold", value: "gold", hex: "#fbbf24", image: sleepMaskGold },
  { name: "Silver", value: "silver", hex: "#94a3b8", image: sleepMaskSilver },
  { name: "Black", value: "black", hex: "#000000", image: sleepMaskBlack },
];

interface StickyAddToCartProps {
  productType: "ergonomic-pillow" | "knee-pillow" | "sleep-mask" | "sleep-bundle";
}

export const StickyAddToCart = ({ productType }: StickyAddToCartProps) => {
  const isErgonomicPillow = productType === "ergonomic-pillow";
  const isKneePillow = productType === "knee-pillow";
  const isPillowProduct = isErgonomicPillow || isKneePillow;
  const isSleepMask = productType === "sleep-mask";
  const isSleepBundle = productType === "sleep-bundle";
  // For ergonomic and knee pillow, always use single quantity; no more bundle selection
  const [selectedBundle, setSelectedBundle] = useState<"1" | "2">("1");
  const [quantity, setQuantity] = useState(1);
  // Use shared color store for sleep mask, local state for others
  const { selectedColor: sharedColor, setSelectedColor: setSharedColor } = useSleepMaskColorStore();
  const [localColor, setLocalColor] = useState("navy");
  const selectedColor = isSleepMask ? (sharedColor || "Navy") : localColor;
  const setSelectedColor = isSleepMask ? setSharedColor : setLocalColor;
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [product, setProduct] = useState<ShopifyProduct | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const { addItem, setCartOpen, isCartOpen, items } = useCartStore();
  const { isMobileMenuOpen } = useUIStore();
  const isMobile = useIsMobile();
  const isEU = useIsEU();
  
  // Calculate cart totals
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = items.reduce((sum, item) => sum + (parseFloat(item.price.amount) * item.quantity), 0);

  useEffect(() => {
    const loadProduct = async () => {
      try {
        const products = await fetchProducts(20);
        let selectedProduct: ShopifyProduct | undefined;
        
        if (productType === "knee-pillow") {
          selectedProduct = products.find(p => p.node.title.toLowerCase().includes('knee'));
        } else if (productType === "sleep-mask") {
          selectedProduct = products.find(p => p.node.title.toLowerCase().includes('mask'));
        } else if (productType === "sleep-bundle") {
          selectedProduct = products.find(p => p.node.title.toLowerCase().includes('bundle'));
        } else {
          // Ergonomic pillow: use A/B-aware product handle
          const targetHandle = getErgonomicPillowHandle();
          selectedProduct = products.find(p => p.node.handle === targetHandle);
          
          // Fallback to any ergonomic pillow if specific handle not found
          if (!selectedProduct) {
            selectedProduct = products.find(p => 
              p.node.title.toLowerCase().includes('ergonomic') && 
              !p.node.title.toLowerCase().includes('knee')
            );
          }
        }
        
        if (selectedProduct) {
          setProduct(selectedProduct);
        }
      } catch (error) {
        console.error("Error loading product:", error);
      }
    };
    loadProduct();
  }, [productType]);

  const handleAddToCart = async () => {
    if (!product) {
      toast.error("Product not available");
      return;
    }

    // Track A/B intent event for sticky ATC - fire and forget
    trackStickyATCClick();
    
    // Note: trackABEvent for ab_funnel_comparison is now handled centrally in cartStore.addItem()

    setIsCheckingOut(true);
    try {
      let variant;
      let itemQuantity = 1;
      
      if (isSleepBundle) {
        // For bundle, find the correct variant based on selection
        variant = product.node.variants.edges.find(
          v => v.node.title === (selectedBundle === "1" ? "Single Bundle" : "Double Bundle")
        )?.node;
      } else if (isSleepMask) {
        // Sleep mask: match by color - selectedColor is now the actual color name (e.g., "Navy")
        variant = product.node.variants.edges.find(v => {
          const colorOpt = v.node.selectedOptions.find(opt => opt.name === "Color");
          const colorMatch = colorOpt?.value === selectedColor;
          
          // Try to match quantity option if it exists
          const quantityOpt = v.node.selectedOptions.find(opt => opt.name === "Quantity");
          if (quantityOpt) {
            const isSingleQty = quantityOpt.value === "1 Mask" || quantityOpt.value === "1" || quantityOpt.value.toLowerCase().includes("single");
            return colorMatch && isSingleQty;
          }
          return colorMatch;
        })?.node;
        itemQuantity = quantity;
      } else if (isErgonomicPillow) {
        // Ergonomic pillow: Product is already A/B-aware (loaded via getErgonomicPillowHandle)
        // Just use the first variant of whatever product was loaded
        variant = product.node.variants.edges[0].node;
        itemQuantity = 1;
      } else if (isKneePillow) {
        // Knee pillow: always single quantity (no more 1+1)
        variant = product.node.variants.edges[0].node;
        itemQuantity = 1;
      } else {
        variant = product.node.variants.edges[0].node;
        itemQuantity = quantity;
      }

      if (!variant) {
        toast.error("Selected variant not available");
        return;
      }
      
      const cartItem = {
        product,
        variantId: variant.id,
        variantTitle: isSleepMask 
          ? `${selectedColor} / 1 Mask`
          : variant.title,
        price: variant.price,
        compareAtPrice: variant.compareAtPrice,
        quantity: isSleepBundle ? 1 : itemQuantity,
        selectedOptions: variant.selectedOptions || []
      };
      
      addItem(cartItem);
      const itemName = isSleepBundle
        ? variant.title
        : isPillowProduct 
          ? `${itemQuantity} ${itemQuantity === 1 ? 'pillow' : 'pillows'}`
          : `${itemQuantity} ${product.node.title}${itemQuantity > 1 ? 's' : ''}`;
      const toastId = toast.success("Added to cart!", {
        description: `${itemName} added to your cart.`,
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

  // Get A/B variant for description text
  const abVariant = getCurrentVariant();
  const isVariantB = abVariant === 'B';
  
  // Get price and currency from product data
  // Product is already A/B-aware (loaded via getErgonomicPillowHandle for ergonomic pillow)
  const productVariant = product?.node.variants.edges[0]?.node;
  const shopifyCurrency = productVariant?.price.currencyCode || 'USD';
  // Override to EUR for EU countries if Shopify returns USD
  const currencyCode = (isEU && shopifyCurrency === 'USD') ? 'EUR' : shopifyCurrency;
  const productPrice = isErgonomicPillow 
    ? parseFloat(productVariant?.price.amount || (isVariantB ? "59.99" : "79.99")) 
    : isKneePillow 
      ? parseFloat(productVariant?.price.amount || "39.99") 
      : (product ? parseFloat(product.node.variants.edges[0].node.price.amount) : 129.99);
  
  // Calculate the value being added to cart (not current cart total)
  const addToCartValue = isSleepBundle
    ? (selectedBundle === "2" 
        ? parseFloat(product?.node.variants.edges[1]?.node.price.amount || "199.99")
        : parseFloat(product?.node.variants.edges[0]?.node.price.amount || "109.99"))
    : isPillowProduct
      ? productPrice // Always single pillow now (no more bundles)
      : (productPrice * quantity);

  const bundles = {
    "1": {
      quantity: 1,
      price: productPrice,
      discount: ""
    },
    "2": {
      quantity: 2,
      price: productPrice,
      discount: ""
    }
  };

  const selectedOption = bundles[selectedBundle];

  // Mobile: opacity-only hide (no transforms to prevent GPU glitches)
  // Desktop: transform-based hide/show
  const shouldHide = isCartOpen || isMobileMenuOpen;

  return (
    <div 
      className={`fixed bottom-0 left-0 right-0 z-[100] bg-background border-t shadow-lg max-w-[100vw] overflow-x-clip ${
        isMobile
          ? `transition-opacity duration-200 ${shouldHide ? "opacity-0 pointer-events-none" : "opacity-100"}`
          : `transition-all duration-200 ${shouldHide ? "translate-y-full opacity-0 pointer-events-none" : "translate-y-0 opacity-100"}`
      }`}
    >
      <div className="container mx-auto px-4 py-2 max-w-full overflow-x-hidden">
        {!product ? (
          <div className="text-center text-sm text-muted-foreground">Loading...</div>
        ) : (
          <>
            <div className="flex flex-row flex-wrap items-center justify-between gap-3 w-full">
              {/* Product Info */}
              <div className="flex items-center gap-3">
                <div className="hidden sm:block w-12 h-12 bg-secondary/30 rounded-lg overflow-hidden flex-shrink-0">
                {isSleepMask ? (
                    <img
                      src={colors.find(c => c.name === selectedColor || c.value === selectedColor)?.image || colors[0].image}
                      alt={`${product.node.title} - ${selectedColor}`}
                      className="w-full h-full object-contain p-1"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : product.node.images?.edges?.[0]?.node && (
                    <img
                      src={product.node.images.edges[0].node.url}
                      alt={product.node.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  )}
                </div>
                <div className="text-left hidden sm:block min-w-0">
                  <h3 className="font-semibold text-sm line-clamp-1">
                    {product.node.title}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {isSleepBundle
                      ? `${selectedBundle === "1" ? "Single" : "Double"} Bundle`
                      : isPillowProduct
                        ? (isVariantB && isErgonomicPillow ? "1 Pillow" : "1 Pillow + Sleep Mask Included")
                        : "Sleep Mask"}
                  </p>
                </div>
              </div>

              {/* Bundle Selection & Add to Cart */}
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-center sm:justify-end lg:flex-nowrap">
                {/* Bundle Selector - Only show for sleep bundle, NOT pillows */}
                {isSleepBundle && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedBundle("1")}
                      aria-label={isSleepBundle ? "Select single bundle" : "Select 1 pillow"}
                      aria-pressed={selectedBundle === "1"}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors relative overflow-hidden group ${
                        selectedBundle === "1"
                          ? "bg-primary text-primary-foreground"
                          : "bg-primary/20 hover:bg-primary/40 text-foreground"
                      }`}
                    >
                      <span className="flex items-center gap-1 transition-all duration-300 group-hover:-translate-y-8 group-hover:opacity-0">
                        <Plus className="w-3 h-3" aria-hidden="true" />
                        {isSleepBundle ? "Single Bundle" : "1 Pillow"}
                      </span>
                      <span className="absolute inset-0 flex items-center justify-center gap-1 translate-y-8 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100" aria-hidden="true">
                        <Plus className="w-3 h-3" />
                        {isSleepBundle ? "Single Bundle" : "1 Pillow"}
                      </span>
                    </button>
                    <button
                      onClick={() => setSelectedBundle("2")}
                      aria-label={isSleepBundle ? "Select double bundle" : "Select 2 pillows with free gift"}
                      aria-pressed={selectedBundle === "2"}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors relative overflow-hidden group ${
                        selectedBundle === "2"
                          ? "bg-primary text-primary-foreground"
                          : "bg-primary/20 hover:bg-primary/40 text-foreground"
                      }`}
                    >
                      <span className="flex items-center gap-1 transition-all duration-300 group-hover:-translate-y-8 group-hover:opacity-0">
                        <Plus className="w-3 h-3" aria-hidden="true" />
                        {isSleepBundle ? (
                          "Double Bundle"
                        ) : (
                          <>
                            <span>2 Pillows + FREE GIFT 2X</span>
                            <img src={eyeMaskGift} alt="Free gift" className="w-6 h-6 object-contain" loading="lazy" decoding="async" />
                          </>
                        )}
                      </span>
                      <span className="absolute inset-0 flex items-center justify-center gap-1 translate-y-8 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100" aria-hidden="true">
                        <Plus className="w-3 h-3" />
                        {isSleepBundle ? (
                          "Double Bundle"
                        ) : (
                          <>
                            <span>2 Pillows + FREE GIFT 2X</span>
                            <img src={eyeMaskGift} alt="Free gift" className="w-6 h-6 object-contain" loading="lazy" decoding="async" />
                          </>
                        )}
                      </span>
                    </button>
                  </div>
                )}

                {/* Pillow Quantity Selector */}
                {isPillowProduct && (
                  <div className="flex items-center gap-1 bg-primary/10 rounded-lg p-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="text-sm font-semibold min-w-[2rem] text-center" aria-live="polite">{quantity}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setQuantity(quantity + 1)}
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                )}

                {isSleepMask && (
                  <div className="flex items-center gap-2">
                    {/* Quantity Selector */}
                    <div className="flex items-center gap-1 bg-primary/10 rounded-lg p-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1}
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="text-sm font-semibold min-w-[2rem] text-center" aria-live="polite">{quantity}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setQuantity(quantity + 1)}
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>

                    {/* Color Selector */}
                    <div className="relative">
                      <button
                        onClick={() => setShowColorPicker(!showColorPicker)}
                        aria-label={`Select color, currently ${selectedColor}`}
                        aria-expanded={showColorPicker}
                        aria-haspopup="listbox"
                        className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg border-2 border-border overflow-hidden bg-background flex items-center justify-center">
                          <img 
                            src={colors.find(c => c.name === selectedColor)?.image || colors[0].image} 
                            alt={selectedColor}
                            className="w-full h-full object-contain p-0.5"
                          />
                        </div>
                        <span className="text-xs font-medium hidden sm:inline">
                          {selectedColor}
                        </span>
                      </button>

                      {/* Color Picker Dropdown */}
                      {showColorPicker && (
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-background border border-border rounded-lg shadow-lg p-3 z-[110] w-[280px] max-w-[calc(100vw-2rem)]">
                          <div className="grid grid-cols-3 gap-3">
                            {colors.map((color) => (
                              <button
                                key={color.value}
                                onClick={() => {
                                  setSelectedColor(color.name);
                                  setShowColorPicker(false);
                                }}
                                className={`flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-primary/10 transition-colors ${
                                  selectedColor === color.name ? "bg-primary/20 ring-2 ring-primary" : ""
                                }`}
                              >
                                <div className="w-14 h-14 rounded-lg border-2 border-border overflow-hidden bg-background flex items-center justify-center relative">
                                  <img 
                                    src={color.image} 
                                    alt={color.name}
                                    className="w-full h-full object-contain p-1"
                                  />
                                  {selectedColor === color.name && (
                                    <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                                      <Check className="w-5 h-5 text-primary" />
                                    </div>
                                  )}
                                </div>
                                <span className="text-xs font-medium text-center">{color.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Cart Button with Totals */}
                <Button 
                  onClick={handleAddToCart}
                  disabled={isCheckingOut}
                  className="min-w-[140px] sm:flex-initial bg-primary text-primary-foreground hover:bg-black hover:text-white transition-all relative overflow-hidden group"
                >
                  {isCheckingOut ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      <span className="whitespace-nowrap">Adding...</span>
                    </>
                  ) : (
                    <>
                      <span className="inline-flex items-center gap-2 transition-all duration-300 group-hover:-translate-y-12 group-hover:opacity-0">
                        <div className="relative">
                          <ShoppingCart className="w-4 h-4" />
                          {totalItems > 0 && (
                            <Badge className="absolute -top-2 -right-2 h-4 w-4 rounded-full p-0 flex items-center justify-center text-[10px]">
                              {totalItems}
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="text-xs leading-none whitespace-nowrap">Add to Cart</span>
                          <span className="font-bold leading-none whitespace-nowrap text-primary-foreground">{formatPrice(addToCartValue, currencyCode)}</span>
                        </div>
                      </span>
                      <span className="absolute inset-0 flex items-center justify-center gap-2 translate-y-12 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                        <div className="relative">
                          <ShoppingCart className="w-4 h-4" />
                          {totalItems > 0 && (
                            <Badge className="absolute -top-2 -right-2 h-4 w-4 rounded-full p-0 flex items-center justify-center text-[10px]">
                              {totalItems}
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="text-xs leading-none whitespace-nowrap">Add to Cart</span>
                          <span className="font-bold leading-none whitespace-nowrap text-primary-foreground">{formatPrice(addToCartValue, currencyCode)}</span>
                        </div>
                      </span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
