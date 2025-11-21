import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Star } from "lucide-react";
import { Link } from "react-router-dom";
import pillowMain from "@/assets/optisleep-pillow-main.png";
import kneePillowMain from "@/assets/knee-pillow-main.jpg";
import eyeMaskGift from "@/assets/eye-mask-gift-transparent.png";

export const ProductGallery = () => {
  const products = [
    {
      id: 1,
      name: "RiseByNight™ Ergonomic Pillow",
      tagline: "The #1 Rated Orthopedic Pillow",
      price: "$89.99",
      originalPrice: "$179.98",
      rating: 4.8,
      reviews: "15,000+",
      image: pillowMain,
      features: [
        "Ergonomic contour design",
        "Cooling gel technology",
        "High-density memory foam",
        "3-5 year lifespan"
      ],
      badge: "Black Friday 1+1 Deal",
      link: "/product/ergonomic-pillow"
    },
    {
      id: 2,
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
        "Adjustable strap included"
      ],
      badge: "Black Friday 1+1 Deal",
      link: "/product/knee-pillow"
    },
    {
      id: 3,
      name: "RiseByNight™ Silk Sleep Mask",
      tagline: "100% Pure Mulberry Silk",
      price: "$29.99",
      originalPrice: "$59.99",
      rating: 4.9,
      reviews: "3,200+",
      image: eyeMaskGift,
      features: [
        "Blocks 100% of light",
        "Gentle on skin & eyelashes",
        "Contoured eye design",
        "Hypoallergenic silk"
      ],
      badge: "Special Offer",
      link: "/product/sleep-mask"
    }
  ];

  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Our Sleep Solutions
          </h2>
          <p className="text-xl text-muted-foreground">
            Discover products designed to transform your sleep quality
          </p>
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
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-auto"
                  />
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < Math.floor(product.rating)
                            ? "fill-primary text-primary"
                            : "text-muted"
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
  );
};
