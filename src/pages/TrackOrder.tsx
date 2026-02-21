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
  PackageCheck,
  Info
} from "lucide-react";
import { useSEO, SEO_CONFIGS } from "@/hooks/useSEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface TrackingEvent {
  id: string;
  tracking_number: string;
  status: string;
  description: string;
  location?: string;
  event_time?: string;
}

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
  events?: TrackingEvent[];
}

const STATUS_CONFIG: Record<string, { 
  icon: React.ElementType; 
  label: string; 
  color: string;
  bgColor: string;
  step: number;
}> = {
  pending: { icon: Clock, label: "Order Received", color: "text-muted-foreground", bgColor: "bg-muted/50", step: 0 },
  processing: { icon: Package, label: "Preparing", color: "text-muted-foreground", bgColor: "bg-muted/50", step: 0 },
  info_received: { icon: PackageCheck, label: "Ready to Ship", color: "text-primary", bgColor: "bg-primary/10", step: 1 },
  in_transit: { icon: Truck, label: "On the Way", color: "text-primary", bgColor: "bg-primary/10", step: 2 },
  out_for_delivery: { icon: Truck, label: "Out for Delivery", color: "text-emerald-600", bgColor: "bg-emerald-50", step: 3 },
  pickup: { icon: MapPin, label: "Ready for Pickup", color: "text-emerald-600", bgColor: "bg-emerald-50", step: 3 },
  delivered: { icon: CheckCircle, label: "Delivered", color: "text-green-600", bgColor: "bg-green-50", step: 4 },
  alert: { icon: AlertCircle, label: "Attention Required", color: "text-amber-600", bgColor: "bg-amber-50", step: -1 },
  undelivered: { icon: AlertCircle, label: "Delivery Attempted", color: "text-amber-600", bgColor: "bg-amber-50", step: -1 },
  expired: { icon: Info, label: "Tracking Unavailable", color: "text-muted-foreground", bgColor: "bg-muted/50", step: -1 },
};

const TIMELINE_STEPS = [
  { key: 'received', label: 'Order Received', icon: Package },
  { key: 'shipped', label: 'Shipped', icon: PackageCheck },
  { key: 'transit', label: 'In Transit', icon: Truck },
  { key: 'delivery', label: 'Out for Delivery', icon: MapPin },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle },
];

