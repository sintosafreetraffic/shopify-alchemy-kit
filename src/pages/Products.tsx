import { Link } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Star, Award, Truck, ChevronDown, ChevronUp, TrendingUp } from "lucide-react";
import OptimizedImage from "@/components/OptimizedImage";
import { useShopifyProducts } from "@/hooks/useShopifyProducts";
import { formatPrice } from "@/lib/formatPrice";
import { getCompareAtFromRatio } from "@/lib/compareAtPriceRatios";
import { useIsEU } from "@/hooks/useCurrencySymbol";
import { useSEO, SEO_CONFIGS } from "@/hooks/useSEO";
import { BreadcrumbSchema } from "@/components/seo/SEOSchemas";
import { getErgonomicPillowHandle, AB_PRODUCT_HANDLES } from "@/lib/abProductConfig";

// Product handle to internal route mapping
const PRODUCT_ROUTES: Record<string, string> = {
  "risebynight-ergonomic-sleep-pillow": "ergonomic-pillow",
  "risebynight-ergonomic-sleep-pillow-copy": "ergonomic-pillow", // Variant B product
  "risebynight-ergonomic-knee-pillow": "knee-pillow",
  "risebynight-silk-sleep-mask": "sleep-mask",
  "risebynight-silk-deep-sleep-mask": "sleep-mask",
  "rise-by-night™-complete-sleep-bundle": "sleep-bundle",
};

// Static data for reviews (aligned with product pages)
const PRODUCT_REVIEWS: Record<string, { rating: number; reviews: string; badge?: string }> = {
  "risebynight-ergonomic-sleep-pillow": { rating: 4.8, reviews: "6,247", badge: "Best Seller" },
  "risebynight-ergonomic-sleep-pillow-copy": { rating: 4.8, reviews: "6,247", badge: "Best Seller" }, // Variant B
  "risebynight-ergonomic-knee-pillow": { rating: 4.7, reviews: "5,100+" },
  "risebynight-silk-sleep-mask": { rating: 4.9, reviews: "3,200+" },
  "risebynight-silk-deep-sleep-mask": { rating: 4.9, reviews: "3,200+" },
  "rise-by-night™-complete-sleep-bundle": { rating: 4.9, reviews: "2,100+", badge: "Best Offer" },
};

// Taglines for products
const PRODUCT_TAGLINES: Record<string, string> = {
  "risebynight-ergonomic-sleep-pillow": "Clinically designed for cervical support",
  "risebynight-ergonomic-sleep-pillow-copy": "Clinically designed for cervical support", // Variant B
  "risebynight-ergonomic-knee-pillow": "Perfect support for side sleepers",
  "risebynight-silk-sleep-mask": "100% Pure Mulberry Silk",
  "risebynight-silk-deep-sleep-mask": "100% Pure Mulberry Silk",
  "rise-by-night™-complete-sleep-bundle": "Pillow + Knee Pillow + Sleep Mask",
};

// Sales data for scarcity messaging (weekly sold count)
const PRODUCT_WEEKLY_SALES: Record<string, number> = {
  "risebynight-ergonomic-sleep-pillow": 127,
  "risebynight-ergonomic-sleep-pillow-copy": 127,
  "risebynight-ergonomic-knee-pillow": 89,
  "risebynight-silk-sleep-mask": 156,
  "risebynight-silk-deep-sleep-mask": 156,
  "rise-by-night™-complete-sleep-bundle": 64,
};

// Build product order dynamically based on A/B variant
// This function returns the correct order with the right ergonomic pillow handle
const getProductOrder = (ergonomicHandle: string) => [
  ergonomicHandle, // Use the A/B-selected product handle
  "risebynight-ergonomic-knee-pillow", 
  "risebynight-silk-deep-sleep-mask",
  "rise-by-night™-complete-sleep-bundle",
];

// Alternate handles mapping (some products have multiple handles)
const HANDLE_ALIASES: Record<string, string[]> = {
  "risebynight-silk-deep-sleep-mask": ["risebynight-silk-sleep-mask", "risebynight-silk-deep-sleep-mask"],
};

