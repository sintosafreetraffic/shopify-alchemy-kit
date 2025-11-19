import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import testimonial from "@/assets/testimonial.png";
import offerBundle from "@/assets/offer-bundle.png";
import comparisonChart from "@/assets/comparison-them.png";
import { useState, useEffect } from "react";
import { useCartStore } from "@/stores/cartStore";
import { fetchProducts } from "@/lib/shopify";
import type { ShopifyProduct } from "@/lib/shopify";
import { toast } from "sonner";

const features = [
  {
    image: testimonial,
    title: "Join 29,931+ Happy Sleepers",
    description: "Don't just take our word for it. Thousands of customers have transformed their sleep quality with RiseByNight. Experience the difference that proper neck alignment and ergonomic support can make.",
    benefits: [
      "Wake up pain-free and refreshed",
      "Fall asleep faster every night",
      "Verified 5-star customer reviews"
    ],
    imagePosition: "left" as const
  },
  {
    image: offerBundle,
    title: "Complete Sleep Solution Bundle",
    description: "Get everything you need for the perfect night's sleep. Our exclusive bundle includes premium accessories designed to complement your RiseByNight pillow for maximum comfort.",
    benefits: [
      "Premium sleep mask included",
      "Luxury pillowcase for cooling comfort",
      "Bonus neck roll for extra support"
    ],
    imagePosition: "right" as const
  },
  {
    image: comparisonChart,
    title: "Scientifically Proven Superior",
    description: "RiseByNight isn't just another pillow - it's engineered with advanced ergonomic design and cooling technology that outperforms traditional pillows in every way.",
    benefits: [
      "Maintains shape 5x longer than regular pillows",
      "Cooling gel prevents night sweats",
      "Clinically tested spinal alignment"
    ],
    imagePosition: "left" as const
  }
];

export const Features = () => {
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

  const handleBuyNow = async () => {
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
        variantTitle: variant.title,
        price: variant.price,
        quantity: 1,
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

  return (
    <section className="py-10 px-4 bg-primary/5">
      <div className="container mx-auto max-w-6xl space-y-16">
        {features.map((feature, index) => (
          <div
            key={index}
            className={`grid md:grid-cols-2 gap-8 md:gap-12 items-center ${
              feature.imagePosition === "right" ? "md:grid-flow-dense" : ""
            }`}
          >
            <div
              className={`rounded-xl overflow-hidden shadow-xl ${
                feature.imagePosition === "right" ? "md:col-start-2" : ""
              }`}
            >
              <img
                src={feature.image}
                alt={feature.title}
                className="w-full h-auto"
                style={
                  feature.image === comparisonChart
                    ? { filter: "hue-rotate(240deg)" }
                    : undefined
                }
              />
            </div>

            <div
              className={`space-y-6 ${
                feature.imagePosition === "right" ? "md:col-start-1 md:row-start-1" : ""
              }`}
            >
              <h2 className="text-3xl md:text-4xl font-bold leading-tight">
                {feature.title}
              </h2>
              
              <p className="text-lg text-muted-foreground">
                {feature.description}
              </p>

              <div className="space-y-3">
                {feature.benefits.map((benefit) => (
                  <div key={benefit} className="flex items-start gap-3">
                    <div className="bg-primary/10 rounded-full p-1 flex-shrink-0 mt-0.5">
                      <Check className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-base">{benefit}</span>
                  </div>
                ))}
              </div>

              <Button 
                size="lg" 
                className="mt-4" 
                onClick={handleBuyNow}
                disabled={isCheckingOut || !product}
              >
                {isCheckingOut ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Get Your OptiSleep Now'
                )}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
