import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Star } from "lucide-react";
import { Link } from "react-router-dom";
import pillowMain from "@/assets/optisleep-pillow-main.png";
import kneePillowMain from "@/assets/knee-pillow-new.png";
import eyeMaskGift from "@/assets/eye-mask-gift-transparent.png";
import completeSleepBundle from "@/assets/complete-sleep-bundle.png";

export const ProductGallery = () => {
  const bundleProduct = {
    id: 1,
    name: "RiseByNight™ Complete Sleep Bundle",
    tagline: "Everything for Perfect Sleep",
    price: "$149.99",
    originalPrice: "$189.97",
    rating: 4.9,
    reviews: "2,100+",
    image: completeSleepBundle,
    features: [
      "Pillow + Knee Pillow + Sleep Mask",
      "Complete sleep solution package",
      "Save $40 vs buying separately",
      "Perfect for side & back sleepers",
    ],
    badge: "Best Value Bundle",
    link: "/product/sleep-bundle",
  };

  const products = [
    {
      id: 2,
      name: "RiseByNight™ Ergonomic Pillow",
      tagline: "The #1 Rated Orthopedic Pillow",
      price: "$89.99",
      originalPrice: "$179.98",
      rating: 4.8,
      reviews: "6,247",
      image: pillowMain,
      features: ["Ergonomic contour design", "Cooling gel technology", "High-density memory foam", "3-5 year lifespan"],
      badge: "Black Friday 1+1 Deal",
      link: "/product/ergonomic-pillow",
    },
    {
      id: 3,
      name: "RiseByNight™ Ergonomic Knee Pillow",
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
      name: "RiseByNight™ Silk Sleep Mask",
      tagline: "100% Pure Mulberry Silk",
      price: "$29.99",
      originalPrice: "$59.99",
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
            <Card className="overflow-hidden hover:shadow-xl transition-shadow">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="relative">
                  {bundleProduct.badge && (
                    <div className="absolute top-4 left-4 z-10">
                      <span className="bg-destructive text-destructive-foreground px-4 py-2 rounded-full text-sm font-bold">
                        {bundleProduct.badge}
                      </span>
                    </div>
                  )}
                  <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-8 h-full flex items-center justify-center">
                    <img src={bundleProduct.image} alt={bundleProduct.name} className="w-full object-contain" />
                  </div>
                </div>

                <div className="p-6 md:p-8 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-5 h-5 ${
                            i < Math.floor(bundleProduct.rating) ? "fill-primary text-primary" : "text-muted"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-base font-semibold">{bundleProduct.rating}</span>
                    <span className="text-sm text-muted-foreground">({bundleProduct.reviews} reviews)</span>
                  </div>

                  <p className="text-sm text-primary font-semibold mb-2">{bundleProduct.tagline}</p>
                  <h3 className="text-2xl md:text-3xl font-bold mb-4">{bundleProduct.name}</h3>

                  <div className="flex items-center gap-3 mb-6">
                    <span className="text-3xl md:text-4xl font-bold text-primary">{bundleProduct.price}</span>
                    <span className="text-xl text-muted-foreground line-through">{bundleProduct.originalPrice}</span>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {bundleProduct.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-primary mt-0.5 text-lg">✓</span>
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link to={bundleProduct.link}>
                    <Button className="w-full" size="lg">
                      Get the Bundle <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
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
                    <img src={product.image} alt={product.name} className="w-full h-64 object-contain" />
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
                    <span className="text-lg text-muted-foreground line-through">{product.originalPrice}</span>
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
