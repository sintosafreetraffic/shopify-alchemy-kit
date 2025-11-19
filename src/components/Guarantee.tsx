import { Moon, Truck, RotateCcw } from "lucide-react";

export const Guarantee = () => {
  return (
    <section className="py-16 px-4 bg-primary/5">
      <div className="container mx-auto max-w-6xl">
        <div className="grid md:grid-cols-3 gap-8 text-center">
          <div className="space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-3">
              <Truck className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold">Free Shipping</h3>
            <p className="text-muted-foreground">Fast delivery on all orders</p>
          </div>
          
          <div className="space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-3">
              <Moon className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold">100 nights risk free</h3>
            <p className="text-muted-foreground">Try it risk-free for 100 nights</p>
          </div>
          
          <div className="space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-3">
              <RotateCcw className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold">Easy Returns</h3>
            <p className="text-muted-foreground">Hassle-free return process</p>
          </div>
        </div>
      </div>
    </section>
  );
};
