/**
 * Phase 4.2b - Pinterest Source Truth Dashboard
 * Shows sent vs blocked purchases, attribution breakdown, and recent events
 * Phase 5: Added EQS (Event Quality Score) monitoring card
 * Phase 6: Added Ads Reporting section
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Target,
  ShieldCheck,
  ShieldX,
  TrendingUp,
  Filter,
  Eye,
  Link2,
  Zap,
  ChevronDown,
  BarChart3,
  Activity,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import { Radio } from "lucide-react";
import { PinterestEQSCard } from "./PinterestEQSCard";
import AdsReportingSection from "./AdsReportingSection";

interface SourceTruthEvent {
  id: string;
  order_id: string;
  value: number;
  currency: string;
  epik: string | null;
  attribution_source: string | null;
  attribution_confidence: string | null;
  attribution_reason: string | null;
  send_status: string;
  send_status_reason: string | null;
  send_mode: string | null;
  render_status: string;
  is_test: boolean;
  created_at: string;
}

interface SourceTruthStats {
  total: number;
  sent: number;
  blocked: number;
  blockedAttribution: number;
  blockedDisabled: number;
  blockedTest: number;
  blockedError: number;
  totalValue: number;
  sentValue: number;
  blockedValue: number;
  byAttributionSource: Record<string, { count: number; value: number }>;
  byConfidence: Record<string, number>;
  currentMode: string;
}

const SEND_STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType; bgColor: string }> = {
  sent: { label: 'Sent', color: 'text-emerald-600', icon: CheckCircle, bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' },
  blocked_attribution: { label: 'Blocked (Attribution)', color: 'text-amber-600', icon: ShieldX, bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
  blocked_disabled: { label: 'Blocked (Disabled)', color: 'text-gray-600', icon: XCircle, bgColor: 'bg-gray-100 dark:bg-gray-800/30' },
  blocked_test: { label: 'Blocked (Test)', color: 'text-blue-600', icon: Filter, bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  blocked_error: { label: 'Blocked (Error)', color: 'text-red-600', icon: AlertTriangle, bgColor: 'bg-red-100 dark:bg-red-900/30' },
};

const ATTRIBUTION_SOURCE_CONFIG: Record<string, { label: string; color: string }> = {
  pinterest: { label: 'Pinterest', color: 'hsl(0, 80%, 55%)' }, // Pinterest red
  organic: { label: 'Organic', color: 'hsl(142, 60%, 45%)' }, // Green
  other: { label: 'Other', color: 'hsl(217, 60%, 55%)' }, // Blue
  unknown: { label: 'Unknown', color: 'hsl(0, 0%, 60%)' }, // Gray
};

const CONFIDENCE_CONFIG: Record<string, { label: string; color: string }> = {
  high: { label: 'High', color: 'hsl(142, 60%, 45%)' },
  medium: { label: 'Medium', color: 'hsl(45, 80%, 50%)' },
  low: { label: 'Low', color: 'hsl(0, 0%, 60%)' },
};

const SEND_MODE_CONFIG: Record<string, { label: string; description: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  pinterest_only: { 
    label: 'Pinterest Only', 
    description: 'Only send Pinterest-attributed orders (EPIK or UTM). Organic orders are blocked.',
    variant: 'default'
  },
  all_orders: { 
    label: 'All Orders', 
    description: 'Send all orders to Pinterest regardless of attribution. May inflate ROAS.',
    variant: 'secondary'
  },
  disabled: { 
    label: 'Disabled', 
    description: 'No orders are sent to Pinterest. Use for testing or maintenance.',
    variant: 'destructive'
  },
};

const MetricCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  variant?: 'default' | 'success' | 'warning' | 'error';
}) => {
  const variantStyles = {
    default: 'border-border',
    success: 'border-emerald-500/30 bg-emerald-500/5',
    warning: 'border-amber-500/30 bg-amber-500/5',
    error: 'border-red-500/30 bg-red-500/5',
  };

  return (
    <Card className={`p-4 ${variantStyles[variant]}`}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-2xl font-bold tabular-nums">{value}</p>
          <p className="text-xs text-muted-foreground">{title}</p>
          {subtitle && <p className="text-xs text-muted-foreground/70 mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </Card>
  );
};

const EventRow = ({ event }: { event: SourceTruthEvent }) => {
  const statusConfig = SEND_STATUS_CONFIG[event.send_status] || SEND_STATUS_CONFIG.sent;
  const StatusIcon = statusConfig.icon;
  const sourceConfig = ATTRIBUTION_SOURCE_CONFIG[event.attribution_source || 'unknown'];
  const confidenceConfig = CONFIDENCE_CONFIG[event.attribution_confidence || 'low'];

  return (
    <div className={`p-3 rounded-lg ${statusConfig.bgColor} flex flex-col gap-2`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusIcon className={`w-4 h-4 ${statusConfig.color}`} />
          <span className="font-mono text-sm">{event.order_id}</span>
          {event.is_test && (
            <Badge variant="outline" className="text-xs">TEST</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold">€{event.value.toFixed(2)}</span>
          <span className="text-xs text-muted-foreground">
            {new Date(event.created_at).toLocaleString()}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <Target className="w-3 h-3" />
          <span className={statusConfig.color}>{statusConfig.label}</span>
        </div>
        <div className="flex items-center gap-1">
          <Link2 className="w-3 h-3" />
          <span style={{ color: sourceConfig.color }}>{sourceConfig.label}</span>
          <Badge variant="secondary" className="text-[10px] h-4 px-1">
            {confidenceConfig.label}
          </Badge>
        </div>
        {event.attribution_reason && (
          <span className="text-muted-foreground">{event.attribution_reason}</span>
        )}
        {event.epik && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <Zap className="w-3 h-3" />
            <span className="font-mono truncate max-w-[100px]">{event.epik}</span>
          </div>
        )}
      </div>
    </div>
  );
};

interface TrendDataPoint {
  date: string;
  pinterest: number;
  organic: number;
  other: number;
  unknown: number;
  sent: number;
  blocked: number;
}

export const PinterestSourceTruthTab = () => {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<SourceTruthEvent[]>([]);
  const [stats, setStats] = useState<SourceTruthStats | null>(null);
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [liveEvents, setLiveEvents] = useState<SourceTruthEvent[]>([]);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [days, setDays] = useState("7");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [pendingMode, setPendingMode] = useState<string | null>(null);
  const [isUpdatingMode, setIsUpdatingMode] = useState(false);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const daysNum = parseInt(days);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysNum);

      // Fetch events and current mode in parallel
      const [eventsResult, modeResult] = await Promise.all([
        supabase
          .from('pinterest_purchase_events')
          .select('id, order_id, value, currency, epik, attribution_source, attribution_confidence, attribution_reason, send_status, send_status_reason, send_mode, render_status, is_test, created_at')
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: false })
          .limit(200),
        supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'pinterest_purchase_send_mode')
          .single(),
      ]);

      if (eventsResult.error) throw eventsResult.error;

      const allEvents = eventsResult.data as SourceTruthEvent[];
      
      // Exclude test events for stats but show them in events list
      const nonTestEvents = allEvents.filter(e => !e.is_test);

      // Calculate stats
      const sent = nonTestEvents.filter(e => e.send_status === 'sent');
      const blocked = nonTestEvents.filter(e => e.send_status !== 'sent');

      const byAttributionSource: Record<string, { count: number; value: number }> = {};
      const byConfidence: Record<string, number> = {};

      nonTestEvents.forEach(e => {
        const source = e.attribution_source || 'unknown';
        if (!byAttributionSource[source]) {
          byAttributionSource[source] = { count: 0, value: 0 };
        }
        byAttributionSource[source].count++;
        byAttributionSource[source].value += e.value || 0;

        const confidence = e.attribution_confidence || 'low';
        byConfidence[confidence] = (byConfidence[confidence] || 0) + 1;
      });

      // Get current mode
      let currentMode = 'pinterest_only';
      if (modeResult.data?.value && typeof modeResult.data.value === 'object' && 'mode' in modeResult.data.value) {
        currentMode = (modeResult.data.value as { mode: string }).mode;
      }

      setStats({
        total: nonTestEvents.length,
        sent: sent.length,
        blocked: blocked.length,
        blockedAttribution: nonTestEvents.filter(e => e.send_status === 'blocked_attribution').length,
        blockedDisabled: nonTestEvents.filter(e => e.send_status === 'blocked_disabled').length,
        blockedTest: allEvents.filter(e => e.send_status === 'blocked_test').length,
        blockedError: nonTestEvents.filter(e => e.send_status === 'blocked_error').length,
        totalValue: nonTestEvents.reduce((sum, e) => sum + (e.value || 0), 0),
        sentValue: sent.reduce((sum, e) => sum + (e.value || 0), 0),
        blockedValue: blocked.reduce((sum, e) => sum + (e.value || 0), 0),
        byAttributionSource,
        byConfidence,
        currentMode,
      });

      setEvents(allEvents);

      // Calculate daily trend data
      const dailyData: Record<string, TrendDataPoint> = {};
      nonTestEvents.forEach(e => {
        const date = new Date(e.created_at).toISOString().split('T')[0];
        if (!dailyData[date]) {
          dailyData[date] = { date, pinterest: 0, organic: 0, other: 0, unknown: 0, sent: 0, blocked: 0 };
        }
        const source = e.attribution_source || 'unknown';
        if (source === 'pinterest') dailyData[date].pinterest++;
        else if (source === 'organic') dailyData[date].organic++;
        else if (source === 'other') dailyData[date].other++;
        else dailyData[date].unknown++;

        if (e.send_status === 'sent') dailyData[date].sent++;
        else dailyData[date].blocked++;
      });

      const sortedTrend = Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));
      setTrendData(sortedTrend);
    } catch (err) {
      console.error('Failed to fetch source truth data:', err);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time subscription for live purchase events
  useEffect(() => {
    console.log('[SourceTruth] Setting up real-time subscription');
    
    const channel = supabase
      .channel('source-truth-live-events')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'pinterest_purchase_events',
        },
        (payload) => {
          console.log('[SourceTruth] New purchase event:', payload);
          const newEvent = payload.new as SourceTruthEvent;
          
          setLiveEvents(prev => [newEvent, ...prev].slice(0, 10));
          
          // Refresh stats if not a test event
          if (!newEvent.is_test) {
            fetchData();
          }
        }
      )
      .subscribe((status) => {
        console.log('[SourceTruth] Subscription status:', status);
        setIsLiveConnected(status === 'SUBSCRIBED');
      });

    return () => {
      console.log('[SourceTruth] Cleaning up subscription');
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  const updateSendMode = async (newMode: string) => {
    setIsUpdatingMode(true);
    try {
      const { error } = await supabase
        .from('app_settings')
        .update({ value: { mode: newMode }, updated_at: new Date().toISOString() })
        .eq('key', 'pinterest_purchase_send_mode');

      if (error) throw error;

      toast({
        title: "Send Mode Updated",
        description: `Pinterest tracking is now set to "${SEND_MODE_CONFIG[newMode]?.label || newMode}"`,
      });

      // Refresh data to show new mode
      await fetchData();
    } catch (err) {
      console.error('Failed to update send mode:', err);
      toast({
        title: "Update Failed",
        description: "Could not update send mode. Check admin permissions.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingMode(false);
      setPendingMode(null);
    }
  };

  const filteredEvents = statusFilter === 'all'
    ? events
    : events.filter(e => e.send_status === statusFilter);

  // Chart data
  const sendStatusChartData = stats ? [
    { name: 'Sent to Pinterest', value: stats.sent, color: 'hsl(142, 60%, 45%)' },
    { name: 'Blocked (Attribution)', value: stats.blockedAttribution, color: 'hsl(45, 80%, 50%)' },
    { name: 'Blocked (Disabled)', value: stats.blockedDisabled, color: 'hsl(0, 0%, 60%)' },
    { name: 'Blocked (Error)', value: stats.blockedError, color: 'hsl(0, 70%, 55%)' },
  ].filter(d => d.value > 0) : [];

  const attributionChartData = stats
    ? Object.entries(stats.byAttributionSource).map(([source, data]) => ({
        name: ATTRIBUTION_SOURCE_CONFIG[source]?.label || source,
        count: data.count,
        value: data.value,
        color: ATTRIBUTION_SOURCE_CONFIG[source]?.color || 'hsl(0, 0%, 60%)',
      }))
    : [];

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Confirmation Dialog */}
      <AlertDialog open={!!pendingMode} onOpenChange={() => setPendingMode(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Pinterest Send Mode?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>You are about to change the send mode to:</p>
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-semibold">{SEND_MODE_CONFIG[pendingMode || '']?.label}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {SEND_MODE_CONFIG[pendingMode || '']?.description}
                </p>
              </div>
              <p className="text-sm text-amber-600 dark:text-amber-400">
                This change takes effect immediately for all new orders.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdatingMode}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => pendingMode && updateSendMode(pendingMode)}
              disabled={isUpdatingMode}
            >
              {isUpdatingMode ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Confirm Change'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
            <Target className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Pinterest Source Truth</h2>
            <span className="text-xs text-muted-foreground">
              Phase 4.3 Attribution Gating
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Send Mode Toggle */}
          <Select 
            value={stats?.currentMode || 'pinterest_only'} 
            onValueChange={(value) => setPendingMode(value)}
            disabled={isUpdatingMode}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Send Mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pinterest_only">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Pinterest Only
                </div>
              </SelectItem>
              <SelectItem value="all_orders">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  All Orders
                </div>
              </SelectItem>
              <SelectItem value="disabled">
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-600" />
                  Disabled
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

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
          <Button variant="outline" size="icon" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Purchases"
          value={stats?.total || 0}
          subtitle={`€${(stats?.totalValue || 0).toFixed(2)} total`}
          icon={Eye}
        />
        <MetricCard
          title="Sent to Pinterest"
          value={stats?.sent || 0}
          subtitle={`€${(stats?.sentValue || 0).toFixed(2)} attributed`}
          icon={ShieldCheck}
          variant="success"
        />
        <MetricCard
          title="Blocked (Non-Pinterest)"
          value={stats?.blockedAttribution || 0}
          subtitle={`€${(stats?.blockedValue || 0).toFixed(2)} filtered`}
          icon={ShieldX}
          variant="warning"
        />
        <MetricCard
          title="Pinterest Attribution Rate"
          value={stats?.total ? `${Math.round((stats.sent / stats.total) * 100)}%` : '0%'}
          subtitle="Of all purchases"
          icon={TrendingUp}
        />
      </div>

      {/* Ads Reporting Section - Collapsible */}
      <Collapsible defaultOpen={false}>
        <Card className="p-0 overflow-hidden">
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <BarChart3 className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-left">Ads Performance & Insights</h3>
              </div>
              <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform duration-200 [&[data-state=open]>svg]:rotate-180" />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="border-t">
              <AdsReportingSection />
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* EQS Measurement Quality Card - Collapsible */}
      <Collapsible defaultOpen={false}>
        <Card className="p-0 overflow-hidden">
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-left">Event Quality Score (EQS)</h3>
              </div>
              <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform duration-200" />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="border-t">
              <PinterestEQSCard />
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Send Status Pie Chart */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4">Send Status Breakdown</h3>
          {sendStatusChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={sendStatusChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {sendStatusChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [value, 'Orders']}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
              No data available
            </div>
          )}
        </Card>

        {/* Attribution Source Bar Chart */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4">Attribution Source Breakdown</h3>
          {attributionChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={attributionChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={80} />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    name === 'Orders' ? `${value} orders` : `€${value.toFixed(2)}`,
                    name === 'Orders' ? 'Orders' : 'Value'
                  ]}
                />
                <Legend />
                <Bar dataKey="count" name="Orders" fill="hsl(217, 60%, 55%)" />
                <Bar dataKey="value" name="Value (€)" fill="hsl(142, 60%, 45%)" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
              No data available
            </div>
          )}
        </Card>
      </div>

      {/* Phase 4.4 - Attribution Trend Over Time */}
      {trendData.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold mb-4">Attribution Trend Over Time</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="pinterestGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(0, 80%, 55%)" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="hsl(0, 80%, 55%)" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="organicGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(142, 60%, 45%)" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="hsl(142, 60%, 45%)" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="otherGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(217, 60%, 55%)" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="hsl(217, 60%, 55%)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 11 }} 
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="pinterest"
                name="Pinterest"
                stroke="hsl(0, 80%, 55%)"
                strokeWidth={2}
                fill="url(#pinterestGradient)"
                stackId="1"
              />
              <Area
                type="monotone"
                dataKey="organic"
                name="Organic"
                stroke="hsl(142, 60%, 45%)"
                strokeWidth={2}
                fill="url(#organicGradient)"
                stackId="1"
              />
              <Area
                type="monotone"
                dataKey="other"
                name="Other"
                stroke="hsl(217, 60%, 55%)"
                strokeWidth={2}
                fill="url(#otherGradient)"
                stackId="1"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Phase 4.5 - Real-time Purchase Stream */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Radio className={`w-5 h-5 ${isLiveConnected ? 'text-emerald-500 animate-pulse' : 'text-muted-foreground'}`} />
            <h3 className="font-semibold">Live Purchase Stream</h3>
            <Badge variant={isLiveConnected ? 'default' : 'secondary'} className="ml-1">
              {isLiveConnected ? 'Live' : 'Connecting...'}
            </Badge>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setLiveEvents([])}
            disabled={liveEvents.length === 0}
          >
            Clear
          </Button>
        </div>
        
        {liveEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-muted-foreground border border-dashed rounded-lg">
            <Radio className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm">Waiting for new purchase events...</p>
            <p className="text-xs mt-1">Events will appear here in real-time</p>
          </div>
        ) : (
          <ScrollArea className="h-48">
            <div className="space-y-2">
              {liveEvents.map((event) => (
                <EventRow key={event.id} event={event} />
              ))}
            </div>
          </ScrollArea>
        )}
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Recent Purchase Events</h3>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="blocked_attribution">Blocked (Attribution)</SelectItem>
              <SelectItem value="blocked_disabled">Blocked (Disabled)</SelectItem>
              <SelectItem value="blocked_test">Blocked (Test)</SelectItem>
              <SelectItem value="blocked_error">Blocked (Error)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {filteredEvents.length > 0 ? (
              filteredEvents.map(event => (
                <EventRow key={event.id} event={event} />
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No events found for the selected filter
              </div>
            )}
          </div>
        </ScrollArea>
      </Card>

      {/* Legend / Info */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">How Attribution Gating Works</h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm text-muted-foreground">
          <div>
            <p className="font-medium text-foreground mb-1">Strategy A: Pinterest-Only Mode</p>
            <ul className="space-y-1 list-disc list-inside">
              <li><span className="font-medium text-emerald-600">Sent:</span> Orders with Pinterest attribution (EPIK or UTM)</li>
              <li><span className="font-medium text-amber-600">Blocked:</span> Organic/other orders - not sent to Pinterest</li>
              <li>Prevents inflated ROAS by only attributing real Pinterest conversions</li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-foreground mb-1">Attribution Confidence Levels</p>
            <ul className="space-y-1 list-disc list-inside">
              <li><span className="font-medium text-emerald-600">High:</span> EPIK present (direct Pinterest click)</li>
              <li><span className="font-medium text-amber-600">Medium:</span> UTM indicates Pinterest source</li>
              <li><span className="font-medium text-gray-500">Low:</span> No Pinterest signals detected</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PinterestSourceTruthTab;
