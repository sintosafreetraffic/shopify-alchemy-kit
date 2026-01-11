// Performance: Using OptimizedImage for lazy loading
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import testimonial from "@/assets/happy-sleepers-pillow.webp";
import offerBundle from "@/assets/offer-bundle.png";
import comparisonChart from "@/assets/pillow-comparison.webp";
import OptimizedImage from "@/components/OptimizedImage";
import { useState, useEffect } from "react";
import { useCartStore } from "@/stores/cartStore";
import { fetchProducts } from "@/lib/shopify";
import type { ShopifyProduct } from "@/lib/shopify";
import { toast } from "sonner";

const features: Array<{
  image: string;
  title: string;
  description: string;
  benefits: string[];
  imagePosition: "left" | "right";
}> = [
  {
    image: testimonial,
    title: "Join Our Happy Sleepers",
    description: "Don't just take our word for it. Thousands of customers have transformed their sleep quality with Rise By Night. Experience the difference that proper neck alignment and ergonomic support can make.",
    benefits: [
      "Wake up pain-free and refreshed",
      "Fall asleep faster every night",
      "Verified 5-star customer reviews"
    ],
    imagePosition: "left"
  },
  {
    image: comparisonChart,
    title: "Scientifically Proven Superior",
    description: "Rise By Night isn't just another pillow - it's engineered with advanced ergonomic design and cooling technology that outperforms traditional pillows in every way.",
    benefits: [
      "Maintains shape 5x longer than regular pillows",
      "Cooling gel prevents night sweats",
      "Clinically tested spinal alignment"
    ],
    imagePosition: "right"
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
        compareAtPrice: variant.compareAtPrice,
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
    <section className="py-4 md:py-6 lg:py-10 px-4 bg-primary/5">
      <div className="container mx-auto max-w-6xl space-y-4 md:space-y-8 lg:space-y-12">
        {features.map((feature, index) => (
          <div
            key={index}
            className={`grid md:grid-cols-2 gap-4 md:gap-8 items-center ${
              feature.imagePosition === "right" ? "md:grid-flow-dense" : ""
            }`}
          >
            <div
              className={`rounded-xl overflow-hidden shadow-xl ${
                feature.imagePosition === "right" ? "md:col-start-2" : ""
              }`}
            >
              <OptimizedImage
                src={feature.image}
                alt={feature.title}
                width={672}
                height={400}
                className="w-full h-auto"
              />
            </div>

            <div
              className={`space-y-2 md:space-y-4 ${
                feature.imagePosition === "right" ? "md:col-start-1 md:row-start-1" : ""
              }`}
            >
              <h2 className="text-lg md:text-2xl lg:text-3xl font-bold leading-tight">
                {feature.title}
              </h2>
              
              <p className="text-sm md:text-base text-muted-foreground">
                {feature.description}
              </p>

              <div className="space-y-1.5 md:space-y-2">
                {feature.benefits.map((benefit) => (
                  <div key={benefit} className="flex items-start gap-2">
                    <div className="bg-primary/10 rounded-full p-0.5 md:p-1 flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 md:w-4 md:h-4 text-primary" />
                    </div>
                    <span className="text-xs md:text-sm">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
