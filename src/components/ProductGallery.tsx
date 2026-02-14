// Performance: Updated images to use WebP variants + OptimizedImage component
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Heart } from "lucide-react";
import { StarRating } from "@/components/ui/star-rating";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { fetchProducts, type ShopifyProduct } from "@/lib/shopify";
import OptimizedImage from "@/components/OptimizedImage";
import { formatPrice } from "@/lib/formatPrice";
import { getCompareAtFromRatio } from "@/lib/compareAtPriceRatios";
import { useIsEU } from "@/hooks/useCurrencySymbol";
import { useABErgonomicPillow } from "@/hooks/useABProduct";
import { getPreferredPillowRoute } from "@/lib/pillowFocusPreference";
import { useValentinesOffer } from "@/hooks/useValentinesOffer";
// Using WebP variants where available for better performance
import ergonomicPillowProduct from "@/assets/ergonomic-pillow-product.webp";
import kneePillowMain from "@/assets/knee-pillow-main-new.webp";
import eyeMaskGift from "@/assets/sleep-mask-product-shot-new.png";
import completeSleepBundle from "@/assets/complete-sleep-bundle-updated.webp";

export const ProductGallery = () => {
  const [shopifyProducts, setShopifyProducts] = useState<ShopifyProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isEU = useIsEU();
  
  // Get A/B tested ergonomic pillow product
  const { product: abErgonomicPillow, config: abConfig } = useABErgonomicPillow();

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const products = await fetchProducts();
        setShopifyProducts(products);
      } catch (error) {
        console.error("Failed to load products:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadProducts();
  }, []);

  // Find Shopify products by handle
  const bundleProduct = shopifyProducts.find(
    (p: ShopifyProduct) => p.node.handle === "rise-by-night™-complete-sleep-bundle"
  );
  const ergonomicPillowShopify = shopifyProducts.find(
    (p: ShopifyProduct) => p.node.handle === "risebynight-ergonomic-sleep-pillow"
  );
  const kneePillowShopify = shopifyProducts.find(
    (p: ShopifyProduct) => p.node.handle === "risebynight-ergonomic-knee-pillow"
  );
  const sleepMaskShopify = shopifyProducts.find(
    (p: ShopifyProduct) => p.node.handle === "risebynight-silk-deep-sleep-mask"
  );

  // Get currency from first available product
  const shopifyCurrency = ergonomicPillowShopify?.node.variants.edges[0]?.node.price.currencyCode || 
                       bundleProduct?.node.variants.edges[0]?.node.price.currencyCode || 'USD';
  // Override to EUR for EU countries if Shopify returns USD
  const currencyCode = (isEU && shopifyCurrency === 'USD') ? 'EUR' : shopifyCurrency;

  // Helper to get formatted price from Shopify product
  const getProductPrice = (product: ShopifyProduct | undefined, fallback: string) => {
    const variant = product?.node.variants.edges[0]?.node;
    if (variant) {
      return formatPrice(variant.price.amount, variant.price.currencyCode);
    }
    return fallback;
  };

  // Helper to get formatted compare-at price from Shopify product
  const getCompareAtPrice = (product: ShopifyProduct | undefined): string | undefined => {
    // First try variant-level compareAtPrice
    const variant = product?.node.variants.edges[0]?.node;
    if (variant?.compareAtPrice?.amount && parseFloat(variant.compareAtPrice.amount) > 0) {
      return formatPrice(variant.compareAtPrice.amount, currencyCode);
    }
    // Fallback to product-level compareAtPriceRange
    const rangeAmount = product?.node.compareAtPriceRange?.minVariantPrice?.amount;
    if (rangeAmount && parseFloat(rangeAmount) > 0) {
      return formatPrice(rangeAmount, currencyCode);
    }
    // Ratio-based fallback for non-US markets
    const handle = product?.node.handle;
    const localPrice = variant?.price?.amount;
    if (handle && localPrice) {
      const ratioCompareAt = getCompareAtFromRatio(handle, localPrice, 0);
      if (ratioCompareAt) {
        return formatPrice(ratioCompareAt, currencyCode);
      }
    }
    return undefined;
  };

  const valentinesOffer = useValentinesOffer();

  // Use A/B tested product for ergonomic pillow (falls back to standard if not loaded)
  const ergonomicPillowForDisplay = abErgonomicPillow || ergonomicPillowShopify;
  
  const products = [
    {
      id: 2,
      name: "Rise By Night™ Ergonomic Pillow",
      tagline: "The #1 Rated Orthopedic Pillow",
      price: getProductPrice(ergonomicPillowForDisplay, formatPrice(abConfig.price.toString(), currencyCode)),
      originalPrice: getCompareAtPrice(ergonomicPillowForDisplay),
      rating: 4.8,
      reviews: "6,247",
      image: ergonomicPillowProduct,
      features: ["Ergonomic contour design", "Cooling gel technology", "High-density memory foam", "3-5 year lifespan"],
      badge: abConfig.includesMask ? "Sleep Mask Included" : "",
      link: getPreferredPillowRoute(),
      isValentinesDeal: true,
    },
    {
      id: 3,
      name: "Rise By Night™ Ergonomic Knee Pillow",
      tagline: "Perfect Support for Side Sleepers",
      price: getProductPrice(kneePillowShopify, formatPrice("39.99", currencyCode)),
      originalPrice: getCompareAtPrice(kneePillowShopify),
      rating: 4.7,
      reviews: "5,100+",
      image: kneePillowMain,
      features: [
        "Aligns hips and spine",
        "Reduces lower back pain",
        "Memory foam comfort",
        "Adjustable strap included",
      ],
      badge: "",
      link: "/products/knee-pillow",
      isValentinesDeal: false,
    },
    {
      id: 4,
      name: "Rise By Night™ Silk Deep Sleep Mask",
      tagline: "100% Pure Mulberry Silk",
      price: getProductPrice(sleepMaskShopify, formatPrice("29.99", currencyCode)),
      originalPrice: getCompareAtPrice(sleepMaskShopify),
      rating: 4.9,
      reviews: "3,200+",
      image: eyeMaskGift,
      features: ["Blocks 100% of light", "Gentle on skin & eyelashes", "Contoured eye design", "Hypoallergenic silk"],
      badge: "",
      link: "/products/sleep-mask",
      isValentinesDeal: false,
    },
  ];

  return (
    <>
      {/* Featured Bundle Section */}
      <section className="py-8 md:py-12 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-8 md:mb-12">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Complete Sleep Solution</h2>
            <p className="text-xl text-muted-foreground">Get everything you need for perfect sleep in one bundle</p>
          </div>

          <div className="max-w-4xl mx-auto">
            {bundleProduct && (
              <Card className="overflow-hidden hover:shadow-xl transition-shadow">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="relative">
                    <div className="absolute top-4 left-4 z-10">
                      <span className="bg-destructive text-destructive-foreground px-4 py-2 rounded-full text-sm font-bold">
                        Best Value Bundle
                      </span>
                    </div>
                    <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-8 h-full flex items-center justify-center">
                      <OptimizedImage 
                        src={completeSleepBundle} 
                        alt={bundleProduct.node.title} 
                        width={600}
                        height={400}
                        className="w-full object-contain" 
                      />
                    </div>
                  </div>

                  <div className="p-6 md:p-8 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-3">
                      <StarRating rating={4.9} size="lg" showEmpty />
                      <span className="text-base font-semibold">4.9</span>
                      <span className="text-sm text-muted-foreground">(2,100+ reviews)</span>
                    </div>

                    <p className="text-sm text-primary font-semibold mb-2">Everything for Perfect Sleep</p>
                    <h3 className="text-2xl md:text-3xl font-bold mb-4">{bundleProduct.node.title}</h3>

                    <div className="flex items-center gap-3 mb-6">
                      <span className="text-3xl md:text-4xl font-bold text-primary">
                        {formatPrice(bundleProduct.node.variants.edges[0]?.node.price.amount || "0", currencyCode)}
                      </span>
                      {(() => {
                        const variantCompare = bundleProduct.node.variants.edges[0]?.node.compareAtPrice?.amount;
                        const rangeCompare = bundleProduct.node.compareAtPriceRange?.minVariantPrice?.amount;
                        const compareAmount = (variantCompare && parseFloat(variantCompare) > 0) ? variantCompare : (rangeCompare && parseFloat(rangeCompare) > 0) ? rangeCompare : null;
                        return compareAmount ? (
                          <span className="text-xl text-muted-foreground line-through">
                            {formatPrice(compareAmount, currencyCode)}
                          </span>
                        ) : null;
                      })()}
                    </div>

                    <ul className="space-y-3 mb-8">
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5 text-lg">✓</span>
                        <span className="text-muted-foreground">Pillow + Knee Pillow + Deep Sleep Mask</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5 text-lg">✓</span>
                        <span className="text-muted-foreground">Complete sleep solution package</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5 text-lg">✓</span>
                        <span className="text-muted-foreground">Save {formatPrice(10, currencyCode)} vs buying separately</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5 text-lg">✓</span>
                        <span className="text-muted-foreground">Perfect for side & back sleepers</span>
                      </li>
                    </ul>

                    <Link to="/products/sleep-bundle">
                      <Button className="w-full" size="lg">
                        Get the Bundle <ArrowRight className="ml-2 w-5 h-5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </section>

      {/* Individual Products Section */}
      <section className="py-8 md:py-12 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-6 md:mb-8">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Individual Products</h2>
            <p className="text-xl text-muted-foreground">Choose specific solutions tailored to your needs</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {products.map((product) => (
              <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative">
                  {product.isValentinesDeal && valentinesOffer.isActive && (
                    <div className="absolute top-4 left-4 z-10">
                      <div className="bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
                        <Heart className="w-3.5 h-3.5 fill-white" />
                        <span>1+1 FREE</span>
                      </div>
                    </div>
                  )}
                  {product.badge && !product.isValentinesDeal && (
                    <div className="absolute top-4 left-4 z-10">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        product.badge.toLowerCase().includes('included') 
                          ? 'text-white' 
                          : 'bg-destructive text-destructive-foreground'
                      }`} style={product.badge.toLowerCase().includes('included') ? { backgroundColor: '#3e81e0' } : undefined}>
                        {product.badge}
                      </span>
                    </div>
                  )}
                  <div className="bg-gradient-to-b from-primary/5 to-background p-8">
                    <OptimizedImage src={product.image} alt={product.name} width={256} height={256} className="w-full h-64 object-contain" />
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <StarRating rating={product.rating} size="md" showEmpty />
                    <span className="text-sm font-medium">{product.rating}</span>
                    <span className="text-sm text-muted-foreground">({product.reviews} reviews)</span>
                  </div>

                  <p className="text-sm text-primary font-medium mb-1">{product.tagline}</p>
                  <h3 className="text-lg font-bold mb-3">{product.name}</h3>

                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl font-bold text-primary">{product.price}</span>
                    {product.originalPrice && (
                      <span className="text-lg text-muted-foreground line-through">{product.originalPrice}</span>
                    )}
                  </div>

                  <ul className="space-y-2 mb-6">
                    {product.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="text-primary mt-0.5">✓</span>
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link to={product.link}>
                    <Button className="w-full" size="lg">
                      Improve your sleep <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};
