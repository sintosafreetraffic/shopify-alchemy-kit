/**
 * HeroABTestTab Component
 * 
 * Displays Hero A/B test variant exposure tracking data.
 * Shows which headline variants are being shown to users based on persona.
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Loader2, 
  RefreshCw, 
  FlaskConical,
  Eye,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface HeroVariantStats {
  totalExposures: number;
  byVariant: Record<string, number>;
  byPersona: Record<string, number>;
  recentEvents: Array<{
    variant: string;
    persona_cluster: string | null;
    page_path: string;
    session_id: string;
    timestamp: string;
  }>;
}

const VARIANT_COLORS: Record<string, string> = {
  science: "#3b82f6",   // blue
  posture: "#10b981",   // green
  recovery: "#8b5cf6",  // purple
};

const PERSONA_COLORS: Record<string, string> = {
  pain_sleeper: "#ef4444",      // red
  recovery_sleeper: "#8b5cf6",  // purple
  stress_insomnia: "#f59e0b",   // amber
  optimizer: "#3b82f6",         // blue
  unknown: "#6b7280",           // gray
};

export default function HeroABTestTab() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<HeroVariantStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch recent hero_variant_exposure events from edge function logs
      // Since we log to console, we need to get from Supabase analytics
      // For now, call the persona-analytics function with a get_stats action
      const { data, error: invokeError } = await supabase.functions.invoke("persona-analytics", {
        body: {
          action: "get_hero_stats",
        },
      });

      if (invokeError) {
        // If the function doesn't support get_hero_stats yet, show empty state
        console.warn("Hero stats fetch failed:", invokeError);
        setStats({
          totalExposures: 0,
          byVariant: {},
          byPersona: {},
          recentEvents: [],
        });
        return;
      }

      if (data) {
        setStats(data);
      }
    } catch (err) {
      console.error("Error fetching hero stats:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch hero A/B stats");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const variantChartData = stats?.byVariant 
    ? Object.entries(stats.byVariant).map(([variant, count]) => ({
        name: variant.charAt(0).toUpperCase() + variant.slice(1),
        value: count,
        fill: VARIANT_COLORS[variant] || "#6b7280",
      }))
    : [];

  const personaChartData = stats?.byPersona
    ? Object.entries(stats.byPersona).map(([persona, count]) => ({
        name: persona === "null" || !persona ? "No Persona" : persona.replace(/_/g, " "),
        value: count,
        fill: PERSONA_COLORS[persona] || PERSONA_COLORS.unknown,
      }))
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center">
            <FlaskConical className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Hero A/B Test</h2>
            <p className="text-sm text-muted-foreground">
              Headline variant exposure based on persona cookie
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchStats}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Loading State */}
      {loading && !stats && (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading hero A/B stats...</p>
          </div>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card className="p-6 border-destructive/50 bg-destructive/5">
          <p className="text-destructive">{error}</p>
        </Card>
      )}

      {/* Stats Display */}
      {stats && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                  <Eye className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalExposures.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total Exposures</p>
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                  <FlaskConical className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{Object.keys(stats.byVariant).length}</p>
                  <p className="text-xs text-muted-foreground">Active Variants</p>
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
                  <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{Object.keys(stats.byPersona).length}</p>
                  <p className="text-xs text-muted-foreground">Persona Segments</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Variant Content Reference */}
          <Card className="p-5">
            <h3 className="font-medium mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Variant Content Reference
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Each variant shows different headline/subtext based on the user's persona cookie:
            </p>
            <div className="space-y-4">
              {/* Science Variant */}
              <div className="border rounded-lg p-4" style={{ borderColor: VARIANT_COLORS.science }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: VARIANT_COLORS.science }} />
                  <span className="font-semibold text-sm">Science Variant</span>
                  <Badge variant="outline" className="ml-auto text-xs">Default / stress_insomnia / optimizer</Badge>
                </div>
                <div className="bg-muted/50 rounded p-3 space-y-1">
                  <p className="font-medium text-base">"The Science of Better Sleep"</p>
                  <p className="text-sm text-muted-foreground">Discover how small changes to your sleep environment can transform your rest, recovery, and daily energy.</p>
                </div>
              </div>

              {/* Posture Variant */}
              <div className="border rounded-lg p-4" style={{ borderColor: VARIANT_COLORS.posture }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: VARIANT_COLORS.posture }} />
                  <span className="font-semibold text-sm">Posture Variant</span>
                  <Badge variant="outline" className="ml-auto text-xs">pain_sleeper</Badge>
                </div>
                <div className="bg-muted/50 rounded p-3 space-y-1">
                  <p className="font-medium text-base">"Wake Up Without the Aches"</p>
                  <p className="text-sm text-muted-foreground">Ergonomic sleep solutions designed to support your spine and reduce morning tension.</p>
                </div>
              </div>

              {/* Recovery Variant */}
              <div className="border rounded-lg p-4" style={{ borderColor: VARIANT_COLORS.recovery }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: VARIANT_COLORS.recovery }} />
                  <span className="font-semibold text-sm">Recovery Variant</span>
                  <Badge variant="outline" className="ml-auto text-xs">recovery_sleeper</Badge>
                </div>
                <div className="bg-muted/50 rounded p-3 space-y-1">
                  <p className="font-medium text-base">"Maximize Your Recovery"</p>
                  <p className="text-sm text-muted-foreground">Sleep tools designed for athletes and active individuals seeking peak performance through better rest.</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Variant Distribution */}
            <Card className="p-5">
              <h3 className="font-medium mb-4">Exposures by Variant</h3>
              {variantChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={variantChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {variantChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  No variant data yet
                </div>
              )}
            </Card>

            {/* Persona Distribution */}
            <Card className="p-5">
              <h3 className="font-medium mb-4">Exposures by Persona</h3>
              {personaChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={personaChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {personaChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  No persona data yet
                </div>
              )}
            </Card>
          </div>

          {/* Recent Events */}
          <Card className="p-5">
            <h3 className="font-medium mb-4">Recent Exposures</h3>
            {stats.recentEvents.length > 0 ? (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {stats.recentEvents.slice(0, 20).map((event, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-sm py-2 border-b last:border-0">
                    <Badge
                      variant="outline"
                      style={{ 
                        backgroundColor: `${VARIANT_COLORS[event.variant] || "#6b7280"}20`,
                        borderColor: VARIANT_COLORS[event.variant] || "#6b7280",
                      }}
                    >
                      {event.variant}
                    </Badge>
                    <span className="text-muted-foreground">
                      {event.persona_cluster || "No persona"}
                    </span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {event.timestamp ? new Date(event.timestamp).toLocaleString() : "—"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                No recent exposures tracked yet. Visit the homepage to trigger tracking.
              </p>
            )}
          </Card>

          {/* Note about data */}
          <Card className="p-4 bg-muted/50">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> Data is tracked via the <code>persona-analytics</code> edge function. 
              Each homepage visit fires a <code>hero_variant_exposure</code> event with the variant shown and user's persona.
            </p>
          </Card>
        </>
      )}
    </div>
  );
}
