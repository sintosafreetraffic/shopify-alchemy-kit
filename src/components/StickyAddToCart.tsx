import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useCartStore } from "@/stores/cartStore";
import { useUIStore } from "@/stores/uiStore";
import { fetchProducts } from "@/lib/shopify";
import type { ShopifyProduct } from "@/lib/shopify";
import { toast } from "sonner";
import { ShoppingCart, Loader2, Plus, Minus, Check } from "lucide-react";
import eyeMaskGift from "@/assets/eye-mask-gift-new.webp";
import { Badge } from "@/components/ui/badge";
import sleepMaskNavy from "@/assets/sleep-mask-navy.webp";
import sleepMaskTurquoise from "@/assets/sleep-mask-turquoise.webp";
import sleepMaskPink from "@/assets/sleep-mask-pink.webp";
import sleepMaskGold from "@/assets/sleep-mask-gold.webp";
import sleepMaskSilver from "@/assets/sleep-mask-silver.webp";
import sleepMaskBlack from "@/assets/sleep-mask-black.webp";

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
  const isPillowProduct = productType === "ergonomic-pillow" || productType === "knee-pillow";
  const isSleepMask = productType === "sleep-mask";
  const isSleepBundle = productType === "sleep-bundle";
  const [selectedBundle, setSelectedBundle] = useState<"1" | "2">(isPillowProduct ? "2" : "1");
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState("navy");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [product, setProduct] = useState<ShopifyProduct | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const { addItem, setCartOpen, isCartOpen, items } = useCartStore();
  const { isMobileMenuOpen } = useUIStore();
  
  // Calculate cart totals
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = items.reduce((sum, item) => sum + (parseFloat(item.price.amount) * item.quantity), 0);

  useEffect(() => {
    const loadProduct = async () => {
      try {
        const products = await fetchProducts(10);
        let selectedProduct: ShopifyProduct | undefined;
        
        if (productType === "knee-pillow") {
          selectedProduct = products.find(p => p.node.title.toLowerCase().includes('knee'));
        } else if (productType === "sleep-mask") {
          selectedProduct = products.find(p => p.node.title.toLowerCase().includes('mask'));
        } else if (productType === "sleep-bundle") {
          selectedProduct = products.find(p => p.node.title.toLowerCase().includes('bundle'));
        } else {
          selectedProduct = products.find(p => 
            p.node.title.toLowerCase().includes('ergonomic') && 
            !p.node.title.toLowerCase().includes('knee')
          );
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

    setIsCheckingOut(true);
    try {
      let variant;
      let itemQuantity = 1;
      
      if (isSleepBundle) {
        // For bundle, find the correct variant based on selection
        variant = product.node.variants.edges.find(
          v => v.node.title === (selectedBundle === "1" ? "Single Bundle" : "Double Bundle")
        )?.node;
      } else if (isPillowProduct) {
        variant = product.node.variants.edges[0].node;
        itemQuantity = selectedBundle === "1" ? 1 : 2;
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
          ? `${variant.title} - ${colors.find(c => c.value === selectedColor)?.name}`
          : variant.title,
        price: variant.price,
        compareAtPrice: variant.compareAtPrice,
        quantity: isSleepBundle ? 1 : itemQuantity,
        selectedOptions: isSleepMask 
          ? [
              ...variant.selectedOptions || [],
              { name: "Color", value: colors.find(c => c.value === selectedColor)?.name || "Black" }
            ]
          : variant.selectedOptions || []
      };
      
      addItem(cartItem);
      const itemName = isSleepBundle
        ? variant.title
        : isPillowProduct 
          ? `${itemQuantity} ${itemQuantity === 1 ? 'pillow' : 'pillows'}`
          : `${itemQuantity} ${product.node.title}${itemQuantity > 1 ? 's' : ''}`;
      const toastId = toast.success("Added to cart!", {
        description: `${itemName} added to your cart.`,
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

  const productPrice = product ? parseFloat(product.node.variants.edges[0].node.price.amount) : 129.99;
  
  // Calculate the value being added to cart (not current cart total)
  const addToCartValue = isSleepBundle
    ? (selectedBundle === "2" 
        ? parseFloat(product?.node.variants.edges[1]?.node.price.amount || "249.99")
        : parseFloat(product?.node.variants.edges[0]?.node.price.amount || "149.99"))
    : isPillowProduct 
      ? (selectedBundle === "2" ? productPrice : productPrice) // 1+1 deal: pay for 1, get 1 free
      : (productPrice * quantity); // Sleep mask: price * quantity

  const bundles = {
    "1": {
      quantity: 1,
      price: productPrice,
      discount: "CHRISTMAS"
    },
    "2": {
      quantity: 2,
      price: productPrice,
      discount: "1+1 FREE"
    }
  };

  const selectedOption = bundles[selectedBundle];

  if (isCartOpen || isMobileMenuOpen) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] bg-background/95 backdrop-blur-md border-t shadow-lg">
      <div className="container mx-auto px-4 py-3">
        {!product ? (
          <div className="text-center text-sm text-muted-foreground">Loading...</div>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Product Info */}
              <div className="flex items-center gap-3">
                <div className="hidden sm:block w-12 h-12 bg-secondary/30 rounded-lg overflow-hidden flex-shrink-0">
                  {product.node.images?.edges?.[0]?.node && (
                    <img
                      src={product.node.images.edges[0].node.url}
                      alt={product.node.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  )}
                </div>
                <div className="text-left hidden sm:block">
                  <h3 className="font-semibold text-sm line-clamp-1">
                    {product.node.title}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {isSleepBundle
                      ? `${selectedBundle === "1" ? "Single" : "Double"} Bundle`
                      : isPillowProduct 
                        ? `${selectedOption.quantity} ${selectedOption.quantity === 1 ? "Pillow" : "Pillows"} • ${selectedOption.discount}`
                        : "Sleep Mask"}
                  </p>
                </div>
              </div>

              {/* Bundle Selection & Add to Cart */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {/* Bundle Selector - Only show for pillow products and sleep bundle */}
                {(isPillowProduct || isSleepBundle) && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedBundle("1")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors relative overflow-hidden group ${
                        selectedBundle === "1"
                          ? "bg-primary text-primary-foreground"
                          : "bg-primary/20 hover:bg-primary/40 text-foreground"
                      }`}
                    >
                      <span className="flex items-center gap-1 transition-all duration-300 group-hover:-translate-y-8 group-hover:opacity-0">
                        <Plus className="w-3 h-3" />
                        {isSleepBundle ? "Single Bundle" : "1 Pillow"}
                      </span>
                      <span className="absolute inset-0 flex items-center justify-center gap-1 translate-y-8 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                        <Plus className="w-3 h-3" />
                        {isSleepBundle ? "Single Bundle" : "1 Pillow"}
                      </span>
                    </button>
                    <button
                      onClick={() => setSelectedBundle("2")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors relative overflow-hidden group ${
                        selectedBundle === "2"
                          ? "bg-primary text-primary-foreground"
                          : "bg-primary/20 hover:bg-primary/40 text-foreground"
                      }`}
                    >
                      <span className="flex items-center gap-1 transition-all duration-300 group-hover:-translate-y-8 group-hover:opacity-0">
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
                      <span className="absolute inset-0 flex items-center justify-center gap-1 translate-y-8 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
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

                {/* Sleep Mask Quantity & Color Selector */}
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
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="text-sm font-semibold min-w-[2rem] text-center">{quantity}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setQuantity(quantity + 1)}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>

                    {/* Color Selector */}
                    <div className="relative">
                      <button
                        onClick={() => setShowColorPicker(!showColorPicker)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg border-2 border-border overflow-hidden bg-background flex items-center justify-center">
                          <img 
                            src={colors.find(c => c.value === selectedColor)?.image} 
                            alt={colors.find(c => c.value === selectedColor)?.name}
                            className="w-full h-full object-contain p-0.5"
                          />
                        </div>
                        <span className="text-xs font-medium hidden sm:inline">
                          {colors.find(c => c.value === selectedColor)?.name}
                        </span>
                      </button>

                      {/* Color Picker Dropdown */}
                      {showColorPicker && (
                        <div className="absolute bottom-full mb-2 right-0 bg-background border border-border rounded-lg shadow-lg p-2 z-[110]">
                          <div className="grid grid-cols-3 gap-2">
                            {colors.map((color) => (
                              <button
                                key={color.value}
                                onClick={() => {
                                  setSelectedColor(color.value);
                                  setShowColorPicker(false);
                                }}
                                className={`flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-primary/10 transition-colors ${
                                  selectedColor === color.value ? "bg-primary/10" : ""
                                }`}
                              >
                                <div className="w-12 h-12 rounded-lg border-2 border-border overflow-hidden bg-background flex items-center justify-center relative">
                                  <img 
                                    src={color.image} 
                                    alt={color.name}
                                    className="w-full h-full object-contain p-1"
                                  />
                                  {selectedColor === color.value && (
                                    <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                                      <Check className="w-4 h-4 text-primary" />
                                    </div>
                                  )}
                                </div>
                                <span className="text-xs font-medium whitespace-nowrap">{color.name}</span>
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
                  className="min-w-[140px] sm:flex-initial bg-black text-white hover:bg-primary transition-all relative overflow-hidden group"
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
                          <span className="font-bold leading-none whitespace-nowrap">${addToCartValue.toFixed(2)}</span>
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
                          <span className="font-bold leading-none whitespace-nowrap">${addToCartValue.toFixed(2)}</span>
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
