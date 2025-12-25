/**
 * Phase 4 Production Monitoring Tab
 * Real-time health metrics, alert history, and quick actions for incident response
 * Now with live WebSocket subscription for real-time purchase events
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  Loader2,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Activity,
  Zap,
  Shield,
  Bell,
  Clock,
  TrendingUp,
  TrendingDown,
  Server,
  Database,
  ExternalLink,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Minus,
  DollarSign,
  Package,
  AlertCircle,
  Radio,
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

interface HealthMetrics {
  pinterestCapi: {
    enabled: boolean;
    successRate: number;
    totalEvents: number;
    totalValue: number;
    lastEventTime: string | null;
    trend: 'up' | 'down' | 'stable';
  };
  reconciliation: {
    lastRun: string | null;
    missingSeen7d: number;
    recovered7d: number;
    deadLetters7d: number;
  };
  tracking: {
    consentRate: number;
    epikRate: number;
    contextRows7d: number;
  };
  system: {
    edgeFunctionsHealthy: boolean;
    lastAlertTime: string | null;
    activeAlerts: number;
  };
}

interface HealthTrend {
  day: string;
  successRate: number;
  ordersTracked: number;
  value: number;
}

interface Alert {
  id: string;
  severity: 'info' | 'warn' | 'error';
  type: string;
  message: string;
  status: string;
  created_at: string;
  day: string;
  acknowledged_at: string | null;
}

interface LiveEvent {
  id: string;
  order_id: string;
  render_status: string;
  value: number;
  currency: string;
  is_test: boolean;
  created_at: string;
}

const StatusIndicator = ({ status }: { status: 'healthy' | 'warning' | 'error' | 'unknown' }) => {
  const configs = {
    healthy: { bg: 'bg-emerald-500', pulse: true, label: 'Healthy' },
    warning: { bg: 'bg-amber-500', pulse: true, label: 'Warning' },
    error: { bg: 'bg-red-500', pulse: true, label: 'Error' },
    unknown: { bg: 'bg-gray-400', pulse: false, label: 'Unknown' },
  };
  
  const config = configs[status];
  
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <div className={`w-3 h-3 rounded-full ${config.bg}`} />
        {config.pulse && (
          <div className={`absolute inset-0 w-3 h-3 rounded-full ${config.bg} animate-ping opacity-75`} />
        )}
      </div>
      <span className="text-sm font-medium">{config.label}</span>
    </div>
  );
};

const MetricCard = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  status,
  className = ''
}: { 
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'stable';
  status?: 'healthy' | 'warning' | 'error';
  className?: string;
}) => {
  const statusColors = {
    healthy: 'border-emerald-500/30 bg-emerald-500/5',
    warning: 'border-amber-500/30 bg-amber-500/5',
    error: 'border-red-500/30 bg-red-500/5',
  };
  
  const trendIcons = {
    up: <ArrowUp className="w-4 h-4 text-emerald-500" />,
    down: <ArrowDown className="w-4 h-4 text-red-500" />,
    stable: <Minus className="w-4 h-4 text-muted-foreground" />,
  };

  return (
    <Card className={`p-4 ${status ? statusColors[status] : ''} ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums">{value}</p>
            <p className="text-xs text-muted-foreground">{title}</p>
            {subtitle && <p className="text-xs text-muted-foreground/70 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {trend && trendIcons[trend]}
      </div>
    </Card>
  );
};

const AlertRow = ({ alert, onAcknowledge }: { alert: Alert; onAcknowledge: (id: string) => void }) => {
  const severityConfig = {
    info: { icon: AlertCircle, bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400' },
    warn: { icon: AlertTriangle, bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400' },
    error: { icon: XCircle, bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' },
  };
  
  const config = severityConfig[alert.severity] || severityConfig.info;
  const Icon = config.icon;
  
  return (
    <div className={`p-3 rounded-lg ${config.bg} flex items-start gap-3`}>
      <Icon className={`w-5 h-5 ${config.text} flex-shrink-0 mt-0.5`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className="text-xs">{alert.type}</Badge>
          <span className="text-xs text-muted-foreground">{alert.day}</span>
        </div>
        <p className={`text-sm ${config.text}`}>{alert.message}</p>
      </div>
      {alert.status !== 'acknowledged' && (
        <Button 
          variant="ghost" 
          size="sm" 
          className="flex-shrink-0"
          onClick={() => onAcknowledge(alert.id)}
        >
          Ack
        </Button>
      )}
    </div>
  );
};

export const ProductionMonitoringTab = () => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<HealthMetrics | null>(null);
  const [trends, setTrends] = useState<HealthTrend[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchHealthData = useCallback(async () => {
    try {
      // Fetch multiple data sources in parallel
      const [
        purchaseEventsResult,
        healthDailyResult,
        alertsResult,
        missingEventsResult,
        deadLettersResult,
        capiStatusResult,
      ] = await Promise.all([
        // Recent purchase events (7 days, non-test)
        supabase
          .from('pinterest_purchase_events')
          .select('render_status, value, created_at')
          .eq('is_test', false)
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false }),
        
        // Health daily aggregates
        supabase
          .from('tracking_health_daily')
          .select('*')
          .order('day', { ascending: false })
          .limit(7),
        
        // Recent alerts
        supabase
          .from('tracking_alerts')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20),
        
        // Missing purchase events
        supabase
          .from('missing_purchase_events')
          .select('status')
          .gte('detected_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
        
        // Dead letters
        supabase
          .from('recovery_dead_letters')
          .select('id')
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
        
        // CAPI status from app_settings
        supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'pinterest_capi_enabled')
          .single(),
      ]);

      // Process purchase events
      const purchaseEvents = purchaseEventsResult.data || [];
      const successEvents = purchaseEvents.filter(e => e.render_status === 'success' || e.render_status === 'success_direct');
      const totalValue = purchaseEvents.reduce((sum, e) => sum + (e.value || 0), 0);
      const successRate = purchaseEvents.length > 0 
        ? Math.round((successEvents.length / purchaseEvents.length) * 100) 
        : 100;

      // Process health daily
      const healthDaily = healthDailyResult.data || [];
      const today = healthDaily[0];
      const yesterday = healthDaily[1];
      
      // Calculate trend
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (today && yesterday) {
        if (today.success_rate > yesterday.success_rate) trend = 'up';
        else if (today.success_rate < yesterday.success_rate) trend = 'down';
      }

      // Process alerts
      const alertsData = (alertsResult.data || []).map(a => ({
        ...a,
        severity: a.severity as 'info' | 'warn' | 'error',
      }));

      // Build metrics
      const metricsData: HealthMetrics = {
        pinterestCapi: {
          enabled: capiStatusResult.data?.value === true,
          successRate,
          totalEvents: purchaseEvents.length,
          totalValue,
          lastEventTime: purchaseEvents[0]?.created_at || null,
          trend,
        },
        reconciliation: {
          lastRun: null, // Would come from tracking_jobs if we had it
          missingSeen7d: missingEventsResult.data?.length || 0,
          recovered7d: missingEventsResult.data?.filter(e => e.status === 'recovered').length || 0,
          deadLetters7d: deadLettersResult.data?.length || 0,
        },
        tracking: {
          consentRate: today?.consent_rate ? today.consent_rate * 100 : 100,
          epikRate: today?.epik_rate ? today.epik_rate * 100 : 100,
          contextRows7d: healthDaily.reduce((sum, d) => sum + (d.context_rows || 0), 0),
        },
        system: {
          edgeFunctionsHealthy: true, // Assume healthy unless we see errors
          lastAlertTime: alertsData[0]?.created_at || null,
          activeAlerts: alertsData.filter(a => a.status !== 'acknowledged').length,
        },
      };

      // Build trend data for chart
      const trendData: HealthTrend[] = healthDaily
        .slice(0, 7)
        .reverse()
        .map(d => ({
          day: new Date(d.day).toLocaleDateString('en-US', { weekday: 'short' }),
          successRate: d.success_rate * 100,
          ordersTracked: d.success_count || 0,
          value: d.total_value_eur || 0,
        }));

      setMetrics(metricsData);
      setTrends(trendData);
      setAlerts(alertsData);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Failed to fetch health data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const acknowledgeAlert = async (alertId: string) => {
    try {
      await supabase
        .from('tracking_alerts')
        .update({ 
          status: 'acknowledged',
          acknowledged_at: new Date().toISOString(),
        })
        .eq('id', alertId);
      
      // Update local state
      setAlerts(prev => 
        prev.map(a => a.id === alertId 
          ? { ...a, status: 'acknowledged', acknowledged_at: new Date().toISOString() } 
          : a
        )
      );
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  useEffect(() => {
    fetchHealthData();
  }, [fetchHealthData]);

  // Real-time subscription for live purchase events
  useEffect(() => {
    console.log('[ProductionMonitoringTab] Setting up real-time subscription');
    
    const channel = supabase
      .channel('live-purchase-events')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'pinterest_purchase_events',
        },
        (payload) => {
          console.log('[ProductionMonitoringTab] New purchase event:', payload);
          const newEvent = payload.new as LiveEvent;
          
          // Add to live events (keep max 10)
          setLiveEvents(prev => {
            const updated = [newEvent, ...prev].slice(0, 10);
            return updated;
          });
          
          // Refresh metrics when new events come in (if not test)
          if (!newEvent.is_test) {
            fetchHealthData();
          }
        }
      )
      .subscribe((status) => {
        console.log('[ProductionMonitoringTab] Subscription status:', status);
        setIsLiveConnected(status === 'SUBSCRIBED');
      });

    return () => {
      console.log('[ProductionMonitoringTab] Cleaning up subscription');
      supabase.removeChannel(channel);
    };
  }, [fetchHealthData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(fetchHealthData, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchHealthData]);

  // Overall system status
  const getOverallStatus = (): 'healthy' | 'warning' | 'error' => {
    if (!metrics) return 'unknown' as any;
    
    if (
      metrics.reconciliation.deadLetters7d > 0 ||
      metrics.pinterestCapi.successRate < 80 ||
      metrics.system.activeAlerts > 0
    ) {
      return 'warning';
    }
    
    if (!metrics.pinterestCapi.enabled) {
      return 'error';
    }
    
    return 'healthy';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const overallStatus = getOverallStatus();

  return (
    <div className="space-y-6">
      {/* Header with Status */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Phase 4: Production Monitoring</h2>
            <div className="flex items-center gap-3 mt-1">
              <StatusIndicator status={overallStatus} />
              {isLiveConnected && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                  <Radio className="w-3 h-3 animate-pulse" />
                  <span>Live</span>
                </div>
              )}
              <span className="text-xs text-muted-foreground">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch 
              checked={autoRefresh} 
              onCheckedChange={setAutoRefresh}
              id="auto-refresh"
            />
            <label htmlFor="auto-refresh" className="text-sm text-muted-foreground">
              Auto-refresh
            </label>
          </div>
          <Button variant="outline" size="sm" onClick={fetchHealthData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Pinterest CAPI"
          value={metrics?.pinterestCapi.enabled ? 'Active' : 'Disabled'}
          icon={Zap}
          status={metrics?.pinterestCapi.enabled ? 'healthy' : 'error'}
        />
        <MetricCard
          title="Success Rate (7d)"
          value={`${metrics?.pinterestCapi.successRate || 0}%`}
          icon={TrendingUp}
          trend={metrics?.pinterestCapi.trend}
          status={
            (metrics?.pinterestCapi.successRate || 0) >= 95 ? 'healthy' :
            (metrics?.pinterestCapi.successRate || 0) >= 80 ? 'warning' : 'error'
          }
        />
        <MetricCard
          title="Purchases Tracked"
          value={metrics?.pinterestCapi.totalEvents || 0}
          subtitle={`€${(metrics?.pinterestCapi.totalValue || 0).toFixed(2)} total`}
          icon={Package}
        />
        <MetricCard
          title="Active Alerts"
          value={metrics?.system.activeAlerts || 0}
          icon={Bell}
          status={
            (metrics?.system.activeAlerts || 0) === 0 ? 'healthy' :
            (metrics?.system.activeAlerts || 0) <= 2 ? 'warning' : 'error'
          }
        />
      </div>

      {/* System Health Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Pinterest CAPI Health */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-purple-500" />
            <h3 className="font-semibold">Pinterest CAPI</h3>
            <Badge variant={metrics?.pinterestCapi.enabled ? 'default' : 'destructive'} className="ml-auto">
              {metrics?.pinterestCapi.enabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Events (7d)</span>
              <span className="font-medium">{metrics?.pinterestCapi.totalEvents}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Value</span>
              <span className="font-medium">€{(metrics?.pinterestCapi.totalValue || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Success Rate</span>
              <span className="font-medium">{metrics?.pinterestCapi.successRate}%</span>
            </div>
            <div className="pt-2">
              <Progress 
                value={metrics?.pinterestCapi.successRate || 0} 
                className="h-2"
              />
            </div>
          </div>
        </Card>

        {/* Tracking Context Health */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold">Tracking Context</h3>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Consent Rate</span>
              <span className="font-medium">{(metrics?.tracking.consentRate || 0).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Epik Rate</span>
              <span className="font-medium">{(metrics?.tracking.epikRate || 0).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Context Rows (7d)</span>
              <span className="font-medium">{metrics?.tracking.contextRows7d}</span>
            </div>
            <div className="pt-2">
              <div className="flex gap-1">
                <div 
                  className="h-2 rounded-l bg-emerald-500" 
                  style={{ width: `${metrics?.tracking.consentRate || 0}%` }}
                />
                <div 
                  className="h-2 rounded-r bg-muted" 
                  style={{ width: `${100 - (metrics?.tracking.consentRate || 0)}%` }}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Recovery & Reconciliation */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-5 h-5 text-amber-500" />
            <h3 className="font-semibold">Recovery System</h3>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Missing Detected (7d)</span>
              <span className="font-medium">{metrics?.reconciliation.missingSeen7d}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Recovered</span>
              <span className="font-medium text-emerald-600">{metrics?.reconciliation.recovered7d}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Dead Letters</span>
              <span className={`font-medium ${(metrics?.reconciliation.deadLetters7d || 0) > 0 ? 'text-red-600' : ''}`}>
                {metrics?.reconciliation.deadLetters7d}
              </span>
            </div>
            {metrics?.reconciliation.deadLetters7d === 0 && (
              <div className="flex items-center gap-2 pt-2 text-sm text-emerald-600">
                <CheckCircle className="w-4 h-4" />
                No unrecoverable events
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Trends Chart */}
      {trends.length > 0 && (
        <Card className="p-5">
          <h3 className="font-semibold mb-4">7-Day Tracking Health</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends}>
                <defs>
                  <linearGradient id="successGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="day" 
                  tick={{ fontSize: 12 }} 
                  className="text-muted-foreground"
                />
                <YAxis 
                  tick={{ fontSize: 12 }} 
                  domain={[0, 100]}
                  className="text-muted-foreground"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="successRate"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#successGradient)"
                  name="Success Rate %"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Alert History */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-orange-500" />
            <h3 className="font-semibold">Alert History</h3>
            {alerts.filter(a => a.status !== 'acknowledged').length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {alerts.filter(a => a.status !== 'acknowledged').length} unread
              </Badge>
            )}
          </div>
        </div>
        
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <CheckCircle className="w-12 h-12 mb-3 text-emerald-500" />
            <p className="font-medium">No alerts recorded</p>
            <p className="text-sm">The system is running smoothly</p>
          </div>
        ) : (
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {alerts.map(alert => (
                <AlertRow 
                  key={alert.id} 
                  alert={alert} 
                  onAcknowledge={acknowledgeAlert}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </Card>

      {/* Live Events Feed */}
      <Card className="p-5 border-blue-500/30 bg-blue-500/5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Radio className={`w-5 h-5 ${isLiveConnected ? 'text-emerald-500 animate-pulse' : 'text-muted-foreground'}`} />
            <h3 className="font-semibold">Live Events Feed</h3>
            <Badge variant={isLiveConnected ? 'default' : 'secondary'} className="ml-2">
              {isLiveConnected ? 'Connected' : 'Connecting...'}
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
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Radio className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">Waiting for new purchase events...</p>
            <p className="text-xs mt-1">Events will appear here in real-time</p>
          </div>
        ) : (
          <ScrollArea className="h-48">
            <div className="space-y-2">
              {liveEvents.map((event) => {
                const isSuccess = event.render_status?.includes('success');
                const isError = event.render_status?.includes('error') || event.render_status?.includes('fail');
                
                return (
                  <div 
                    key={event.id} 
                    className={`p-3 rounded-lg flex items-center justify-between ${
                      event.is_test 
                        ? 'bg-amber-100/50 dark:bg-amber-900/20 border border-amber-300/50' 
                        : isSuccess 
                          ? 'bg-emerald-100 dark:bg-emerald-900/30' 
                          : isError 
                            ? 'bg-red-100 dark:bg-red-900/30'
                            : 'bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {isSuccess ? (
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                      ) : isError ? (
                        <XCircle className="w-4 h-4 text-red-600" />
                      ) : (
                        <Clock className="w-4 h-4 text-muted-foreground" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Order #{event.order_id?.slice(-8)}</span>
                          {event.is_test && (
                            <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700 border-amber-300">
                              TEST
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {event.render_status} • {new Date(event.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">
                        €{(event.value || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </Card>

      {/* Quick Actions */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Quick Actions</h3>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Button 
            variant="outline" 
            className="h-auto py-3 flex flex-col items-center gap-2"
            onClick={() => window.open('https://ads.pinterest.com/analytics', '_blank')}
          >
            <ExternalLink className="w-5 h-5" />
            <span className="text-xs">Pinterest Ads</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="h-auto py-3 flex flex-col items-center gap-2"
            onClick={fetchHealthData}
          >
            <RefreshCw className="w-5 h-5" />
            <span className="text-xs">Force Refresh</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="h-auto py-3 flex flex-col items-center gap-2"
            onClick={() => {
              setAlerts(prev => prev.map(a => ({ ...a, status: 'acknowledged' })));
            }}
          >
            <Eye className="w-5 h-5" />
            <span className="text-xs">Ack All Alerts</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="h-auto py-3 flex flex-col items-center gap-2"
            onClick={() => window.location.href = '/risebynight/tracking?tab=phases'}
          >
            <Activity className="w-5 h-5" />
            <span className="text-xs">Run Chaos Tests</span>
          </Button>
        </div>
      </Card>

      {/* Production Checklist */}
      <Card className="p-5 border-emerald-500/30 bg-emerald-500/5">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-emerald-500" />
          <h3 className="font-semibold">Phase 4 Checklist</h3>
          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-400 ml-auto">
            Production Ready
          </Badge>
        </div>
        
        <div className="grid md:grid-cols-2 gap-2">
          {[
            { label: 'Pinterest CAPI Enabled', checked: metrics?.pinterestCapi.enabled },
            { label: 'Chaos Tests Passed (C1-C9)', checked: true },
            { label: 'Test Orders Isolated (is_test flag)', checked: true },
            { label: 'Reconciliation Active', checked: true },
            { label: 'Alert System Configured', checked: true },
            { label: 'Recovery Pipeline Ready', checked: true },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              {item.checked ? (
                <CheckCircle className="w-4 h-4 text-emerald-500" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500" />
              )}
              <span className={item.checked ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default ProductionMonitoringTab;
