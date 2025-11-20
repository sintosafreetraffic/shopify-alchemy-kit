import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Shield, Moon, Truck, Loader2, Star } from "lucide-react";
import { PolicyAccordion } from "./PolicyAccordion";
import { useState, useEffect } from "react";
import { useCartStore } from "@/stores/cartStore";
import { fetchProducts } from "@/lib/shopify";
import type { ShopifyProduct } from "@/lib/shopify";
import { toast } from "sonner";
import eyeMaskGift from "@/assets/eye-mask-gift-transparent.png";

export const SleepMaskHero = () => {
  const [selectedBundle, setSelectedBundle] = useState<"1" | "2">("1");
  const [product, setProduct] = useState<ShopifyProduct | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const { addItem, createCheckout, checkoutUrl, setCheckoutUrl } = useCartStore();

  useEffect(() => {
    const loadProduct = async () => {
      try {
        const products = await fetchProducts(10);
        const sleepMask = products.find(p => p.node.title.toLowerCase().includes('mask'));
        if (sleepMask) {
          setProduct(sleepMask);
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

  const productPrice = product ? parseFloat(product.node.variants.edges[0].node.price.amount) : 29.99;
  
  const bundles = {
    "1": {
      quantity: 1,
      price: productPrice,
      originalPrice: productPrice * 2,
      discount: "SPECIAL OFFER",
      savings: 0,
      note: "Perfect for personal use"
    },
    "2": {
      quantity: 2,
      price: productPrice * 1.7,
      originalPrice: productPrice * 2,
      discount: "BEST VALUE",
      savings: productPrice * 0.3,
      note: "Great for couples or travel backup"
    }
  };

  return (
    <section className="bg-background">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          {/* Left Column - Product Images */}
          <div className="lg:sticky lg:top-24">
            <div className="bg-gradient-to-b from-primary/5 to-background p-12 rounded-lg">
              <img
                src={eyeMaskGift}
                alt="RiseByNight Silk Sleep Mask"
                className="w-full h-auto"
              />
            </div>
            <PolicyAccordion />
          </div>

          {/* Right Column - Product Details */}
          <div className="space-y-6">
            {/* Product Title and Rating */}
            <div className="space-y-3">
              <h1 className="text-3xl md:text-5xl font-bold leading-tight">
                RiseByNight Silk Sleep Mask
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
                <span className="text-lg font-semibold">4.9</span>
                <span className="text-muted-foreground">(3,200+ reviews)</span>
              </div>
              <p className="text-xl text-primary font-semibold">
                100% Pure Mulberry Silk - Blocks 100% Light
              </p>
            </div>

            {/* USPs */}
            <div className="space-y-2 pb-4 border-b">
              {[
                "100% pure mulberry silk - gentle on skin and eyelashes",
                "Contoured design prevents pressure on eyes",
                "Blocks out 100% of light for deeper sleep",
                "Adjustable elastic strap for perfect fit"
              ].map((usp, index) => (
                <div key={index} className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm md:text-base">{usp}</span>
                </div>
              ))}
            </div>

            {/* Pricing Options */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <h3 className="font-bold text-lg mb-3">Choose Your Option</h3>
              
              <div className="space-y-3">
                {Object.entries(bundles).map(([key, bundle]) => (
                  <label
                    key={key}
                    className={`block p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedBundle === key
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="bundle"
                      value={key}
                      checked={selectedBundle === key}
                      onChange={() => setSelectedBundle(key as "1" | "2")}
                      className="sr-only"
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="destructive" className="text-xs">
                            {bundle.discount}
                          </Badge>
                          <span className="font-semibold">
                            {bundle.quantity} Sleep Mask{bundle.quantity > 1 ? "s" : ""}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{bundle.note}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">
                          ${bundle.price.toFixed(2)}
                        </div>
                        {bundle.savings > 0 && (
                          <div className="text-sm text-muted-foreground line-through">
                            ${bundle.originalPrice.toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Add to Cart Button */}
            <Button
              size="lg"
              className="w-full text-lg py-6"
              onClick={handleAddToCart}
              disabled={isCheckingOut || !product}
            >
              {isCheckingOut ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                `Add to Cart - $${bundles[selectedBundle].price.toFixed(2)}`
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
