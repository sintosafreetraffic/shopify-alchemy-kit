import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Shield, Moon, Truck, Loader2, Star } from "lucide-react";
import { PolicyAccordion } from "./PolicyAccordion";
import { useState, useEffect } from "react";
import { useCartStore } from "@/stores/cartStore";
import { fetchProducts } from "@/lib/shopify";
import type { ShopifyProduct } from "@/lib/shopify";
import { toast } from "sonner";
import { CountdownTimer } from "./CountdownTimer";
import kneePillowMain from "@/assets/knee-pillow-main-new.png";
import eyeMaskGift from "@/assets/eye-mask-gift-transparent.png";

export const KneePillowHero = () => {
  const [selectedBundle, setSelectedBundle] = useState<"1" | "2">("2");
  const [product, setProduct] = useState<ShopifyProduct | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const { addItem, setCartOpen } = useCartStore();
  const { saleName } = CountdownTimer();

  useEffect(() => {
    const loadProduct = async () => {
      try {
        const products = await fetchProducts(10);
        const kneePillow = products.find(p => p.node.title.toLowerCase().includes('knee'));
        if (kneePillow) {
          setProduct(kneePillow);
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
      toast.success("Added to cart!", {
        description: `${quantity} ${quantity === 1 ? 'pillow' : 'pillows'} added to your cart.`,
        cancel: {
          label: "✕",
          onClick: () => {}
        }
      });
      useCartStore.getState().setCartOpen(true);
    } catch (error) {
      console.error('Failed to add to cart:', error);
      toast.error("Failed to add to cart");
    } finally {
      setIsCheckingOut(false);
    }
  };

  const productPrice = product ? parseFloat(product.node.variants.edges[0].node.price.amount) : 69.99;
  
  const bundles = {
    "1": {
      quantity: 1,
      price: productPrice,
      originalPrice: productPrice * 2,
      discount: "BLACK FRIDAY",
      savings: 0,
      freeGift: "+ FREE Gift",
      note: "Perfect for trying it out"
    },
    "2": {
      quantity: 2,
      price: productPrice,
      originalPrice: productPrice * 2,
      discount: "BLACK FRIDAY 1+1",
      savings: productPrice,
      freeGift: "+ FREE GIFT 2X",
      note: "Best Value - Buy 1 Get 1 FREE!"
    }
  };

  return (
    <section className="bg-background">
      <div className="container mx-auto px-4 pt-0 pb-8 md:pb-12">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          {/* Left Column - Product Images */}
          <div className="lg:sticky lg:top-24">
            <div className="relative">
              <div className="bg-gradient-to-b from-primary/5 to-background p-8 rounded-lg">
                <img
                  src={kneePillowMain}
                  alt="Rise By Night Ergonomic Knee Pillow"
                  className="w-full h-auto"
                  loading="eager"
                  decoding="async"
                />
              </div>
            </div>
            <PolicyAccordion />
          </div>

          {/* Right Column - Product Details */}
          <div className="space-y-6">
            {/* Product Title and Rating */}
            <div className="space-y-3">
              <h1 className="text-3xl md:text-5xl font-bold leading-tight">
                Rise By Night™ Ergonomic Knee Pillow
              </h1>
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-5 h-5 fill-primary text-primary"
                    />
                  ))}
                </div>
                <span className="text-lg font-semibold">4.7</span>
                <span className="text-muted-foreground">(8,500+ reviews)</span>
              </div>
              <p className="text-xl text-primary font-semibold">
                Perfect Support for Side Sleepers
              </p>
            </div>

            {/* USPs */}
            <div className="space-y-2 pb-4 border-b">
              {[
                "Aligns hips and spine for proper posture",
                "Reduces lower back and hip pain",
                "Memory foam conforms to leg shape",
                "Stays in place with adjustable strap"
              ].map((usp, index) => (
                <div key={index} className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm md:text-base">{usp}</span>
                </div>
              ))}
            </div>

            {/* Limited Time Offer */}
            <div className="border-t border-b py-3 my-1.5 space-y-2">
              <p className="text-center font-bold text-sm md:text-base tracking-wide">🎉 LIMITED {saleName} OFFER 🎉</p>
              
              <div className="grid grid-cols-2 gap-3 mb-2">
                <button
                  onClick={() => setSelectedBundle("1")}
                  className={`border-2 rounded-lg p-3 text-center transition-all relative min-h-[120px] ${
                    selectedBundle === "1"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-destructive text-destructive-foreground text-xs px-2 py-0.5">
                    {bundles["1"].discount}
                  </Badge>
                  <div className="flex items-center justify-center mb-2 mt-2">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedBundle === "1" ? "border-primary" : "border-border"
                    }`}>
                      {selectedBundle === "1" && (
                        <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                      )}
                    </div>
                  </div>
                  <p className="font-bold text-base">1 Knee Pillow</p>
                  <p className="text-xs text-muted-foreground mb-1">{bundles["1"].note}</p>
                  <p className="text-xl font-bold">${bundles["1"].price.toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground line-through">${bundles["1"].originalPrice.toFixed(2)}</p>
                </button>

                <button
                  onClick={() => setSelectedBundle("2")}
                  className={`border-2 rounded-lg p-3 text-center transition-all relative min-h-[120px] ${
                    selectedBundle === "2"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-destructive text-destructive-foreground text-xs px-2 py-0.5">
                    {bundles["2"].discount}
                  </Badge>
                  <div className="flex items-center justify-center mb-2">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedBundle === "2" ? "border-primary" : "border-border"
                    }`}>
                      {selectedBundle === "2" && (
                        <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                      )}
                    </div>
                  </div>
                  <p className="font-bold text-base">2 Knee Pillows</p>
                  <p className="text-xs text-muted-foreground mb-1">{bundles["2"].note}</p>
                  <p className="text-xl font-bold">${bundles["2"].price.toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground line-through">${bundles["2"].originalPrice.toFixed(2)}</p>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <p className="text-sm font-medium">+ FREE GIFT 2X</p>
                    <img src={eyeMaskGift} alt="Free eye mask gift" className="w-12 h-12 object-contain" loading="lazy" decoding="async" />
                  </div>
                </button>
              </div>
            </div>

            {/* Add to Cart Button */}
            <Button
              size="lg"
              className="w-full text-lg md:text-xl py-6 font-bold shadow-lg hover:shadow-xl transition-all touch-manipulation animate-subtle-bounce bg-black text-white hover:bg-primary relative overflow-hidden group"
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
                    Add {bundles[selectedBundle].quantity} to Cart - ${bundles[selectedBundle].price.toFixed(2)}
                  </span>
                  <span className="absolute inset-0 flex items-center justify-center translate-y-12 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                    Add {bundles[selectedBundle].quantity} to Cart - ${bundles[selectedBundle].price.toFixed(2)}
                  </span>
                </>
              )}
            </Button>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center">
                <Truck className="w-6 h-6 text-primary mx-auto mb-1" />
                <p className="text-xs font-medium">Free Shipping</p>
              </div>
              <div className="text-center">
                <Moon className="w-6 h-6 text-primary mx-auto mb-1" />
                <p className="text-xs font-medium">100-Night Trial</p>
              </div>
              <div className="text-center">
                <Shield className="w-6 h-6 text-primary mx-auto mb-1" />
                <p className="text-xs font-medium">2-Year Warranty</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
