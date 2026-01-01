/**
 * Analytics Dashboard
 * Internal admin page for tracking quiz reveal + checkout + Pinterest purchase + client tracking analytics
 * Protected: Only accessible to authenticated users with admin role
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Eye, 
  Mail, 
  Loader2,
  RefreshCw,
  AlertCircle,
  ShieldX,
  Shield,
  ShoppingCart,
  Clock,
  CheckCircle,
  XCircle,
  RotateCcw,
  Smartphone,
  Monitor,
  ExternalLink,
  Send,
  DollarSign,
  Link2,
  Globe,
  Activity,
  Zap,
  MousePointer,
  Package,
  Fingerprint,
  Target,
  Percent,
  Info,
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  getAllProviderStatuses,
  getEventLog,
  FUNNEL_EVENT_TABLE,
  ProviderStatus,
  EventLogEntry,
} from "@/lib/analyticsRegistry";
import ContextTab from "@/components/internal/ContextTab";
import PhasesTab from "@/components/internal/PhasesTab";
import ProductionMonitoringTab from "@/components/internal/ProductionMonitoringTab";
import WeeklyReviewTab from "@/components/internal/WeeklyReviewTab";
import PinterestSourceTruthTab from "@/components/internal/PinterestSourceTruthTab";
import { useAdsReporting, DATE_PRESETS } from "@/hooks/useAdsReporting";

interface AnalyticsStats {
  summary: {
    total_pre_reveal_views: number;
    total_full_reveal_unlocks: number;
    unique_pre_reveal_sessions: number;
    unique_full_reveal_sessions: number;
    converted_sessions: number;
    conversion_rate: number;
  };
  persona_breakdown: Record<string, { pre: number; full: number }>;
  daily_breakdown: Array<{ date: string; pre: number; full: number }>;
  recent_events: Array<{
    id: string;
    session_id: string;
    event_type: string;
    persona_cluster: string | null;
    email: string | null;
    created_at: string;
  }>;
}

interface CheckoutStats {
  summary: {
    total_initiated: number;
    total_success: number;
    total_timeout: number;
    total_retry: number;
    total_error: number;
    total_popup_blocked: number;
    success_rate: number;
    timeout_rate: number;
    retry_rate: number;
    avg_success_duration_ms: number;
    avg_timeout_duration_ms: number;
    unique_sessions: number;
    converted_sessions: number;
  };
  device_breakdown: Record<string, { initiated: number; success: number; timeout: number; error: number }>;
  daily_breakdown: Array<{ date: string; initiated: number; success: number; timeout: number; retry: number; error: number }>;
  recent_events: Array<{
    id: string;
    session_id: string;
    event_type: string;
    duration_ms: number | null;
    retry_count: number | null;
    error_message: string | null;
    device_type: string | null;
    created_at: string;
  }>;
}

interface PinterestPurchaseEvent {
  id: string;
  order_id: string;
  value: number;
  currency: string;
  epik: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  landing_page: string | null;
  render_status: string;
  created_at: string;
}

interface ClarityMetrics {
  totalSessions: number;
  totalPageviews: number;
  uniqueUsers: number;
  avgSessionDuration: number;
  bounceRate: number;
  topPages: Array<{ url: string; views: number }>;
}

interface ClarityApiResponse {
  metrics: ClarityMetrics | null;
  mockData: boolean;
  error?: string;
  note?: string;
}

const QuizRevealTracking = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [checkoutStats, setCheckoutStats] = useState<CheckoutStats | null>(null);
  const [popupStats, setPopupStats] = useState<{
    summary: {
      total_views: number;
      total_submissions: number;
      unique_view_sessions: number;
      unique_submit_sessions: number;
      converted_sessions: number;
      submission_rate: number;
    };
    daily_breakdown: Array<{ date: string; views: number; submissions: number }>;
  } | null>(null);
  const [klaviyoPopupStats, setKlaviyoPopupStats] = useState<{
    views_unique_sessions: number;
    submits_unique_sessions: number;
    dismissed_unique_sessions: number;
    submission_rate: number;
    dismissal_rate: number;
    period_days: number;
    trend: {
      views_delta: number;
      submits_delta: number;
      rate_delta: number;
    };
    top_pages: Array<{ page_path: string; views: number; submits: number }>;
    debug_events?: Array<{
      id: string;
      created_at: string;
      event_type: string;
      page_path: string;
      session_id_hash: string;
    }>;
  } | null>(null);
  const [showKlaviyoDebug, setShowKlaviyoDebug] = useState(false);
  const [pinterestPurchases, setPinterestPurchases] = useState<PinterestPurchaseEvent[]>([]);
  const [pinterestStats, setPinterestStats] = useState<{
    total: number;
    totalValue: number;
    withAttribution: number;
    successRate: number;
    bySource: Record<string, number>;
  } | null>(null);
  const [clarityData, setClarityData] = useState<ClarityApiResponse | null>(null);
  const [clarityLoading, setClarityLoading] = useState(false);
  const [pageVisits, setPageVisits] = useState<Array<{
    date: string;
    our_sessions: number;
    our_pageviews: number;
  }>>([]);
  const [pageVisitsTotal, setPageVisitsTotal] = useState({ sessions: 0, pageviews: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState("7");
  const [activeTab, setActiveTab] = useState("overview");
  
  // Client-side tracking state
  const [providerStatuses, setProviderStatuses] = useState<ProviderStatus[]>([]);
  const [eventLog, setEventLog] = useState<EventLogEntry[]>([]);
  const [addToCartEvents, setAddToCartEvents] = useState<any[]>([]);
  
  // Pinterest CAPI toggle state - DEPRECATED: Render path removed, direct CAPI is now the only path
  // Keeping minimal state for future send mode controls if needed
  
  // Auth state
  const [authChecking, setAuthChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Ads reporting hook for ROAS calculation
  const adsReporting = useAdsReporting({ autoFetch: false });

  // Sync ads reporting preset with the selected days timeframe
  useEffect(() => {
    if (!isAdmin) return;

    const daysNum = parseInt(days);

    // We only have presets for 7/14/30/90; for 1/3 day views we use 7-day spend.
    const matchingPreset =
      DATE_PRESETS.find((p) => p.days === daysNum) ||
      DATE_PRESETS.find((p) => p.days >= daysNum) ||
      DATE_PRESETS[DATE_PRESETS.length - 1];

    if (adsReporting.selectedPreset.days !== matchingPreset.days) {
      adsReporting.setSelectedPreset(matchingPreset);
    }
  }, [days, isAdmin, adsReporting.selectedPreset.days]);

  // Fetch ads data whenever the selected preset changes
  useEffect(() => {
    if (!isAdmin) return;
    adsReporting.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, adsReporting.selectedPreset.days]);

  // Shopify revenue stats (net revenue after refunds)
  const [shopifyRevenueStats, setShopifyRevenueStats] = useState<{
    grossRevenue: number;
    totalRefunds: number;
    netRevenue: number;
    orderCount: number;
    refundedOrderCount: number;
    currency: string;
  } | null>(null);
  const [shopifyRevenueLoading, setShopifyRevenueLoading] = useState(false);

  // Fetch Shopify revenue stats
  useEffect(() => {
    if (!isAdmin) return;
    
    const fetchShopifyRevenue = async () => {
      setShopifyRevenueLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("shopify-revenue-stats", {
          body: { days: parseInt(days) },
        });
        if (error) throw error;
        setShopifyRevenueStats(data);
      } catch (err) {
        console.error("Failed to fetch Shopify revenue:", err);
      } finally {
        setShopifyRevenueLoading(false);
      }
    };
    
    fetchShopifyRevenue();
  }, [days, isAdmin]);

  // Calculate ROAS from ads spend + Shopify net revenue (after refunds)
  const overviewRoas = useMemo(() => {
    if (!adsReporting.data?.totals) return null;
    const { spend } = adsReporting.data.totals;
    
    // Use Shopify net revenue if available, otherwise fall back to Pinterest revenue
    const revenue = shopifyRevenueStats?.netRevenue ?? adsReporting.data.totals.revenue;
    const roas = spend > 0 ? Math.round((revenue / spend) * 100) / 100 : 0;
    
    return { 
      spend, 
      revenue, 
      roas,
      isShopifyRevenue: !!shopifyRevenueStats?.netRevenue,
      grossRevenue: shopifyRevenueStats?.grossRevenue,
      refunds: shopifyRevenueStats?.totalRefunds,
    };
  }, [adsReporting.data?.totals, shopifyRevenueStats]);

  // Refresh client-side provider statuses
  const refreshProviderStatuses = useCallback(() => {
    setProviderStatuses(getAllProviderStatuses());
    setEventLog(getEventLog());
  }, []);

  // Check authentication and admin role
  useEffect(() => {
    const checkAuth = async () => {
      setAuthChecking(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setAuthChecking(false);
        return;
      }
      
      setUserId(session.user.id);
      
      // Check admin role using the has_role function
      const { data, error } = await supabase.rpc('has_role', {
        _user_id: session.user.id,
        _role: 'admin'
      });
      
      if (error) {
        console.error('Error checking admin role:', error);
        setIsAdmin(false);
      } else {
        setIsAdmin(data === true);
      }
      
      setAuthChecking(false);
    };
    
    checkAuth();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setUserId(null);
        setIsAdmin(false);
      }
    });
    
    return () => subscription.unsubscribe();
  }, []);

  const fetchStats = async () => {
    if (!isAdmin) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Fetch quiz, checkout stats, and Pinterest purchases in parallel
      const daysNum = parseInt(days);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysNum);

      const [
        quizInvoke,
        checkoutInvoke,
        popupInvoke,
        klaviyoPopupInvoke,
        pinterestResult,
        pageVisitsResult,
        addToCartResult,
        pageVisitsStatsResult,
      ] = await Promise.all([
        supabase.functions.invoke("quiz-reveal-analytics", {
          body: {
            action: "get_stats",
            days: daysNum,
          },
        }),
        supabase.functions.invoke("checkout-analytics", {
          body: {
            action: "get_stats",
            days: daysNum,
          },
        }),
        supabase.functions.invoke("email-popup-analytics", {
          body: {
            action: "get_stats",
            days: daysNum,
          },
        }),
        supabase.functions.invoke("klaviyo-popup-analytics", {
          body: {
            action: "get_stats",
            days: daysNum,
            include_debug: showKlaviyoDebug,
          },
        }),
        supabase
          .from('pinterest_purchase_events')
          .select('*')
          .gte('created_at', startDate.toISOString())
          .eq('is_test', false)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('page_visits')
          .select('session_id, path, created_at')
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: false }),
        supabase
          .from('add_to_cart_analytics')
          .select('*')
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: false })
          .limit(1000),
        // Use server-side aggregation for accurate totals (no row limit)
        supabase.rpc('get_page_visits_stats', { start_date: startDate.toISOString() }),
      ]);

      if (quizInvoke.error) {
        throw new Error(`Failed to fetch quiz stats: ${quizInvoke.error.message}`);
      }

      setStats(quizInvoke.data);

      // Process checkout stats
      if (!checkoutInvoke.error) {
        setCheckoutStats(checkoutInvoke.data);
      }

      // Process email popup stats (legacy)
      if (!popupInvoke.error) {
        setPopupStats(popupInvoke.data);
      }

      // Process Klaviyo popup stats (new dedicated tracking)
      if (!klaviyoPopupInvoke.error) {
        setKlaviyoPopupStats(klaviyoPopupInvoke.data);
      }

      // Process Pinterest purchase events
      if (pinterestResult.data) {
        const purchases = pinterestResult.data as PinterestPurchaseEvent[];
        setPinterestPurchases(purchases);

        // Calculate stats
        const total = purchases.length;
        const totalValue = purchases.reduce((sum, p) => sum + (p.value || 0), 0);
        const withAttribution = purchases.filter(p => p.epik).length;
        const successCount = purchases.filter(p => p.render_status === 'success').length;
        const successRate = total > 0 ? Math.round((successCount / total) * 100) : 0;
        
        // Group by source
        const bySource: Record<string, number> = {};
        purchases.forEach(p => {
          const source = p.utm_source || 'direct';
          bySource[source] = (bySource[source] || 0) + 1;
        });

        setPinterestStats({
          total,
          totalValue,
          withAttribution,
          successRate,
          bySource,
        });
      }

      // Process page visits stats from server-side aggregation (accurate totals)
      if (pageVisitsStatsResult.data && pageVisitsStatsResult.data.length > 0) {
        const stats = pageVisitsStatsResult.data[0] as { total_pageviews: number; unique_sessions: number };
        setPageVisitsTotal({
          sessions: stats.unique_sessions,
          pageviews: stats.total_pageviews,
        });
      }

      // Process page visits for comparison chart (limited sample for chart display)
      if (pageVisitsResult.data) {
        const visits = pageVisitsResult.data as Array<{ session_id: string; path: string; created_at: string }>;

        // Group by date for chart
        const dailyData: Record<string, { sessions: Set<string>; pageviews: number }> = {};
        visits.forEach(visit => {
          const date = visit.created_at.split('T')[0];
          if (!dailyData[date]) {
            dailyData[date] = { sessions: new Set(), pageviews: 0 };
          }
          dailyData[date].sessions.add(visit.session_id);
          dailyData[date].pageviews++;
        });

        const chartData = Object.entries(dailyData)
          .map(([date, data]) => ({
            date,
            our_sessions: data.sessions.size,
            our_pageviews: data.pageviews,
          }))
          .sort((a, b) => a.date.localeCompare(b.date));

        setPageVisits(chartData);
      }

      // Process add-to-cart events
      if (addToCartResult.data) {
        setAddToCartEvents(addToCartResult.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch analytics");
    } finally {
      setLoading(false);
    }
  };

  const fetchClarityData = async () => {
    setClarityLoading(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      // Map our days to Clarity's numOfDays (1, 2, or 3 max)
      const daysNum = parseInt(days);
      const numOfDays = Math.min(daysNum, 3) as 1 | 2 | 3;

      const response = await fetch(`${supabaseUrl}/functions/v1/clarity-analytics`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseKey,
        },
        body: JSON.stringify({ numOfDays }),
      });

      if (response.ok) {
        const data = await response.json();
        setClarityData(data);
        console.log('Clarity API response:', data);
      } else {
        setClarityData({
          metrics: null,
          mockData: true,
          error: `API returned ${response.status}`,
        });
      }
    } catch (err) {
      setClarityData({
        metrics: null,
        mockData: true,
        error: err instanceof Error ? err.message : 'Failed to fetch Clarity data',
      });
    } finally {
      setClarityLoading(false);
    }
  };

  // DEPRECATED: Render path removed - Direct CAPI is now the only path
  // fetchPinterestCapiStatus and togglePinterestCapi removed in Day 4-5 cleanup

  useEffect(() => {
    if (isAdmin) {
      fetchStats();
      fetchClarityData();
      refreshProviderStatuses();
      // fetchPinterestCapiStatus removed - Render path deprecated
      
      // Refresh provider statuses periodically
      const interval = setInterval(refreshProviderStatuses, 3000);
      return () => clearInterval(interval);
    }
  }, [days, isAdmin, refreshProviderStatuses]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString("en-US", { 
      month: "short", 
      day: "numeric", 
      hour: "2-digit", 
      minute: "2-digit" 
    });
  };

  // Transform persona breakdown for chart
  const personaChartData = stats ? Object.entries(stats.persona_breakdown).map(([persona, data]) => ({
    name: persona === "unknown" ? "Unknown" : persona.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase()),
    "Pre-Reveal": data.pre,
    "Full Reveal": data.full,
    "Conversion": data.pre > 0 ? Math.round((data.full / data.pre) * 100) : 0,
  })) : [];

  // Transform device breakdown for checkout chart
  const deviceChartData = checkoutStats ? Object.entries(checkoutStats.device_breakdown).map(([device, data]) => ({
    name: device === "ios" ? "iOS" : device === "android" ? "Android" : device === "mobile_other" ? "Mobile" : "Desktop",
    "Initiated": data.initiated,
    "Success": data.success,
    "Timeout": data.timeout,
    "Error": data.error,
  })) : [];

  // Loading auth check
  if (authChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 flex items-center justify-center">
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Verifying access...</p>
          </div>
        </Card>
      </div>
    );
  }

  // Not authenticated
  if (!userId) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 flex items-center justify-center px-4">
        <Card className="p-8 max-w-md text-center">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <ShieldX className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
            <p className="text-muted-foreground mb-6">
              Please sign in to access the analytics dashboard.
            </p>
            <Button onClick={() => navigate(`/auth?returnTo=${encodeURIComponent('/risebynight/tracking')}`)}>
              Sign In
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 flex items-center justify-center px-4">
        <Card className="p-8 max-w-md text-center">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <ShieldX className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-6">
              You don't have permission to view this page. Admin access is required.
            </p>
            <Button variant="outline" onClick={() => navigate('/')}>
              Return Home
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Analytics Dashboard</h1>
            <p className="text-muted-foreground text-sm">
              Track quiz conversion and checkout reliability metrics
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Last 24 hours</SelectItem>
                <SelectItem value="3">Last 3 days</SelectItem>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="14">Last 14 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={fetchStats} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <Card className="p-6 border-destructive/50 bg-destructive/5">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Failed to load analytics</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Loading State */}
        {loading && !stats && (
          <Card className="p-12">
            <div className="flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Loading analytics...</p>
            </div>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-6xl grid-cols-9">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="phase4" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Phase 4</span>
            </TabsTrigger>
            <TabsTrigger value="sourcetruth" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              <span className="hidden sm:inline">Source Truth</span>
            </TabsTrigger>
            <TabsTrigger value="quiz" className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">Quiz</span>
            </TabsTrigger>
            <TabsTrigger value="checkout" className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              <span className="hidden sm:inline">Checkout</span>
            </TabsTrigger>
            <TabsTrigger value="context" className="flex items-center gap-2">
              <Fingerprint className="w-4 h-4" />
              <span className="hidden sm:inline">Context</span>
            </TabsTrigger>
            <TabsTrigger value="tracking" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              <span className="hidden sm:inline">Tracking</span>
            </TabsTrigger>
            <TabsTrigger value="phases" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              <span className="hidden sm:inline">Chaos</span>
            </TabsTrigger>
            <TabsTrigger value="weekly" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Weekly</span>
            </TabsTrigger>
          </TabsList>

          {/* Phase 4 Production Monitoring Tab */}
          <TabsContent value="phase4" className="mt-6">
            <ProductionMonitoringTab />
          </TabsContent>

          {/* Phase 4.2 Pinterest Source Truth Tab */}
          <TabsContent value="sourcetruth" className="mt-6">
            <PinterestSourceTruthTab />
          </TabsContent>

          {/* Phase 4.1 Weekly Review Tab */}
          <TabsContent value="weekly" className="mt-6">
            <WeeklyReviewTab />
          </TabsContent>
          {/* Overview Tab - Key Funnel Metrics */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Period Indicator */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Showing data for: <strong className="text-foreground">Last {days} {parseInt(days) === 1 ? 'day' : 'days'}</strong></span>
              {parseInt(days) > 3 && (
                <Badge variant="outline" className="text-xs text-amber-600">Clarity API limited to 3 days max</Badge>
              )}
            </div>

            {/* Key Funnel Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Page Visits */}
              <Card className="p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
                    <Eye className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{pageVisitsTotal.sessions.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Page Visits</p>
                  </div>
                </div>
              </Card>

              {/* Unique Pageviews */}
              <Card className="p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{pageVisitsTotal.pageviews.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Page Views</p>
                  </div>
                </div>
              </Card>

              {/* Initiate Checkouts */}
              <Card className="p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                    <ShoppingCart className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{checkoutStats?.summary.total_initiated || 0}</p>
                    <p className="text-xs text-muted-foreground">Initiate Checkouts</p>
                  </div>
                </div>
              </Card>

              {/* Checkout Success */}
              <Card className="p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{checkoutStats?.summary.total_success || 0}</p>
                    <p className="text-xs text-muted-foreground">Checkout Success</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Conversion Rates Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Add to Cart - now from real data */}
              <Card className="p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center">
                    <ShoppingCart className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{addToCartEvents.length}</p>
                    <p className="text-xs text-muted-foreground">Add to Carts</p>
                  </div>
                </div>
              </Card>

              {/* Purchases */}
              <Card className="p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
                    <Package className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{pinterestStats?.total || 0}</p>
                    <p className="text-xs text-muted-foreground">Purchases</p>
                  </div>
                </div>
              </Card>

              {/* Conversion Rate (Visits → Purchase) */}
              <Card className="p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {pageVisitsTotal.sessions > 0 && pinterestStats?.total
                        ? `${((pinterestStats.total / pageVisitsTotal.sessions) * 100).toFixed(2)}%`
                        : '—'}
                    </p>
                    <p className="text-xs text-muted-foreground">CVR (Visit → Purchase)</p>
                  </div>
                </div>
              </Card>

              {/* Checkout Rate */}
              <Card className="p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-cyan-100 dark:bg-cyan-900/50 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {pageVisitsTotal.sessions > 0 && checkoutStats
                        ? `${((checkoutStats.summary.total_initiated / pageVisitsTotal.sessions) * 100).toFixed(1)}%`
                        : '—'}
                    </p>
                    <p className="text-xs text-muted-foreground">Checkout Rate</p>
                  </div>
                </div>
              </Card>

              {/* Success Rate */}
              <Card className="p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{checkoutStats?.summary.success_rate || 0}%</p>
                    <p className="text-xs text-muted-foreground">Checkout Success Rate</p>
                  </div>
                </div>
              </Card>

              {/* Total Revenue */}
              <Card className="p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">${pinterestStats?.totalValue.toFixed(0) || 0}</p>
                    <p className="text-xs text-muted-foreground">Revenue Tracked</p>
                  </div>
                </div>
              </Card>

              {/* Ad Spend */}
              <Card className="p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                    <Target className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {adsReporting.loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : overviewRoas ? (
                        `€${overviewRoas.spend.toFixed(0)}`
                      ) : '—'}
                    </p>
                    <p className="text-xs text-muted-foreground">Ad Spend</p>
                  </div>
                </div>
              </Card>

              {/* ROAS */}
              <Card className="p-5 relative">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    overviewRoas && overviewRoas.roas >= 2 
                      ? 'bg-green-100 dark:bg-green-900/50' 
                      : overviewRoas && overviewRoas.roas >= 1
                        ? 'bg-yellow-100 dark:bg-yellow-900/50'
                        : 'bg-gray-100 dark:bg-gray-900/50'
                  }`}>
                    <Percent className={`w-5 h-5 ${
                      overviewRoas && overviewRoas.roas >= 2 
                        ? 'text-green-600 dark:text-green-400' 
                        : overviewRoas && overviewRoas.roas >= 1
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-gray-600 dark:text-gray-400'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <p className={`text-2xl font-bold ${
                      overviewRoas && overviewRoas.roas >= 2 
                        ? 'text-green-600 dark:text-green-400' 
                        : overviewRoas && overviewRoas.roas >= 1
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : ''
                    }`}>
                      {adsReporting.loading || shopifyRevenueLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : overviewRoas ? (
                        `${overviewRoas.roas.toFixed(2)}x`
                      ) : '—'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ROAS {overviewRoas?.isShopifyRevenue && <span className="text-green-600">(net)</span>}
                    </p>
                  </div>
                  {/* Info tooltip */}
                  <div className="group relative">
                    <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                    <div className="absolute right-0 top-6 z-50 hidden group-hover:block w-64 p-3 bg-popover border rounded-lg shadow-lg text-xs">
                      <p className="font-medium mb-2">ROAS Calculation</p>
                      <p className="text-muted-foreground mb-2">
                        <strong>Net Revenue</strong> (from Shopify) ÷ <strong>Ad Spend</strong> (from Pinterest)
                      </p>
                      {overviewRoas && (
                        <div className="space-y-1 pt-2 border-t">
                          <p>Gross Revenue: <strong>${overviewRoas.grossRevenue?.toFixed(2) ?? overviewRoas.revenue.toFixed(2)}</strong></p>
                          {overviewRoas.refunds !== undefined && overviewRoas.refunds > 0 && (
                            <p>Refunds: <strong className="text-red-500">-${overviewRoas.refunds.toFixed(2)}</strong></p>
                          )}
                          <p>Net Revenue: <strong className="text-green-600">${overviewRoas.revenue.toFixed(2)}</strong></p>
                          <p>Ad Spend: <strong>€{overviewRoas.spend.toFixed(2)}</strong></p>
                          <p className="pt-1 border-t mt-1">ROAS: <strong>{overviewRoas.roas.toFixed(2)}x</strong></p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Funnel Visualization */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Conversion Funnel</h3>
              </div>
              <div className="grid grid-cols-6 gap-2 items-end">
                {/* Page Visits */}
                <div className="text-center">
                  <div 
                    className="bg-indigo-500 rounded-t-lg mx-auto w-full" 
                    style={{ height: '100px' }}
                  />
                  <p className="text-sm font-medium mt-2">{pageVisitsTotal.sessions.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Sessions</p>
                </div>
                {/* Quiz Views */}
                <div className="text-center">
                  <div 
                    className="bg-blue-500 rounded-t-lg mx-auto w-full" 
                    style={{ 
                      height: pageVisitsTotal.sessions > 0 && stats
                        ? `${Math.max(20, (stats.summary.unique_pre_reveal_sessions / pageVisitsTotal.sessions) * 100)}px`
                        : '60px'
                    }}
                  />
                  <p className="text-sm font-medium mt-2">{stats?.summary.unique_pre_reveal_sessions || 0}</p>
                  <p className="text-xs text-muted-foreground">Quiz Views</p>
                </div>
                {/* Add to Cart */}
                <div className="text-center">
                  <div 
                    className="bg-orange-500 rounded-t-lg mx-auto w-full" 
                    style={{ 
                      height: pageVisitsTotal.sessions > 0
                        ? `${Math.max(20, (addToCartEvents.length / pageVisitsTotal.sessions) * 100)}px`
                        : '45px'
                    }}
                  />
                  <p className="text-sm font-medium mt-2">{addToCartEvents.length}</p>
                  <p className="text-xs text-muted-foreground">Add to Cart</p>
                </div>
                {/* Initiate Checkout */}
                <div className="text-center">
                  <div 
                    className="bg-amber-500 rounded-t-lg mx-auto w-full" 
                    style={{ 
                      height: pageVisitsTotal.sessions > 0 && checkoutStats
                        ? `${Math.max(20, (checkoutStats.summary.total_initiated / pageVisitsTotal.sessions) * 100)}px`
                        : '40px'
                    }}
                  />
                  <p className="text-sm font-medium mt-2">{checkoutStats?.summary.total_initiated || 0}</p>
                  <p className="text-xs text-muted-foreground">Checkouts</p>
                </div>
                {/* Checkout Success */}
                <div className="text-center">
                  <div 
                    className="bg-emerald-500 rounded-t-lg mx-auto w-full" 
                    style={{ 
                      height: pageVisitsTotal.sessions > 0 && checkoutStats
                        ? `${Math.max(20, (checkoutStats.summary.total_success / pageVisitsTotal.sessions) * 100)}px`
                        : '30px'
                    }}
                  />
                  <p className="text-sm font-medium mt-2">{checkoutStats?.summary.total_success || 0}</p>
                  <p className="text-xs text-muted-foreground">Success</p>
                </div>
                {/* Purchases */}
                <div className="text-center">
                  <div 
                    className="bg-green-600 rounded-t-lg mx-auto w-full" 
                    style={{ 
                      height: pageVisitsTotal.sessions > 0 && pinterestStats
                        ? `${Math.max(20, (pinterestStats.total / pageVisitsTotal.sessions) * 100)}px`
                        : '25px'
                    }}
                  />
                  <p className="text-sm font-medium mt-2">{pinterestStats?.total || 0}</p>
                  <p className="text-xs text-muted-foreground">Purchases</p>
                </div>
              </div>
            </Card>

            {/* Daily Sessions Chart */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Sessions & Checkouts Over Time</h3>
              </div>
              {pageVisits.length > 0 || (checkoutStats?.daily_breakdown.length ?? 0) > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={pageVisits.map(pv => {
                    const checkoutDay = checkoutStats?.daily_breakdown.find(cd => cd.date === pv.date);
                    const addToCartsForDay = addToCartEvents.filter(e => e.created_at.split('T')[0] === pv.date).length;
                    return {
                      ...pv,
                      add_to_cart: addToCartsForDay,
                      checkouts: checkoutDay?.initiated || 0,
                      success: checkoutDay?.success || 0,
                    };
                  })}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 11 }} 
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      }}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip 
                      contentStyle={{ fontSize: '12px' }}
                      labelFormatter={(label) => new Date(label).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    />
                    <Legend />
                    <Bar dataKey="our_sessions" name="Sessions" fill="hsl(221, 83%, 53%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="add_to_cart" name="Add to Cart" fill="hsl(25, 95%, 53%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="checkouts" name="Checkouts" fill="hsl(45, 93%, 47%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="success" name="Success" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No data for the selected period.</p>
                  </div>
                </div>
              )}
            </Card>

            {/* Clarity Comparison (if available) */}
            {clarityData?.metrics && (
              <Card className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Eye className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold">Clarity Comparison</h3>
                    <Badge variant="outline" className="text-xs">Last {Math.min(parseInt(days), 3)} days</Badge>
                  </div>
                  <Button variant="outline" size="sm" onClick={fetchClarityData} disabled={clarityLoading}>
                    {clarityLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  </Button>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Clarity Sessions</p>
                    <p className="text-2xl font-bold text-blue-600">{clarityData.metrics.totalSessions.toLocaleString()}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Our Sessions</p>
                    <p className="text-2xl font-bold text-indigo-600">{pageVisitsTotal.sessions.toLocaleString()}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-violet-50 dark:bg-violet-900/20 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Parity</p>
                    <p className="text-2xl font-bold text-violet-600">
                      {clarityData.metrics.totalSessions > 0
                        ? `${((pageVisitsTotal.sessions / clarityData.metrics.totalSessions) * 100).toFixed(0)}%`
                        : '—'}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Klaviyo Popup Analytics */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Klaviyo Popup Performance</h3>
                  <Badge variant="outline" className="ml-2">Dedicated Tracking</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Debug</span>
                  <Switch checked={showKlaviyoDebug} onCheckedChange={setShowKlaviyoDebug} />
                </div>
              </div>
              {klaviyoPopupStats ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Views (unique)</p>
                      <p className="text-2xl font-bold text-blue-600">{klaviyoPopupStats.views_unique_sessions}</p>
                      {klaviyoPopupStats.trend.views_delta !== 0 && (
                        <p className={`text-xs mt-1 ${klaviyoPopupStats.trend.views_delta > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {klaviyoPopupStats.trend.views_delta > 0 ? '+' : ''}{klaviyoPopupStats.trend.views_delta} vs prev
                        </p>
                      )}
                    </div>
                    <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Submissions</p>
                      <p className="text-2xl font-bold text-emerald-600">{klaviyoPopupStats.submits_unique_sessions}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-violet-50 dark:bg-violet-900/20 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Submission Rate</p>
                      <p className="text-2xl font-bold text-violet-600">{klaviyoPopupStats.submission_rate}%</p>
                      {klaviyoPopupStats.trend.rate_delta !== 0 && (
                        <p className={`text-xs mt-1 ${klaviyoPopupStats.trend.rate_delta > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {klaviyoPopupStats.trend.rate_delta > 0 ? '+' : ''}{klaviyoPopupStats.trend.rate_delta}% vs prev
                        </p>
                      )}
                    </div>
                    <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Dismissed</p>
                      <p className="text-2xl font-bold text-amber-600">{klaviyoPopupStats.dismissed_unique_sessions}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">Counts unique sessions to avoid double-counting.</p>
                  
                  {/* Debug events for admins */}
                  {showKlaviyoDebug && klaviyoPopupStats.debug_events && klaviyoPopupStats.debug_events.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-xs font-medium mb-2">Last 10 Events (Admin Only)</p>
                      <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
                        {klaviyoPopupStats.debug_events.map((e) => (
                          <div key={e.id} className="flex justify-between text-muted-foreground">
                            <span>{e.event_type}</span>
                            <span>{e.page_path}</span>
                            <span>{new Date(e.created_at).toLocaleTimeString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="h-24 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>Collecting baseline — check back after more traffic.</p>
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="quiz" className="space-y-6 mt-6">
            {stats && (
              <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                    <Eye className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.summary.unique_pre_reveal_sessions}</p>
                    <p className="text-xs text-muted-foreground">Pre-Reveal Views</p>
                  </div>
                </div>
              </Card>

              <Card className="p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.summary.converted_sessions}</p>
                    <p className="text-xs text-muted-foreground">Email Unlocks</p>
                  </div>
                </div>
              </Card>

              <Card className="p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.summary.conversion_rate}%</p>
                    <p className="text-xs text-muted-foreground">Conversion Rate</p>
                  </div>
                </div>
              </Card>

              <Card className="p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                    <Users className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.summary.total_pre_reveal_views}</p>
                    <p className="text-xs text-muted-foreground">Total Events</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Daily Trend Chart */}
              <Card className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Daily Trend</h3>
                </div>
                <div className="h-64">
                  {stats.daily_breakdown.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={stats.daily_breakdown}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={formatDate}
                          className="text-xs"
                        />
                        <YAxis className="text-xs" />
                        <Tooltip 
                          labelFormatter={formatDate}
                          contentStyle={{ 
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="pre" 
                          name="Pre-Reveal" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="full" 
                          name="Full Reveal" 
                          stroke="hsl(142 76% 36%)" 
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      No data for selected period
                    </div>
                  )}
                </div>
              </Card>

              {/* Persona Breakdown Chart */}
              <Card className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Conversion by Persona</h3>
                </div>
                <div className="h-64">
                  {personaChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={personaChartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" className="text-xs" />
                        <YAxis 
                          type="category" 
                          dataKey="name" 
                          width={100}
                          className="text-xs"
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                        <Legend />
                        <Bar dataKey="Pre-Reveal" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                        <Bar dataKey="Full Reveal" fill="hsl(142 76% 36%)" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      No persona data available
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Recent Events Table */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Eye className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Recent Events</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Time</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Event</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Persona</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Session</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recent_events.slice(0, 20).map((event) => (
                      <tr key={event.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-2 px-3 text-muted-foreground">
                          {formatDateTime(event.created_at)}
                        </td>
                        <td className="py-2 px-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            event.event_type === "pre_reveal_viewed" 
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300"
                              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300"
                          }`}>
                            {event.event_type === "pre_reveal_viewed" ? "Pre-Reveal" : "Full Reveal"}
                          </span>
                        </td>
                        <td className="py-2 px-3 capitalize">
                          {event.persona_cluster?.replace("_", " ") || "—"}
                        </td>
                        <td className="py-2 px-3 font-mono text-xs text-muted-foreground">
                          {event.session_id.substring(0, 16)}...
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {stats.recent_events.length === 0 && (
                  <div className="py-8 text-center text-muted-foreground">
                    No events recorded yet
                  </div>
                )}
              </div>
            </Card>
              </>
            )}
          </TabsContent>

          {/* Checkout Analytics Tab */}
          <TabsContent value="checkout" className="space-y-6 mt-6">
            {checkoutStats && (
              <>
                {/* Checkout Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="p-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                        <ShoppingCart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{checkoutStats.summary.total_initiated}</p>
                        <p className="text-xs text-muted-foreground">Checkouts Initiated</p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{checkoutStats.summary.success_rate}%</p>
                        <p className="text-xs text-muted-foreground">Success Rate</p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{checkoutStats.summary.total_timeout}</p>
                        <p className="text-xs text-muted-foreground">Timeouts</p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center">
                        <RotateCcw className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{checkoutStats.summary.total_retry}</p>
                        <p className="text-xs text-muted-foreground">Retries</p>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Performance Metrics */}
                <div className="grid md:grid-cols-3 gap-4">
                  <Card className="p-5">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-primary">
                        {checkoutStats.summary.avg_success_duration_ms > 0 
                          ? `${(checkoutStats.summary.avg_success_duration_ms / 1000).toFixed(1)}s` 
                          : "—"}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">Avg Success Duration</p>
                    </div>
                  </Card>
                  <Card className="p-5">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-destructive">
                        {checkoutStats.summary.total_error}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">Total Errors</p>
                    </div>
                  </Card>
                  <Card className="p-5">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-amber-600">
                        {checkoutStats.summary.total_popup_blocked}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">Popup Blocked</p>
                    </div>
                  </Card>
                </div>

                {/* Charts Row */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Daily Checkout Trend */}
                  <Card className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <BarChart3 className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold">Daily Checkout Trend</h3>
                    </div>
                    <div className="h-64">
                      {checkoutStats.daily_breakdown.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={checkoutStats.daily_breakdown}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis 
                              dataKey="date" 
                              tickFormatter={formatDate}
                              className="text-xs"
                            />
                            <YAxis className="text-xs" />
                            <Tooltip 
                              labelFormatter={formatDate}
                              contentStyle={{ 
                                backgroundColor: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "8px",
                              }}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="initiated" 
                              name="Initiated" 
                              stroke="hsl(var(--primary))" 
                              strokeWidth={2}
                              dot={false}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="success" 
                              name="Success" 
                              stroke="hsl(142 76% 36%)" 
                              strokeWidth={2}
                              dot={false}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="timeout" 
                              name="Timeout" 
                              stroke="hsl(38 92% 50%)" 
                              strokeWidth={2}
                              dot={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground">
                          No checkout data for selected period
                        </div>
                      )}
                    </div>
                  </Card>

                  {/* Device Breakdown */}
                  <Card className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Smartphone className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold">By Device Type</h3>
                    </div>
                    <div className="h-64">
                      {deviceChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={deviceChartData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis type="number" className="text-xs" />
                            <YAxis 
                              type="category" 
                              dataKey="name" 
                              width={80}
                              className="text-xs"
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "8px",
                              }}
                            />
                            <Legend />
                            <Bar dataKey="Initiated" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                            <Bar dataKey="Success" fill="hsl(142 76% 36%)" radius={[0, 4, 4, 0]} />
                            <Bar dataKey="Timeout" fill="hsl(38 92% 50%)" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground">
                          No device data available
                        </div>
                      )}
                    </div>
                  </Card>
                </div>

                {/* Recent Checkout Events */}
                <Card className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <ShoppingCart className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">Recent Checkout Events</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 px-3 font-medium text-muted-foreground">Time</th>
                          <th className="text-left py-2 px-3 font-medium text-muted-foreground">Event</th>
                          <th className="text-left py-2 px-3 font-medium text-muted-foreground">Duration</th>
                          <th className="text-left py-2 px-3 font-medium text-muted-foreground">Device</th>
                        </tr>
                      </thead>
                      <tbody>
                        {checkoutStats.recent_events.slice(0, 20).map((event) => (
                          <tr key={event.id} className="border-b border-border/50 hover:bg-muted/30">
                            <td className="py-2 px-3 text-muted-foreground">
                              {formatDateTime(event.created_at)}
                            </td>
                            <td className="py-2 px-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                event.event_type === "checkout_success" 
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300"
                                  : event.event_type === "checkout_timeout"
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300"
                                  : event.event_type === "checkout_error"
                                  ? "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300"
                                  : event.event_type === "checkout_retry"
                                  ? "bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-300"
                                  : "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300"
                              }`}>
                                {event.event_type.replace("checkout_", "").replace("_", " ")}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              {event.duration_ms ? `${(event.duration_ms / 1000).toFixed(1)}s` : "—"}
                            </td>
                            <td className="py-2 px-3 capitalize">
                              {event.device_type || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {checkoutStats.recent_events.length === 0 && (
                      <div className="py-8 text-center text-muted-foreground">
                        No checkout events recorded yet
                      </div>
                    )}
                  </div>
                </Card>

                {/* Pinterest Conversions API Section */}
                <div className="pt-8 border-t border-border">
                  <div className="flex items-center gap-2 mb-6">
                    <Send className="w-5 h-5 text-red-600" />
                    <h3 className="text-lg font-semibold">Pinterest Conversions API</h3>
                    <Badge variant="outline" className="ml-2">Server-Side</Badge>
                  </div>

                  {/* Pinterest Stats Cards */}
                  {pinterestStats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <Card className="p-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                            <Send className="w-5 h-5 text-red-600 dark:text-red-400" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold">{pinterestStats.total}</p>
                            <p className="text-xs text-muted-foreground">Purchases Tracked</p>
                          </div>
                        </div>
                      </Card>

                      <Card className="p-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                            <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold">${pinterestStats.totalValue.toFixed(0)}</p>
                            <p className="text-xs text-muted-foreground">Total Value</p>
                          </div>
                        </div>
                      </Card>

                      <Card className="p-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                            <Link2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold">{pinterestStats.withAttribution}</p>
                            <p className="text-xs text-muted-foreground">With Pinterest Click</p>
                          </div>
                        </div>
                      </Card>

                      <Card className="p-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold">{pinterestStats.successRate}%</p>
                            <p className="text-xs text-muted-foreground">API Success Rate</p>
                          </div>
                        </div>
                      </Card>
                    </div>
                  )}

                  {/* Attribution Breakdown */}
                  {pinterestStats && Object.keys(pinterestStats.bySource).length > 0 && (
                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                      <Card className="p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <Globe className="w-5 h-5 text-primary" />
                          <h4 className="font-semibold">Traffic Sources</h4>
                        </div>
                        <div className="space-y-2">
                          {Object.entries(pinterestStats.bySource)
                            .sort((a, b) => b[1] - a[1])
                            .map(([source, count]) => (
                              <div key={source} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                                <span className="text-sm">{source}</span>
                                <Badge variant="secondary">{count}</Badge>
                              </div>
                            ))}
                        </div>
                      </Card>

                      <Card className="p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <ExternalLink className="w-5 h-5 text-primary" />
                          <h4 className="font-semibold">Attribution Flow</h4>
                        </div>
                        <div className="space-y-3 text-sm text-muted-foreground">
                          <p><strong className="text-foreground">1. Click Capture:</strong> Pinterest epik stored on landing</p>
                          <p><strong className="text-foreground">2. Checkout Pass:</strong> Attribution added to cart attributes</p>
                          <p><strong className="text-foreground">3. Webhook Trigger:</strong> orders/paid fires to Edge Function</p>
                          <p><strong className="text-foreground">4. API Call:</strong> Server → Render → Pinterest CAPI</p>
                          <div className="pt-2 mt-2 border-t border-border">
                            <Badge 
                              variant={pinterestStats.successRate >= 90 ? "default" : pinterestStats.successRate >= 70 ? "secondary" : "destructive"}
                              className={pinterestStats.successRate >= 90 ? "bg-emerald-100 text-emerald-800" : ""}
                            >
                              {pinterestStats.successRate >= 90 ? "Healthy" : pinterestStats.successRate >= 70 ? "Degraded" : "Issues Detected"}
                            </Badge>
                          </div>
                        </div>
                      </Card>
                    </div>
                  )}

                  {/* Recent Pinterest Events */}
                  <Card className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Send className="w-5 h-5 text-red-600" />
                      <h4 className="font-semibold">Recent Pinterest Purchase Events</h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-2 px-3 font-medium text-muted-foreground">Time</th>
                            <th className="text-left py-2 px-3 font-medium text-muted-foreground">Order</th>
                            <th className="text-left py-2 px-3 font-medium text-muted-foreground">Value</th>
                            <th className="text-left py-2 px-3 font-medium text-muted-foreground">Attribution</th>
                            <th className="text-left py-2 px-3 font-medium text-muted-foreground">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pinterestPurchases.slice(0, 15).map((event) => (
                            <tr key={event.id} className="border-b border-border/50 hover:bg-muted/30">
                              <td className="py-2 px-3 text-muted-foreground">
                                {formatDateTime(event.created_at)}
                              </td>
                              <td className="py-2 px-3 font-mono text-xs">
                                {event.order_id.substring(0, 12)}...
                              </td>
                              <td className="py-2 px-3">
                                {event.currency} {event.value?.toFixed(2) || "—"}
                              </td>
                              <td className="py-2 px-3">
                                <div className="flex items-center gap-1">
                                  {event.epik ? (
                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                      epik ✓
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">—</span>
                                  )}
                                  {event.utm_source && (
                                    <Badge variant="secondary" className="text-xs">
                                      {event.utm_source}
                                    </Badge>
                                  )}
                                </div>
                              </td>
                              <td className="py-2 px-3">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  event.render_status === "success" 
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300"
                                    : event.render_status === "skipped"
                                    ? "bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300"
                                    : "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300"
                                }`}>
                                  {event.render_status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {pinterestPurchases.length === 0 && (
                        <div className="py-8 text-center text-muted-foreground">
                          No Pinterest purchase events recorded yet
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              </>
            )}
            {!checkoutStats && !loading && (
              <Card className="p-12">
                <div className="flex flex-col items-center justify-center">
                  <ShoppingCart className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No checkout data available yet</p>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* Context Tab - Pinterest CAPI Context Tracking */}
          <TabsContent value="context" className="space-y-6 mt-6">
            <ContextTab days={days} />
          </TabsContent>

          {/* Tracking Health Tab */}
          <TabsContent value="tracking" className="space-y-6 mt-6">
            {/* Provider Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {providerStatuses.map((status) => (
                <Card key={status.name} className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        status.name === 'Pinterest' 
                          ? 'bg-red-100 dark:bg-red-900/50' 
                          : status.name === 'Clarity'
                          ? 'bg-blue-100 dark:bg-blue-900/50'
                          : 'bg-violet-100 dark:bg-violet-900/50'
                      }`}>
                        {status.name === 'Pinterest' && <Send className="w-5 h-5 text-red-600" />}
                        {status.name === 'Clarity' && <Eye className="w-5 h-5 text-blue-600" />}
                        {status.name === 'Klaviyo' && <Mail className="w-5 h-5 text-violet-600" />}
                      </div>
                      <span className="font-semibold">{status.name}</span>
                    </div>
                    {status.initialized ? (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Active</Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">Pending</Badge>
                    )}
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Script Loaded</span>
                      <span className={status.scriptLoaded ? "text-emerald-600" : "text-amber-500"}>
                        {status.scriptLoaded ? "Yes" : "No"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Event</span>
                      <span className="text-xs">
                        {status.lastEventAt ? new Date(status.lastEventAt).toLocaleTimeString() : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Route</span>
                      <span className="text-xs truncate max-w-[120px]">
                        {status.lastRoute || "—"}
                      </span>
                    </div>
                    {status.blockers.length > 0 && (
                      <div className="pt-2 border-t border-border mt-2">
                        {status.blockers.map((blocker, i) => (
                          <div key={i} className="flex items-start gap-1 text-xs text-amber-600">
                            <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            <span>{blocker}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>

            {/* Pinterest CAPI Status - Render path deprecated, Direct CAPI is canonical */}
            <Card className="p-5 border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Pinterest CAPI Tracking</h3>
                    <p className="text-sm text-muted-foreground">Direct CAPI is the canonical path (Render deprecated)</p>
                  </div>
                </div>
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                  DIRECT (Supabase)
                </Badge>
              </div>
            </Card>

            {/* Tracking Comparison */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Our Tracked Events */}
              <Card className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Our Tracked Events (Checkout Analytics)</h3>
                </div>
                <div className="space-y-3">
                  {checkoutStats && (
                    <>
                      <div className="flex justify-between items-center py-2 border-b border-border/50">
                        <div className="flex items-center gap-2">
                          <ShoppingCart className="w-4 h-4 text-blue-600" />
                          <span>Checkouts Initiated</span>
                        </div>
                        <Badge variant="secondary">{checkoutStats.summary.total_initiated}</Badge>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-border/50">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                          <span>Checkout Success</span>
                        </div>
                        <Badge variant="secondary">{checkoutStats.summary.total_success}</Badge>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-border/50">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-amber-600" />
                          <span>Checkout Timeout</span>
                        </div>
                        <Badge variant="secondary">{checkoutStats.summary.total_timeout}</Badge>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-border/50">
                        <div className="flex items-center gap-2">
                          <RotateCcw className="w-4 h-4 text-violet-600" />
                          <span>Checkout Retry</span>
                        </div>
                        <Badge variant="secondary">{checkoutStats.summary.total_retry}</Badge>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <div className="flex items-center gap-2">
                          <XCircle className="w-4 h-4 text-red-600" />
                          <span>Checkout Error</span>
                        </div>
                        <Badge variant="secondary">{checkoutStats.summary.total_error}</Badge>
                      </div>
                    </>
                  )}
                  {!checkoutStats && (
                    <div className="py-4 text-center text-muted-foreground">No data</div>
                  )}
                </div>
              </Card>

              {/* Clarity API Data */}
              <Card className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Eye className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold">Microsoft Clarity API</h3>
                    <Badge variant="outline" className="text-xs">Last {Math.min(parseInt(days), 3)} days</Badge>
                    {clarityData?.mockData && (
                      <Badge variant="outline" className="text-xs text-amber-600">Estimated</Badge>
                    )}
                  </div>
                  <Button variant="outline" size="sm" onClick={fetchClarityData} disabled={clarityLoading}>
                    {clarityLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mb-4">Clarity API limited to max 3 days (not affected by selector above)</p>
                {clarityLoading ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading Clarity data...
                  </div>
                ) : clarityData?.metrics ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-border/50">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-600" />
                        <span>Total Sessions</span>
                      </div>
                      <Badge variant="secondary">{clarityData.metrics.totalSessions.toLocaleString()}</Badge>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border/50">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-blue-600" />
                        <span>Total Page Views</span>
                      </div>
                      <Badge variant="secondary">{clarityData.metrics.totalPageviews.toLocaleString()}</Badge>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border/50">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-emerald-600" />
                        <span>Unique Users</span>
                      </div>
                      <Badge variant="secondary">{clarityData.metrics.uniqueUsers.toLocaleString()}</Badge>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border/50">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-violet-600" />
                        <span>Avg Session (sec)</span>
                      </div>
                      <Badge variant="secondary">{Math.round(clarityData.metrics.avgSessionDuration)}</Badge>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-amber-600" />
                        <span>Bounce Rate</span>
                      </div>
                      <Badge variant="secondary">{clarityData.metrics.bounceRate.toFixed(1)}%</Badge>
                    </div>
                  </div>
                ) : (
                  <div className="py-4">
                    {clarityData?.error && (
                      <div className="p-3 mb-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <AlertCircle className="w-4 h-4" />
                          <strong>API Note:</strong>
                        </div>
                        <p className="text-xs">{clarityData.note || clarityData.error}</p>
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground text-center">
                      Clarity API requires OAuth2 setup. View metrics in the dashboard instead.
                    </p>
                    <a 
                      href="https://clarity.microsoft.com/projects/view/ue7ibjdmdj"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mt-2 w-full justify-center"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open Clarity Dashboard
                    </a>
                  </div>
                )}
              </Card>
            </div>

            {/* Session Comparison Chart */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Sessions Over Time</h3>
                <Badge variant="outline" className="text-xs">Our Tracking (page_visits)</Badge>
              </div>
              {pageVisits.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={pageVisits}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 11 }} 
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      }}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip 
                      contentStyle={{ fontSize: '12px' }}
                      formatter={(value: number, name: string) => [
                        value.toLocaleString(),
                        name === 'our_sessions' ? 'Sessions' : 'Pageviews'
                      ]}
                      labelFormatter={(label) => new Date(label).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    />
                    <Legend />
                    <Bar dataKey="our_sessions" name="Sessions" fill="hsl(221, 83%, 53%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="our_pageviews" name="Pageviews" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No page visit data yet. Navigate the site to start tracking.</p>
                  </div>
                </div>
              )}
            </Card>

            {/* Session Parity Check */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Session Parity Check</h3>
                <Badge variant="outline" className="text-xs">Our Tracking vs Clarity</Badge>
              </div>
              <div className="grid md:grid-cols-5 gap-4">
                <div className="p-4 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Our Sessions</p>
                  <p className="text-2xl font-bold text-indigo-600">
                    {pageVisitsTotal.sessions.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">page_visits</p>
                </div>
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Our Pageviews</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {pageVisitsTotal.pageviews.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">page_visits</p>
                </div>
                <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Clarity Sessions</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {clarityData?.metrics?.totalSessions?.toLocaleString() || '—'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">API / Estimated</p>
                </div>
                <div className="p-4 rounded-lg bg-violet-50 dark:bg-violet-900/20 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Parity Ratio</p>
                  <p className="text-2xl font-bold text-violet-600">
                    {clarityData?.metrics && clarityData.metrics.totalSessions > 0
                      ? `${((pageVisitsTotal.sessions / clarityData.metrics.totalSessions) * 100).toFixed(0)}%`
                      : '—'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">ours / clarity</p>
                </div>
                <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Checkout Rate</p>
                  <p className="text-2xl font-bold text-amber-600">
                    {pageVisitsTotal.sessions > 0 && checkoutStats
                      ? `${((checkoutStats.summary.total_initiated / pageVisitsTotal.sessions) * 100).toFixed(1)}%`
                      : '—'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">checkouts / sessions</p>
                </div>
              </div>
              <div className="mt-4 p-3 rounded-lg bg-muted/30 text-sm text-muted-foreground">
                <strong>Interpretation:</strong> Parity Ratio should be close to 100% if our tracking matches Clarity. 
                Values &lt;100% suggest we're missing some sessions; &gt;100% suggests duplicate tracking.
                Checkout Rate shows what % of sessions initiate checkout.
              </div>
            </Card>

            {/* Funnel Event Truth Table */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Funnel Event Truth Table</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Event</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Providers</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Data Sent</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Location</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Deduplication</th>
                    </tr>
                  </thead>
                  <tbody>
                    {FUNNEL_EVENT_TABLE.map((row, i) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-2 px-3">
                          <Badge variant="outline" className="font-mono text-xs">
                            {row.event}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 text-muted-foreground text-xs">
                          {row.providers.join(', ')}
                        </td>
                        <td className="py-2 px-3 text-muted-foreground text-xs">
                          {row.data.join(', ')}
                        </td>
                        <td className="py-2 px-3 text-xs max-w-[200px] truncate" title={row.location}>
                          {row.location}
                        </td>
                        <td className="py-2 px-3 text-xs text-muted-foreground">
                          {row.deduplication}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Live Event Log */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <MousePointer className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Live Event Log</h3>
                  <Badge variant="outline" className="text-xs">Last 50</Badge>
                </div>
                <Button variant="outline" size="sm" onClick={refreshProviderStatuses}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
              <ScrollArea className="h-[300px]">
                {eventLog.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    No events logged yet. Navigate the site to see events appear here.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {eventLog.map((entry) => (
                      <div
                        key={entry.id}
                        className={`p-3 rounded-lg border ${
                          entry.success ? 'bg-white dark:bg-background border-border' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            {entry.success ? (
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <XCircle className="w-3 h-3 text-red-500" />
                            )}
                            <Badge variant="outline" className="font-mono text-xs">
                              {entry.eventName}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {entry.provider}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(entry.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        {entry.error && (
                          <p className="text-xs text-red-600 mt-1">{entry.error}</p>
                        )}
                        <pre className="text-xs text-muted-foreground mt-1 overflow-x-auto max-w-full">
                          {JSON.stringify(entry.payload, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </Card>

            {/* Reconciliation Note */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Link2 className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Tracking Reconciliation</h3>
              </div>
              <div className="grid md:grid-cols-2 gap-6 text-sm text-muted-foreground">
                <div className="space-y-3">
                  <div>
                    <strong className="text-foreground">Source of Truth:</strong>
                    <p>Shopify orders are the canonical conversion source. Client-side events (Clarity sessions, Pinterest pagevisits) are engagement metrics, not conversions.</p>
                  </div>
                  <div>
                    <strong className="text-foreground">Attribution Flow:</strong>
                    <p>Pinterest epik click ID is captured on landing, stored in localStorage/cookie, written to Shopify cart attributes before checkout, and extracted by the shopify-order-webhook for server-side Pinterest Conversions API.</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <strong className="text-foreground">Deduplication:</strong>
                    <p>Purchase events use order_id as the canonical key. Client-side checkout events are intentionally blocked to prevent double-counting.</p>
                  </div>
                  <div>
                    <strong className="text-foreground">Verify Tracking:</strong>
                    <ol className="list-decimal list-inside mt-1 space-y-1">
                      <li>Check provider status cards above (all should be "Active")</li>
                      <li>Navigate the site and watch Live Event Log</li>
                      <li>Compare Pinterest purchases to Clarity sessions in respective dashboards</li>
                    </ol>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Phases Tab - Phase 0-3.5 Visibility (ADDITIVE) */}
          <TabsContent value="phases">
            <PhasesTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default QuizRevealTracking;
