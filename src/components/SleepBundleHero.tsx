import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ShoppingCart } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import bundleImage from "@/assets/complete-sleep-bundle.png";
import { fetchProducts, type ShopifyProduct } from "@/lib/shopify";
import { toast } from "sonner";

export const SleepBundleHero = () => {
  const [selectedBundle, setSelectedBundle] = useState<"single" | "double">("single");
  const [product, setProduct] = useState<ShopifyProduct | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const { addItem, setCartOpen } = useCartStore();

  useEffect(() => {
    const loadProduct = async () => {
      try {
        const products = await fetchProducts();
        const bundleProduct = products.find(
          (p: ShopifyProduct) => p.node.handle === "rise-by-night™-complete-sleep-bundle"
        );
        if (bundleProduct) {
          setProduct(bundleProduct);
        }
      } catch (error) {
        console.error("Failed to load bundle product:", error);
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
      const variant = product.node.variants.edges.find(
        (v) => v.node.title === (selectedBundle === "single" ? "Single Bundle" : "Double Bundle")
      );

      if (!variant) {
        toast.error("Selected variant not available");
        return;
      }

      addItem({
        product: product,
        variantId: variant.node.id,
        variantTitle: variant.node.title,
        price: variant.node.price,
        quantity: 1,
        selectedOptions: variant.node.selectedOptions,
      });

      toast.success("Added to cart!");
      setCartOpen(true);
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast.error("Failed to add to cart");
    } finally {
      setIsCheckingOut(false);
    }
  };

  const images = [
    { type: "image" as const, src: bundleImage, alt: "Rise By Night Complete Sleep Bundle" }
  ];

  return (
    <section className="py-8 md:py-12 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 max-w-7xl mx-auto">
          {/* Left Column - Product Images */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-xl overflow-hidden bg-gradient-to-br from-secondary/30 to-secondary/10 p-8">
              <img
                src={bundleImage}
                alt="Rise By Night Complete Sleep Bundle"
                className="w-full h-auto object-contain"
                loading="eager"
                decoding="async"
              />
            </div>
          </div>

          {/* Right Column - Product Details */}
          <div className="space-y-6">
            {/* Product Title */}
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2 leading-tight">
                Rise By Night™ Complete Sleep Bundle
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground">
                Everything You Need for Perfect Sleep
              </p>
            </div>

            {/* Key Benefits */}
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-sm md:text-base">Complete sleep solution package - Pillow, Knee Pillow & Sleep Mask</p>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-sm md:text-base">Save $40 compared to buying products separately</p>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-sm md:text-base">Perfect for all sleeping positions - side, back, and stomach sleepers</p>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-sm md:text-base">Scientifically proven to improve sleep quality by 93%</p>
              </div>
            </div>

            {/* Bundle Selection */}
            <div className="space-y-3">
              <h3 className="font-semibold text-base md:text-lg">Choose Your Bundle:</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => setSelectedBundle("single")}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    selectedBundle === "single"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-semibold text-sm md:text-base">Single Bundle</span>
                    {selectedBundle === "single" && (
                      <Badge variant="default" className="text-xs">Selected</Badge>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xl md:text-2xl font-bold text-primary">
                      ${parseFloat(product?.node.variants.edges[0]?.node.price.amount || "149.99").toFixed(2)}
                    </p>
                    {product?.node.variants.edges[0]?.node.compareAtPrice && (
                      <p className="text-xs text-muted-foreground line-through">
                        ${parseFloat(product.node.variants.edges[0].node.compareAtPrice.amount).toFixed(2)}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">1 of each product</p>
                  </div>
                </button>

                <button
                  onClick={() => setSelectedBundle("double")}
                  className={`p-4 rounded-lg border-2 transition-all text-left relative ${
                    selectedBundle === "double"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Badge className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground">
                    Best Value
                  </Badge>
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-semibold text-sm md:text-base">Double Bundle</span>
                    {selectedBundle === "double" && (
                      <Badge variant="default" className="text-xs">Selected</Badge>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xl md:text-2xl font-bold text-primary">
                      ${parseFloat(product?.node.variants.edges[1]?.node.price.amount || "249.99").toFixed(2)}
                    </p>
                    {product?.node.variants.edges[1]?.node.compareAtPrice && (
                      <p className="text-xs text-muted-foreground line-through">
                        ${parseFloat(product.node.variants.edges[1].node.compareAtPrice.amount).toFixed(2)}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">2 of each product</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Add to Cart Button */}
            <Button 
              size="lg" 
              className="w-full text-base md:text-lg h-12 md:h-14"
              onClick={handleAddToCart}
              disabled={isCheckingOut || !product}
            >
              <ShoppingCart className="w-5 h-5 mr-2" />
              Add to Cart - {selectedBundle === "single" 
                ? `$${parseFloat(product?.node.variants.edges[0]?.node.price.amount || "149.99").toFixed(2)}`
                : `$${parseFloat(product?.node.variants.edges[1]?.node.price.amount || "249.99").toFixed(2)}`
              }
            </Button>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-3 pt-4 border-t">
              <div className="text-center">
                <p className="font-semibold text-xs md:text-sm">2-Year</p>
                <p className="text-xs text-muted-foreground">Warranty</p>
              </div>
              <div className="text-center">
                <p className="font-semibold text-xs md:text-sm">100 nights</p>
                <p className="text-xs text-muted-foreground">risk free</p>
              </div>
              <div className="text-center">
                <p className="font-semibold text-xs md:text-sm">Easy</p>
                <p className="text-xs text-muted-foreground">Returns</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
