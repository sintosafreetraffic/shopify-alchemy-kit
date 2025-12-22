/**
 * Analytics Dashboard
 * Internal admin page for tracking quiz reveal + checkout + Pinterest purchase + client tracking analytics
 * Protected: Only accessible to authenticated users with admin role
 */
import { useState, useEffect, useCallback } from "react";
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

const QuizRevealTracking = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [checkoutStats, setCheckoutStats] = useState<CheckoutStats | null>(null);
  const [pinterestPurchases, setPinterestPurchases] = useState<PinterestPurchaseEvent[]>([]);
  const [pinterestStats, setPinterestStats] = useState<{
    total: number;
    totalValue: number;
    withAttribution: number;
    successRate: number;
    bySource: Record<string, number>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState("30");
  const [activeTab, setActiveTab] = useState("quiz");
  
  // Client-side tracking state
  const [providerStatuses, setProviderStatuses] = useState<ProviderStatus[]>([]);
  const [eventLog, setEventLog] = useState<EventLogEntry[]>([]);
  const [addToCartEvents, setAddToCartEvents] = useState<any[]>([]);
  
  // Auth state
  const [authChecking, setAuthChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

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
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      // Fetch quiz, checkout stats, and Pinterest purchases in parallel
      const daysNum = parseInt(days);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysNum);

      const [quizResponse, checkoutResponse, pinterestResult] = await Promise.all([
        fetch(`${supabaseUrl}/functions/v1/quiz-reveal-analytics`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseKey,
          },
          body: JSON.stringify({
            action: "get_stats",
            days: daysNum,
          }),
        }),
        fetch(`${supabaseUrl}/functions/v1/checkout-analytics`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseKey,
          },
          body: JSON.stringify({
            action: "get_stats",
            days: daysNum,
          }),
        }),
        supabase
          .from('pinterest_purchase_events')
          .select('*')
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: false })
          .limit(100),
      ]);

      if (!quizResponse.ok) {
        throw new Error(`Failed to fetch quiz stats: ${quizResponse.status}`);
      }
      
      const quizData = await quizResponse.json();
      setStats(quizData);
      
      if (checkoutResponse.ok) {
        const checkoutData = await checkoutResponse.json();
        setCheckoutStats(checkoutData);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchStats();
      refreshProviderStatuses();
      
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
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="14">Last 14 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
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
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="quiz" className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Quiz Reveal
            </TabsTrigger>
            <TabsTrigger value="checkout" className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              Checkout
            </TabsTrigger>
            <TabsTrigger value="tracking" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Tracking
            </TabsTrigger>
          </TabsList>

          {/* Quiz Analytics Tab */}
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
                            <p className="text-2xl font-bold">€{pinterestStats.totalValue.toFixed(0)}</p>
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

              {/* Clarity Info */}
              <Card className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Eye className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold">Microsoft Clarity</h3>
                  <Badge variant="outline" className="ml-2 text-xs">Session Recording</Badge>
                </div>
                <div className="space-y-3">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>Clarity Project:</strong> ue7ibjdmdj
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Clarity automatically tracks page views, sessions, clicks, and scroll depth. Access the full dashboard at:
                    </p>
                    <a 
                      href="https://clarity.microsoft.com/projects/view/ue7ibjdmdj"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-2"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Open Clarity Dashboard
                    </a>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center py-2 border-b border-border/50">
                      <span>Script Status</span>
                      <Badge variant={providerStatuses.find(p => p.name === 'Clarity')?.scriptLoaded ? 'default' : 'secondary'} className="bg-emerald-100 text-emerald-800">
                        {providerStatuses.find(p => p.name === 'Clarity')?.scriptLoaded ? 'Loaded' : 'Pending'}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border/50">
                      <span>Session Recording</span>
                      <span className="text-emerald-600 text-xs">Auto-tracked</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border/50">
                      <span>Heatmaps</span>
                      <span className="text-emerald-600 text-xs">Auto-tracked</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span>Click Maps</span>
                      <span className="text-emerald-600 text-xs">Auto-tracked</span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

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
        </Tabs>
      </div>
    </div>
  );
};

export default QuizRevealTracking;
