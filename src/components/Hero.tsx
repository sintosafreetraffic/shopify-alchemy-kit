import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import pillow from "@/assets/optisleep-pillow.png";

export const Hero = () => {
  const scrollToProducts = () => {
    document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="py-12 md:py-20">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="relative order-2 md:order-1">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent rounded-3xl" />
            <img
              src={pillow}
              alt="OptiSleep Ergonomic Memory Foam Pillow - Perfect neck support"
              className="relative z-10 w-full h-auto"
            />
          </div>
          
          <div className="space-y-6 order-1 md:order-2">
            <Badge variant="secondary" className="w-fit">
              LIMITED TIME - 33% OFF
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight">
              Transform Your Sleep with OptiSleep
            </h1>
            <p className="text-lg text-muted-foreground">
              Experience the perfect balance of comfort and support with our 
              ergonomic memory foam pillow designed by sleep experts.
            </p>
            
            <div className="mb-4">
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-4xl font-bold text-primary">$49.99</span>
                <span className="text-2xl text-muted-foreground line-through">$74.99</span>
                <Badge variant="destructive">SAVE $25</Badge>
              </div>
              <p className="text-sm text-muted-foreground">Free shipping on orders over $50</p>
            </div>
            
            <div className="space-y-3 mb-6">
              {[
                "Ergonomic neck support - Perfect alignment",
                "Premium memory foam - Pressure relief",
                "Reduces snoring naturally",
                "Hypoallergenic & breathable",
                "Temperature regulating design",
                "Improves sleep quality by 40%"
              ].map((benefit) => (
                <div key={benefit} className="flex items-center gap-3">
                  <div className="bg-primary/10 rounded-full p-1 flex-shrink-0">
                    <Check className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-base">{benefit}</span>
                </div>
              ))}
            </div>

            <Button size="lg" className="text-lg px-8 w-full sm:w-auto" onClick={scrollToProducts}>
              Buy Now - Limited Stock
            </Button>
            <p className="text-sm text-muted-foreground mt-2">
              ✓ 90-Day Money Back Guarantee
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
