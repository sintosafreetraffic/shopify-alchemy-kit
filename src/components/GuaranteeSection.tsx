import { Moon, Truck, RotateCcw } from "lucide-react";

export const GuaranteeSection = () => {
  return (
    <section className="py-6 md:py-16 px-4 bg-primary/5">
      <div className="container mx-auto max-w-6xl">
        <div className="grid md:grid-cols-3 gap-6 md:gap-8 text-center">
          <div className="space-y-1.5 md:space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-full bg-primary/10 mb-2 md:mb-3">
              <Truck className="w-6 h-6 md:w-8 md:h-8 text-primary" />
            </div>
            <h3 className="text-lg md:text-xl font-bold">Free Shipping</h3>
            <p className="text-sm md:text-base text-muted-foreground">On pillow orders within the U.S.</p>
          </div>
          
          <div className="space-y-1.5 md:space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-full bg-primary/10 mb-2 md:mb-3">
              <Moon className="w-6 h-6 md:w-8 md:h-8 text-primary" />
            </div>
            <h3 className="text-lg md:text-xl font-bold">100 nights risk free</h3>
            <p className="text-sm md:text-base text-muted-foreground">Try it risk-free for 100 nights</p>
          </div>
          
          <div className="space-y-1.5 md:space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-full bg-primary/10 mb-2 md:mb-3">
              <RotateCcw className="w-6 h-6 md:w-8 md:h-8 text-primary" />
            </div>
            <h3 className="text-lg md:text-xl font-bold">Easy Returns</h3>
            <p className="text-sm md:text-base text-muted-foreground">Hassle-free return process</p>
          </div>
        </div>
      </div>
    </section>
  );
};
