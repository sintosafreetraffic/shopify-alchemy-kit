/**
 * Delivery State Dashboard Component
 * Visualizes delivery_state breakdown and stuck event counts
 * Part of Day 6 sprint - monitoring operational state of purchase events
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Ban,
  Zap,
  TrendingUp,
  Package,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

interface DeliveryStateBreakdown {
  state: string;
  count: number;
  percentage: number;
}

interface StuckEventInfo {
  id: string;
  order_id: string;
  created_at: string;
  render_status: string;
  value: number;
  hours_stuck: number;
}

const STATE_COLORS: Record<string, string> = {
  sent: '#10b981', // emerald-500
  pending: '#f59e0b', // amber-500
  failed: '#ef4444', // red-500
  blocked_test: '#6b7280', // gray-500
  blocked_disabled: '#8b5cf6', // violet-500
  blocked_attribution: '#3b82f6', // blue-500
  blocked_duplicate: '#14b8a6', // teal-500
  blocked_error: '#f97316', // orange-500
};

const STATE_ICONS: Record<string, React.ElementType> = {
  sent: CheckCircle,
  pending: Clock,
  failed: XCircle,
  blocked_test: Ban,
  blocked_disabled: Ban,
  blocked_attribution: Ban,
  blocked_duplicate: Ban,
  blocked_error: AlertTriangle,
};

const STATE_LABELS: Record<string, string> = {
  sent: 'Sent to Pinterest',
  pending: 'Pending',
  failed: 'Failed',
  blocked_test: 'Blocked (Test)',
  blocked_disabled: 'Blocked (Disabled)',
  blocked_attribution: 'Blocked (Non-Pinterest)',
  blocked_duplicate: 'Blocked (Duplicate)',
  blocked_error: 'Blocked (Error)',
};

export const DeliveryStateDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [breakdown, setBreakdown] = useState<DeliveryStateBreakdown[]>([]);
  const [stuckEvents, setStuckEvents] = useState<StuckEventInfo[]>([]);
  const [totalEvents, setTotalEvents] = useState(0);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch delivery state breakdown (non-test events from last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      
      const { data: events, error: eventsError } = await supabase
        .from('pinterest_purchase_events')
        .select('delivery_state')
        .eq('is_test', false)
        .gte('created_at', sevenDaysAgo);

      if (eventsError) {
        console.error('Failed to fetch events:', eventsError);
        return;
      }

      // Aggregate by delivery_state
      const stateCounts: Record<string, number> = {};
      (events || []).forEach(e => {
        const state = e.delivery_state || 'pending';
        stateCounts[state] = (stateCounts[state] || 0) + 1;
      });

      const total = events?.length || 0;
      setTotalEvents(total);

      const breakdownData: DeliveryStateBreakdown[] = Object.entries(stateCounts)
        .map(([state, count]) => ({
          state,
          count,
          percentage: total > 0 ? Math.round((count / total) * 100) : 0,
        }))
        .sort((a, b) => b.count - a.count);

      setBreakdown(breakdownData);

      // Fetch stuck events (pending > 1 hour, non-test)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      const { data: stuck, error: stuckError } = await supabase
        .from('pinterest_purchase_events')
        .select('id, order_id, created_at, render_status, value')
        .eq('delivery_state', 'pending')
        .eq('is_test', false)
        .lt('created_at', oneHourAgo)
        .order('created_at', { ascending: true })
        .limit(10);

      if (stuckError) {
        console.error('Failed to fetch stuck events:', stuckError);
        return;
      }

      const stuckWithHours: StuckEventInfo[] = (stuck || []).map(e => ({
        ...e,
        hours_stuck: Math.round((Date.now() - new Date(e.created_at).getTime()) / (1000 * 60 * 60)),
      }));

      setStuckEvents(stuckWithHours);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Failed to fetch delivery state data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Prepare pie chart data
  const pieData = breakdown.map(b => ({
    name: STATE_LABELS[b.state] || b.state,
    value: b.count,
    color: STATE_COLORS[b.state] || '#9ca3af',
  }));

  const sentCount = breakdown.find(b => b.state === 'sent')?.count || 0;
  const pendingCount = breakdown.find(b => b.state === 'pending')?.count || 0;
  const failedCount = breakdown.find(b => b.state === 'failed')?.count || 0;
  const blockedCount = breakdown.filter(b => b.state.startsWith('blocked_')).reduce((sum, b) => sum + b.count, 0);

  const deliveryRate = totalEvents > 0 ? Math.round((sentCount / totalEvents) * 100) : 0;

  if (loading) {
    return (
      <Card className="p-6 flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg">Delivery State Dashboard</h3>
          <Badge variant="outline" className="ml-2">
            Last 7 days
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Updated {lastRefresh.toLocaleTimeString()}
          </span>
          <Button variant="ghost" size="sm" onClick={fetchData}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 border-emerald-500/30 bg-emerald-500/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">{sentCount}</p>
              <p className="text-xs text-muted-foreground">Sent</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-amber-500/30 bg-amber-500/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">{pendingCount}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-red-500/30 bg-red-500/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">{failedCount}</p>
              <p className="text-xs text-muted-foreground">Failed</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-blue-500/30 bg-blue-500/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Ban className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">{blockedCount}</p>
              <p className="text-xs text-muted-foreground">Blocked</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Delivery Rate Progress */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <span className="font-medium">Delivery Rate</span>
          </div>
          <span className="text-2xl font-bold">{deliveryRate}%</span>
        </div>
        <Progress value={deliveryRate} className="h-3" />
        <p className="text-xs text-muted-foreground mt-2">
          {sentCount} of {totalEvents} events successfully delivered to Pinterest
        </p>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <Card className="p-5">
          <h4 className="font-medium mb-4">State Distribution</h4>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [`${value} events`, 'Count']}
                />
                <Legend 
                  layout="vertical" 
                  align="right" 
                  verticalAlign="middle"
                  formatter={(value) => <span className="text-xs">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-muted-foreground">
              No events in the last 7 days
            </div>
          )}
        </Card>

        {/* State Breakdown List */}
        <Card className="p-5">
          <h4 className="font-medium mb-4">Detailed Breakdown</h4>
          <div className="space-y-3">
            {breakdown.map((item) => {
              const Icon = STATE_ICONS[item.state] || Clock;
              const color = STATE_COLORS[item.state] || '#9ca3af';
              const label = STATE_LABELS[item.state] || item.state;
              
              return (
                <div key={item.state} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" style={{ color }} />
                    <span className="text-sm">{label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium tabular-nums">{item.count}</span>
                    <Badge variant="secondary" className="text-xs">
                      {item.percentage}%
                    </Badge>
                  </div>
                </div>
              );
            })}
            {breakdown.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No events found
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* Stuck Events Alert */}
      {stuckEvents.length > 0 && (
        <Card className="p-5 border-amber-500/50 bg-amber-500/10">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h4 className="font-medium text-amber-700 dark:text-amber-400">
              Stuck Events ({stuckEvents.length})
            </h4>
            <Badge variant="destructive" className="ml-auto">
              {stuckEvents.length >= 5 ? 'Critical' : 'Warning'}
            </Badge>
          </div>
          <p className="text-sm text-amber-600 dark:text-amber-300 mb-4">
            These events have been in 'pending' state for over 1 hour and may require investigation.
          </p>
          <div className="space-y-2">
            {stuckEvents.map((event) => (
              <div 
                key={event.id} 
                className="flex items-center justify-between p-3 rounded-lg bg-background/50"
              >
                <div>
                  <span className="text-sm font-medium">Order #{event.order_id?.slice(-8)}</span>
                  <p className="text-xs text-muted-foreground">
                    {event.render_status} • Stuck for {event.hours_stuck}h
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold">${(event.value || 0).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* No Stuck Events - All Clear */}
      {stuckEvents.length === 0 && (
        <Card className="p-5 border-emerald-500/30 bg-emerald-500/5">
          <div className="flex items-center gap-3">
            <Zap className="w-6 h-6 text-emerald-500" />
            <div>
              <p className="font-medium text-emerald-700 dark:text-emerald-400">All Clear</p>
              <p className="text-sm text-muted-foreground">No stuck events detected. Pipeline is healthy.</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default DeliveryStateDashboard;
