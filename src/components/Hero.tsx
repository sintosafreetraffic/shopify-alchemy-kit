import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Truck, Clock } from "lucide-react";
import pillow from "@/assets/optisleep-pillow.png";

export const Hero = () => {
  const scrollToProducts = () => {
    document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="py-12 md:py-20">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div className="space-y-6">
            <Badge variant="secondary" className="w-fit">
              Limited Time Offer
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight">
              Sleep Better, Wake Refreshed
            </h1>
            <p className="text-lg text-muted-foreground">
              Experience the ultimate in sleep comfort with OptiSleep. Ergonomically designed 
              to support your neck and shoulders for a perfect night's rest.
            </p>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span>2-Year Warranty</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4" />
                <span>Free Shipping</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>100-Night Trial</span>
              </div>
            </div>
            <div className="flex gap-4">
              <Button size="lg" onClick={scrollToProducts}>
                Shop Now
              </Button>
              <Button size="lg" variant="outline" onClick={scrollToProducts}>
                Learn More
              </Button>
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent rounded-3xl" />
            <img
              src={pillow}
              alt="OptiSleep Pillow"
              className="relative z-10 w-full h-auto"
            />
          </div>
        </div>
      </div>
    </section>
  );
};
