import { useState } from "react";
import { Package, Search, Mail, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

export default function TrackOrder() {
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [showError, setShowError] = useState(false);

  const handleTrackOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!orderNumber || !email) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSearching(true);
    setShowError(false);
    
    // Simulate a brief search delay
    setTimeout(() => {
      setIsSearching(false);
      setShowError(true);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="text-center mb-12">
          <Package className="w-16 h-16 text-primary mx-auto mb-6" />
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            Track Your Order
          </h1>
          <p className="text-lg text-muted-foreground">
            Enter your order details below to track your shipment
          </p>
        </div>
        
        {/* Tracking Form */}
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
                  required
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
                  required
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

          {/* Error Message */}
          {showError && (
            <Alert variant="destructive" className="mt-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                There went something wrong. Please contact our customer support at{" "}
                <a 
                  href="mailto:support@risebynight.com" 
                  className="font-semibold underline hover:no-underline"
                >
                  support@risebynight.com
                </a>
                , and we will help you as soon as possible.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
}
