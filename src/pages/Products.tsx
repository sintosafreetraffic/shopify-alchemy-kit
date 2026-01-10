import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Star, Award, Truck } from "lucide-react";
import OptimizedImage from "@/components/OptimizedImage";
import { useShopifyProducts } from "@/hooks/useShopifyProducts";
import { formatPrice } from "@/lib/formatPrice";
import { useIsEU } from "@/hooks/useCurrencySymbol";

// Product handle to internal route mapping
const PRODUCT_ROUTES: Record<string, string> = {
  "risebynight-ergonomic-sleep-pillow": "ergonomic-pillow",
  "risebynight-ergonomic-knee-pillow": "knee-pillow",
  "risebynight-silk-sleep-mask": "sleep-mask",
  "risebynight-silk-deep-sleep-mask": "sleep-mask",
  "rise-by-night™-complete-sleep-bundle": "sleep-bundle",
};

// Static data for reviews (aligned with product pages)
const PRODUCT_REVIEWS: Record<string, { rating: number; reviews: string; badge?: string }> = {
  "risebynight-ergonomic-sleep-pillow": { rating: 4.8, reviews: "6,247", badge: "Best Seller" },
  "risebynight-ergonomic-knee-pillow": { rating: 4.7, reviews: "5,100+" },
  "risebynight-silk-sleep-mask": { rating: 4.9, reviews: "3,200+" },
  "risebynight-silk-deep-sleep-mask": { rating: 4.9, reviews: "3,200+" },
  "rise-by-night™-complete-sleep-bundle": { rating: 4.9, reviews: "2,100+", badge: "Save 20%" },
};

// Taglines for products
const PRODUCT_TAGLINES: Record<string, string> = {
  "risebynight-ergonomic-sleep-pillow": "Clinically designed for cervical support",
  "risebynight-ergonomic-knee-pillow": "Perfect support for side sleepers",
  "risebynight-silk-sleep-mask": "100% Pure Mulberry Silk",
  "risebynight-silk-deep-sleep-mask": "100% Pure Mulberry Silk",
  "rise-by-night™-complete-sleep-bundle": "Pillow + Knee Pillow + Sleep Mask",
};

// Product display order (use actual Shopify handles)
const PRODUCT_ORDER = [
  "risebynight-ergonomic-sleep-pillow",
  "risebynight-ergonomic-knee-pillow", 
  "risebynight-silk-deep-sleep-mask",
  "rise-by-night™-complete-sleep-bundle",
];

// Alternate handles mapping (some products have multiple handles)
const HANDLE_ALIASES: Record<string, string[]> = {
  "risebynight-silk-deep-sleep-mask": ["risebynight-silk-sleep-mask", "risebynight-silk-deep-sleep-mask"],
};

