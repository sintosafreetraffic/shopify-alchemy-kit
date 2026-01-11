import { Moon, Truck, RotateCcw } from "lucide-react";

export const GuaranteeSection = () => {
  return (
    <section className="py-4 md:py-8 lg:py-12 px-4 bg-primary/5">
      <div className="container mx-auto max-w-6xl">
        <div className="grid grid-cols-3 gap-3 md:gap-6 text-center">
          <div className="space-y-1">
            <div className="inline-flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 mb-1 md:mb-2">
              <Truck className="w-5 h-5 md:w-6 md:h-6 text-primary" />
            </div>
            <h3 className="text-sm md:text-base lg:text-lg font-bold">Free Shipping</h3>
            <p className="text-[10px] md:text-xs lg:text-sm text-muted-foreground">On pillow orders within the U.S.</p>
          </div>
          
          <div className="space-y-1">
            <div className="inline-flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 mb-1 md:mb-2">
              <Moon className="w-5 h-5 md:w-6 md:h-6 text-primary" />
            </div>
            <h3 className="text-sm md:text-base lg:text-lg font-bold">100 nights risk free</h3>
            <p className="text-[10px] md:text-xs lg:text-sm text-muted-foreground">Try it risk-free for 100 nights</p>
          </div>
          
          <div className="space-y-1">
            <div className="inline-flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 mb-1 md:mb-2">
              <RotateCcw className="w-5 h-5 md:w-6 md:h-6 text-primary" />
            </div>
            <h3 className="text-sm md:text-base lg:text-lg font-bold">Easy Returns</h3>
            <p className="text-[10px] md:text-xs lg:text-sm text-muted-foreground">Hassle-free return process</p>
          </div>
        </div>
      </div>
    </section>
  );
};
