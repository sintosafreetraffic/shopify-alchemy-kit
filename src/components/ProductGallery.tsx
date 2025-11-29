import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { fetchProducts, type ShopifyProduct } from "@/lib/shopify";
import pillowMain from "@/assets/optisleep-pillow-main.png";
import kneePillowMain from "@/assets/knee-pillow-new.png";
import eyeMaskGift from "@/assets/eye-mask-gift-transparent.png";
import completeSleepBundle from "@/assets/complete-sleep-bundle.png";

export const ProductGallery = () => {
  const [bundleProduct, setBundleProduct] = useState<ShopifyProduct | null>(null);

  useEffect(() => {
    const loadBundleProduct = async () => {
      try {
        const products = await fetchProducts();
        const bundle = products.find(
          (p: ShopifyProduct) => p.node.handle === "rise-by-night™-complete-sleep-bundle"
        );
        if (bundle) {
          setBundleProduct(bundle);
        }
      } catch (error) {
        console.error("Failed to load bundle product:", error);
      }
    };
    loadBundleProduct();
  }, []);

  const products = [
    {
      id: 2,
      name: "Rise By Night™ Ergonomic Pillow",
      tagline: "The #1 Rated Orthopedic Pillow",
      price: "$129.99",
      originalPrice: "$259.98",
      rating: 4.8,
      reviews: "6,247",
      image: pillowMain,
      features: ["Ergonomic contour design", "Cooling gel technology", "High-density memory foam", "3-5 year lifespan"],
      badge: "Black Friday 1+1 Deal",
      link: "/product/ergonomic-pillow",
    },
    {
      id: 3,
      name: "Rise By Night™ Ergonomic Knee Pillow",
      tagline: "Perfect Support for Side Sleepers",
      price: "$69.99",
      originalPrice: "$109.99",
      rating: 4.7,
      reviews: "8,500+",
      image: kneePillowMain,
      features: [
        "Aligns hips and spine",
        "Reduces lower back pain",
        "Memory foam comfort",
        "Adjustable strap included",
      ],
      badge: "Black Friday 1+1 Deal",
      link: "/product/knee-pillow",
    },
    {
      id: 4,
      name: "Rise By Night™ Silk Deep Sleep Mask",
      tagline: "100% Pure Mulberry Silk",
      price: "$29.99",
      originalPrice: "",
      rating: 4.9,
      reviews: "3,200+",
      image: eyeMaskGift,
      features: ["Blocks 100% of light", "Gentle on skin & eyelashes", "Contoured eye design", "Hypoallergenic silk"],
      badge: "Special Offer",
      link: "/product/sleep-mask",
    },
  ];

  return (
    <>
      {/* Featured Bundle Section */}
      <section className="py-12 md:py-16 bg-gradient-to-b from-primary/5 to-background">
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
                      <img 
                        src={completeSleepBundle} 
                        alt={bundleProduct.node.title} 
                        className="w-full object-contain" 
                        loading="lazy" 
                        decoding="async" 
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
                        {bundleProduct.node.variants.edges[0]?.node.price.currencyCode}{" "}
                        {parseFloat(bundleProduct.node.variants.edges[0]?.node.price.amount || "0").toFixed(2)}
                      </span>
                      <span className="text-xl text-muted-foreground line-through">$199.99</span>
                    </div>

                    <ul className="space-y-3 mb-8">
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5 text-lg">✓</span>
                        <span className="text-muted-foreground">Pillow + Knee Pillow + Sleep Mask</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5 text-lg">✓</span>
                        <span className="text-muted-foreground">Complete sleep solution package</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5 text-lg">✓</span>
                        <span className="text-muted-foreground">Save $40 vs buying separately</span>
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
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Individual Products</h2>
            <p className="text-xl text-muted-foreground">Choose specific solutions tailored to your needs</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {products.map((product) => (
              <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative">
                  {product.badge && (
                    <div className="absolute top-4 left-4 z-10">
                      <span className="bg-destructive text-destructive-foreground px-3 py-1 rounded-full text-sm font-semibold">
                        {product.badge}
                      </span>
                    </div>
                  )}
                  <div className="bg-gradient-to-b from-primary/5 to-background p-8">
                    <img src={product.image} alt={product.name} className="w-full h-64 object-contain" loading="lazy" decoding="async" />
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
