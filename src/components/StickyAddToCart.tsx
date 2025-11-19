import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useCartStore } from "@/stores/cartStore";
import { fetchProducts } from "@/lib/shopify";
import type { ShopifyProduct } from "@/lib/shopify";
import { toast } from "sonner";
import { ShoppingCart, Loader2 } from "lucide-react";
import eyeMaskGift from "@/assets/eye-mask-gift.png";

export const StickyAddToCart = () => {
  const [selectedBundle, setSelectedBundle] = useState<"1" | "2">("2");
  const [product, setProduct] = useState<ShopifyProduct | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const { addItem, createCheckout, setCheckoutUrl } = useCartStore();

  useEffect(() => {
    const loadProduct = async () => {
      try {
        const products = await fetchProducts(1);
        if (products.length > 0) {
          setProduct(products[0]);
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

  const bundles = {
    "1": {
      quantity: 1,
      price: 58.99,
      discount: "60% OFF"
    },
    "2": {
      quantity: 2,
      price: 97.99,
      discount: "73% OFF"
    }
  };

  const selectedOption = bundles[selectedBundle];

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
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    selectedBundle === "1"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary/50 hover:bg-secondary"
                  }`}
                >
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
                  <span>2 Pillows</span>
                  <span className="text-[10px]">+ FREE</span>
                  <img src={eyeMaskGift} alt="Free gift" className="w-3 h-3" />
                </button>
              </div>

              {/* Add to Cart Button */}
              <Button 
                onClick={handleAddToCart}
                disabled={isCheckingOut}
                className="flex-1 sm:flex-initial"
              >
                {isCheckingOut ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    ${selectedOption.price}
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
