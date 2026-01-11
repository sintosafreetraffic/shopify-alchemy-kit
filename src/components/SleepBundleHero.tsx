// Performance: Using OptimizedImage for optimized loading
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ShoppingCart, Shield, Moon, Truck } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import bundleImage from "@/assets/complete-sleep-bundle-updated.webp";
import { fetchProducts, type ShopifyProduct } from "@/lib/shopify";
import { toast } from "sonner";
import { trackViewedProduct } from "@/lib/klaviyo";
import OptimizedImage from "@/components/OptimizedImage";
import { formatPrice } from "@/lib/formatPrice";
import { useIsEU } from "@/hooks/useCurrencySymbol";

export const SleepBundleHero = () => {
  const [selectedBundle, setSelectedBundle] = useState<"single" | "double">("single");
  const [product, setProduct] = useState<ShopifyProduct | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const { addItem, setCartOpen } = useCartStore();
  const hasTrackedView = useRef(false);
  const isEU = useIsEU();

  useEffect(() => {
    const loadProduct = async () => {
      try {
        const products = await fetchProducts();
        const bundleProduct = products.find(
          (p: ShopifyProduct) => p.node.handle === "rise-by-night™-complete-sleep-bundle"
        );
        if (bundleProduct) {
          setProduct(bundleProduct);
          
          // Track Klaviyo Viewed Product (only once per page load)
          if (!hasTrackedView.current) {
            hasTrackedView.current = true;
            trackViewedProduct({
              id: bundleProduct.node.id,
              title: bundleProduct.node.title,
              price: parseFloat(bundleProduct.node.variants.edges[0]?.node.price.amount || "0"),
              sku: bundleProduct.node.variants.edges[0]?.node.id || "",
              imageUrl: bundleProduct.node.images?.edges?.[0]?.node?.url || "",
            });
          }
        }
      } catch (error) {
        console.error("Failed to load bundle product:", error);
      }
    };
    loadProduct();
  }, []);

  // Helper to get currency with EU override
  const getCurrency = (shopifyCurrency: string | undefined) => {
    const currency = shopifyCurrency || 'USD';
    return (isEU && currency === 'USD') ? 'EUR' : currency;
  };

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

      console.log('Bundle variant data:', {
        title: variant.node.title,
        price: variant.node.price,
        compareAtPrice: variant.node.compareAtPrice
      });

      addItem({
        product: product,
        variantId: variant.node.id,
        variantTitle: variant.node.title,
        price: variant.node.price,
        compareAtPrice: variant.node.compareAtPrice,
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
    <section className="py-4 md:py-8 lg:py-12 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-4 md:gap-6 lg:gap-10 max-w-7xl mx-auto">
          {/* Left Column - Product Images */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-xl overflow-hidden bg-gradient-to-br from-secondary/30 to-secondary/10 p-8">
              <OptimizedImage
                src={bundleImage}
                alt="Rise By Night Complete Sleep Bundle"
                width={600}
                height={450}
                priority
                className="w-full h-auto object-contain"
              />
            </div>
          </div>

          {/* Right Column - Product Details */}
          <div className="space-y-3 md:space-y-4 lg:space-y-6">
            {/* Product Title */}
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-1 md:mb-2 leading-tight">
                Rise By Night™ Complete Sleep Bundle
              </h1>
              <p className="text-base md:text-lg text-muted-foreground">
                Everything You Need for Perfect Sleep
              </p>
            </div>

            {/* Key Benefits */}
            <div className="space-y-2 mt-2 mb-2 md:mt-2 md:mb-4">
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0 mt-0.5" />
                <p className="text-[10px] sm:text-[11px] lg:text-xs xl:text-sm leading-tight"><span className="font-semibold">Complete solution</span> – Pillow, Knee Pillow & Deep Sleep Mask included</p>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0 mt-0.5" />
                <p className="text-[10px] sm:text-[11px] lg:text-xs xl:text-sm leading-tight"><span className="font-semibold">Save $30</span> – Compared to buying products separately</p>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0 mt-0.5" />
                <p className="text-[10px] sm:text-[11px] lg:text-xs xl:text-sm leading-tight"><span className="font-semibold">All positions</span> – Perfect for side, back, and stomach sleepers</p>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0 mt-0.5" />
                <p className="text-[10px] sm:text-[11px] lg:text-xs xl:text-sm leading-tight"><span className="font-semibold">Proven results</span> – Scientifically shown to improve sleep quality by 93%</p>
              </div>
            </div>

            {/* Bundle Selection */}
            <div className="space-y-2 md:space-y-3">
              <h3 className="font-semibold text-sm md:text-base">Choose Your Bundle:</h3>
              <div className="grid grid-cols-2 gap-2 md:gap-3">
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
                      {formatPrice(product?.node.variants.edges[0]?.node.price.amount || "149.99", getCurrency(product?.node.variants.edges[0]?.node.price.currencyCode))}
                    </p>
                    {product?.node.variants.edges[0]?.node.compareAtPrice && (
                      <p className="text-xs text-muted-foreground line-through">
                        {formatPrice(product.node.variants.edges[0].node.compareAtPrice.amount, getCurrency(product.node.variants.edges[0].node.compareAtPrice.currencyCode))}
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
                      {formatPrice(product?.node.variants.edges[1]?.node.price.amount || "249.99", getCurrency(product?.node.variants.edges[1]?.node.price.currencyCode))}
                    </p>
                    {product?.node.variants.edges[1]?.node.compareAtPrice && (
                      <p className="text-xs text-muted-foreground line-through">
                        {formatPrice(product.node.variants.edges[1].node.compareAtPrice.amount, getCurrency(product.node.variants.edges[1].node.compareAtPrice.currencyCode))}
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
                ? formatPrice(product?.node.variants.edges[0]?.node.price.amount || "149.99", getCurrency(product?.node.variants.edges[0]?.node.price.currencyCode))
                : formatPrice(product?.node.variants.edges[1]?.node.price.amount || "249.99", getCurrency(product?.node.variants.edges[1]?.node.price.currencyCode))
              }
            </Button>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-2 pt-3 border-t">
              <div className="flex flex-col items-center text-center">
                <Shield className="w-4 h-4 md:w-5 md:h-5 mb-1 text-primary" />
                <p className="font-semibold text-[10px] md:text-xs">2-Year</p>
                <p className="text-[10px] text-muted-foreground">Warranty</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <Moon className="w-4 h-4 md:w-5 md:h-5 mb-1 text-primary" />
                <p className="font-semibold text-[10px] md:text-xs">100 nights</p>
                <p className="text-[10px] text-muted-foreground">risk free</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <Truck className="w-4 h-4 md:w-5 md:h-5 mb-1 text-primary" />
                <p className="font-semibold text-[10px] md:text-xs">Easy</p>
                <p className="text-[10px] text-muted-foreground">Returns</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
