import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Star, Award, Truck } from "lucide-react";
import OptimizedImage from "@/components/OptimizedImage";

interface ProductItem {
  handle: string;
  name: string;
  tagline: string;
  price: string;
  originalPrice?: string;
  rating: number;
  reviews: string;
  image: string;
  badge?: string;
}

const products: ProductItem[] = [
  {
    handle: "ergonomic-pillow",
    name: "Rise By Night™ Ergonomic Sleep Pillow",
    tagline: "Clinically designed for cervical support",
    price: "$79.99",
    rating: 4.8,
    reviews: "12,400+",
    image: "/images/pillow-main-new.png",
    badge: "Best Seller",
  },
  {
    handle: "knee-pillow",
    name: "Rise By Night™ Ergonomic Knee Pillow",
    tagline: "Perfect support for side sleepers",
    price: "$39.99",
    rating: 4.7,
    reviews: "5,100+",
    image: "/images/knee-pillow-main-new.png",
  },
  {
    handle: "sleep-mask",
    name: "Rise By Night™ Silk Deep Sleep Mask",
    tagline: "100% Pure Mulberry Silk",
    price: "$29.99",
    rating: 4.9,
    reviews: "3,200+",
    image: "/images/eye-mask-gift.png",
  },
  {
    handle: "sleep-bundle",
    name: "Rise By Night™ Complete Sleep Bundle",
    tagline: "Pillow + Knee Pillow + Sleep Mask",
    price: "$119.99",
    originalPrice: "$149.97",
    rating: 4.9,
    reviews: "2,800+",
    image: "/images/sleep-bundle-hero.png",
    badge: "Save 20%",
  },
];

const Products = () => {
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
              <span>30-Night Trial</span>
            </div>
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-12 md:py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-8">
            {products.map((product) => (
              <Link
                key={product.handle}
                to={`/products/${product.handle}`}
                className="group"
              >
                <div className="bg-card rounded-2xl overflow-hidden border border-border hover:border-primary/30 hover:shadow-lg transition-all duration-300">
                  {/* Image */}
                  <div className="relative aspect-[4/3] bg-secondary/10 overflow-hidden">
                    <OptimizedImage
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {product.badge && (
                      <span className="absolute top-4 left-4 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
                        {product.badge}
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    {/* Rating */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < Math.floor(product.rating)
                                ? "fill-primary text-primary"
                                : "fill-muted text-muted"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {product.rating} ({product.reviews} reviews)
                      </span>
                    </div>

                    {/* Title & Description */}
                    <h2 className="text-xl font-semibold mb-1 group-hover:text-primary transition-colors">
                      {product.name}
                    </h2>
                    <p className="text-muted-foreground mb-4">
                      {product.tagline}
                    </p>

                    {/* Price & CTA */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold">{product.price}</span>
                        {product.originalPrice && (
                          <span className="text-muted-foreground line-through">
                            {product.originalPrice}
                          </span>
                        )}
                      </div>
                      <Button variant="ghost" size="sm" className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        View Details <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Quiz CTA */}
      <section className="py-12 md:py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-2xl text-center">
          <h2 className="text-2xl md:text-3xl font-semibold mb-4">
            Not sure which product is right for you?
          </h2>
          <p className="text-muted-foreground mb-6">
            Take our 2-minute sleep assessment to get personalized recommendations based on your sleep position and pain points.
          </p>
          <Link to="/sleep-quiz">
            <Button size="lg" className="rounded-full px-8">
              Take the Sleep Assessment <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Products;
