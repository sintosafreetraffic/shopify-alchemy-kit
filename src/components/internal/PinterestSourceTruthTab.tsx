/**
 * Phase 4.2b - Pinterest Source Truth Dashboard
 * Shows sent vs blocked purchases, attribution breakdown, and recent events
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
} from "lucide-react";
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
} from "recharts";

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

export const PinterestSourceTruthTab = () => {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<SourceTruthEvent[]>([]);
  const [stats, setStats] = useState<SourceTruthStats | null>(null);
  const [days, setDays] = useState("7");
  const [statusFilter, setStatusFilter] = useState<string>("all");

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
    } catch (err) {
      console.error('Failed to fetch source truth data:', err);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
            <Target className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Pinterest Source Truth</h2>
            <div className="flex items-center gap-3 mt-1">
              <Badge variant={stats?.currentMode === 'pinterest_only' ? 'default' : 'secondary'}>
                Mode: {stats?.currentMode || 'unknown'}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Phase 4.2 Attribution Gating
              </span>
            </div>
          </div>
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
                    name === 'count' ? `${value} orders` : `€${value.toFixed(2)}`,
                    name === 'count' ? 'Orders' : 'Value'
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

      {/* Recent Events Table */}
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
