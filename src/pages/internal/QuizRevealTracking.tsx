/**
 * Analytics Dashboard
 * Internal admin page for tracking quiz reveal + checkout analytics
 * Protected: Only accessible to authenticated users with admin role
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
} from "recharts";

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

const QuizRevealTracking = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [checkoutStats, setCheckoutStats] = useState<CheckoutStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState("30");
  const [activeTab, setActiveTab] = useState("quiz");
  
  // Auth state
  const [authChecking, setAuthChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

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

      // Fetch both quiz and checkout stats in parallel
      const [quizResponse, checkoutResponse] = await Promise.all([
        fetch(`${supabaseUrl}/functions/v1/quiz-reveal-analytics`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseKey,
          },
          body: JSON.stringify({
            action: "get_stats",
            days: parseInt(days),
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
            days: parseInt(days),
          }),
        }),
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchStats();
    }
  }, [days, isAdmin]);

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
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="quiz" className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Quiz Reveal
            </TabsTrigger>
            <TabsTrigger value="checkout" className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              Checkout
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
        </Tabs>
      </div>
    </div>
  );
};

export default QuizRevealTracking;
