// Performance: Updated images to use WebP variants + OptimizedImage component
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { fetchProducts, type ShopifyProduct } from "@/lib/shopify";
import OptimizedImage from "@/components/OptimizedImage";
import { formatPrice } from "@/lib/formatPrice";
// Using WebP variants where available for better performance
import ergonomicPillowProduct from "@/assets/ergonomic-pillow-product.webp";
import kneePillowMain from "@/assets/knee-pillow-main-new.webp";
import eyeMaskGift from "@/assets/eye-mask-gift-new.webp";
import completeSleepBundle from "@/assets/complete-sleep-bundle-updated.webp";

export const ProductGallery = () => {
  const [shopifyProducts, setShopifyProducts] = useState<ShopifyProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
  const currencyCode = ergonomicPillowShopify?.node.variants.edges[0]?.node.price.currencyCode || 
                       bundleProduct?.node.variants.edges[0]?.node.price.currencyCode || 'USD';

  // Helper to get formatted price from Shopify product
  const getProductPrice = (product: ShopifyProduct | undefined, fallback: string) => {
    const variant = product?.node.variants.edges[0]?.node;
    if (variant) {
      return formatPrice(variant.price.amount, variant.price.currencyCode);
    }
    return fallback;
  };

  const products = [
    {
      id: 2,
      name: "Rise By Night™ Ergonomic Pillow",
      tagline: "The #1 Rated Orthopedic Pillow",
      price: getProductPrice(ergonomicPillowShopify, formatPrice("79.99", currencyCode)),
      originalPrice: undefined,
      rating: 4.8,
      reviews: "6,247",
      image: ergonomicPillowProduct,
      features: ["Ergonomic contour design", "Cooling gel technology", "High-density memory foam", "3-5 year lifespan"],
      badge: "Sleep Mask Included",
      link: "/product/ergonomic-pillow",
    },
    {
      id: 3,
      name: "Rise By Night™ Ergonomic Knee Pillow",
      tagline: "Perfect Support for Side Sleepers",
      price: getProductPrice(kneePillowShopify, formatPrice("39.99", currencyCode)),
      originalPrice: undefined,
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
      link: "/product/knee-pillow",
    },
    {
      id: 4,
      name: "Rise By Night™ Silk Deep Sleep Mask",
      tagline: "100% Pure Mulberry Silk",
      price: getProductPrice(sleepMaskShopify, formatPrice("29.99", currencyCode)),
      originalPrice: undefined,
      rating: 4.9,
      reviews: "3,200+",
      image: eyeMaskGift,
      features: ["Blocks 100% of light", "Gentle on skin & eyelashes", "Contoured eye design", "Hypoallergenic silk"],
      badge: "",
      link: "/product/sleep-mask",
    },
  ];

  return (
    <>
      {/* Featured Bundle Section */}
      <section className="py-10 md:py-12 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-12">
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
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-5 h-5 ${
                              i < 5 ? "fill-primary text-primary" : "text-muted"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-base font-semibold">4.9</span>
                      <span className="text-sm text-muted-foreground">(2,100+ reviews)</span>
                    </div>

                    <p className="text-sm text-primary font-semibold mb-2">Everything for Perfect Sleep</p>
                    <h3 className="text-2xl md:text-3xl font-bold mb-4">{bundleProduct.node.title}</h3>

                    <div className="flex items-center gap-3 mb-6">
                      <span className="text-3xl md:text-4xl font-bold text-primary">
                        {formatPrice(bundleProduct.node.variants.edges[0]?.node.price.amount || "0", bundleProduct.node.variants.edges[0]?.node.price.currencyCode || 'USD')}
                      </span>
                      {bundleProduct.node.variants.edges[0]?.node.compareAtPrice?.amount && (
                        <span className="text-xl text-muted-foreground line-through">
                          {formatPrice(bundleProduct.node.variants.edges[0].node.compareAtPrice.amount, bundleProduct.node.variants.edges[0].node.compareAtPrice.currencyCode)}
                        </span>
                      )}
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
                        <span className="text-muted-foreground">Save $10 vs buying separately</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5 text-lg">✓</span>
                        <span className="text-muted-foreground">Perfect for side & back sleepers</span>
                      </li>
                    </ul>

                    <Link to="/product/sleep-bundle">
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
      <section className="py-10 md:py-12 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-8">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Individual Products</h2>
            <p className="text-xl text-muted-foreground">Choose specific solutions tailored to your needs</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {products.map((product) => (
              <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative">
                  {product.badge && (
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
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < Math.floor(product.rating) ? "fill-primary text-primary" : "text-muted"
                          }`}
                        />
                      ))}
                    </div>
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
