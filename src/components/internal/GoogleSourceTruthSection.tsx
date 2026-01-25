/**
 * Google Enhanced Conversions Source Truth Section
 * Shows sent events, GCLID match rate, and recent events
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
  Zap,
  Link2,
  Target,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

interface GoogleEvent {
  id: string;
  order_id: string;
  event_id: string;
  value: number;
  currency: string;
  email_hash: string | null;
  phone_hash: string | null;
  gclid: string | null;
  send_status: string;
  response_status: number | null;
  error_message: string | null;
  created_at: string;
}

interface GoogleStats {
  total: number;
  sent: number;
  withGclid: number;
  errors: number;
  totalValue: number;
  sentValue: number;
  gclidCoverage: number;
  emailCoverage: number;
}

interface TrendDataPoint {
  date: string;
  sent: number;
  withGclid: number;
  value: number;
}

const SEND_STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  sent_with_gclid: { label: 'Sent (GCLID)', variant: 'default' },
  sent_without_gclid: { label: 'Sent', variant: 'secondary' },
  logged: { label: 'Logged', variant: 'outline' },
  error: { label: 'Error', variant: 'destructive' },
  skipped_test: { label: 'Skipped', variant: 'outline' },
};

export const GoogleSourceTruthSection = () => {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<GoogleEvent[]>([]);
  const [stats, setStats] = useState<GoogleStats | null>(null);
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [days, setDays] = useState("7");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const daysNum = parseInt(days);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysNum);

      const { data, error } = await supabase
        .from('google_purchase_events')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;

      const allEvents = (data || []) as GoogleEvent[];
      
      // Calculate stats
      const sent = allEvents.filter(e => e.send_status?.includes('sent'));
      const withGclid = allEvents.filter(e => e.gclid);
      const withEmail = allEvents.filter(e => e.email_hash);
      const errors = allEvents.filter(e => e.send_status === 'error');

      setStats({
        total: allEvents.length,
        sent: sent.length,
        withGclid: withGclid.length,
        errors: errors.length,
        totalValue: allEvents.reduce((sum, e) => sum + (e.value || 0), 0),
        sentValue: sent.reduce((sum, e) => sum + (e.value || 0), 0),
        gclidCoverage: allEvents.length > 0 ? Math.round((withGclid.length / allEvents.length) * 100) : 0,
        emailCoverage: allEvents.length > 0 ? Math.round((withEmail.length / allEvents.length) * 100) : 0,
      });

      setEvents(allEvents);

      // Calculate daily trend
      const dailyData: Record<string, TrendDataPoint> = {};
      allEvents.forEach(e => {
        const date = new Date(e.created_at).toISOString().split('T')[0];
        if (!dailyData[date]) {
          dailyData[date] = { date, sent: 0, withGclid: 0, value: 0 };
        }
        if (e.send_status?.includes('sent')) {
          dailyData[date].sent++;
          dailyData[date].value += e.value || 0;
        }
        if (e.gclid) {
          dailyData[date].withGclid++;
        }
      });

      const sortedTrend = Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));
      setTrendData(sortedTrend);
    } catch (err) {
      console.error('Failed to fetch Google events:', err);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
            <Zap className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Google Enhanced Conversions</h2>
            <p className="text-sm text-muted-foreground">Server-side purchase tracking via EC</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last 24h</SelectItem>
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

      {/* Configuration Info */}
      <Card className="p-4 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20">
        <div className="flex items-center gap-3">
          <Target className="w-5 h-5 text-amber-600" />
          <div>
            <p className="text-sm font-medium">Conversion ID: AW-17903761568</p>
            <p className="text-xs text-muted-foreground">Enhanced Conversions enabled • Server-side tracking active</p>
          </div>
        </div>
      </Card>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
              <div>
                <p className="text-2xl font-bold">{stats.sent}</p>
                <p className="text-xs text-muted-foreground">Events Sent</p>
              </div>
            </div>
            <div className="mt-2 text-sm text-emerald-600">
              {formatCurrency(stats.sentValue)} tracked
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Link2 className="w-8 h-8 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">{stats.gclidCoverage}%</p>
                <p className="text-xs text-muted-foreground">GCLID Coverage</p>
              </div>
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              {stats.withGclid} with click ID
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Target className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats.emailCoverage}%</p>
                <p className="text-xs text-muted-foreground">Email Match</p>
              </div>
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              Enhanced matching rate
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <XCircle className="w-8 h-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{stats.errors}</p>
                <p className="text-xs text-muted-foreground">Errors</p>
              </div>
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              {stats.total > 0 ? ((stats.errors / stats.total) * 100).toFixed(1) : 0}% error rate
            </div>
          </Card>
        </div>
      )}

      {/* Trend Chart */}
      {trendData.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-medium mb-4">Daily Events</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v) => new Date(v).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value: number, name: string) => [value, name === 'sent' ? 'Total Sent' : 'With GCLID']}
                  labelFormatter={(label) => new Date(label).toLocaleDateString()}
                />
                <Area type="monotone" dataKey="sent" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
                <Area type="monotone" dataKey="withGclid" stroke="#10b981" fill="#10b981" fillOpacity={0.4} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Events Table */}
      <Card className="p-4">
        <h3 className="text-sm font-medium mb-4">Recent Events ({events.length})</h3>
        <ScrollArea className="h-80">
          <div className="space-y-2">
            {events.map((event) => {
              const config = SEND_STATUS_CONFIG[event.send_status] || { label: event.send_status, variant: 'outline' as const };
              return (
                <div key={event.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    {event.gclid ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{event.order_id}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(event.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <div>
                      <p className="text-sm font-medium">{formatCurrency(event.value)}</p>
                      <div className="flex gap-1">
                        {event.gclid && <Badge variant="outline" className="text-xs">gclid</Badge>}
                        {event.email_hash && <Badge variant="outline" className="text-xs">email</Badge>}
                        {event.phone_hash && <Badge variant="outline" className="text-xs">phone</Badge>}
                      </div>
                    </div>
                    <Badge variant={config.variant}>
                      {config.label}
                    </Badge>
                  </div>
                </div>
              );
            })}
            {events.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No Google events in this period
              </div>
            )}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
};

export default GoogleSourceTruthSection;
