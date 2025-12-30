/**
 * Pinterest EQS Trends Component
 * Shows historical EQS data to track improvement over time
 */

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  RefreshCw,
} from "lucide-react";

interface TrendDataPoint {
  date: string;
  capi_status: string | null;
  tag_status: string | null;
  capi_email: number | null;
  capi_click_id: number | null;
  tag_email: number | null;
  tag_click_id: number | null;
  tag_order_value_atc: number | null;
}

interface EQSTrendsProps {
  lookbackPeriod: "1d" | "14d";
}

export const PinterestEQSTrends = ({ lookbackPeriod }: EQSTrendsProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [trends, setTrends] = useState<TrendDataPoint[]>([]);

  const fetchTrends = async () => {
    setLoading(true);
    try {
      // Fetch last 7 days of snapshots for the selected lookback period
      const { data, error } = await supabase
        .from("pinterest_eqs_snapshots")
        .select("created_at, ingestion_source, overall_status, coverage_email, coverage_click_id, quality_components")
        .eq("lookback_period", lookbackPeriod)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      if (data && data.length > 0) {
        // Group by date and ingestion source
        const byDate: Record<string, TrendDataPoint> = {};
        
        for (const row of data) {
          const date = new Date(row.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });
          
          if (!byDate[date]) {
            byDate[date] = {
              date,
              capi_status: null,
              tag_status: null,
              capi_email: null,
              capi_click_id: null,
              tag_email: null,
              tag_click_id: null,
              tag_order_value_atc: null,
            };
          }
          
          const entry = byDate[date];
          
          if (row.ingestion_source === "CONVERSIONS_API") {
            entry.capi_status = row.overall_status;
            entry.capi_email = row.coverage_email;
            entry.capi_click_id = row.coverage_click_id;
          } else if (row.ingestion_source === "TAG") {
            entry.tag_status = row.overall_status;
            entry.tag_email = row.coverage_email;
            entry.tag_click_id = row.coverage_click_id;
            
            // Extract order_value for add_to_cart specifically
            const components = row.quality_components as Record<string, any> | null;
            if (components?.order_value?.add_to_cart?.coverage !== undefined) {
              entry.tag_order_value_atc = components.order_value.add_to_cart.coverage;
            }
          }
        }
        
        // Convert to array and sort by date (most recent first)
        const trendArray = Object.values(byDate).slice(0, 7);
        setTrends(trendArray);
      }
    } catch (err) {
      console.error("[EQS Trends] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && trends.length === 0) {
      fetchTrends();
    }
  }, [isOpen, lookbackPeriod]);

  const getTrendIcon = (current: number | null, previous: number | null) => {
    if (current === null || previous === null) return <Minus className="w-3 h-3 text-muted-foreground" />;
    if (current > previous) return <TrendingUp className="w-3 h-3 text-emerald-500" />;
    if (current < previous) return <TrendingDown className="w-3 h-3 text-rose-400" />;
    return <Minus className="w-3 h-3 text-muted-foreground" />;
  };

  const getStatusBadge = (status: string | null) => {
    if (!status) return null;
    
    const colors: Record<string, string> = {
      GOOD: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
      FAIR: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      NEEDS_IMPROVEMENT: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
      UNKNOWN: "bg-muted text-muted-foreground",
    };
    
    return (
      <Badge variant="outline" className={`text-[10px] ${colors[status] || colors.UNKNOWN}`}>
        {status === "NEEDS_IMPROVEMENT" ? "NEEDS IMP." : status}
      </Badge>
    );
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer border border-border/50 mt-4">
          <div className="flex items-center gap-2">
            {isOpen ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
            <span className="text-sm font-medium">EQS History</span>
            <span className="text-xs text-muted-foreground">(Last 7 days)</span>
          </div>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        </div>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <div className="mt-3 p-4 rounded-lg border border-border bg-background">
          {loading && trends.length === 0 ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : trends.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              No historical data available. Sync EQS data to start tracking trends.
            </p>
          ) : (
            <div className="space-y-3">
              {/* Header */}
              <div className="grid grid-cols-6 gap-2 text-[10px] text-muted-foreground font-medium uppercase tracking-wide border-b border-border pb-2">
                <div>Date</div>
                <div>CAPI Status</div>
                <div>Tag Status</div>
                <div>Tag Order Value (ATC)</div>
                <div>Tag Email</div>
                <div>Tag Click ID</div>
              </div>
              
              {/* Data rows */}
              {trends.map((point, idx) => {
                const prev = trends[idx + 1];
                
                return (
                  <div key={point.date} className="grid grid-cols-6 gap-2 text-xs items-center">
                    <div className="font-medium">{point.date}</div>
                    <div>{getStatusBadge(point.capi_status)}</div>
                    <div>{getStatusBadge(point.tag_status)}</div>
                    <div className="flex items-center gap-1">
                      <span className={`font-mono ${point.tag_order_value_atc !== null && point.tag_order_value_atc >= 90 ? 'text-emerald-600' : point.tag_order_value_atc !== null && point.tag_order_value_atc >= 70 ? 'text-amber-600' : 'text-rose-600'}`}>
                        {point.tag_order_value_atc !== null ? `${Math.round(point.tag_order_value_atc)}%` : "—"}
                      </span>
                      {getTrendIcon(point.tag_order_value_atc, prev?.tag_order_value_atc ?? null)}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-mono">
                        {point.tag_email !== null ? `${Math.round(point.tag_email)}%` : "—"}
                      </span>
                      {getTrendIcon(point.tag_email, prev?.tag_email ?? null)}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-mono">
                        {point.tag_click_id !== null ? `${Math.round(point.tag_click_id)}%` : "—"}
                      </span>
                      {getTrendIcon(point.tag_click_id, prev?.tag_click_id ?? null)}
                    </div>
                  </div>
                );
              })}
              
              {/* Refresh button */}
              <div className="pt-2 border-t border-border">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => fetchTrends()}
                  disabled={loading}
                  className="w-full text-xs"
                >
                  {loading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                  Refresh Trends
                </Button>
              </div>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
