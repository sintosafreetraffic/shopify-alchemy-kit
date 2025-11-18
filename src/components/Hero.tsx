import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Shield, RotateCcw, Truck, Loader2, Package, Clock, CreditCard, Wind, Snowflake, Heart, Award, Star } from "lucide-react";
import { ProductImageCarousel } from "./ProductImageCarousel";
import { PolicyAccordion } from "./PolicyAccordion";
import { useState, useEffect } from "react";
import { useCartStore } from "@/stores/cartStore";
import { fetchProducts } from "@/lib/shopify";
import type { ShopifyProduct } from "@/lib/shopify";
import { toast } from "sonner";
import testimonialAvatar from "@/assets/testimonial.png";

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

  const bundles = {
    "1": {
      quantity: 1,
      price: 58.99,
      originalPrice: 129.98,
      discount: "60% OFF",
      savings: 70.99,
      freeGift: "+ FREE Gift",
      freeGiftValue: "$29.99"
    },
    "2": {
      quantity: 2,
      price: 97.99,
      originalPrice: 259.96,
      discount: "73% OFF",
      savings: 161.97,
      freeGifts: "+2 FREE Gifts",
      freeGiftValue: "$59.98"
    }
  };

  const selectedOption = bundles[selectedBundle];

  return (
    <section className="py-8 md:py-16">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="grid md:grid-cols-2 gap-8 lg:gap-16">
          {/* Scrollable Product Images Column */}
          <div className="relative order-2 md:order-1">
            <Badge variant="secondary" className="mb-6 text-xs font-semibold tracking-wide flex items-center gap-1.5">
              <span className="text-base">←</span>
              <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
              <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
              <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
              CONSUMER CHOICE
              <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
              <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
              <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
              <span className="text-base">→</span>
            </Badge>
            <ProductImageCarousel />
          </div>
          
          {/* Sticky Product Details Column */}
          <div className="space-y-5 order-1 md:order-2 md:sticky md:top-24 md:self-start md:h-fit">

            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="w-5 h-5 fill-yellow-500 text-yellow-500" />
                  ))}
                </div>
                <span className="text-sm font-medium">Rated 4.8/5 by 12,500+ customers</span>
              </div>
              
              <div className="inline-flex items-center gap-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 px-3 py-1.5 rounded-md text-sm font-medium w-fit">
                🔥 This product is frequently viewed
              </div>
            </div>

            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
              OptiSleep™ Sleep Apnea Pillow
            </h1>
            
            <p className="text-base md:text-lg text-muted-foreground">
              The #1 Rated Orthopedic Pillow for Sleep Apnea in the U.S.
            </p>

            <div className="space-y-3 py-2">
              <p className="text-sm font-semibold text-foreground/80">The only scientifically designed pillow that:</p>
              {[
                "Eliminates sleep apnea episodes by 86%*",
                "Stops dangerous breathing interruptions",
                "Ends marriage-threatening snoring instantly"
              ].map((benefit) => (
                <div key={benefit} className="flex items-start gap-3">
                  <div className="bg-primary/10 rounded-full p-1.5 flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm md:text-base">{benefit}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-b py-5 my-4">
              <p className="text-center font-bold text-base md:text-lg mb-4 tracking-wide">LIMITED-TIME ANNIVERSARY OFFER</p>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <button
                  onClick={() => setSelectedBundle("1")}
                  className={`border-2 rounded-lg p-4 text-center transition-all relative ${
                    selectedBundle === "1"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                    SAVE $${bundles["1"].savings.toFixed(2)}
                  </Badge>
                  <div className="flex items-center justify-center mb-2">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedBundle === "1" ? "border-primary" : "border-border"
                    }`}>
                      {selectedBundle === "1" && (
                        <div className="w-3 h-3 rounded-full bg-primary" />
                      )}
                    </div>
                  </div>
                  <p className="font-bold text-lg">1 Pillow</p>
                  <p className="text-sm text-primary font-bold">{bundles["1"].discount}</p>
                  <p className="text-2xl font-bold mt-2">${bundles["1"].price}</p>
                  <p className="text-sm text-muted-foreground line-through">${bundles["1"].originalPrice}</p>
                  <div className="mt-2 bg-muted rounded px-2 py-1">
                    <p className="text-xs font-medium">{bundles["1"].freeGift}</p>
                    <p className="text-xs text-muted-foreground">{bundles["1"].freeGiftValue}</p>
                  </div>
                </button>

                <button
                  onClick={() => setSelectedBundle("2")}
                  className={`border-2 rounded-lg p-4 text-center transition-all relative ${
                    selectedBundle === "2"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-destructive text-destructive-foreground">
                    SAVE $${bundles["2"].savings.toFixed(2)}
                  </Badge>
                  <div className="flex items-center justify-center mb-2">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedBundle === "2" ? "border-primary" : "border-border"
                    }`}>
                      {selectedBundle === "2" && (
                        <div className="w-3 h-3 rounded-full bg-primary" />
                      )}
                    </div>
                  </div>
                  <p className="font-bold text-lg">2 Pillows</p>
                  <p className="text-sm text-primary font-bold">{bundles["2"].discount}</p>
                  <p className="text-2xl font-bold mt-2">${bundles["2"].price}</p>
                  <p className="text-sm text-muted-foreground line-through">${bundles["2"].originalPrice}</p>
                  <div className="mt-2 bg-black text-white rounded px-2 py-1">
                    <p className="text-xs font-medium">{bundles["2"].freeGifts}</p>
                    <p className="text-xs">{bundles["2"].freeGiftValue}</p>
                    <p className="text-xs font-medium">+ FREE Shipping</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center justify-center gap-4 py-4 border-y bg-secondary/5 rounded-lg">
              <div className="flex items-center gap-2 text-xs md:text-sm">
                <Package className="w-4 h-4 text-success" />
                <span className="font-medium">In Stock, Ready to Ship</span>
              </div>
              <div className="flex items-center gap-2 text-xs md:text-sm">
                <Clock className="w-4 h-4 text-primary" />
                <span className="font-medium">120-Day Money-Back</span>
              </div>
              <div className="flex items-center gap-2 text-xs md:text-sm">
                <CreditCard className="w-4 h-4 text-primary" />
                <span className="font-medium">Secure Checkout</span>
              </div>
            </div>

            {/* Customer Testimonial */}
            <div className="bg-secondary/10 rounded-xl p-5 border border-border/50">
              <div className="flex items-start gap-3">
                <img 
                  src={testimonialAvatar} 
                  alt="Customer testimonial" 
                  className="w-11 h-11 rounded-full object-cover flex-shrink-0"
                />
                <div className="flex-1">
                  <p className="text-xs md:text-sm italic mb-2 leading-relaxed">
                    "The OptiSleep pillow has <strong>completely transformed</strong> my sleep quality. I wake up without neck pain for the first time in years!"
                  </p>
                  <p className="text-xs text-muted-foreground font-medium">— Sarah M., Verified Buyer</p>
                </div>
              </div>
            </div>

            {/* Product Features Icons */}
            <div className="grid grid-cols-2 gap-3 py-2">
              <div className="flex items-center gap-2.5 text-xs md:text-sm">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Heart className="w-4 h-4 text-primary" />
                </div>
                <span className="font-medium">Ergonomic Design</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs md:text-sm">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Snowflake className="w-4 h-4 text-primary" />
                </div>
                <span className="font-medium">Cooling Technology</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs md:text-sm">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Award className="w-4 h-4 text-primary" />
                </div>
                <span className="font-medium">Medical Grade</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs md:text-sm">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Wind className="w-4 h-4 text-primary" />
                </div>
                <span className="font-medium">Breathable Fabric</span>
              </div>
            </div>

            <Button
              size="lg" 
              className="w-full text-base md:text-lg py-6 font-bold shadow-lg hover:shadow-xl transition-shadow" 
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

            <div className="grid grid-cols-3 gap-3 py-4 border-t">
              <div className="text-center">
                <Shield className="w-5 h-5 mx-auto mb-1.5 text-primary" />
                <p className="text-xs font-medium leading-tight">2-Year Warranty</p>
              </div>
              <div className="text-center">
                <RotateCcw className="w-5 h-5 mx-auto mb-1.5 text-primary" />
                <p className="text-xs font-medium leading-tight">120 Night Money-Back</p>
              </div>
              <div className="text-center">
                <Truck className="w-5 h-5 mx-auto mb-1.5 text-primary" />
                <p className="text-xs font-medium leading-tight">Easy Returns</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground bg-secondary/5 p-3 rounded-lg">
              <Truck className="w-4 h-4 flex-shrink-0" />
              <span>Arrives on <strong className="text-foreground">November 22nd</strong>, if you order before <strong className="text-foreground">11:50 PM EST</strong></span>
            </div>
          </div>
        </div>
      </div>
      
      <PolicyAccordion />
    </section>
  );
};
