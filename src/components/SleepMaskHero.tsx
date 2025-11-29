import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Shield, Moon, Truck, Loader2, Star, Minus, Plus } from "lucide-react";
import { PolicyAccordion } from "./PolicyAccordion";
import { useState, useEffect } from "react";
import { useCartStore } from "@/stores/cartStore";
import { fetchProducts } from "@/lib/shopify";
import type { ShopifyProduct } from "@/lib/shopify";
import { toast } from "sonner";
import eyeMaskGift from "@/assets/eye-mask-gift-transparent.png";
import consumerChoiceBadge from "@/assets/consumer-choice-badge-transparent.png";

const colors = [
  { name: "Black", value: "black", hex: "#000000" },
  { name: "Navy", value: "navy", hex: "#1e3a8a" },
  { name: "Pink", value: "pink", hex: "#ec4899" },
  { name: "Silver", value: "silver", hex: "#94a3b8" },
];

export const SleepMaskHero = () => {
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState("black");
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
      
      const cartItem = {
        product,
        variantId: variant.id,
        variantTitle: `${variant.title} - ${colors.find(c => c.value === selectedColor)?.name}`,
        price: variant.price,
        quantity,
        selectedOptions: [
          ...variant.selectedOptions || [],
          { name: "Color", value: colors.find(c => c.value === selectedColor)?.name || "Black" }
        ]
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
  const totalPrice = productPrice * quantity;

  return (
    <section className="bg-background">
      <div className="container mx-auto px-4 pt-0 pb-8 md:pb-12">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          {/* Left Column - Product Images */}
          <div className="lg:sticky lg:top-24">
            <div className="relative">
              <img 
                src={consumerChoiceBadge} 
                alt="Consumer Choice" 
                className="absolute top-4 right-4 z-10 w-20 h-20 md:w-24 md:h-24"
                loading="lazy"
                decoding="async"
              />
              <div className="bg-gradient-to-b from-primary/5 to-background p-12 rounded-lg">
                <img
                  src={eyeMaskGift}
                  alt="Rise By Night Silk Sleep Mask"
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
                Rise By Night™ Silk Sleep Mask
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

            {/* Color Selection */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <h3 className="font-bold text-lg mb-3">Choose Color</h3>
              
              <div className="flex gap-3">
                {colors.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setSelectedColor(color.value)}
                    className={`relative flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                      selectedColor === color.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div 
                      className="w-8 h-8 rounded-full border-2 border-border"
                      style={{ backgroundColor: color.hex }}
                    />
                    <span className="text-xs font-medium">{color.name}</span>
                    {selectedColor === color.value && (
                      <Check className="absolute top-1 right-1 w-4 h-4 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity Selection */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg">Quantity</h3>
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="text-2xl font-bold min-w-[3rem] text-center">{quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setQuantity(quantity + 1)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <span className="text-muted-foreground">Price per mask:</span>
                <span className="font-semibold">${productPrice.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-lg font-semibold">Total:</span>
                <span className="text-2xl font-bold text-primary">${totalPrice.toFixed(2)}</span>
              </div>
            </div>

            {/* Add to Cart Button */}
            <Button
              size="lg"
              className="w-full text-lg py-6 bg-black text-white hover:bg-primary transition-all relative overflow-hidden group"
              onClick={handleAddToCart}
              disabled={isCheckingOut || !product}
            >
              {isCheckingOut ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <span className="inline-block transition-all duration-300 group-hover:-translate-y-12 group-hover:opacity-0">
                    Add to Cart - ${totalPrice.toFixed(2)}
                  </span>
                  <span className="absolute inset-0 flex items-center justify-center translate-y-12 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                    Add to Cart - ${totalPrice.toFixed(2)}
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
