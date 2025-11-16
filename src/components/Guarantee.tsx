import { Shield, Truck, RotateCcw, Award } from "lucide-react";

export const Guarantee = () => {
  return (
    <section className="py-16 px-4 bg-primary/5">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
            <Shield className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-4xl font-bold mb-4">90-Day Money Back Guarantee</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Try OptiSleep risk-free for 90 nights. If you don't experience the best sleep of your life, 
            we'll refund every penny. No questions asked.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
              <Truck className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Free Shipping</h3>
            <p className="text-sm text-muted-foreground">
              Free delivery on all orders over $50
            </p>
          </div>

          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
              <RotateCcw className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Easy Returns</h3>
            <p className="text-sm text-muted-foreground">
              Hassle-free returns within 90 days
            </p>
          </div>

          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
              <Award className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Quality Assured</h3>
            <p className="text-sm text-muted-foreground">
              Certified materials & tested quality
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
