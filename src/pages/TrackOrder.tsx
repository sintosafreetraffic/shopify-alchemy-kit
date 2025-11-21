import { useState } from "react";
import { Package, Search, Mail, Truck, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function TrackOrder() {
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const handleTrackOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!orderNumber || !email) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSearching(true);
    
    // Simulate search - In production, this would make an API call to Shopify
    setTimeout(() => {
      setIsSearching(false);
      toast.info("Redirecting to Shopify order tracking...", {
        description: "You'll be redirected to view your order details."
      });
      
      // Redirect to Shopify order status page
      // Format: https://store.myshopify.com/tools/order-status?order_number=ORDER&email=EMAIL
      window.open(
        `https://checkout.shopify.com/tools/order-lookup?email=${encodeURIComponent(email)}`,
        '_blank'
      );
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-full bg-primary/10 mb-6">
            <Package className="w-8 h-8 md:w-10 md:h-10 text-primary" />
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Track Your Order
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Enter your order details below to check the status of your shipment
          </p>
        </div>
      </section>

      {/* Tracking Form */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="bg-card border rounded-xl p-8 md:p-12 shadow-lg">
            <form onSubmit={handleTrackOrder} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="orderNumber" className="text-base font-semibold">
                  Order Number
                </Label>
                <div className="relative">
                  <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="orderNumber"
                    type="text"
                    placeholder="e.g., #1001 or RBN12345"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    className="pl-11 h-12 text-base"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  You can find your order number in your confirmation email
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-base font-semibold">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-11 h-12 text-base"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Use the email address from your order
                </p>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 text-base"
                disabled={isSearching}
              >
                {isSearching ? (
                  <>
                    <Search className="w-5 h-5 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5 mr-2" />
                    Track My Order
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </section>

      {/* Shipping Timeline */}
      <section className="py-16 md:py-24 bg-primary/5">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              What to Expect
            </h2>
            <p className="text-lg text-muted-foreground">
              Here's the typical journey of your RiseByNight order
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary text-primary-foreground">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-lg">Order Confirmed</h3>
              <p className="text-sm text-muted-foreground">
                You'll receive a confirmation email immediately
              </p>
            </div>

            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary text-primary-foreground">
                <Package className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-lg">Processing</h3>
              <p className="text-sm text-muted-foreground">
                We prepare your order within 1-2 business days
              </p>
            </div>

            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary text-primary-foreground">
                <Truck className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-lg">Shipped</h3>
              <p className="text-sm text-muted-foreground">
                Your order is on the way with tracking
              </p>
            </div>

            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary text-primary-foreground">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-lg">Delivered</h3>
              <p className="text-sm text-muted-foreground">
                Typically arrives within 5-7 days worldwide
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Shipping Questions?
            </h2>
          </div>

          <div className="space-y-6">
            <div className="bg-card border rounded-xl p-6">
              <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                How long does shipping take?
              </h3>
              <p className="text-muted-foreground">
                Orders typically arrive within 5-7 days worldwide. US orders often arrive in 5 days due to our strategic partnerships with logistics providers.
              </p>
            </div>

            <div className="bg-card border rounded-xl p-6">
              <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                <Truck className="w-5 h-5 text-primary" />
                Is tracking included?
              </h3>
              <p className="text-muted-foreground">
                Yes! All orders include free tracking. You'll receive a tracking number via email once your order ships.
              </p>
            </div>

            <div className="bg-card border rounded-xl p-6">
              <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                What if my tracking isn't updating?
              </h3>
              <p className="text-muted-foreground">
                Tracking information can take 24-48 hours to update after shipment. If you don't see updates after 48 hours, please contact us at support@risebynight.com.
              </p>
            </div>

            <div className="bg-card border rounded-xl p-6">
              <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                Need help?
              </h3>
              <p className="text-muted-foreground">
                Our customer support team is here to help! Email us at <a href="mailto:support@risebynight.com" className="text-primary hover:underline">support@risebynight.com</a> and we'll respond within 24 hours.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-primary to-primary/80 text-primary-foreground">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Haven't Ordered Yet?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join 30,000+ customers who've transformed their sleep with RiseByNight
          </p>
          
          <Button size="lg" variant="secondary" className="text-lg px-8" asChild>
            <a href="/product/ergonomic-pillow">
              Shop Our Bestseller
            </a>
          </Button>
          
          <div className="mt-8 pt-8 border-t border-primary-foreground/20">
            <p className="text-sm opacity-75">
              Free Worldwide Shipping • 100-Night Trial • 2-Year Warranty
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