// SEO Content for category page - optimized keywords for search
const SEO_CONTENT = {
  preview: "Explore our chiropractor-recommended ergonomic pillows and sleep accessories — designed for adults over 55 seeking lasting relief from neck pain, back discomfort, and poor sleep quality.",
  full: `Explore our chiropractor-recommended ergonomic pillows and sleep accessories — designed for adults over 55 seeking lasting relief from neck pain, back discomfort, and poor sleep quality. Each Rise By Night product is developed in collaboration with spine health professionals to provide optimal cervical support and spinal alignment while you sleep.

Our best-selling ergonomic cervical pillow features a contoured memory foam design that adapts to your unique head and neck shape, providing personalized support for side sleepers, back sleepers, and combination sleepers. Unlike traditional pillows that flatten over time, our medical-grade foam maintains its shape night after night, offering consistent support that promotes proper spinal alignment and reduces morning stiffness.

For side sleepers experiencing hip pain, sciatica, or lower back discomfort, our ergonomic knee pillow creates ideal leg separation to align the hips and reduce pressure on the lumbar spine. This orthopedic knee pillow can significantly reduce sciatic nerve pain and improve overall sleep quality.

Complete your sleep environment with our 100% pure mulberry silk sleep mask, designed to block light completely while remaining gentle on delicate facial skin. The breathable silk helps regulate temperature and prevents the friction that can cause sleep lines and skin irritation.

All Rise By Night sleep products come with our 100-night comfort guarantee — if you don't experience improved sleep quality, we'll provide a full refund. We also offer free shipping on all orders and responsive customer support from our sleep wellness team.

Whether you're recovering from an injury, managing chronic pain, or simply seeking better sleep quality, our ergonomic sleep solutions are designed to help you wake up refreshed and pain-free. Join thousands of customers aged 55 and older who have transformed their sleep with Rise By Night.`,
};

