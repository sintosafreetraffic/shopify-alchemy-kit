import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Shield, RotateCcw, Truck } from "lucide-react";
import pillow from "@/assets/optisleep-pillow.png";
import { useState } from "react";

export const Hero = () => {
  const [selectedBundle, setSelectedBundle] = useState<"1" | "2">("2");
  
  const scrollToProducts = () => {
    document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
  };

  const bundles = {
    "1": {
      quantity: 1,
      price: 58.99,
      originalPrice: 129.98,
      discount: "60% OFF",
      savings: 70.99,
      freeGift: "+ FREE Gift",
      freeGiftValue: "$29.99"
    },
    "2": {
      quantity: 2,
      price: 97.99,
      originalPrice: 259.96,
      discount: "73% OFF",
      savings: 161.97,
      freeGifts: "+2 FREE Gifts",
      freeGiftValue: "$59.98"
    }
  };

  const selectedOption = bundles[selectedBundle];

  return (
    <section className="py-12 md:py-20">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 items-start">
          <div className="relative order-2 md:order-1">
            <Badge variant="secondary" className="absolute top-4 left-4 z-20">
              USERS' CHOICE 2025
            </Badge>
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent rounded-3xl" />
            <img
              src={pillow}
              alt="OptiSleep Ergonomic Memory Foam Pillow - Perfect neck support"
              className="relative z-10 w-full h-auto"
            />
          </div>
          
          <div className="space-y-6 order-1 md:order-2">
            <div className="flex items-center gap-2 text-sm">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span key={star} className="text-yellow-500">★</span>
                ))}
              </div>
              <span className="text-muted-foreground">Rated 4.8/5 by 12,500+ customers</span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              OptiSleep™ Sleep Apnea Pillow
            </h1>
            
            <p className="text-lg font-medium">
              The #1 Rated Orthopedic Pillow for Sleep Apnea in the U.S.
            </p>

            <div className="space-y-3">
              <p className="text-base font-medium">The only scientifically designed pillow that:</p>
              {[
                "Eliminates sleep apnea episodes by 86%*",
                "Stops dangerous breathing interruptions",
                "Ends marriage-threatening snoring instantly"
              ].map((benefit) => (
                <div key={benefit} className="flex items-center gap-3">
                  <div className="bg-primary/10 rounded-full p-1 flex-shrink-0">
                    <Check className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-base">{benefit}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-b py-4 my-6">
              <p className="text-center font-bold text-lg mb-4">LIMITED-TIME ANNIVERSARY OFFER</p>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <button
                  onClick={() => setSelectedBundle("1")}
                  className={`border-2 rounded-lg p-4 text-center transition-all ${
                    selectedBundle === "1"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center justify-center mb-2">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedBundle === "1" ? "border-primary" : "border-border"
                    }`}>
                      {selectedBundle === "1" && (
                        <div className="w-3 h-3 rounded-full bg-primary" />
                      )}
                    </div>
                  </div>
                  <p className="font-bold text-lg">1 Pillow</p>
                  <p className="text-sm text-primary font-bold">{bundles["1"].discount}</p>
                  <p className="text-2xl font-bold mt-2">${bundles["1"].price}</p>
                  <p className="text-sm text-muted-foreground line-through">${bundles["1"].originalPrice}</p>
                  <div className="mt-2 bg-muted rounded px-2 py-1">
                    <p className="text-xs font-medium">{bundles["1"].freeGift}</p>
                    <p className="text-xs text-muted-foreground">{bundles["1"].freeGiftValue}</p>
                  </div>
                </button>

                <button
                  onClick={() => setSelectedBundle("2")}
                  className={`border-2 rounded-lg p-4 text-center transition-all relative ${
                    selectedBundle === "2"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-destructive text-destructive-foreground">
                    SAVE EXTRA $90
                  </Badge>
                  <div className="flex items-center justify-center mb-2">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedBundle === "2" ? "border-primary" : "border-border"
                    }`}>
                      {selectedBundle === "2" && (
                        <div className="w-3 h-3 rounded-full bg-primary" />
                      )}
                    </div>
                  </div>
                  <p className="font-bold text-lg">2 Pillows</p>
                  <p className="text-sm text-primary font-bold">{bundles["2"].discount}</p>
                  <p className="text-2xl font-bold mt-2">${bundles["2"].price}</p>
                  <p className="text-sm text-muted-foreground line-through">${bundles["2"].originalPrice}</p>
                  <div className="mt-2 bg-black text-white rounded px-2 py-1">
                    <p className="text-xs font-medium">{bundles["2"].freeGifts}</p>
                    <p className="text-xs">{bundles["2"].freeGiftValue}</p>
                    <p className="text-xs font-medium">+ FREE Shipping</p>
                  </div>
                </button>
              </div>
            </div>

            <Button 
              size="lg" 
              className="w-full text-lg py-6 font-bold" 
              onClick={scrollToProducts}
            >
              ADD TO CART
            </Button>

            <div className="grid grid-cols-3 gap-4 py-4 border-t">
              <div className="text-center">
                <Shield className="w-6 h-6 mx-auto mb-2 text-primary" />
                <p className="text-xs font-medium">2-Year Warranty</p>
              </div>
              <div className="text-center">
                <RotateCcw className="w-6 h-6 mx-auto mb-2 text-primary" />
                <p className="text-xs font-medium">120 Night Money-Back</p>
              </div>
              <div className="text-center">
                <Truck className="w-6 h-6 mx-auto mb-2 text-primary" />
                <p className="text-xs font-medium">Easy Returns</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Truck className="w-4 h-4" />
              <span>Arrives on <strong>November 22nd</strong>, if you order before <strong>11:50 PM EST</strong></span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
