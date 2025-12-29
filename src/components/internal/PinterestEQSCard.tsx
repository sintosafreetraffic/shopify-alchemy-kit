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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

interface BlockingIssue {
  issue_type: string;
  severity: "high" | "medium" | "low";
  description: string;
  recommendation: string;
}

interface EQSSnapshot {
  id: string;
  created_at: string;
  overall_status: string;
  coverage_email: number | null;
  coverage_external_id: number | null;
  coverage_order_id: number | null;
  coverage_click_id: number | null;
  blocking_issues: BlockingIssue[];
  api_error_message: string | null;
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
// MAIN COMPONENT
// ============================================================================

export const PinterestEQSCard = () => {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [snapshot, setSnapshot] = useState<EQSSnapshot | null>(null);
  const [previousSnapshot, setPreviousSnapshot] = useState<EQSSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [oauthStatus, setOauthStatus] = useState<OAuthStatus | null>(null);

  const checkOAuthStatus = async () => {
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pinterest-oauth?action=status`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setOauthStatus(data);
      } else {
        setOauthStatus({ connected: false });
      }
    } catch (err) {
      console.error("[EQS Card] OAuth status check failed:", err);
      setOauthStatus({ connected: false });
    }
  };

  const handleConnectPinterest = async () => {
    setConnecting(true);
    try {
      const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pinterest-oauth?action=authorize`);
      const res = await fetch(url.toString());
      
      if (!res.ok) {
        throw new Error("Failed to get authorization URL");
      }
      
      const data = await res.json();
      if (data.auth_url) {
        // Open Pinterest authorization in new window
        window.open(data.auth_url, "_blank", "width=600,height=700");
      }
    } catch (err) {
      console.error("[EQS Card] Connect error:", err);
      setError(err instanceof Error ? err.message : "Failed to connect");
    } finally {
      setConnecting(false);
    }
  };

  const fetchLatestSnapshot = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch latest 2 snapshots to show trend
      const { data, error: fetchError } = await supabase
        .from("pinterest_eqs_snapshots")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(2);

      if (fetchError) throw fetchError;

      if (data && data.length > 0) {
        // Parse blocking_issues from JSONB
        const parseSnapshot = (s: any): EQSSnapshot => ({
          ...s,
          blocking_issues: Array.isArray(s.blocking_issues) 
            ? s.blocking_issues 
            : JSON.parse(s.blocking_issues || "[]"),
        });

        setSnapshot(parseSnapshot(data[0]));
        if (data.length > 1) {
          setPreviousSnapshot(parseSnapshot(data[1]));
        }
      }
    } catch (err) {
      console.error("[EQS Card] Fetch error:", err);
      setError(err instanceof Error ? err.message : "Failed to load EQS data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLatestSnapshot();
    checkOAuthStatus();
    
    // Check for OAuth callback params
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("pinterest_connected") === "true") {
      // Refresh status after successful connection
      setTimeout(() => {
        checkOAuthStatus();
        fetchLatestSnapshot();
      }, 1000);
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // Calculate trend indicator
  const getTrend = (current: number | null, previous: number | null) => {
    if (current === null || previous === null) return null;
    const diff = current - previous;
    if (diff > 2) return "up";
    if (diff < -2) return "down";
    return "stable";
  };

  const statusConfig = STATUS_CONFIG[snapshot?.overall_status || "UNKNOWN"];
  const StatusIcon = statusConfig.icon;

  // Format last update time
  const lastUpdated = snapshot?.created_at
    ? new Date(snapshot.created_at).toLocaleDateString("en-US", {
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
  if (!oauthStatus?.connected && !snapshot) {
    return (
      <Card className="p-6">
        <div className="flex flex-col items-center justify-center py-8 gap-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Link className="w-5 h-5" />
            <span className="text-sm font-medium">Pinterest API not connected</span>
          </div>
          <p className="text-xs text-muted-foreground text-center max-w-xs">
            Connect your Pinterest Ads account to monitor Event Quality Score metrics
          </p>
          <Button 
            onClick={handleConnectPinterest} 
            disabled={connecting}
            className="gap-2"
          >
            {connecting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ExternalLink className="w-4 h-4" />
            )}
            Connect Pinterest
          </Button>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 text-muted-foreground">
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
            <Button variant="ghost" size="sm" onClick={fetchLatestSnapshot}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Not authenticated");
      }
      
      const response = await supabase.functions.invoke("pinterest-eqs-fetch", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      
      if (response.error) {
        throw new Error(response.error.message || "Sync failed");
      }
      
      // Refetch data after successful sync
      await fetchLatestSnapshot();
    } catch (err) {
      console.error("[EQS Card] Manual sync error:", err);
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  if (!snapshot) {
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
            onClick={handleManualSync} 
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

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-sm font-medium text-foreground">Pinterest Measurement Quality</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Event Quality Score (14-day lookback)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={`${statusConfig.bgColor} ${statusConfig.color} border-0`}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {statusConfig.label}
          </Badge>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fetchLatestSnapshot}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Coverage Bars */}
      <div className="space-y-3 mb-6">
        <CoverageBar
          label="Email"
          value={snapshot.coverage_email}
          tooltip="Percentage of events with hashed email for customer matching"
        />
        <CoverageBar
          label="Click ID (EPIK)"
          value={snapshot.coverage_click_id}
          tooltip="Pinterest click tracking parameter - critical for attribution"
        />
        <CoverageBar
          label="Order ID"
          value={snapshot.coverage_order_id}
          tooltip="Unique order identifiers for deduplication"
        />
        <CoverageBar
          label="External ID"
          value={snapshot.coverage_external_id}
          tooltip="Customer identifier for cross-device matching"
        />
      </div>

      {/* Blocking Issues */}
      {snapshot.blocking_issues.length > 0 && (
        <div className="border-t border-border pt-4">
          <p className="text-xs text-muted-foreground mb-3">Limiting factors</p>
          <div className="space-y-2">
            {snapshot.blocking_issues.map((issue, idx) => {
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
      {snapshot.api_error_message && (
        <div className="border-t border-border pt-4 mt-4">
          <div className="p-3 rounded-lg bg-muted">
            <p className="text-xs text-muted-foreground">
              API error: {snapshot.api_error_message.slice(0, 100)}
              {snapshot.api_error_message.length > 100 && "..."}
            </p>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-border pt-3 mt-4">
        <p className="text-xs text-muted-foreground text-right">
          Last sync: {lastUpdated || "Never"}
        </p>
      </div>
    </Card>
  );
};
