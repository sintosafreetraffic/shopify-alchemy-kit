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
  const isPillowProduct = productType === "ergonomic-pillow" || productType === "knee-pillow";
  const [selectedBundle, setSelectedBundle] = useState<"1" | "2">(isPillowProduct ? "2" : "1");
  const [product, setProduct] = useState<ShopifyProduct | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const { addItem, setCartOpen, isCartOpen, items } = useCartStore();
  
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
      const quantity = isPillowProduct ? (selectedBundle === "1" ? 1 : 2) : 1;
      
      const cartItem = {
        product,
        variantId: variant.id,
        variantTitle: variant.title,
        price: variant.price,
        quantity,
        selectedOptions: variant.selectedOptions || []
      };
      
      addItem(cartItem);
      const itemName = isPillowProduct 
        ? `${quantity} ${quantity === 1 ? 'pillow' : 'pillows'}`
        : product.node.title;
      toast.success("Added to cart!", {
        description: `${itemName} added to your cart.`
      });
      setCartOpen(true);
    } catch (error) {
      console.error('Failed to add to cart:', error);
      toast.error("Failed to add to cart");
    } finally {
      setIsCheckingOut(false);
    }
  };

  const productPrice = product ? parseFloat(product.node.variants.edges[0].node.price.amount) : 89.99;
  
  // Calculate the value being added to cart (not current cart total)
  const addToCartValue = isPillowProduct 
    ? (selectedBundle === "2" ? productPrice : productPrice) // 1+1 deal: pay for 1, get 1 free
    : productPrice; // Sleep mask: regular price

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
          <>
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
                    {isPillowProduct 
                      ? `${selectedOption.quantity} ${selectedOption.quantity === 1 ? "Pillow" : "Pillows"} • ${selectedOption.discount}`
                      : "Sleep Mask"}
                  </p>
                </div>
              </div>

              {/* Bundle Selection & Add to Cart */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {/* Bundle Selector - Only show for pillow products */}
                {isPillowProduct && (
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
                      <span>2 Pillows + FREE GIFT 2X</span>
                      <img src={eyeMaskGift} alt="Free gift" className="w-6 h-6 object-contain" />
                    </button>
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
            
            {/* Trust Badges */}
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground mt-2 pt-2 border-t flex-nowrap">
              <span className="flex items-center gap-1 whitespace-nowrap">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                2-Year Warranty
              </span>
              <span className="flex items-center gap-1 whitespace-nowrap">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
                100 nights risk free
              </span>
              <span className="flex items-center gap-1 whitespace-nowrap">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
                Easy Returns
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