const Products = () => {
  const { data: shopifyProducts, isLoading } = useShopifyProducts(10);
  const isEU = useIsEU();

  // Filter and sort products based on our order
  const sortedProducts = PRODUCT_ORDER
    .map(handle => {
      // Check for exact match first
      let product = shopifyProducts?.find(p => p.node.handle === handle);
      // Check aliases if no exact match
      if (!product && HANDLE_ALIASES[handle]) {
        for (const alias of HANDLE_ALIASES[handle]) {
          product = shopifyProducts?.find(p => p.node.handle === alias);
          if (product) break;
        }
      }
      return product;
    })
    .filter(Boolean);

  // Get currency code from products or default
  const currencyCode = isEU ? 'EUR' : (shopifyProducts?.[0]?.node.variants.edges[0]?.node.price.currencyCode || 'USD');

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="py-12 md:py-16 px-4 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto max-w-6xl text-center">
          <h1 className="text-3xl md:text-5xl font-bold mb-4">
            Our Sleep Products
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Ergonomic sleep solutions designed by chiropractors, loved by thousands
          </p>
          
          {/* Trust Badges */}
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              <span>Chiropractor Approved</span>
            </div>
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-primary" />
              <span>Free Shipping</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-primary" />
              <span>100-Night Trial</span>
            </div>
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-12 md:py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          {isLoading ? (
            <div className="grid md:grid-cols-2 gap-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-card rounded-2xl overflow-hidden border border-border animate-pulse">
                  <div className="aspect-[4/3] bg-muted" />
                  <div className="p-6 space-y-4">
                    <div className="h-4 bg-muted rounded w-1/2" />
                    <div className="h-6 bg-muted rounded w-3/4" />
                    <div className="h-4 bg-muted rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-8">
              {sortedProducts.map((product) => {
                if (!product) return null;
                
                const handle = product.node.handle;
                const routeHandle = PRODUCT_ROUTES[handle] || handle;
                const reviewData = PRODUCT_REVIEWS[handle] || { rating: 4.5, reviews: "1,000+" };
                const tagline = PRODUCT_TAGLINES[handle] || "";
                const variant = product.node.variants.edges[0]?.node;
                const price = variant ? formatPrice(variant.price.amount, currencyCode) : "$0.00";
                const compareAtPrice = variant?.compareAtPrice?.amount 
                  ? formatPrice(variant.compareAtPrice.amount, currencyCode) 
                  : null;
                const image = product.node.images.edges[0]?.node?.url;

                return (
                  <Link
                    key={product.node.id}
                    to={`/products/${routeHandle}`}
                    className="group"
                  >
                    <div className="bg-card rounded-2xl overflow-hidden border border-border hover:border-primary/30 hover:shadow-lg transition-all duration-300">
                      {/* Image */}
                      <div className="relative aspect-[4/3] bg-secondary/10 overflow-hidden">
                        {image && (
                          <OptimizedImage
                            src={image}
                            alt={product.node.title}
                            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500 p-4"
                          />
                        )}
                        {reviewData.badge && (
                          <span className="absolute top-4 left-4 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
                            {reviewData.badge}
                          </span>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-6">
                        {/* Rating - Yellow Stars with partial fill support */}
                        <div className="flex items-center gap-2 mb-3">
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => {
                              const fillPercentage = Math.min(1, Math.max(0, reviewData.rating - i));
                              return (
                                <div key={i} className="relative w-4 h-4">
                                  {/* Background star (empty) */}
                                  <Star className="absolute w-4 h-4 fill-muted text-muted" />
                                  {/* Foreground star (filled) with clip */}
                                  {fillPercentage > 0 && (
                                    <div 
                                      className="absolute overflow-hidden" 
                                      style={{ width: `${fillPercentage * 100}%` }}
                                    >
                                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {reviewData.rating} ({reviewData.reviews} reviews)
                          </span>
                        </div>

                        {/* Title & Description */}
                        <h2 className="text-xl font-semibold mb-1 group-hover:text-primary transition-colors">
                          {product.node.title}
                        </h2>
                        <p className="text-muted-foreground mb-4">
                          {tagline}
                        </p>

                        {/* Price (Blue) & CTA */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-primary">{price}</span>
                            {compareAtPrice && (
                              <span className="text-muted-foreground line-through">
                                {compareAtPrice}
                              </span>
                            )}
                          </div>
                          <Button 
                            size="sm" 
                            className="bg-primary text-primary-foreground hover:bg-black transition-colors"
                          >
                            {handle.includes('bundle') ? 'Get the Bundle' : 'Improve your sleep'} <ArrowRight className="w-4 h-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Quiz CTA */}
      <section className="py-12 md:py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-2xl text-center">
          <h2 className="text-2xl md:text-3xl font-semibold mb-4">
            Not sure which product is right for you?
          </h2>
          <p className="text-muted-foreground mb-6">
            Take our sleep assessment to get personalized recommendations based on your sleep position and pain points.
          </p>
          <Link to="/sleep-quiz">
            <Button size="lg" className="rounded-full px-8 bg-primary hover:bg-black transition-colors">
              Take the Sleep Assessment <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Products;
