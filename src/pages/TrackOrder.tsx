import { useState, useEffect } from "react";
import { Package, Search, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { fetchPageByHandle, ShopifyPage } from "@/lib/shopify";

export default function TrackOrder() {
  const [pageContent, setPageContent] = useState<ShopifyPage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const loadPage = async () => {
      const page = await fetchPageByHandle("track-order");
      setPageContent(page);
      setIsLoading(false);
    };
    loadPage();
  }, []);

  const handleTrackOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!orderNumber || !email) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSearching(true);
    
    setTimeout(() => {
      setIsSearching(false);
      toast.info("Redirecting to Shopify order tracking...", {
        description: "You'll be redirected to view your order details."
      });
      
      window.open(
        `https://checkout.shopify.com/tools/order-lookup?email=${encodeURIComponent(email)}`,
        '_blank'
      );
    }, 1000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Package className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (pageContent) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-16 max-w-4xl">
          <h1 className="text-4xl md:text-6xl font-bold mb-8 text-center">
            {pageContent.title}
          </h1>
          <div 
            className="prose prose-lg max-w-none mb-12 [&_h1]:text-4xl [&_h1]:font-bold [&_h1]:mb-6 [&_h2]:text-3xl [&_h2]:font-bold [&_h2]:mb-4 [&_h3]:text-2xl [&_h3]:font-bold [&_h3]:mb-3 [&_p]:text-lg [&_p]:text-muted-foreground [&_p]:mb-4 [&_ul]:list-disc [&_ul]:ml-6 [&_ol]:list-decimal [&_ol]:ml-6"
            dangerouslySetInnerHTML={{ __html: pageContent.body }}
          />
          
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="container mx-auto px-4 max-w-2xl text-center">
        <Package className="w-16 h-16 text-muted-foreground mx-auto mb-6" />
        <h1 className="text-3xl font-bold mb-4">Page Not Found</h1>
        <p className="text-lg text-muted-foreground mb-6">
          This page hasn't been created in Shopify yet. Please create a page with handle "track-order" in your Shopify admin.
        </p>
        <Link to="/">
          <Button>Return Home</Button>
        </Link>
      </div>
    </div>
  );
}
