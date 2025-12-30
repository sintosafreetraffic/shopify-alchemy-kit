/**
 * Real-Time EQS Monitor
 * 
 * Shows event quality metrics from YOUR database in real-time,
 * complementing Pinterest's delayed API data (1d/14d only).
 * 
 * Data sources:
 * - add_to_cart_analytics: Cart events with value tracking
 * - pinterest_purchase_events: Purchase events sent to Pinterest
 * - pinterest_context: Attribution context (epik, IP, UA)
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShoppingCart,
  CreditCard,
  ChevronDown,
  ChevronRight,
  Database,
  Zap,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

interface TimePeriod {
  value: number;
  unit: "minutes" | "hours" | "days";
  label: string;
}

interface MetricCoverage {
  name: string;
  displayName: string;
  coverage: number;
  withParam: number;
  total: number;
  priority: "high" | "medium" | "low";
  tooltip: string;
}

interface EventTypeMetrics {
  eventType: string;
  displayName: string;
  icon: typeof ShoppingCart;
  total: number;
  metrics: MetricCoverage[];
}

interface RealTimeEQSData {
  period: string;
  lastUpdated: Date;
  eventTypes: EventTypeMetrics[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TIME_PERIODS: TimePeriod[] = [
  { value: 15, unit: "minutes", label: "15 minutes" },
  { value: 1, unit: "hours", label: "1 hour" },
  { value: 6, unit: "hours", label: "6 hours" },
  { value: 24, unit: "hours", label: "24 hours" },
  { value: 7, unit: "days", label: "7 days" },
  { value: 14, unit: "days", label: "14 days" },
];

// ============================================================================
// COVERAGE METRIC COMPONENT
// ============================================================================

interface CoverageMetricProps {
  metric: MetricCoverage;
}

const CoverageMetric = ({ metric }: CoverageMetricProps) => {
  const { displayName, coverage, withParam, total, priority, tooltip } = metric;
  
  // Color based on coverage
  let barColor = "bg-muted-foreground";
  let textColor = "text-muted-foreground";
  let statusIcon = <AlertCircle className="w-3.5 h-3.5" />;
  
  if (coverage >= 90) {
    barColor = "bg-emerald-500";
    textColor = "text-emerald-600 dark:text-emerald-400";
    statusIcon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
  } else if (coverage >= 70) {
    barColor = "bg-amber-500";
    textColor = "text-amber-600 dark:text-amber-400";
    statusIcon = <AlertCircle className="w-3.5 h-3.5 text-amber-500" />;
  } else if (total > 0) {
    barColor = "bg-rose-400";
    textColor = "text-rose-600 dark:text-rose-400";
    statusIcon = <AlertCircle className="w-3.5 h-3.5 text-rose-400" />;
  }

  const priorityBadge = priority === "high" ? (
    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800">
      HIGH
    </Badge>
  ) : priority === "medium" ? (
    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800">
      MED
    </Badge>
  ) : null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="space-y-1.5 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-help">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {statusIcon}
                <span className="text-xs font-medium">{displayName}</span>
                {priorityBadge}
              </div>
              <span className={`text-xs font-mono tabular-nums ${textColor}`}>
                {total > 0 ? `${Math.round(coverage)}%` : "—"}
              </span>
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full ${barColor} transition-all duration-500`}
                style={{ width: `${total > 0 ? coverage : 0}%` }}
              />
            </div>
            <div className="text-[10px] text-muted-foreground">
              {withParam}/{total} events
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-xs">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// ============================================================================
// EVENT TYPE SECTION COMPONENT
// ============================================================================

interface EventTypeSectionProps {
  eventType: EventTypeMetrics;
}

const EventTypeSection = ({ eventType }: EventTypeSectionProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const Icon = eventType.icon;
  
  // Calculate overall health
  const highPriorityMetrics = eventType.metrics.filter(m => m.priority === "high");
  const avgHighPriorityCoverage = highPriorityMetrics.length > 0
    ? highPriorityMetrics.reduce((sum, m) => sum + m.coverage, 0) / highPriorityMetrics.length
    : 100;
  
  let statusColor = "bg-emerald-500";
  let statusText = "Good";
  if (avgHighPriorityCoverage < 70) {
    statusColor = "bg-rose-400";
    statusText = "Needs Improvement";
  } else if (avgHighPriorityCoverage < 90) {
    statusColor = "bg-amber-500";
    statusText = "Fair";
  }

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer">
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
            <Icon className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">{eventType.displayName}</span>
            <Badge variant="outline" className="text-[10px]">
              {eventType.total} events
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${statusColor}`} />
            <span className="text-xs text-muted-foreground">{statusText}</span>
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 grid grid-cols-2 gap-1">
          {eventType.metrics.map((metric) => (
            <CoverageMetric key={metric.name} metric={metric} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const RealTimeEQS = () => {
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>(TIME_PERIODS[3]); // Default: 24 hours
  const [data, setData] = useState<RealTimeEQSData | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    
    try {
      // Calculate threshold time
      const now = new Date();
      let thresholdMs = 0;
      
      if (selectedPeriod.unit === "minutes") {
        thresholdMs = selectedPeriod.value * 60 * 1000;
      } else if (selectedPeriod.unit === "hours") {
        thresholdMs = selectedPeriod.value * 60 * 60 * 1000;
      } else if (selectedPeriod.unit === "days") {
        thresholdMs = selectedPeriod.value * 24 * 60 * 60 * 1000;
      }
      
      const threshold = new Date(now.getTime() - thresholdMs).toISOString();
      
      // Fetch all data in parallel
      const [cartResult, purchaseResult, contextResult] = await Promise.all([
        // Add to Cart events
        supabase
          .from("add_to_cart_analytics")
          .select("id, price, session_id, referrer, page_path, device_type")
          .gte("created_at", threshold),
        
        // Purchase events
        supabase
          .from("pinterest_purchase_events")
          .select("id, order_id, value, epik, send_status, attribution_source")
          .gte("created_at", threshold),
        
        // Context (for attribution metrics)
        supabase
          .from("pinterest_context")
          .select("id, epik, email_hash, client_ip_address, client_user_agent, landing_page")
          .gte("created_at", threshold),
      ]);
      
      // Process Add to Cart metrics
      const cartEvents = cartResult.data || [];
      const cartMetrics: MetricCoverage[] = [
        {
          name: "value",
          displayName: "Order Value",
          coverage: cartEvents.length > 0 
            ? (cartEvents.filter(e => e.price && e.price > 0).length / cartEvents.length) * 100 
            : 0,
          withParam: cartEvents.filter(e => e.price && e.price > 0).length,
          total: cartEvents.length,
          priority: "high",
          tooltip: "Transaction value is required for ROAS calculation. All AddToCart events should include a valid price > 0.",
        },
        {
          name: "session_id",
          displayName: "External ID",
          coverage: cartEvents.length > 0 
            ? (cartEvents.filter(e => e.session_id).length / cartEvents.length) * 100 
            : 0,
          withParam: cartEvents.filter(e => e.session_id).length,
          total: cartEvents.length,
          priority: "medium",
          tooltip: "Session/user identifier for cross-device matching and deduplication.",
        },
        {
          name: "referrer",
          displayName: "Source URL",
          coverage: cartEvents.length > 0 
            ? (cartEvents.filter(e => e.referrer).length / cartEvents.length) * 100 
            : 0,
          withParam: cartEvents.filter(e => e.referrer).length,
          total: cartEvents.length,
          priority: "low",
          tooltip: "Referrer URL provides context for event attribution.",
        },
      ];
      
      // Process Purchase metrics
      const purchaseEvents = purchaseResult.data || [];
      const purchaseMetrics: MetricCoverage[] = [
        {
          name: "order_id",
          displayName: "Order ID",
          coverage: purchaseEvents.length > 0 
            ? (purchaseEvents.filter(e => e.order_id).length / purchaseEvents.length) * 100 
            : 0,
          withParam: purchaseEvents.filter(e => e.order_id).length,
          total: purchaseEvents.length,
          priority: "high",
          tooltip: "Unique order identifier for deduplication between client and server events.",
        },
        {
          name: "value",
          displayName: "Order Value",
          coverage: purchaseEvents.length > 0 
            ? (purchaseEvents.filter(e => e.value && e.value > 0).length / purchaseEvents.length) * 100 
            : 0,
          withParam: purchaseEvents.filter(e => e.value && e.value > 0).length,
          total: purchaseEvents.length,
          priority: "high",
          tooltip: "Purchase value is critical for ROAS calculation and optimization.",
        },
        {
          name: "click_id",
          displayName: "Click ID (EPIK)",
          coverage: purchaseEvents.length > 0 
            ? (purchaseEvents.filter(e => e.epik).length / purchaseEvents.length) * 100 
            : 0,
          withParam: purchaseEvents.filter(e => e.epik).length,
          total: purchaseEvents.length,
          priority: "high",
          tooltip: "Pinterest click ID (_epik) is critical for attribution. Without it, Pinterest can't credit your ads.",
        },
        {
          name: "send_status",
          displayName: "CAPI Delivery",
          coverage: purchaseEvents.length > 0 
            ? (purchaseEvents.filter(e => e.send_status === "sent").length / purchaseEvents.length) * 100 
            : 0,
          withParam: purchaseEvents.filter(e => e.send_status === "sent").length,
          total: purchaseEvents.length,
          priority: "high",
          tooltip: "Percentage of events successfully sent to Pinterest Conversions API.",
        },
      ];
      
      // Process Context metrics (attribution quality)
      const contextEvents = contextResult.data || [];
      const contextMetrics: MetricCoverage[] = [
        {
          name: "epik",
          displayName: "Click ID Capture",
          coverage: contextEvents.length > 0 
            ? (contextEvents.filter(e => e.epik).length / contextEvents.length) * 100 
            : 0,
          withParam: contextEvents.filter(e => e.epik).length,
          total: contextEvents.length,
          priority: "high",
          tooltip: "Pinterest click ID captured from landing page URL parameter.",
        },
        {
          name: "email",
          displayName: "Email Hash",
          coverage: contextEvents.length > 0 
            ? (contextEvents.filter(e => e.email_hash).length / contextEvents.length) * 100 
            : 0,
          withParam: contextEvents.filter(e => e.email_hash).length,
          total: contextEvents.length,
          priority: "high",
          tooltip: "Hashed email enables customer matching across devices and sessions.",
        },
        {
          name: "ip_address",
          displayName: "IP Address",
          coverage: contextEvents.length > 0 
            ? (contextEvents.filter(e => e.client_ip_address).length / contextEvents.length) * 100 
            : 0,
          withParam: contextEvents.filter(e => e.client_ip_address).length,
          total: contextEvents.length,
          priority: "medium",
          tooltip: "Client IP address helps with geographic and device matching.",
        },
        {
          name: "user_agent",
          displayName: "User Agent",
          coverage: contextEvents.length > 0 
            ? (contextEvents.filter(e => e.client_user_agent).length / contextEvents.length) * 100 
            : 0,
          withParam: contextEvents.filter(e => e.client_user_agent).length,
          total: contextEvents.length,
          priority: "low",
          tooltip: "Browser user agent helps with device matching.",
        },
      ];
      
      // Build final data structure
      const eqsData: RealTimeEQSData = {
        period: selectedPeriod.label,
        lastUpdated: now,
        eventTypes: [
          {
            eventType: "add_to_cart",
            displayName: "Add to Cart",
            icon: ShoppingCart,
            total: cartEvents.length,
            metrics: cartMetrics,
          },
          {
            eventType: "checkout",
            displayName: "Purchase/Checkout",
            icon: CreditCard,
            total: purchaseEvents.length,
            metrics: purchaseMetrics,
          },
          {
            eventType: "context",
            displayName: "Attribution Context",
            icon: Zap,
            total: contextEvents.length,
            metrics: contextMetrics,
          },
        ],
      };
      
      setData(eqsData);
    } catch (error) {
      console.error("[RealTimeEQS] Fetch error:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod]);

  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(fetchMetrics, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, [autoRefresh, fetchMetrics]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Your Data (Real-Time)</span>
          <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
            LIVE
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <Select
            value={`${selectedPeriod.value}-${selectedPeriod.unit}`}
            onValueChange={(val) => {
              const [value, unit] = val.split("-");
              const period = TIME_PERIODS.find(
                p => p.value === parseInt(value) && p.unit === unit
              );
              if (period) setSelectedPeriod(period);
            }}
          >
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_PERIODS.map((period) => (
                <SelectItem 
                  key={`${period.value}-${period.unit}`} 
                  value={`${period.value}-${period.unit}`}
                  className="text-xs"
                >
                  {period.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMetrics}
            disabled={loading}
            className="h-8"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
          </Button>
          
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="h-8 text-xs"
          >
            <Clock className="w-3.5 h-3.5 mr-1" />
            {autoRefresh ? "Auto" : "Manual"}
          </Button>
        </div>
      </div>
      
      {/* Last Updated */}
      {data && (
        <p className="text-[10px] text-muted-foreground">
          Last updated: {data.lastUpdated.toLocaleTimeString()} • Period: {data.period}
        </p>
      )}
      
      {/* Loading State */}
      {loading && !data && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}
      
      {/* Event Type Sections */}
      {data && (
        <div className="space-y-3">
          {data.eventTypes.map((eventType) => (
            <EventTypeSection key={eventType.eventType} eventType={eventType} />
          ))}
        </div>
      )}
      
      {/* No Data State */}
      {!loading && data && data.eventTypes.every(et => et.total === 0) && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          <p>No events found in the selected time period.</p>
          <p className="text-xs mt-1">Try selecting a longer time range.</p>
        </div>
      )}
      
      {/* Comparison Note */}
      <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
        <p className="text-[10px] text-muted-foreground">
          <strong>Note:</strong> This shows coverage from YOUR database. Pinterest's EQS (above) may differ 
          because it includes all events Pinterest receives, including from other sources like the Shopify app. 
          Use this view to verify your tracking implementation is correct.
        </p>
      </div>
    </div>
  );
};
