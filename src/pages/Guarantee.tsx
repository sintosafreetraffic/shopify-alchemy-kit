import { Shield, Moon, RotateCcw, Award, Check, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";

const Guarantee = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Shield className="w-20 h-20 text-primary mx-auto mb-6" />
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Our Guarantee to You
            </h1>
            <p className="text-xl text-muted-foreground">
              We stand behind our products with industry-leading guarantees because we're confident you'll love them
            </p>
          </div>
        </div>
      </section>

      {/* Main Guarantees */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
            <Card className="p-8 text-center hover:shadow-lg transition-shadow">
              <Moon className="w-16 h-16 text-primary mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-4">100-Night Trial</h3>
              <p className="text-muted-foreground mb-4">
                Try any RiseByNight™ product for 100 nights, risk-free. If you're not completely satisfied, return it for a full refund.
              </p>
              <p className="text-sm text-primary font-semibold">No Questions Asked</p>
            </Card>

            <Card className="p-8 text-center hover:shadow-lg transition-shadow">
              <Award className="w-16 h-16 text-primary mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-4">2-Year Warranty</h3>
              <p className="text-muted-foreground mb-4">
                All products are covered by our comprehensive 2-year warranty against manufacturing defects and material issues.
              </p>
              <p className="text-sm text-primary font-semibold">Full Replacement Coverage</p>
            </Card>

            <Card className="p-8 text-center hover:shadow-lg transition-shadow">
              <RotateCcw className="w-16 h-16 text-primary mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-4">Easy Returns</h3>
              <p className="text-muted-foreground mb-4">
                Simple return process with full refund. Just contact our support team and we'll guide you through the process.
              </p>
              <p className="text-sm text-primary font-semibold">Hassle-Free Process</p>
            </Card>
          </div>

          {/* Detailed Guarantee Information */}
          <div className="max-w-4xl mx-auto space-y-12">
            <div>
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                <Moon className="w-8 h-8 text-primary" />
                100-Night Sleep Trial Details
              </h2>
              <div className="space-y-4 bg-card p-6 rounded-lg">
                <p className="text-muted-foreground">
                  We want you to be absolutely certain that RiseByNight™ is right for you. That's why we offer a full 100 nights to try our products in the comfort of your own home.
                </p>
                <ul className="space-y-3">
                  {[
                    "Trial period begins on the date you receive your product",
                    "Use the product every night to give your body time to adjust",
                    "If not satisfied, contact us within 100 nights for a return",
                    "Full refund issued upon return of the product",
                    "Customer responsible for return shipping costs",
                    "Product must be in reasonably clean condition"
                  ].map((item, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div>
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                <Award className="w-8 h-8 text-primary" />
                2-Year Warranty Coverage
              </h2>
              <div className="space-y-4 bg-card p-6 rounded-lg">
                <p className="text-muted-foreground">
                  Our products are built to last, and we back them with a comprehensive 2-year warranty against defects.
                </p>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-bold mb-3 text-lg">What's Covered:</h3>
                    <ul className="space-y-2">
                      {[
                        "Manufacturing defects",
                        "Material degradation under normal use",
                        "Loss of shape or support",
                        "Zipper or strap failures"
                      ].map((item, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-bold mb-3 text-lg">What's Not Covered:</h3>
                    <ul className="space-y-2">
                      {[
                        "Normal wear and tear",
                        "Damage from misuse or abuse",
                        "Improper cleaning or care",
                        "Unauthorized modifications"
                      ].map((item, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="w-4 h-4 flex-shrink-0 mt-0.5">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground pt-4 border-t">
                  To file a warranty claim, contact support@risebynight.com with your order number and photos showing the issue. Claims are typically processed within 7 business days.
                </p>
              </div>
            </div>

            <div>
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                <Clock className="w-8 h-8 text-primary" />
                Return Process Timeline
              </h2>
              <div className="space-y-6 bg-card p-6 rounded-lg">
                <div className="flex items-start gap-4">
                  <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">
                    1
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold mb-1">Contact Us</h3>
                    <p className="text-sm text-muted-foreground">
                      Email support@risebynight.com with your order number and reason for return. We respond within 24 hours.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">
                    2
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold mb-1">Receive Return Authorization</h3>
                    <p className="text-sm text-muted-foreground">
                      We'll provide return instructions and authorization. Pack your item securely in its original packaging if possible.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">
                    3
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold mb-1">Ship Your Return</h3>
                    <p className="text-sm text-muted-foreground">
                      Send the item back using a trackable shipping method. Customer bears return shipping costs.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">
                    4
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold mb-1">Receive Your Refund</h3>
                    <p className="text-sm text-muted-foreground">
                      Once we receive your return, we'll process your full refund within 7 business days to your original payment method.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why We Offer This */}
      <section className="py-16 md:py-24 bg-primary/5">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Why We Stand Behind Our Products
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              We're confident in the quality and effectiveness of our products because we've seen the results. With thousands of satisfied customers and a 96% satisfaction rate, we know RiseByNight™ delivers on its promises. Our generous guarantees ensure you can shop with complete confidence.
            </p>
            <a 
              href="/"
              className="inline-block bg-foreground text-background px-8 py-4 rounded-lg font-semibold hover:opacity-90 transition-opacity"
            >
              Shop Risk-Free Now
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Guarantee;
