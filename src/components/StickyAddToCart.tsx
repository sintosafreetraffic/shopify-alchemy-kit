import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useCartStore } from "@/stores/cartStore";
import { fetchProducts } from "@/lib/shopify";
import type { ShopifyProduct } from "@/lib/shopify";
import { toast } from "sonner";
import { ShoppingCart, Loader2, Plus } from "lucide-react";
import eyeMaskGift from "@/assets/eye-mask-gift-transparent.png";
import { Badge } from "@/components/ui/badge";

interface StickyAddToCartProps {
  productType: "ergonomic-pillow" | "knee-pillow" | "sleep-mask";
}

export const StickyAddToCart = ({ productType }: StickyAddToCartProps) => {
  const [selectedBundle, setSelectedBundle] = useState<"1" | "2">("2");
  const [product, setProduct] = useState<ShopifyProduct | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const { addItem, createCheckout, setCheckoutUrl, isCartOpen, items } = useCartStore();
  
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
      const variant = product.node.variants.edges[0].node;
      const quantity = selectedBundle === "1" ? 1 : 2;
      
      const cartItem = {
        product,
        variantId: variant.id,
        variantTitle: variant.title,
        price: variant.price,
        quantity,
        selectedOptions: variant.selectedOptions || []
      };
      
      addItem(cartItem);
      await createCheckout();
      
      const url = useCartStore.getState().checkoutUrl;
      if (url) {
        window.open(url, '_blank');
        setCheckoutUrl(null);
      }
    } catch (error) {
      console.error('Checkout failed:', error);
      toast.error("Failed to start checkout");
    } finally {
      setIsCheckingOut(false);
    }
  };

  const productPrice = product ? parseFloat(product.node.variants.edges[0].node.price.amount) : 89.99;

  const bundles = {
    "1": {
      quantity: 1,
      price: productPrice,
      discount: "BLACK FRIDAY"
    },
    "2": {
      quantity: 2,
      price: productPrice,
      discount: "1+1 FREE"
    }
  };

  const selectedOption = bundles[selectedBundle];

  if (isCartOpen) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] bg-background/95 backdrop-blur-md border-t shadow-lg">
      <div className="container mx-auto px-4 py-3">
        {!product ? (
          <div className="text-center text-sm text-muted-foreground">Loading...</div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Product Info */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-secondary/30 rounded-lg overflow-hidden flex-shrink-0">
                {product.node.images?.edges?.[0]?.node && (
                  <img
                    src={product.node.images.edges[0].node.url}
                    alt={product.node.title}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-sm line-clamp-1">
                  {product.node.title}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {selectedOption.quantity} {selectedOption.quantity === 1 ? "Pillow" : "Pillows"} • {selectedOption.discount}
                </p>
              </div>
            </div>

            {/* Bundle Selection & Add to Cart */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Bundle Selector */}
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedBundle("1")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                    selectedBundle === "1"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary/50 hover:bg-secondary"
                  }`}
                >
                  <Plus className="w-3 h-3" />
                  1 Pillow
                </button>
                <button
                  onClick={() => setSelectedBundle("2")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                    selectedBundle === "2"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary/50 hover:bg-secondary"
                  }`}
                >
                  <Plus className="w-3 h-3" />
                  <span>2 Pillows • + FREE GIFT 2X</span>
                  <img src={eyeMaskGift} alt="Free gift" className="w-6 h-6 object-contain" />
                </button>
              </div>

              {/* Cart Button with Totals */}
              <Button 
                onClick={handleAddToCart}
                disabled={isCheckingOut}
                className="flex-1 sm:flex-initial bg-black text-white hover:bg-primary transition-all relative overflow-hidden group"
              >
                {isCheckingOut ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
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
                        <span className="text-xs leading-none">Cart Total</span>
                        <span className="font-bold leading-none">${cartTotal.toFixed(2)}</span>
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
                        <span className="text-xs leading-none">Cart Total</span>
                        <span className="font-bold leading-none">${cartTotal.toFixed(2)}</span>
                      </div>
                    </span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