export default function TrackOrder() {
  useSEO(SEO_CONFIGS.trackOrder);
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
        if (data.error === 'Rate limit exceeded') {
          setShowError(true);
          setErrorMessage('You\'ve checked this order too many times. Please wait a bit before trying again.');
          return;
        }
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

  const getActiveStep = (status: string) => {
    const config = getStatusConfig(status);
    return config.step >= 0 ? config.step : 2; // Default to in_transit for alerts
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16 max-w-3xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
            <Package className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold mb-3 tracking-tight">
            Track Your Order
          </h1>
          <p className="text-muted-foreground">
            We'll show the latest shipping updates for your order.
          </p>
        </div>
        
        {/* Tracking Form */}
        <div className="bg-card border border-border/50 rounded-2xl p-6 md:p-8 shadow-sm">
          <form onSubmit={handleTrackOrder} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="orderNumber" className="text-sm font-medium">
                Order Number
              </Label>
              <div className="relative">
                <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="orderNumber"
                  type="text"
                  placeholder="e.g., #1001"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  className="pl-10 h-11 bg-background"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Found in your order confirmation email
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11 bg-background"
                  required
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-11"
              disabled={isSearching}
            >
              {isSearching ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Looking up...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Track Order
                </>
              )}
            </Button>
          </form>

          {/* Error Message */}
          {showError && (
            <Alert variant="destructive" className="mt-5">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                {errorMessage || (
                  <>
                    Something went wrong. Please contact{" "}
                    <a 
                      href="mailto:support@risebynight.com" 
                      className="font-medium underline hover:no-underline"
                    >
                      support@risebynight.com
                    </a>
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Tracking Results */}
        {trackingResults && trackingResults.length > 0 && (
          <div className="mt-8 space-y-6">
            {trackingResults.map((tracking, index) => {
              const statusConfig = getStatusConfig(tracking.status);
              const StatusIcon = statusConfig.icon;
              const activeStep = getActiveStep(tracking.status);
              
              return (
                <div 
                  key={tracking.id || index}
                  className="bg-card border border-border/50 rounded-2xl p-6 md:p-8 shadow-sm"
                >
                  {/* Current Status */}
                  <div className={`flex items-center gap-3 p-4 rounded-xl ${statusConfig.bgColor} mb-8`}>
                    <StatusIcon className={`w-6 h-6 ${statusConfig.color}`} />
                    <div className="flex-1">
                      <p className={`font-semibold ${statusConfig.color}`}>
                        {statusConfig.label}
                      </p>
                      {tracking.last_event && (
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {tracking.last_event}
                        </p>
                      )}
                    </div>
                    {tracking.last_event_time && (
                      <p className="text-xs text-muted-foreground">
                        {formatDate(tracking.last_event_time)}
                      </p>
                    )}
                  </div>

                  {/* Progress Timeline */}
                  {statusConfig.step >= 0 && (
                    <div className="mb-8">
                      <div className="flex items-center justify-between relative">
                        {/* Progress line */}
                        <div className="absolute top-4 left-0 right-0 h-0.5 bg-border" />
                        <div 
                          className="absolute top-4 left-0 h-0.5 bg-primary transition-all duration-500"
                          style={{ width: `${(activeStep / (TIMELINE_STEPS.length - 1)) * 100}%` }}
                        />
                        
                        {TIMELINE_STEPS.map((step, stepIndex) => {
                          const isCompleted = stepIndex <= activeStep;
                          const isCurrent = stepIndex === activeStep;
                          const StepIcon = step.icon;
                          
                          return (
                            <div 
                              key={step.key}
                              className="flex flex-col items-center z-10"
                            >
                              <div 
                                className={`
                                  w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300
                                  ${isCompleted 
                                    ? 'bg-primary text-primary-foreground' 
                                    : 'bg-muted text-muted-foreground border-2 border-border'
                                  }
                                  ${isCurrent ? 'ring-4 ring-primary/20' : ''}
                                `}
                              >
                                <StepIcon className="w-4 h-4" />
                              </div>
                              <span 
                                className={`
                                  text-xs mt-2 text-center max-w-[60px] leading-tight
                                  ${isCompleted ? 'text-foreground font-medium' : 'text-muted-foreground'}
                                `}
                              >
                                {step.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Order Details */}
                  <div className="grid gap-4 sm:grid-cols-2 text-sm">
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Order</p>
                      <p className="font-medium">{tracking.order_number}</p>
                    </div>
                    
                    {tracking.carrier_name && tracking.carrier_name !== 'Unknown' && (
                      <div className="space-y-1">
                        <p className="text-muted-foreground">Carrier</p>
                        <p className="font-medium">{tracking.carrier_name}</p>
                      </div>
                    )}

                    {tracking.estimated_delivery && tracking.status !== 'delivered' && (
                      <div className="space-y-1">
                        <p className="text-muted-foreground">Expected Delivery</p>
                        <p className="font-medium text-primary">{formatDate(tracking.estimated_delivery)}</p>
                      </div>
                    )}

                    {tracking.delivered_at && (
                      <div className="space-y-1">
                        <p className="text-muted-foreground">Delivered</p>
                        <p className="font-medium text-green-600">{formatDate(tracking.delivered_at)}</p>
                      </div>
                    )}

                    {(tracking.origin_country || tracking.destination_country) && (
                      <div className="space-y-1 sm:col-span-2">
                        <p className="text-muted-foreground">Shipping Route</p>
                        <p className="font-medium">
                          {tracking.origin_country || 'Origin'} → {tracking.destination_country || 'Destination'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Event Timeline */}
                  {tracking.events && tracking.events.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-border/50">
                      <h3 className="text-sm font-medium mb-4">Tracking History</h3>
                      <div className="space-y-4">
                        {tracking.events.slice(0, 10).map((event, eventIndex) => (
                          <div 
                            key={event.id || eventIndex}
                            className="flex gap-3 text-sm"
                          >
                            <div className="flex flex-col items-center">
                              <div className={`w-2 h-2 rounded-full mt-1.5 ${eventIndex === 0 ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                              {eventIndex < (tracking.events?.length || 0) - 1 && (
                                <div className="w-px h-full bg-border flex-1 mt-1" />
                              )}
                            </div>
                            <div className="flex-1 pb-4">
                              <p className={eventIndex === 0 ? 'font-medium' : 'text-muted-foreground'}>
                                {event.description}
                              </p>
                              <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                                {event.event_time && (
                                  <span>{formatDate(event.event_time)}</span>
                                )}
                                {event.location && (
                                  <>
                                    <span>•</span>
                                    <span>{event.location}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Help Section */}
        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            Need help?{" "}
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
