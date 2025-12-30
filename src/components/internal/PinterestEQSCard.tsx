/**
 * Pinterest EQS (Event Quality Score) Monitoring Card
 * 
 * Displays measurement quality metrics for Pinterest conversion tracking.
 * Calm, diagnostic UI - no marketing copy, no alarmism.
 */

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
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
  Loader2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  CheckCircle2,
  Info,
  Link,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Wrench,
  Zap,
} from "lucide-react";
import { PinterestEQSTrends } from "./PinterestEQSTrends";

// ============================================================================
// TYPES
// ============================================================================

interface BlockingIssue {
  issue_type: string;
  severity: "high" | "medium" | "low";
  description: string;
  recommendation: string;
}

interface EventTypeDetail {
  coverage: number;
  issues?: Array<{ id: string; name: string; reason: string }>;
}

interface QualityComponentDetail {
  [eventType: string]: EventTypeDetail;
}

interface QualityComponents {
  [componentName: string]: QualityComponentDetail;
}

interface EQSSnapshot {
  id: string;
  created_at: string;
  overall_status: string;
  ingestion_source?: string;
  coverage_email: number | null;
  coverage_external_id: number | null;
  coverage_order_id: number | null;
  coverage_click_id: number | null;
  blocking_issues: BlockingIssue[];
  api_error_message: string | null;
  quality_components?: QualityComponents;
}

interface OAuthStatus {
  connected: boolean;
  expired?: boolean;
  expires_at?: string;
  last_updated?: string;
}

// ============================================================================
// STATUS CONFIG
// ============================================================================

const STATUS_CONFIG: Record<string, {
  label: string;
  color: string;
  bgColor: string;
  icon: typeof CheckCircle2;
}> = {
  GOOD: {
    label: "Good",
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    icon: CheckCircle2,
  },
  FAIR: {
    label: "Fair",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    icon: AlertCircle,
  },
  NEEDS_IMPROVEMENT: {
    label: "Needs Improvement",
    color: "text-rose-600/80 dark:text-rose-400/80",
    bgColor: "bg-rose-100/50 dark:bg-rose-900/20",
    icon: AlertCircle,
  },
  UNKNOWN: {
    label: "Unknown",
    color: "text-muted-foreground",
    bgColor: "bg-muted",
    icon: Info,
  },
};

const SEVERITY_CONFIG: Record<string, { color: string; bgColor: string }> = {
  high: { color: "text-rose-600", bgColor: "bg-rose-100 dark:bg-rose-900/30" },
  medium: { color: "text-amber-600", bgColor: "bg-amber-100 dark:bg-amber-900/30" },
  low: { color: "text-muted-foreground", bgColor: "bg-muted" },
};

// ============================================================================
// COVERAGE BAR COMPONENT
// ============================================================================

interface CoverageBarProps {
  label: string;
  value: number | null;
  tooltip?: string;
}

