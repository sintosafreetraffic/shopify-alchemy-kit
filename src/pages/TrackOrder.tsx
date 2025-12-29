import { useState } from "react";
import { 
  Package, 
  Search, 
  Mail, 
  AlertCircle, 
  Truck, 
  CheckCircle, 
  Clock, 
  MapPin,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface TrackingInfo {
  id?: string;
  order_number: string;
  email: string;
  tracking_number?: string;
  carrier_name?: string;
  status: string;
  sub_status?: string;
  last_event?: string;
  last_event_time?: string;
  origin_country?: string;
  destination_country?: string;
  estimated_delivery?: string;
  delivered_at?: string;
}

const STATUS_CONFIG: Record<string, { 
  icon: React.ElementType; 
  label: string; 
  color: string;
  bgColor: string;
}> = {
  pending: { icon: Clock, label: "Pending", color: "text-amber-600", bgColor: "bg-amber-50" },
  processing: { icon: Package, label: "Processing", color: "text-blue-600", bgColor: "bg-blue-50" },
  info_received: { icon: Package, label: "Info Received", color: "text-blue-600", bgColor: "bg-blue-50" },
  in_transit: { icon: Truck, label: "In Transit", color: "text-primary", bgColor: "bg-primary/10" },
  out_for_delivery: { icon: Truck, label: "Out for Delivery", color: "text-emerald-600", bgColor: "bg-emerald-50" },
  pickup: { icon: MapPin, label: "Ready for Pickup", color: "text-purple-600", bgColor: "bg-purple-50" },
  delivered: { icon: CheckCircle, label: "Delivered", color: "text-green-600", bgColor: "bg-green-50" },
  alert: { icon: AlertCircle, label: "Attention Required", color: "text-red-600", bgColor: "bg-red-50" },
  undelivered: { icon: AlertCircle, label: "Delivery Failed", color: "text-orange-600", bgColor: "bg-orange-50" },
  expired: { icon: AlertCircle, label: "Tracking Expired", color: "text-muted-foreground", bgColor: "bg-muted" },
};

export default function TrackOrder() {
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [trackingResults, setTrackingResults] = useState<TrackingInfo[] | null>(null);

  const handleTrackOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!orderNumber || !email) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSearching(true);
    setShowError(false);
    setErrorMessage("");
    setTrackingResults(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('track-lookup', {
        body: {
          order_number: orderNumber.trim(),
          email: email.toLowerCase().trim(),
        },
      });

      if (error) {
        console.error('[TrackOrder] Function error:', error);
        throw new Error('Unable to look up your order. Please try again.');
      }

      if (!data.success) {
        setShowError(true);
        setErrorMessage(data.message || 'An error occurred while looking up your order.');
        return;
      }

      if (!data.found) {
        setShowError(true);
        setErrorMessage(data.message || 'Order not found. Please verify your order number and email address.');
        return;
      }

      setTrackingResults(data.tracking);
      
    } catch (err) {
      console.error('[TrackOrder] Error:', err);
      setShowError(true);
      setErrorMessage(
        err instanceof Error 
          ? err.message 
          : 'Something went wrong. Please try again or contact support.'
      );
    } finally {
      setIsSearching(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status] || STATUS_CONFIG.pending;
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
                {errorMessage || (
                  <>
                    Something went wrong. Please contact our customer support at{" "}
                    <a 
                      href="mailto:support@risebynight.com" 
                      className="font-semibold underline hover:no-underline"
                    >
                      support@risebynight.com
                    </a>
                    , and we will help you as soon as possible.
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Tracking Results */}
        {trackingResults && trackingResults.length > 0 && (
          <div className="mt-8 space-y-6">
            <h2 className="text-2xl font-bold text-center">Tracking Information</h2>
            
            {trackingResults.map((tracking, index) => {
              const statusConfig = getStatusConfig(tracking.status);
              const StatusIcon = statusConfig.icon;
              
              return (
                <div 
                  key={tracking.id || index}
                  className="bg-card border rounded-xl p-6 md:p-8 shadow-lg"
                >
                  {/* Status Header */}
                  <div className={`flex items-center gap-4 p-4 rounded-lg ${statusConfig.bgColor} mb-6`}>
                    <StatusIcon className={`w-8 h-8 ${statusConfig.color}`} />
                    <div>
                      <p className={`text-lg font-bold ${statusConfig.color}`}>
                        {statusConfig.label}
                      </p>
                      {tracking.last_event && (
                        <p className="text-sm text-muted-foreground">
                          {tracking.last_event}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Tracking Details */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Order Number</p>
                      <p className="font-semibold">{tracking.order_number}</p>
                    </div>
                    
                    {tracking.tracking_number && (
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Tracking Number</p>
                        <p className="font-mono font-semibold">{tracking.tracking_number}</p>
                      </div>
                    )}
                    
                    {tracking.carrier_name && (
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Carrier</p>
                        <p className="font-semibold">{tracking.carrier_name}</p>
                      </div>
                    )}

                    {tracking.last_event_time && (
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Last Update</p>
                        <p className="font-semibold">{formatDate(tracking.last_event_time)}</p>
                      </div>
                    )}

                    {tracking.estimated_delivery && tracking.status !== 'delivered' && (
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Estimated Delivery</p>
                        <p className="font-semibold text-primary">{formatDate(tracking.estimated_delivery)}</p>
                      </div>
                    )}

                    {tracking.delivered_at && (
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Delivered On</p>
                        <p className="font-semibold text-green-600">{formatDate(tracking.delivered_at)}</p>
                      </div>
                    )}

                    {(tracking.origin_country || tracking.destination_country) && (
                      <div className="space-y-1 md:col-span-2">
                        <p className="text-sm text-muted-foreground">Route</p>
                        <p className="font-semibold">
                          {tracking.origin_country || 'Origin'} → {tracking.destination_country || 'Destination'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Track on carrier site */}
                  {tracking.tracking_number && (
                    <div className="mt-6 pt-6 border-t">
                      <a
                        href={`https://t.17track.net/en#nums=${tracking.tracking_number}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        View detailed tracking on 17track.net
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Help Section */}
        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>
            Having trouble tracking your order?{" "}
            <a 
              href="mailto:support@risebynight.com" 
              className="text-primary hover:underline"
            >
              Contact our support team
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
