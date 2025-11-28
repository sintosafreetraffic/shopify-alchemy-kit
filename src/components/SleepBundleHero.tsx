import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ShoppingCart } from "lucide-react";
import consumerChoiceBadge from "@/assets/consumer-choice-badge-transparent.png";
import { useCartStore } from "@/stores/cartStore";
import bundleImage from "@/assets/complete-sleep-bundle.png";

export const SleepBundleHero = () => {
  const [selectedBundle, setSelectedBundle] = useState<"single" | "double">("single");
  const { setCartOpen } = useCartStore();

  const handleAddToCart = () => {
    // Add bundle to cart logic here
    setCartOpen(true);
  };

  const images = [
    { type: "image" as const, src: bundleImage, alt: "Rise By Night Complete Sleep Bundle" }
  ];

  return (
    <section className="py-8 md:py-12 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 max-w-7xl mx-auto">
          {/* Left Column - Product Images */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-xl overflow-hidden bg-gradient-to-br from-secondary/30 to-secondary/10 p-8">
              <img
                src={bundleImage}
                alt="Rise By Night Complete Sleep Bundle"
                className="w-full h-auto object-contain"
                loading="eager"
                decoding="async"
              />
            </div>
          </div>

          {/* Right Column - Product Details */}
          <div className="space-y-6">
            {/* Consumer Choice Badge */}
            <div className="flex justify-start">
              <img 
                src={consumerChoiceBadge} 
                alt="Consumer Choice Badge" 
                className="h-16 md:h-20 w-auto object-contain"
                loading="lazy"
                decoding="async"
              />
            </div>

            {/* Product Title */}
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2 leading-tight">
                Rise By Night™ Complete Sleep Bundle
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground">
                Everything You Need for Perfect Sleep
              </p>
            </div>

            {/* Key Benefits */}
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-sm md:text-base">Complete sleep solution package - Pillow, Knee Pillow & Sleep Mask</p>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-sm md:text-base">Save $40 compared to buying products separately</p>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-sm md:text-base">Perfect for all sleeping positions - side, back, and stomach sleepers</p>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-sm md:text-base">Scientifically proven to improve sleep quality by 93%</p>
              </div>
            </div>

            {/* Bundle Selection */}
            <div className="space-y-3">
              <h3 className="font-semibold text-base md:text-lg">Choose Your Bundle:</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => setSelectedBundle("single")}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    selectedBundle === "single"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-semibold text-sm md:text-base">Single Bundle</span>
                    {selectedBundle === "single" && (
                      <Badge variant="default" className="text-xs">Selected</Badge>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xl md:text-2xl font-bold text-primary">$149.99</p>
                    <p className="text-xs text-muted-foreground line-through">$189.97</p>
                    <p className="text-xs text-muted-foreground">1 of each product</p>
                  </div>
                </button>

                <button
                  onClick={() => setSelectedBundle("double")}
                  className={`p-4 rounded-lg border-2 transition-all text-left relative ${
                    selectedBundle === "double"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Badge className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground">
                    Best Value
                  </Badge>
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-semibold text-sm md:text-base">Double Bundle</span>
                    {selectedBundle === "double" && (
                      <Badge variant="default" className="text-xs">Selected</Badge>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xl md:text-2xl font-bold text-primary">$249.99</p>
                    <p className="text-xs text-muted-foreground line-through">$379.94</p>
                    <p className="text-xs text-muted-foreground">2 of each product</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Add to Cart Button */}
            <Button 
              size="lg" 
              className="w-full text-base md:text-lg h-12 md:h-14"
              onClick={handleAddToCart}
            >
              <ShoppingCart className="w-5 h-5 mr-2" />
              Add to Cart - {selectedBundle === "single" ? "$149.99" : "$249.99"}
            </Button>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-3 pt-4 border-t">
              <div className="text-center">
                <p className="font-semibold text-xs md:text-sm">2-Year</p>
                <p className="text-xs text-muted-foreground">Warranty</p>
              </div>
              <div className="text-center">
                <p className="font-semibold text-xs md:text-sm">100 nights</p>
                <p className="text-xs text-muted-foreground">risk free</p>
              </div>
              <div className="text-center">
                <p className="font-semibold text-xs md:text-sm">Easy</p>
                <p className="text-xs text-muted-foreground">Returns</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