const CoverageBar = ({ label, value, tooltip }: CoverageBarProps) => {
  const displayValue = value !== null ? Math.round(value) : null;
  const progressValue = displayValue ?? 0;
  
  // Determine color based on coverage level
  let progressColor = "bg-muted-foreground";
  if (displayValue !== null) {
    if (displayValue >= 80) progressColor = "bg-emerald-500";
    else if (displayValue >= 50) progressColor = "bg-amber-500";
    else progressColor = "bg-rose-400";
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono tabular-nums">
          {displayValue !== null ? `${displayValue}%` : "—"}
        </span>
      </div>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full ${progressColor} transition-all duration-500`}
                style={{ width: `${progressValue}%` }}
              />
            </div>
          </TooltipTrigger>
          {tooltip && (
            <TooltipContent side="top" className="max-w-xs">
              <p className="text-xs">{tooltip}</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

// ============================================================================
// ACTIONABLE FIX SUGGESTIONS
// ============================================================================

const COMPONENT_FIXES: Record<string, {
  displayName: string;
  priority: "high" | "medium" | "low";
  description: string;
  actionable: string;
  implementation: string;
}> = {
  email: {
    displayName: "Email",
    priority: "high",
    description: "Hashed email enables customer matching across devices and sessions",
    actionable: "Capture email earlier in the funnel (e.g., email popup before checkout)",
    implementation: "Add email hash to Pinterest Conversions API payload: em: SHA256(email.toLowerCase().trim())",
  },
  click_id: {
    displayName: "Click ID (EPIK)",
    priority: "high",
    description: "Pinterest click parameter is critical for attribution",
    actionable: "Ensure _epik URL parameter is captured on landing pages and stored through checkout",
    implementation: "Capture from URL: new URLSearchParams(window.location.search).get('_epik') and persist in localStorage/cookie",
  },
  order_id: {
    displayName: "Order ID",
    priority: "medium",
    description: "Unique order identifiers for deduplication",
    actionable: "Ensure order_id is sent with all checkout events",
    implementation: "Include order_id in Conversions API payload for checkout events",
  },
  external_id: {
    displayName: "External ID",
    priority: "medium",
    description: "Customer identifier for cross-device matching",
    actionable: "Add customer ID to conversion events for better matching",
    implementation: "Add external_id (customer ID hash) to Pinterest Conversions API payload",
  },
  user_agent: {
    displayName: "User Agent",
    priority: "low",
    description: "Browser information helps with matching",
    actionable: "Ensure user agent is passed through Conversions API",
    implementation: "Capture navigator.userAgent and pass to backend for API calls",
  },
  ip_address: {
    displayName: "IP Address",
    priority: "low",
    description: "IP helps with geographic and device matching",
    actionable: "Capture client IP on server-side for Conversions API",
    implementation: "Use req.headers['x-forwarded-for'] or req.socket.remoteAddress on server",
  },
  source_url: {
    displayName: "Source URL",
    priority: "low",
    description: "Page URL provides context for events",
    actionable: "Include page URL with all events",
    implementation: "Add event_source_url: window.location.href to event payloads",
  },
  order_value: {
    displayName: "Order Value",
    priority: "medium",
    description: "Transaction value is required for ROAS calculation",
    actionable: "Ensure order value is sent with checkout and add_to_cart events",
    implementation: "Add value: orderTotal and currency: 'EUR' to event payloads",
  },
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  checkout: "Checkout",
  add_to_cart: "Add to Cart",
  page_visit: "Page Visit",
  lead: "Lead",
  search: "Search",
  view_category: "View Category",
  custom: "Custom",
};

// ============================================================================
// DETAILED BREAKDOWN COMPONENT
// ============================================================================

interface DetailedBreakdownProps {
  qualityComponents: QualityComponents;
}

const DetailedBreakdown = ({ qualityComponents }: DetailedBreakdownProps) => {
  const [expandedComponent, setExpandedComponent] = useState<string | null>(null);

  if (!qualityComponents || Object.keys(qualityComponents).length === 0) {
    return null;
  }

  // Sort components by priority
  const sortedComponents = Object.entries(qualityComponents).sort(([a], [b]) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const aPriority = COMPONENT_FIXES[a]?.priority || "low";
    const bPriority = COMPONENT_FIXES[b]?.priority || "low";
    return priorityOrder[aPriority] - priorityOrder[bPriority];
  });

  return (
    <div className="border-t border-border pt-4 mt-4">
      <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1.5">
        <Zap className="w-3.5 h-3.5" />
        Detailed Breakdown by Event Type
      </p>
      <div className="space-y-2">
        {sortedComponents.map(([componentName, eventTypes]) => {
          const fix = COMPONENT_FIXES[componentName];
          const displayName = fix?.displayName || componentName;
          const isExpanded = expandedComponent === componentName;
          
          // Calculate average coverage and find issues
          const eventEntries = Object.entries(eventTypes);
          const coverages = eventEntries
            .filter(([, data]) => typeof data.coverage === "number")
            .map(([, data]) => data.coverage);
          const avgCoverage = coverages.length > 0 
            ? Math.round(coverages.reduce((a, b) => a + b, 0) / coverages.length) 
            : null;
          
          const allIssues = eventEntries.flatMap(([eventType, data]) => 
            (data.issues || []).map(issue => ({ ...issue, eventType }))
          );
          
          const hasIssues = allIssues.length > 0;
          const coverageColor = avgCoverage === null ? "text-muted-foreground" 
            : avgCoverage >= 90 ? "text-emerald-600 dark:text-emerald-400"
            : avgCoverage >= 70 ? "text-amber-600 dark:text-amber-400"
            : "text-rose-600 dark:text-rose-400";

          return (
            <Collapsible key={componentName} open={isExpanded} onOpenChange={(open) => setExpandedComponent(open ? componentName : null)}>
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer">
                  <div className="flex items-center gap-2">
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                    <span className="text-sm font-medium">{displayName}</span>
                    {hasIssues && (
                      <Badge variant="outline" className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800">
                        {allIssues.length} issue{allIssues.length > 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>
                  <span className={`font-mono text-sm tabular-nums ${coverageColor}`}>
                    {avgCoverage !== null ? `${avgCoverage}%` : "—"}
                  </span>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 ml-6 space-y-3 pb-2">
                  {/* Per-event-type breakdown */}
                  <div className="grid grid-cols-2 gap-2">
                    {eventEntries.map(([eventType, data]) => {
                      const eventLabel = EVENT_TYPE_LABELS[eventType] || eventType;
                      const coverage = Math.round(data.coverage);
                      const eventHasIssues = (data.issues || []).length > 0;
                      const eventColor = coverage >= 90 ? "text-emerald-600 dark:text-emerald-400"
                        : coverage >= 70 ? "text-amber-600 dark:text-amber-400"
                        : "text-rose-600 dark:text-rose-400";
                      
                      return (
                        <div key={eventType} className="flex items-center justify-between text-xs p-2 rounded bg-background border border-border">
                          <span className="text-muted-foreground flex items-center gap-1">
                            {eventLabel}
                            {eventHasIssues && <AlertCircle className="w-3 h-3 text-amber-500" />}
                          </span>
                          <span className={`font-mono ${eventColor}`}>{coverage}%</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Issues list */}
                  {allIssues.length > 0 && (
                    <div className="space-y-1.5">
                      {allIssues.map((issue, idx) => (
                        <div key={idx} className="text-xs p-2 rounded bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                          <p className="font-medium text-amber-700 dark:text-amber-400">
                            {issue.name} ({EVENT_TYPE_LABELS[issue.eventType] || issue.eventType})
                          </p>
                          <p className="text-amber-600/80 dark:text-amber-500/80 mt-0.5">{issue.reason}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Actionable fix */}
                  {fix && (
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <div className="flex items-start gap-2">
                        <Wrench className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <div className="space-y-1.5">
                          <p className="text-xs font-medium text-foreground">{fix.actionable}</p>
                          <details className="text-xs">
                            <summary className="cursor-pointer text-primary hover:underline">Implementation details</summary>
                            <code className="block mt-1.5 p-2 rounded bg-muted text-muted-foreground font-mono text-[11px] break-all">
                              {fix.implementation}
                            </code>
                          </details>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const PinterestEQSCard = () => {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [snapshots, setSnapshots] = useState<Record<string, EQSSnapshot>>({});
  const [activeSource, setActiveSource] = useState<string>("CONVERSIONS_API");
  const [lookbackPeriod, setLookbackPeriod] = useState<"1d" | "14d">("14d");
  const [error, setError] = useState<string | null>(null);
  const [oauthStatus, setOauthStatus] = useState<OAuthStatus | null>(null);

  const checkOAuthStatus = async (): Promise<OAuthStatus> => {
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pinterest-oauth?action=status`;
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as OAuthStatus;
        setOauthStatus(data);
        return data;
      }

      const fallback = { connected: false } as OAuthStatus;
      setOauthStatus(fallback);
      return fallback;
    } catch (err) {
      console.error("[EQS Card] OAuth status check failed:", err);
      const fallback = { connected: false } as OAuthStatus;
      setOauthStatus(fallback);
      return fallback;
    }
  };

  const fetchLatestSnapshots = async (period?: "1d" | "14d") => {
    const targetPeriod = period || lookbackPeriod;
    setLoading(true);
    setError(null);

    try {
      // Fetch latest snapshot for each ingestion source filtered by lookback period
      const { data, error: fetchError } = await supabase
        .from("pinterest_eqs_snapshots")
        .select("*")
        .eq("lookback_period", targetPeriod)
        .order("created_at", { ascending: false })
        .limit(10);

      if (fetchError) throw fetchError;

      if (data && data.length > 0) {
        const parseSnapshot = (s: any): EQSSnapshot => ({
          ...s,
          blocking_issues: Array.isArray(s.blocking_issues)
            ? s.blocking_issues
            : JSON.parse(s.blocking_issues || "[]"),
        });

        // Group by ingestion_source and take the latest for each
        const bySource: Record<string, EQSSnapshot> = {};
        for (const row of data) {
          const source = row.ingestion_source || "CONVERSIONS_API";
          if (!bySource[source]) {
            bySource[source] = parseSnapshot(row);
          }
        }
        
        setSnapshots(bySource);
        
        // Set active tab to first available source
        const sources = Object.keys(bySource);
        if (sources.length > 0 && !bySource[activeSource]) {
          setActiveSource(sources[0]);
        }
      }
    } catch (err) {
      console.error("[EQS Card] Fetch error:", err);
      setError(err instanceof Error ? err.message : "Failed to load EQS data");
    } finally {
      setLoading(false);
    }
  };

  const handleManualSync = async (opts?: { showToast?: boolean; period?: "1d" | "14d" }) => {
    setSyncing(true);
    const showToast = opts?.showToast ?? true;
    const targetPeriod = opts?.period || lookbackPeriod;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Not authenticated");
      }

      const response = await supabase.functions.invoke("pinterest-eqs-fetch", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          lookback_period: targetPeriod,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Sync failed");
      }

      if (showToast) toast.success("EQS synced");

      // Refetch data after successful sync
      await fetchLatestSnapshots(targetPeriod);
    } catch (err) {
      console.error("[EQS Card] Manual sync error:", err);
      if (showToast) toast.error(err instanceof Error ? err.message : "Sync failed");
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const handleConnectPinterest = async () => {
    setConnecting(true);
    try {
      // Include origin so the edge function can redirect back to the correct app
      const origin = window.location.origin;
      const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pinterest-oauth`);
      url.searchParams.set("action", "authorize");
      url.searchParams.set("origin", origin);

      const res = await fetch(url.toString(), { cache: "no-store" });

      if (!res.ok) {
        throw new Error("Failed to get authorization URL");
      }

      const data = await res.json();
      if (!data.auth_url) throw new Error("Authorization URL missing");

      const popup = window.open(data.auth_url, "_blank", "width=600,height=700");
      toast("Complete Pinterest authorization in the opened window.");

      const startedAt = Date.now();
      const poll = window.setInterval(async () => {
        try {
          // Stop polling if popup was closed
          if (popup && popup.closed) {
            window.clearInterval(poll);
            setConnecting(false);
            return;
          }

          const status = await checkOAuthStatus();
          if (status.connected) {
            window.clearInterval(poll);
            try {
              popup?.close();
            } catch {
              // ignore
            }

            toast.success("Pinterest connected");

            // Run a fresh EQS fetch so we don't keep showing stale 401 snapshots
            await handleManualSync({ showToast: false });
            return;
          }

          // Time out after 2 minutes
          if (Date.now() - startedAt > 2 * 60 * 1000) {
            window.clearInterval(poll);
            toast.error("Pinterest connection timed out");
            setConnecting(false);
          }
        } catch (e) {
          console.error("[EQS Card] OAuth poll error:", e);
        }
      }, 2000);
    } catch (err) {
      console.error("[EQS Card] Connect error:", err);
      setError(err instanceof Error ? err.message : "Failed to connect");
      toast.error(err instanceof Error ? err.message : "Failed to connect");
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnectPinterest = async () => {
    setDisconnecting(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pinterest-oauth?action=disconnect`;
      const res = await fetch(url, { method: "POST", cache: "no-store" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to disconnect");
      }
      toast.success("Pinterest disconnected");
      setOauthStatus({ connected: false });
    } catch (err) {
      console.error("[EQS Card] Disconnect error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to disconnect");
    } finally {
      setDisconnecting(false);
    }
  };

  useEffect(() => {
    fetchLatestSnapshots();
    checkOAuthStatus();
    
    // Check for OAuth callback params
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("pinterest_connected") === "true") {
      // Refresh status after successful connection
      setTimeout(() => {
        checkOAuthStatus();
        fetchLatestSnapshots();
      }, 1000);
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const hasAnySnapshot = Object.keys(snapshots).length > 0;
  const currentSnapshot = snapshots[activeSource];

  // Format last update time
  const lastUpdated = currentSnapshot?.created_at
    ? new Date(currentSnapshot.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  // Show connect button if not connected or no data
  if (!oauthStatus?.connected && !hasAnySnapshot) {
    return (
      <Card className="p-6">
        <div className="flex flex-col items-center justify-center py-6 text-center gap-4">
          <div className="text-muted-foreground">
            <h3 className="text-sm font-medium">Pinterest EQS Not Connected</h3>
            <p className="text-xs mt-1">Connect your Pinterest account to monitor event quality</p>
          </div>
          <Button
            onClick={handleConnectPinterest}
            disabled={connecting}
            className="gap-2"
          >
            {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
            Connect Pinterest
          </Button>
        </div>
      </Card>
    );
  }

  if (error && !hasAnySnapshot) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 text-rose-600/80 dark:text-rose-400/80">
          <AlertCircle className="w-5 h-5" />
          <div>
            <p className="text-sm font-medium">EQS data unavailable</p>
            <p className="text-xs">{error}</p>
          </div>
          <div className="ml-auto flex gap-2">
            {!oauthStatus?.connected && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleConnectPinterest}
                disabled={connecting}
              >
                {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Connect"}
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => fetchLatestSnapshots()}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  if (!hasAnySnapshot) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Info className="w-5 h-5" />
          <div>
            <p className="text-sm font-medium">No EQS data yet</p>
            <p className="text-xs">Daily sync will populate metrics, or sync manually</p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleManualSync()} 
            disabled={syncing}
            className="ml-auto"
          >
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
            {syncing ? "Syncing..." : "Sync Now"}
          </Button>
        </div>
      </Card>
    );
  }

  const availableSources = Object.keys(snapshots);
  const sourceLabels: Record<string, string> = {
    "CONVERSIONS_API": "Server-side (CAPI)",
    "TAG": "Client-side (Tag)",
  };

  const lookbackLabels: Record<string, string> = {
    "1d": "24 hours",
    "14d": "14 days",
  };

  const handleLookbackChange = async (newPeriod: "1d" | "14d") => {
    setLookbackPeriod(newPeriod);
    await fetchLatestSnapshots(newPeriod);
  };

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-foreground">Pinterest Measurement Quality</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Event Quality Score
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Lookback Period Selector */}
          <div className="flex items-center rounded-md border border-input bg-background">
            {(["1d", "14d"] as const).map((period, idx, arr) => (
              <button
                key={period}
                onClick={() => handleLookbackChange(period)}
                disabled={syncing || loading}
                className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                  lookbackPeriod === period
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                } ${idx === 0 ? "rounded-l-md" : ""} ${idx === arr.length - 1 ? "rounded-r-md" : ""}`}
              >
                {lookbackLabels[period]}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleManualSync()}
            disabled={syncing}
            className="gap-2"
          >
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {syncing ? "Syncing..." : "Sync Now"}
          </Button>
          {oauthStatus?.connected ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDisconnectPinterest}
              disabled={disconnecting}
              className="gap-1 text-muted-foreground hover:text-destructive"
            >
              {disconnecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Link className="w-3 h-3" />}
              Disconnect
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleConnectPinterest}
              disabled={connecting}
              className="gap-1"
            >
              {connecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <ExternalLink className="w-3 h-3" />}
              Connect
            </Button>
          )}
        </div>
      </div>

      {/* Source Tabs */}
      <Tabs value={activeSource} onValueChange={setActiveSource} className="w-full">
        <TabsList className="mb-4 w-full grid grid-cols-2">
          {availableSources.map((source) => {
            const snap = snapshots[source];
            const statusConfig = STATUS_CONFIG[snap?.overall_status || "UNKNOWN"];
            return (
              <TabsTrigger key={source} value={source} className="text-xs gap-2">
                <span className={`w-2 h-2 rounded-full ${statusConfig.bgColor}`} />
                {sourceLabels[source] || source}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {availableSources.map((source) => {
          const snap = snapshots[source];
          if (!snap) return null;

          const statusConfig = STATUS_CONFIG[snap.overall_status || "UNKNOWN"];
          const StatusIcon = statusConfig.icon;

          return (
            <TabsContent key={source} value={source} className="mt-0">
              {/* Status Badge */}
              <div className="flex items-center gap-2 mb-4">
                <Badge className={`${statusConfig.bgColor} ${statusConfig.color} border-0`}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {statusConfig.label}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {sourceLabels[source] || source}
                </span>
              </div>

              {/* Coverage Summary - All Components from quality_components */}
              <div className="space-y-2 mb-4">
                {(() => {
                  const components = snap.quality_components || {};
                  
                  // Display order for components
                  const componentLabels: Record<string, string> = {
                    email: "Email",
                    click_id: "Click ID (EPIK)",
                    order_id: "Order ID",
                    external_id: "External ID",
                    ip_address: "IP Address",
                    user_agent: "User Agent",
                    source_url: "Source URL",
                    order_value: "Order Value",
                    external_event_id: "External Event ID",
                  };
                  
                  // Sort by priority (high priority first)
                  const priorityOrder: Record<string, number> = {
                    email: 0,
                    click_id: 1,
                    order_id: 2,
                    external_id: 3,
                    order_value: 4,
                    ip_address: 5,
                    user_agent: 6,
                    source_url: 7,
                    external_event_id: 8,
                  };
                  
                  const sortedKeys = Object.keys(components).sort((a, b) => 
                    (priorityOrder[a] ?? 99) - (priorityOrder[b] ?? 99)
                  );
                  
                  if (sortedKeys.length === 0) {
                    return (
                      <p className="text-xs text-muted-foreground italic">
                        No component data available. Click Sync Now to fetch latest EQS.
                      </p>
                    );
                  }
                  
                  return sortedKeys.map((key) => {
                    const compData = components[key];
                    const label = componentLabels[key] || key;
                    
                    // Calculate coverage dynamically from event types
                    const entries = Object.entries(compData);
                    const eventCount = entries.length;
                    const coverages = entries
                      .filter(([, data]: [string, any]) => typeof data.coverage === "number")
                      .map(([, data]: [string, any]) => data.coverage);
                    
                    const avgCoverage = coverages.length > 0
                      ? Math.round((coverages.reduce((a, b) => a + b, 0) / coverages.length) * 100) / 100
                      : null;
                    
                    const issueCount = entries.reduce((count, [, data]: [string, any]) => 
                      count + ((data.issues || []).length), 0);
                    
                    const displayValue = avgCoverage !== null ? Math.round(avgCoverage) : null;
                    const progressValue = displayValue ?? 0;
                    
                    let progressColor = "bg-muted-foreground";
                    let statusIcon = null;
                    if (displayValue !== null) {
                      if (displayValue >= 90) {
                        progressColor = "bg-emerald-500";
                        statusIcon = <CheckCircle2 className="w-3 h-3 text-emerald-500" />;
                      } else if (displayValue >= 70) {
                        progressColor = "bg-amber-500";
                        statusIcon = <AlertCircle className="w-3 h-3 text-amber-500" />;
                      } else {
                        progressColor = "bg-rose-400";
                        statusIcon = <AlertCircle className="w-3 h-3 text-rose-400" />;
                      }
                    }
                    
                    return (
                      <div key={key} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            {statusIcon}
                            {label}
                            <span className="text-muted-foreground/60">
                              ({eventCount} event{eventCount !== 1 ? "s" : ""})
                            </span>
                            {issueCount > 0 && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800">
                                {issueCount} issue{issueCount !== 1 ? "s" : ""}
                              </Badge>
                            )}
                          </span>
                          <span className="font-mono tabular-nums">
                            {displayValue !== null ? `${displayValue}%` : "—"}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${progressColor} transition-all duration-500`}
                            style={{ width: `${progressValue}%` }}
                          />
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Detailed Breakdown by Event Type */}
              {snap.quality_components && Object.keys(snap.quality_components).length > 0 && (
                <DetailedBreakdown qualityComponents={snap.quality_components} />
              )}

              {/* Blocking Issues */}
              {snap.blocking_issues && snap.blocking_issues.length > 0 && (
                <div className="border-t border-border pt-4 mt-4">
                  <p className="text-xs text-muted-foreground mb-3">Limiting factors</p>
                  <div className="space-y-2">
                    {snap.blocking_issues.map((issue, idx) => {
                      const severityConfig = SEVERITY_CONFIG[issue.severity];
                      return (
                        <div key={idx} className={`p-3 rounded-lg ${severityConfig.bgColor}`}>
                          <p className={`text-xs font-medium ${severityConfig.color}`}>
                            {issue.description}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            → {issue.recommendation}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* API Error Display */}
              {snap.api_error_message && (
                <div className="border-t border-border pt-4 mt-4">
                  <div className="p-3 rounded-lg bg-muted flex items-start justify-between gap-3">
                    <p className="text-xs text-muted-foreground flex-1">
                      API error: {snap.api_error_message.slice(0, 100)}
                      {snap.api_error_message.length > 100 && "..."}
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      {/* EQS Trends */}
      <PinterestEQSTrends lookbackPeriod={lookbackPeriod} />

      {/* Footer */}
      <div className="border-t border-border pt-3 mt-4">
        <p className="text-xs text-muted-foreground text-right">
          Last sync: {lastUpdated || "Never"}
        </p>
      </div>
    </Card>
  );
};
