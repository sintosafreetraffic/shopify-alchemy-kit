/**
 * Phase 4.1 - Weekly Tracking Health Review Tab
 * READ-ONLY dashboard summarizing the last 7 days of tracking health
 * 
 * Sections:
 * A - Weekly Scorecard (6 cards)
 * B - Trends (7-day chart)
 * C - Alert History
 * D - Recovery Effectiveness
 * E - Dedupe Health Quick Check
 * F - Job Reliability
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RefreshCw,
  Package,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Copy,
  Activity,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// Types
interface WeeklyMetrics {
  purchasesTracked: number;
  totalValueByCurrency: Record<string, number>;
  avgSuccessRate: number | null;
  reconciliationMismatches: number;
  recovered: number;
  deadLetters: number;
  valueSampled: boolean;
}

interface PrevWeekMetrics {
  purchasesTracked: number;
  totalValueEur: number;
  avgSuccessRate: number | null;
  reconciliationMismatches: number;
  recovered: number;
  deadLetters: number;
}

interface TrendData {
  day: string;
  success_rate: number;
  error_rate: number;
  epik_rate: number;
}

interface AlertSummary {
  type: string;
  severity: string;
  count: number;
}

interface RecentAlert {
  id: string;
  created_at: string;
  type: string;
  severity: string;
  message: string;
}

interface RecoveryMetrics {
  medianMinutes: number | null;
  p90Minutes: number | null;
  detectedCount: number;
  attemptedCount: number;
  recoveredCount: number;
  deadLetterCount: number;
  usesFallback: boolean;
}

interface DedupeMetrics {
  duplicateOrderIds: number;
  duplicateEventIds: number | null;
  orderIdSampled: boolean;
  eventIdSampled: boolean;
}

interface JobMetrics {
  job_name: string;
  runs: number;
  failed: number;
  last_run_at: string | null;
  duration_p50: number | null;
  duration_p95: number | null;
}

// Helper to compute window (current and previous week)
const getTimeWindow = () => {
  const now = new Date();
  const windowEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const windowStart = new Date(windowEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
  const prevWindowEnd = windowStart;
  const prevWindowStart = new Date(prevWindowEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
  return {
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
    windowStartDate: windowStart.toISOString().split('T')[0],
    windowEndDate: windowEnd.toISOString().split('T')[0],
    displayStart: windowStart.toISOString().split('T')[0],
    displayEnd: new Date(windowEnd.getTime() - 1).toISOString().split('T')[0],
    prevWindowStart: prevWindowStart.toISOString(),
    prevWindowEnd: prevWindowEnd.toISOString(),
    prevWindowStartDate: prevWindowStart.toISOString().split('T')[0],
    prevWindowEndDate: prevWindowEnd.toISOString().split('T')[0],
  };
};

// Helper to calculate percentiles
const calculatePercentile = (arr: number[], p: number): number | null => {
  if (!arr.length) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
};

// Helper to compute delta indicator
const getDeltaIndicator = (current: number, previous: number, inverse = false) => {
  if (previous === 0) return null;
  const delta = ((current - previous) / previous) * 100;
  const isPositive = inverse ? delta < 0 : delta > 0;
  const isNegative = inverse ? delta > 0 : delta < 0;
  return {
    delta,
    isPositive,
    isNegative,
    display: `${delta > 0 ? "+" : ""}${delta.toFixed(0)}%`,
  };
};

export default function WeeklyReviewTab() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState<WeeklyMetrics | null>(null);
  const [prevMetrics, setPrevMetrics] = useState<PrevWeekMetrics | null>(null);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [alertSummary, setAlertSummary] = useState<AlertSummary[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<RecentAlert[]>([]);
  const [recoveryMetrics, setRecoveryMetrics] = useState<RecoveryMetrics | null>(null);
  const [dedupeMetrics, setDedupeMetrics] = useState<DedupeMetrics | null>(null);
  const [jobMetrics, setJobMetrics] = useState<JobMetrics[]>([]);
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const window = useMemo(() => getTimeWindow(), []);

  // Section A: Weekly Scorecard
  const fetchScorecard = useCallback(async () => {
    const newErrors: Record<string, boolean> = {};
    let purchasesTracked = 0;
    let totalValueByCurrency: Record<string, number> = {};
    let avgSuccessRate: number | null = null;
    let reconciliationMismatches = 0;
    let recovered = 0;
    let deadLetters = 0;

    try {
      // A1: Purchases tracked (using head: true for count-only query)
      const { count: purchaseCount, error: purchaseError } = await supabase
        .from("pinterest_purchase_events")
        .select("id", { count: "exact", head: true })
        .eq("is_test", false)
        .gte("created_at", window.windowStart)
        .lt("created_at", window.windowEnd);
      
      if (purchaseError) {
        console.warn("[WeeklyReview] A1 error:", purchaseError.message);
        newErrors.purchases = true;
      } else {
        purchasesTracked = purchaseCount || 0;
      }

      // A2: Total value by currency (bounded to 500 rows for performance)
      const { data: valueData, error: valueError } = await supabase
        .from("pinterest_purchase_events")
        .select("value, currency")
        .eq("is_test", false)
        .gte("created_at", window.windowStart)
        .lt("created_at", window.windowEnd)
        .order("created_at", { ascending: false })
        .limit(500);

      if (valueError) {
        console.warn("[WeeklyReview] A2 error:", valueError.message);
        newErrors.value = true;
      } else if (valueData) {
        valueData.forEach((row) => {
          const currency = row.currency || "Unknown";
          totalValueByCurrency[currency] = (totalValueByCurrency[currency] || 0) + Number(row.value || 0);
        });
      }
      const valueSampled = (valueData?.length || 0) >= 500;

      // A3: Avg success rate from tracking_health_daily
      const { data: healthData, error: healthError } = await supabase
        .from("tracking_health_daily")
        .select("success_rate, reconciliation_mismatches")
        .gte("day", window.windowStartDate)
        .lt("day", window.windowEndDate);

      if (healthError) {
        console.warn("[WeeklyReview] A3/A4 error:", healthError.message);
        newErrors.health = true;
      } else if (healthData && healthData.length > 0) {
        const rates = healthData.map((r) => Number(r.success_rate) || 0);
        avgSuccessRate = rates.reduce((a, b) => a + b, 0) / rates.length;
        reconciliationMismatches = healthData.reduce((sum, r) => sum + (Number(r.reconciliation_mismatches) || 0), 0);
      }

      // A5: Recovered (from recovery_purchase_attempts using outcome column)
      // First, discover distinct outcomes
      const { data: outcomeDiscovery } = await supabase
        .from("recovery_purchase_attempts")
        .select("outcome")
        .gte("created_at", window.windowStart)
        .lt("created_at", window.windowEnd);
      
      if (outcomeDiscovery) {
        const distinctOutcomes = [...new Set(outcomeDiscovery.map(r => r.outcome))];
        console.warn("[WeeklyReview] A5.0 Discovered outcomes:", distinctOutcomes);
      }

      const { data: recoveryData, error: recoveryError } = await supabase
        .from("recovery_purchase_attempts")
        .select("outcome")
        .gte("created_at", window.windowStart)
        .lt("created_at", window.windowEnd);

      if (recoveryError) {
        console.warn("[WeeklyReview] A5 error:", recoveryError.message);
        newErrors.recovery = true;
      } else if (recoveryData) {
        recovered = recoveryData.filter((r) => {
          const outcome = (r.outcome || "").toLowerCase();
          return outcome === "success" || outcome === "recovered" || outcome.includes("success");
        }).length;
      }

      // A6: Dead letters (using head: true for count-only query)
      const { count: deadLetterCount, error: deadLetterError } = await supabase
        .from("recovery_dead_letters")
        .select("id", { count: "exact", head: true })
        .gte("created_at", window.windowStart)
        .lt("created_at", window.windowEnd);

      if (deadLetterError) {
        console.warn("[WeeklyReview] A6 error:", deadLetterError.message);
        newErrors.deadLetters = true;
      } else {
        deadLetters = deadLetterCount || 0;
      }

      setMetrics({
        purchasesTracked,
        totalValueByCurrency,
        avgSuccessRate,
        reconciliationMismatches,
        recovered,
        deadLetters,
        valueSampled,
      });
    } catch (err) {
      console.warn("[WeeklyReview] Scorecard fetch error");
      newErrors.scorecard = true;
    }

    setErrors((prev) => ({ ...prev, ...newErrors }));
  }, [window]);

  // Section B: Trends
  const fetchTrends = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("tracking_health_daily")
        .select("day, success_rate, error_rate, epik_rate")
        .gte("day", window.windowStartDate)
        .lt("day", window.windowEndDate)
        .order("day", { ascending: true });

      if (error) {
        console.warn("[WeeklyReview] B error:", error.message);
        setErrors((prev) => ({ ...prev, trends: true }));
        return;
      }

      setTrends(
        (data || []).map((row) => ({
          day: row.day,
          success_rate: Number(row.success_rate) || 0,
          error_rate: Number(row.error_rate) || 0,
          epik_rate: Number(row.epik_rate) || 0,
        }))
      );
    } catch {
      console.warn("[WeeklyReview] Trends fetch error");
      setErrors((prev) => ({ ...prev, trends: true }));
    }
  }, [window]);

  // Section C: Alert History
  const fetchAlerts = useCallback(async () => {
    try {
      // C1: Alert counts by type and severity
      const { data: alertData, error: alertError } = await supabase
        .from("tracking_alerts")
        .select("type, severity")
        .gte("created_at", window.windowStart)
        .lt("created_at", window.windowEnd);

      if (alertError) {
        console.warn("[WeeklyReview] C1 error:", alertError.message);
        setErrors((prev) => ({ ...prev, alerts: true }));
        return;
      }

      // Group by type + severity
      const countMap: Record<string, number> = {};
      (alertData || []).forEach((a) => {
        const key = `${a.type}|${a.severity}`;
        countMap[key] = (countMap[key] || 0) + 1;
      });
      
      setAlertSummary(
        Object.entries(countMap).map(([key, count]) => {
          const [type, severity] = key.split("|");
          return { type, severity, count };
        })
      );

      // C2: Recent alerts
      const { data: recentData, error: recentError } = await supabase
        .from("tracking_alerts")
        .select("id, created_at, type, severity, message")
        .gte("created_at", window.windowStart)
        .lt("created_at", window.windowEnd)
        .order("created_at", { ascending: false })
        .limit(10);

      if (recentError) {
        console.warn("[WeeklyReview] C2 error:", recentError.message);
      } else {
        setRecentAlerts(recentData || []);
      }
    } catch {
      console.warn("[WeeklyReview] Alerts fetch error");
      setErrors((prev) => ({ ...prev, alerts: true }));
    }
  }, [window]);

  // Section D: Recovery Effectiveness
  const fetchRecovery = useCallback(async () => {
    try {
      let medianMinutes: number | null = null;
      let p90Minutes: number | null = null;
      let usesFallback = false;

      // Fetch missing purchase events (bounded to 500)
      const { data: missingData, error: missingError } = await supabase
        .from("missing_purchase_events")
        .select("order_id, detected_at")
        .gte("detected_at", window.windowStart)
        .lt("detected_at", window.windowEnd)
        .order("detected_at", { ascending: false })
        .limit(500);

      const detectedCount = missingData?.length || 0;

      // Fetch recovery attempts
      const { data: attemptData, error: attemptError } = await supabase
        .from("recovery_purchase_attempts")
        .select("order_id, outcome, created_at")
        .gte("created_at", window.windowStart)
        .lt("created_at", window.windowEnd)
        .order("created_at", { ascending: false })
        .limit(500);

      const attemptedCount = attemptData?.length || 0;
      const recoveredCount = (attemptData || []).filter((r) => {
        const outcome = (r.outcome || "").toLowerCase();
        return outcome === "success" || outcome === "recovered" || outcome.includes("success");
      }).length;

      // Dead letters
      const { data: deadData } = await supabase
        .from("recovery_dead_letters")
        .select("id", { count: "exact" })
        .gte("created_at", window.windowStart)
        .lt("created_at", window.windowEnd);

      const deadLetterCount = deadData?.length || 0;

      // Try to compute time to recovery via join
      if (!missingError && !attemptError && missingData && attemptData) {
        const successAttempts = attemptData.filter((r) => {
          const outcome = (r.outcome || "").toLowerCase();
          return outcome === "success" || outcome === "recovered" || outcome.includes("success");
        });

        // Build map of order_id -> earliest success time
        const successMap: Record<string, Date> = {};
        successAttempts.forEach((a) => {
          const existing = successMap[a.order_id];
          const current = new Date(a.created_at);
          if (!existing || current < existing) {
            successMap[a.order_id] = current;
          }
        });

        // Calculate time to recovery for each detected order
        const recoveryTimes: number[] = [];
        missingData.forEach((m) => {
          const successTime = successMap[m.order_id];
          if (successTime) {
            const detectedTime = new Date(m.detected_at);
            const diffMinutes = (successTime.getTime() - detectedTime.getTime()) / (1000 * 60);
            if (diffMinutes >= 0) {
              recoveryTimes.push(diffMinutes);
            }
          }
        });

        if (recoveryTimes.length > 0) {
          medianMinutes = calculatePercentile(recoveryTimes, 50);
          p90Minutes = calculatePercentile(recoveryTimes, 90);
        } else {
          usesFallback = true;
        }
      } else {
        usesFallback = true;
      }

      setRecoveryMetrics({
        medianMinutes,
        p90Minutes,
        detectedCount,
        attemptedCount,
        recoveredCount,
        deadLetterCount,
        usesFallback,
      });
    } catch {
      console.warn("[WeeklyReview] Recovery fetch error");
      setErrors((prev) => ({ ...prev, recovery: true }));
    }
  }, [window]);

  // Section E: Dedupe Health
  const fetchDedupe = useCallback(async () => {
    try {
      // E1: Duplicate order_ids (bounded to 500 rows for performance)
      const { data: orderData, error: orderError } = await supabase
        .from("pinterest_purchase_events")
        .select("order_id")
        .eq("is_test", false)
        .gte("created_at", window.windowStart)
        .lt("created_at", window.windowEnd)
        .order("created_at", { ascending: false })
        .limit(500);

      let duplicateOrderIds = 0;
      const orderIdSampled = (orderData?.length || 0) >= 500;
      if (!orderError && orderData) {
        const orderCounts: Record<string, number> = {};
        orderData.forEach((r) => {
          orderCounts[r.order_id] = (orderCounts[r.order_id] || 0) + 1;
        });
        duplicateOrderIds = Object.values(orderCounts).filter((c) => c > 1).length;
      }

      // E2: Duplicate event_ids (bounded to 500 rows for performance)
      let duplicateEventIds: number | null = null;
      const { data: eventData, error: eventError } = await supabase
        .from("pinterest_purchase_events")
        .select("event_id")
        .eq("is_test", false)
        .gte("created_at", window.windowStart)
        .lt("created_at", window.windowEnd)
        .order("created_at", { ascending: false })
        .limit(500);

      const eventIdSampled = (eventData?.length || 0) >= 500;
      if (!eventError && eventData) {
        const eventCounts: Record<string, number> = {};
        eventData.forEach((r) => {
          if (r.event_id) {
            eventCounts[r.event_id] = (eventCounts[r.event_id] || 0) + 1;
          }
        });
        duplicateEventIds = Object.values(eventCounts).filter((c) => c > 1).length;
      }

      setDedupeMetrics({ duplicateOrderIds, duplicateEventIds, orderIdSampled, eventIdSampled });
    } catch {
      console.warn("[WeeklyReview] Dedupe fetch error");
      setErrors((prev) => ({ ...prev, dedupe: true }));
    }
  }, [window]);

  // Section F: Job Reliability
  const fetchJobs = useCallback(async () => {
    try {
      const { data: jobData, error: jobError } = await supabase
        .from("tracking_jobs")
        .select("job_name, success, created_at, duration_ms")
        .gte("created_at", window.windowStart)
        .lt("created_at", window.windowEnd)
        .order("created_at", { ascending: false })
        .limit(500);

      if (jobError) {
        console.warn("[WeeklyReview] F error:", jobError.message);
        setErrors((prev) => ({ ...prev, jobs: true }));
        return;
      }

      // Group by job_name
      const jobMap: Record<string, { runs: number; failed: number; last_run_at: string | null; durations: number[] }> = {};
      
      (jobData || []).forEach((j) => {
        if (!jobMap[j.job_name]) {
          jobMap[j.job_name] = { runs: 0, failed: 0, last_run_at: null, durations: [] };
        }
        jobMap[j.job_name].runs++;
        if (!j.success) jobMap[j.job_name].failed++;
        if (!jobMap[j.job_name].last_run_at || j.created_at > jobMap[j.job_name].last_run_at!) {
          jobMap[j.job_name].last_run_at = j.created_at;
        }
        if (j.duration_ms != null) {
          jobMap[j.job_name].durations.push(j.duration_ms);
        }
      });

      const result: JobMetrics[] = Object.entries(jobMap).map(([job_name, data]) => ({
        job_name,
        runs: data.runs,
        failed: data.failed,
        last_run_at: data.last_run_at,
        duration_p50: calculatePercentile(data.durations, 50),
        duration_p95: calculatePercentile(data.durations, 95),
      }));

      setJobMetrics(result);
    } catch {
      console.warn("[WeeklyReview] Jobs fetch error");
      setErrors((prev) => ({ ...prev, jobs: true }));
    }
  }, [window]);

  // Fetch previous week metrics for comparison
  const fetchPrevWeekMetrics = useCallback(async () => {
    try {
      // Previous week purchases
      const { count: prevPurchases } = await supabase
        .from("pinterest_purchase_events")
        .select("id", { count: "exact", head: true })
        .eq("is_test", false)
        .gte("created_at", window.prevWindowStart)
        .lt("created_at", window.prevWindowEnd);

      // Previous week value (EUR only for simplicity)
      const { data: prevValueData } = await supabase
        .from("pinterest_purchase_events")
        .select("value, currency")
        .eq("is_test", false)
        .gte("created_at", window.prevWindowStart)
        .lt("created_at", window.prevWindowEnd)
        .order("created_at", { ascending: false })
        .limit(500);

      let prevTotalEur = 0;
      (prevValueData || []).forEach((r) => {
        if (r.currency === "EUR") {
          prevTotalEur += Number(r.value || 0);
        }
      });

      // Previous week success rate
      const { data: prevHealthData } = await supabase
        .from("tracking_health_daily")
        .select("success_rate, reconciliation_mismatches")
        .gte("day", window.prevWindowStartDate)
        .lt("day", window.prevWindowEndDate);

      let prevAvgSuccessRate: number | null = null;
      let prevMismatches = 0;
      if (prevHealthData && prevHealthData.length > 0) {
        const rates = prevHealthData.map((r) => Number(r.success_rate) || 0);
        prevAvgSuccessRate = rates.reduce((a, b) => a + b, 0) / rates.length;
        prevMismatches = prevHealthData.reduce((sum, r) => sum + (Number(r.reconciliation_mismatches) || 0), 0);
      }

      // Previous week recovered
      const { data: prevRecoveryData } = await supabase
        .from("recovery_purchase_attempts")
        .select("outcome")
        .gte("created_at", window.prevWindowStart)
        .lt("created_at", window.prevWindowEnd);

      const prevRecovered = (prevRecoveryData || []).filter((r) => {
        const outcome = (r.outcome || "").toLowerCase();
        return outcome === "success" || outcome === "recovered" || outcome.includes("success");
      }).length;

      // Previous week dead letters
      const { count: prevDeadLetters } = await supabase
        .from("recovery_dead_letters")
        .select("id", { count: "exact", head: true })
        .gte("created_at", window.prevWindowStart)
        .lt("created_at", window.prevWindowEnd);

      setPrevMetrics({
        purchasesTracked: prevPurchases || 0,
        totalValueEur: prevTotalEur,
        avgSuccessRate: prevAvgSuccessRate,
        reconciliationMismatches: prevMismatches,
        recovered: prevRecovered,
        deadLetters: prevDeadLetters || 0,
      });
    } catch {
      console.warn("[WeeklyReview] Previous week metrics fetch error");
    }
  }, [window]);

  // Initial load
  const fetchAll = useCallback(async () => {
    setErrors({});
    await Promise.all([
      fetchScorecard(),
      fetchTrends(),
      fetchAlerts(),
      fetchRecovery(),
      fetchDedupe(),
      fetchJobs(),
      fetchPrevWeekMetrics(),
    ]);
  }, [fetchScorecard, fetchTrends, fetchAlerts, fetchRecovery, fetchDedupe, fetchJobs, fetchPrevWeekMetrics]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchAll();
      setLoading(false);
    };
    load();
  }, [fetchAll]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  };

  // Render helpers
  const formatCurrency = (value: number, currency: string) => {
    const symbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : "";
    return `${symbol}${value.toFixed(2)}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
      case "error":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "warning":
      case "warn":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      default:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 p-4">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const currencyCount = Object.keys(metrics?.totalValueByCurrency || {}).length;

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Phase 4.1 Weekly Review</h2>
          <p className="text-sm text-muted-foreground">
            Window: {window.displayStart} to {window.displayEnd} UTC
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {/* Section A: Weekly Scorecard */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* A1: Purchases Tracked */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Purchases</span>
          </div>
          {errors.purchases ? (
            <p className="text-sm text-muted-foreground">Data unavailable</p>
          ) : (
            <div className="flex items-end gap-2">
              <p className="text-2xl font-bold">{metrics?.purchasesTracked || 0}</p>
              {prevMetrics && (() => {
                const delta = getDeltaIndicator(metrics?.purchasesTracked || 0, prevMetrics.purchasesTracked);
                if (!delta) return null;
                return (
                  <span className={`text-xs flex items-center ${delta.isPositive ? 'text-green-600' : delta.isNegative ? 'text-red-600' : 'text-muted-foreground'}`}>
                    {delta.isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {delta.display}
                  </span>
                );
              })()}
            </div>
          )}
        </Card>

        {/* A2: Total Value by Currency */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Value</span>
            {currencyCount > 1 && (
              <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                Mixed
              </Badge>
            )}
            {metrics?.valueSampled && (
              <Badge variant="outline" className="text-xs">
                Sampled
              </Badge>
            )}
          </div>
          {errors.value ? (
            <p className="text-sm text-muted-foreground">Data unavailable</p>
          ) : (
            <div className="space-y-1">
              {Object.entries(metrics?.totalValueByCurrency || {}).map(([currency, value]) => (
                <div key={currency} className="flex items-end gap-2">
                  <p className="text-lg font-semibold">
                    {formatCurrency(value, currency)} <span className="text-xs text-muted-foreground">{currency}</span>
                  </p>
                  {currency === "EUR" && prevMetrics && (() => {
                    const delta = getDeltaIndicator(value, prevMetrics.totalValueEur);
                    if (!delta) return null;
                    return (
                      <span className={`text-xs flex items-center ${delta.isPositive ? 'text-green-600' : delta.isNegative ? 'text-red-600' : 'text-muted-foreground'}`}>
                        {delta.isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {delta.display}
                      </span>
                    );
                  })()}
                </div>
              ))}
              {Object.keys(metrics?.totalValueByCurrency || {}).length === 0 && (
                <p className="text-lg font-semibold">$0.00</p>
              )}
            </div>
          )}
        </Card>

        {/* A3: Avg Success Rate */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Success Rate</span>
          </div>
          {errors.health ? (
            <p className="text-sm text-muted-foreground">Data unavailable</p>
          ) : metrics?.avgSuccessRate != null ? (
            <div className="flex items-end gap-2">
              <p className="text-2xl font-bold">{metrics.avgSuccessRate.toFixed(1)}%</p>
              {prevMetrics?.avgSuccessRate != null && (() => {
                const delta = getDeltaIndicator(metrics.avgSuccessRate, prevMetrics.avgSuccessRate);
                if (!delta) return null;
                return (
                  <span className={`text-xs flex items-center ${delta.isPositive ? 'text-green-600' : delta.isNegative ? 'text-red-600' : 'text-muted-foreground'}`}>
                    {delta.isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {delta.display}
                  </span>
                );
              })()}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">N/A</p>
          )}
        </Card>

        {/* A4: Reconciliation Mismatches */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Mismatches</span>
          </div>
          {errors.health ? (
            <p className="text-sm text-muted-foreground">Data unavailable</p>
          ) : (
            <div className="flex items-end gap-2">
              <p className="text-2xl font-bold">{metrics?.reconciliationMismatches || 0}</p>
              {prevMetrics && (() => {
                const delta = getDeltaIndicator(metrics?.reconciliationMismatches || 0, prevMetrics.reconciliationMismatches, true);
                if (!delta) return null;
                return (
                  <span className={`text-xs flex items-center ${delta.isPositive ? 'text-green-600' : delta.isNegative ? 'text-red-600' : 'text-muted-foreground'}`}>
                    {delta.isPositive ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                    {delta.display}
                  </span>
                );
              })()}
            </div>
          )}
        </Card>

        {/* A5: Recovered */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Recovered</span>
          </div>
          {errors.recovery ? (
            <p className="text-sm text-muted-foreground">Data unavailable</p>
          ) : (
            <>
              <div className="flex items-end gap-2">
                <p className="text-2xl font-bold">{metrics?.recovered || 0}</p>
                {prevMetrics && (() => {
                  const delta = getDeltaIndicator(metrics?.recovered || 0, prevMetrics.recovered);
                  if (!delta) return null;
                  return (
                    <span className={`text-xs flex items-center ${delta.isPositive ? 'text-green-600' : delta.isNegative ? 'text-red-600' : 'text-muted-foreground'}`}>
                      {delta.isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {delta.display}
                    </span>
                  );
                })()}
              </div>
              {metrics?.recovered === 0 && (
                <p className="text-xs text-muted-foreground">No successful outcomes</p>
              )}
            </>
          )}
        </Card>

        {/* A6: Dead Letters */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Dead Letters</span>
          </div>
          {errors.deadLetters ? (
            <p className="text-sm text-muted-foreground">Data unavailable</p>
          ) : (
            <div className="flex items-end gap-2">
              <p className="text-2xl font-bold">{metrics?.deadLetters || 0}</p>
              {prevMetrics && (() => {
                const delta = getDeltaIndicator(metrics?.deadLetters || 0, prevMetrics.deadLetters, true);
                if (!delta) return null;
                return (
                  <span className={`text-xs flex items-center ${delta.isPositive ? 'text-green-600' : delta.isNegative ? 'text-red-600' : 'text-muted-foreground'}`}>
                    {delta.isPositive ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                    {delta.display}
                  </span>
                );
              })()}
            </div>
          )}
        </Card>
      </div>

      {/* Section B: Trends */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">7-Day Trends</h3>
        {errors.trends ? (
          <p className="text-sm text-muted-foreground">Data unavailable</p>
        ) : trends.length === 0 ? (
          <p className="text-sm text-muted-foreground">No trend data available</p>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="day" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="success_rate"
                name="Success %"
                stroke="hsl(var(--chart-1))"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="error_rate"
                name="Error %"
                stroke="hsl(var(--chart-2))"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="epik_rate"
                name="Epik %"
                stroke="hsl(var(--chart-3))"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Section C & D: Alerts and Recovery side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Section C: Alert History */}
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-4">Alert History</h3>
          {errors.alerts ? (
            <p className="text-sm text-muted-foreground">Data unavailable</p>
          ) : (
            <>
              {/* C1: Summary */}
              {alertSummary.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground mb-2">By Type & Severity</p>
                  <div className="flex flex-wrap gap-2">
                    {alertSummary.map((a, i) => (
                      <Badge key={i} variant="outline" className={getSeverityColor(a.severity)}>
                        {a.type} ({a.severity}): {a.count}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {/* C2: Recent */}
              <p className="text-xs text-muted-foreground mb-2">Recent (Top 10)</p>
              {recentAlerts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No alerts in window</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {recentAlerts.map((alert) => (
                    <div key={alert.id} className="text-xs border-b border-border pb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={getSeverityColor(alert.severity)}>
                          {alert.severity}
                        </Badge>
                        <span className="text-muted-foreground">{formatDate(alert.created_at)}</span>
                      </div>
                      <p className="mt-1">{alert.type}: {alert.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </Card>

        {/* Section D: Recovery Effectiveness */}
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-4">Recovery Effectiveness</h3>
          {errors.recovery ? (
            <p className="text-sm text-muted-foreground">Data unavailable</p>
          ) : recoveryMetrics ? (
            <div className="space-y-4">
              {!recoveryMetrics.usesFallback && (recoveryMetrics.medianMinutes != null || recoveryMetrics.p90Minutes != null) && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Median TTR
                    </p>
                    <p className="text-xl font-bold">
                      {recoveryMetrics.medianMinutes?.toFixed(1) || "N/A"} min
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">P90 TTR</p>
                    <p className="text-xl font-bold">
                      {recoveryMetrics.p90Minutes?.toFixed(1) || "N/A"} min
                    </p>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Detected</p>
                  <p className="font-semibold">{recoveryMetrics.detectedCount}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Attempted</p>
                  <p className="font-semibold">{recoveryMetrics.attemptedCount}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Recovered</p>
                  <p className="font-semibold text-green-600">{recoveryMetrics.recoveredCount}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Dead Letters</p>
                  <p className="font-semibold text-red-600">{recoveryMetrics.deadLetterCount}</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No recovery data</p>
          )}
        </Card>
      </div>

      {/* Section E: Dedupe Health */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Copy className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Duplicate Order IDs</span>
            {dedupeMetrics && dedupeMetrics.duplicateOrderIds > 0 && (
              <Badge variant="destructive" className="text-xs">
                {dedupeMetrics.duplicateOrderIds} duplicates
              </Badge>
            )}
            {dedupeMetrics?.orderIdSampled && (
              <Badge variant="outline" className="text-xs">
                Sampled
              </Badge>
            )}
          </div>
          {errors.dedupe ? (
            <p className="text-sm text-muted-foreground">Data unavailable</p>
          ) : (
            <p className="text-2xl font-bold">
              {dedupeMetrics?.duplicateOrderIds || 0}
            </p>
          )}
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Copy className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Duplicate Event IDs</span>
            {dedupeMetrics && dedupeMetrics.duplicateEventIds != null && dedupeMetrics.duplicateEventIds > 0 && (
              <Badge variant="destructive" className="text-xs">
                {dedupeMetrics.duplicateEventIds} duplicates
              </Badge>
            )}
            {dedupeMetrics?.eventIdSampled && (
              <Badge variant="outline" className="text-xs">
                Sampled
              </Badge>
            )}
          </div>
          {errors.dedupe ? (
            <p className="text-sm text-muted-foreground">Data unavailable</p>
          ) : dedupeMetrics?.duplicateEventIds != null ? (
            <p className="text-2xl font-bold">{dedupeMetrics.duplicateEventIds}</p>
          ) : (
            <p className="text-sm text-muted-foreground">N/A</p>
          )}
        </Card>
      </div>

      {/* Section F: Job Reliability */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">Job Reliability</h3>
        {errors.jobs ? (
          <p className="text-sm text-muted-foreground">Data unavailable</p>
        ) : jobMetrics.length === 0 ? (
          <p className="text-sm text-muted-foreground">No job data in window</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2">Job</th>
                  <th className="text-right py-2 px-2">Runs</th>
                  <th className="text-right py-2 px-2">Failed</th>
                  <th className="text-right py-2 px-2">Last Run</th>
                  <th className="text-right py-2 px-2">P50 (ms)</th>
                  <th className="text-right py-2 px-2">P95 (ms)</th>
                </tr>
              </thead>
              <tbody>
                {jobMetrics.map((job) => (
                  <tr key={job.job_name} className="border-b border-border/50">
                    <td className="py-2 px-2 font-mono text-xs">{job.job_name}</td>
                    <td className="text-right py-2 px-2">{job.runs}</td>
                    <td className="text-right py-2 px-2">
                      {job.failed > 0 ? (
                        <span className="text-red-600">{job.failed}</span>
                      ) : (
                        job.failed
                      )}
                    </td>
                    <td className="text-right py-2 px-2 text-muted-foreground">
                      {job.last_run_at ? formatDate(job.last_run_at) : "N/A"}
                    </td>
                    <td className="text-right py-2 px-2">
                      {job.duration_p50?.toFixed(0) || "N/A"}
                    </td>
                    <td className="text-right py-2 px-2">
                      {job.duration_p95?.toFixed(0) || "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