// Product Card with hover image swap
const ProductCard = ({ 
  product, 
  routeHandle, 
  reviewData, 
  tagline, 
  price, 
  compareAtPrice, 
  weeklySales 
}: {
  product: any;
  routeHandle: string;
  reviewData: { rating: number; reviews: string; badge?: string };
  tagline: string;
  price: string;
  compareAtPrice: string | null;
  weeklySales: number;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const images = product.node.images.edges;
  const primaryImage = images[0]?.node?.url;
  const secondaryImage = images[1]?.node?.url || primaryImage;
  const currentImage = isHovered && secondaryImage ? secondaryImage : primaryImage;
  const handle = product.node.handle;

  return (
    <Link
      to={`/products/${routeHandle}`}
      className="group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="bg-card rounded-2xl overflow-hidden border border-border hover:border-primary/30 hover:shadow-lg transition-all duration-300">
        {/* Image with hover swap */}
        <div className="relative aspect-square bg-secondary/10 overflow-hidden">
          {currentImage && (
            <OptimizedImage
              src={currentImage}
              alt={product.node.title}
              className="w-full h-full object-contain group-hover:scale-105 transition-all duration-500 p-2"
            />
          )}
          {/* Badges */}
          <div className="absolute top-4 left-4 flex flex-col gap-2">
            {reviewData.badge && (
              <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
                {reviewData.badge}
              </span>
            )}
          </div>
          {/* Weekly sales badge */}
          <div className="absolute bottom-4 left-4">
            <span className="inline-flex items-center gap-1.5 bg-background/90 backdrop-blur-sm text-foreground px-3 py-1.5 rounded-full text-xs font-medium border border-border/50">
              <TrendingUp className="w-3 h-3 text-affirmative" />
              {weeklySales} sold this week
            </span>
          </div>
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
                        <Star className="w-4 h-4 fill-[hsl(var(--star))] text-[hsl(var(--star))]" />
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
          <div className="flex flex-col gap-4">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-primary">{price}</span>
              {compareAtPrice && (
                <span className="text-muted-foreground line-through">
                  {compareAtPrice}
                </span>
              )}
            </div>
            <Button 
              className="w-full bg-primary text-primary-foreground hover:bg-black transition-colors px-6 py-2.5"
            >
              {handle.includes('bundle') ? 'Get the Bundle' : 'Improve your sleep'} <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </Link>
  );
};

// SEO Content Block with Read More - styled with subtle border and icon
const CategorySEOContent = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mt-12 border-t border-border pt-10">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          About Our Sleep Collection
        </h2>
        <div className="text-muted-foreground leading-relaxed whitespace-pre-line">
          {isExpanded ? SEO_CONTENT.full : SEO_CONTENT.preview}
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors border border-primary/30 rounded-full px-4 py-2 hover:bg-primary/5"
        >
          {isExpanded ? (
            <>
              Read less <ChevronUp className="w-4 h-4" />
            </>
          ) : (
            <>
              Read more <ChevronDown className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

const Products = () => {
  useSEO(SEO_CONFIGS.products);
  
  const { data: shopifyProducts, isLoading } = useShopifyProducts(10);
  const isEU = useIsEU();
  
  // Get the correct ergonomic pillow handle based on A/B variant
  const ergonomicPillowHandle = getErgonomicPillowHandle();
  
  const breadcrumbs = [
    { name: "Home", url: "/" },
    { name: "Products", url: "/products" },
  ];

  // Filter and sort products based on our order (using A/B-aware product handles)
  const productOrder = getProductOrder(ergonomicPillowHandle);
  const sortedProducts = productOrder
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
      <section className="py-8 md:py-12 px-4 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto max-w-6xl text-center">
          <h1 className="text-3xl md:text-5xl font-bold mb-3 md:mb-4">
            Our Sleep Products
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Ergonomic sleep solutions designed by chiropractors, loved by thousands
          </p>

          {/* Breadcrumb Schema for SEO */}
          <BreadcrumbSchema items={breadcrumbs} />
          
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
      <section className="py-8 md:py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          {isLoading ? (
            <div className="grid md:grid-cols-2 gap-4 md:gap-8">
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
            <>
              <div className="grid md:grid-cols-2 gap-4 md:gap-8">
                {sortedProducts.map((product) => {
                  if (!product) return null;
                  
                  const handle = product.node.handle;
                  const routeHandle = PRODUCT_ROUTES[handle] || handle;
                  const reviewData = PRODUCT_REVIEWS[handle] || { rating: 4.5, reviews: "1,000+" };
                  const tagline = PRODUCT_TAGLINES[handle] || "";
                  const weeklySales = PRODUCT_WEEKLY_SALES[handle] || 50;
                  const variant = product.node.variants.edges[0]?.node;
                  const price = variant ? formatPrice(variant.price.amount, currencyCode) : formatPrice(0, currencyCode);
                  // Only show compare-at price for ergonomic pillow and sleep bundle
                  const COMPARE_AT_WHITELIST = [
                    "risebynight-ergonomic-sleep-pillow",
                    "risebynight-ergonomic-sleep-pillow-copy",
                    "rise-by-night™-complete-sleep-bundle",
                  ];
                  const variantCompareAt = variant?.compareAtPrice?.amount;
                  const rangeCompareAt = product.node.compareAtPriceRange?.minVariantPrice?.amount;
                  const ratioCompareAt = getCompareAtFromRatio(handle, variant?.price?.amount, 0);
                  const rawCompareAt = (variantCompareAt && parseFloat(variantCompareAt) > 0)
                    ? variantCompareAt
                    : (rangeCompareAt && parseFloat(rangeCompareAt) > 0) ? rangeCompareAt
                    : ratioCompareAt;
                  const compareAtPrice = COMPARE_AT_WHITELIST.includes(handle) && rawCompareAt
                    ? formatPrice(rawCompareAt, currencyCode)
                    : null;

                  return (
                    <ProductCard
                      key={product.node.id}
                      product={product}
                      routeHandle={routeHandle}
                      reviewData={reviewData}
                      tagline={tagline}
                      price={price}
                      compareAtPrice={compareAtPrice}
                      weeklySales={weeklySales}
                    />
                  );
                })}
              </div>
              
              {/* SEO Content Block - Below Products */}
              <CategorySEOContent />
            </>
          )}
        </div>
      </section>

      {/* Quiz CTA */}
      <section className="py-8 md:py-12 px-4 bg-muted/30">
        <div className="container mx-auto max-w-2xl text-center">
          <h2 className="text-2xl md:text-3xl font-semibold mb-3 md:mb-4">
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
