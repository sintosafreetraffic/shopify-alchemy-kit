import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Shield, Moon, Truck, Loader2, Star } from "lucide-react";
import { ProductImageCarousel } from "./ProductImageCarousel";
import { PolicyAccordion } from "./PolicyAccordion";
import { useState, useEffect } from "react";
import { useCartStore } from "@/stores/cartStore";
import { fetchProducts } from "@/lib/shopify";
import type { ShopifyProduct } from "@/lib/shopify";
import { toast } from "sonner";
import testimonialAvatar from "@/assets/testimonial.png";
import eyeMaskGift from "@/assets/eye-mask-gift-transparent.png";
import consumerChoiceBadge from "@/assets/consumer-choice-badge.jpg";

export const Hero = () => {
  const [selectedBundle, setSelectedBundle] = useState<"1" | "2">("2");
  const [product, setProduct] = useState<ShopifyProduct | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const { addItem, createCheckout, checkoutUrl, setCheckoutUrl } = useCartStore();

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

  const productPrice = product ? parseFloat(product.node.variants.edges[0].node.price.amount) : 89.99;
  
  const bundles = {
    "1": {
      quantity: 1,
      price: productPrice,
      originalPrice: productPrice * 2,
      discount: "BLACK FRIDAY",
      savings: 0,
      freeGift: "+ FREE Gift",
      freeGiftValue: "$29.99"
    },
    "2": {
      quantity: 2,
      price: productPrice,
      originalPrice: productPrice * 2,
      discount: "1+1 FREE",
      savings: productPrice,
      freeGifts: "+2 FREE Gifts",
      freeGiftValue: "$59.98"
    }
  };

  const selectedOption = bundles[selectedBundle];

  return (
    <section className="py-4 md:py-6 bg-background">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Mobile Layout: Carousel at top, then title */}
        <div className="md:hidden space-y-4 mb-6">
          <ProductImageCarousel />
          
          {/* Mobile Title Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                ))}
              </div>
              <span className="text-xs font-medium">Rated 4.8/5 by 12,500+ customers</span>
            </div>
            
            <h1 className="text-2xl font-bold leading-tight tracking-tight">
              RiseByNight™ Ergonomic Sleep Pillow
            </h1>
            
            <p className="text-sm text-muted-foreground">
              The #1 Rated Orthopedic Pillow in the U.S.
            </p>
          </div>
        </div>

        {/* Desktop Grid Layout */}
        <div className="grid md:grid-cols-2 gap-6 lg:gap-10">
          {/* Scrollable Product Images Column - Desktop Only */}
          <div className="hidden md:block relative order-2 md:order-1">
            <img 
              src={consumerChoiceBadge} 
              alt="Consumer Choice Badge" 
              className="mb-3 w-24 h-auto"
            />
            <ProductImageCarousel />
          </div>
          
          {/* Sticky Product Details Column */}
          <div className="space-y-2 order-1 md:order-2 md:sticky md:top-16 md:self-start md:h-fit">

            {/* Desktop Title Section */}
            <div className="hidden md:flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                  ))}
                </div>
                <span className="text-xs font-medium">Rated 4.8/5 by 12,500+ customers</span>
              </div>
              
              <div className="inline-flex items-center gap-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded-md text-xs font-medium w-fit">
                🔥 This product is frequently viewed
              </div>
            </div>

            <h1 className="hidden md:block text-2xl md:text-3xl lg:text-4xl font-bold leading-tight tracking-tight">
              RiseByNight™ Ergonomic Sleep Pillow
            </h1>
            
            <p className="hidden md:block text-sm md:text-base text-muted-foreground">
              The #1 Rated Orthopedic Pillow in the U.S.
            </p>

            {/* USPs Section */}
            <div className="space-y-2 my-4">
              <div className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <p className="text-sm">Scientifically proven to reduce neck pain and improve sleep quality</p>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <p className="text-sm">Ergonomic contour design supports natural spinal alignment</p>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <p className="text-sm">High-density memory foam maintains its shape for 3–5 years</p>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <p className="text-sm">Cooling gel layer prevents overheating and night sweats</p>
              </div>
            </div>

            <div className="border-t border-b py-2 my-1.5">
              <p className="text-center font-bold text-sm md:text-base mb-2 tracking-wide">🎉 BLACK FRIDAY OFFER 🎉</p>
              
              <div className="grid grid-cols-2 gap-3 mb-2">
                <button
                  onClick={() => setSelectedBundle("1")}
                  className={`border-2 rounded-lg p-3 text-center transition-all relative min-h-[120px] ${
                    selectedBundle === "1"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center justify-center mb-2 mt-2">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedBundle === "1" ? "border-primary" : "border-border"
                    }`}>
                      {selectedBundle === "1" && (
                        <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                      )}
                    </div>
                  </div>
                  <p className="font-bold text-base">1 Pillow</p>
                  <p className="text-xl font-bold">${bundles["1"].price.toFixed(2)}</p>
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
                  <p className="font-bold text-base">2 Pillows</p>
                  <p className="text-xl font-bold">${bundles["2"].price.toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground line-through">${bundles["2"].originalPrice.toFixed(2)}</p>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <p className="text-sm font-medium">+ FREE GIFT</p>
                    <img src={eyeMaskGift} alt="Free eye mask gift" className="w-12 h-12 object-contain" />
                  </div>
                </button>
              </div>
            </div>

            <Button
              size="lg" 
              className="w-full text-lg md:text-xl py-6 font-bold shadow-lg hover:shadow-xl transition-shadow touch-manipulation animate-subtle-bounce" 
              onClick={handleAddToCart}
              disabled={isCheckingOut || !product}
            >
              {isCheckingOut ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'ADD TO CART'
              )}
            </Button>

            <div className="grid grid-cols-3 gap-3 py-3 border-t text-center">
              <div className="flex flex-col items-center">
                <Shield className="w-5 h-5 mb-1.5 text-primary" />
                <p className="text-xs font-medium leading-tight">2-Year Warranty</p>
              </div>
              <div className="flex flex-col items-center">
                <Moon className="w-5 h-5 mb-1.5 text-primary" />
                <p className="text-xs font-medium leading-tight">100 nights risk free trial</p>
              </div>
              <div className="flex flex-col items-center">
                <Truck className="w-5 h-5 mb-1.5 text-primary" />
                <p className="text-xs font-medium leading-tight">Easy Returns</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <PolicyAccordion />
    </section>
  );
};
