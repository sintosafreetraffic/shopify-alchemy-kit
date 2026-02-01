/**
 * Attribution Source Truth Tab
 * Unified view of all conversion tracking platforms: Pinterest, Meta, Google
 * Provides both individual platform views and a combined attribution overview
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Layers,
  Target,
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
import { PinterestSourceTruthTab } from "./PinterestSourceTruthTab";
import { MetaSourceTruthSection } from "./MetaSourceTruthSection";
import { GoogleSourceTruthSection } from "./GoogleSourceTruthSection";

interface PlatformStats {
  platform: string;
  events: number;
  value: number;
  color: string;
  attributionBreakdown?: {
    click_id: number;
    email_match: number;
    unmatched: number;
  };
}

interface OverlapStats {
  uniqueOrders: number;
  uniqueValue: number;
  multiTouchOrders: number;
  pinterestOnly: number;
  metaOnly: number;
  googleOnly: number;
  pinterestMeta: number;
  pinterestGoogle: number;
  metaGoogle: number;
  allThree: number;
}

interface CombinedStats {
  totalEvents: number;
  totalValue: number;
  platforms: PlatformStats[];
  overlap: OverlapStats;
  dailyBreakdown: Array<{
    date: string;
    pinterest: number;
    meta: number;
    google: number;
  }>;
}

const PLATFORM_COLORS = {
  pinterest: '#E60023', // Pinterest red
  meta: '#1877F2',      // Meta blue
  google: '#F59E0B',    // Google amber
};

export const AttributionSourceTruthTab = () => {
  const [activeSubTab, setActiveSubTab] = useState("combined");
  const [loading, setLoading] = useState(true);
  const [combinedStats, setCombinedStats] = useState<CombinedStats | null>(null);
  const [days, setDays] = useState("7");

  const fetchCombinedData = useCallback(async () => {
    setLoading(true);
    try {
      const daysNum = parseInt(days);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysNum);

      // Fetch all platform data in parallel (include order_id and attribution_source for analysis)
      const [pinterestResult, metaResult, googleResult] = await Promise.all([
        supabase
          .from('pinterest_purchase_events')
          .select('order_id, value, created_at, send_status, is_test, attribution_source')
          .gte('created_at', startDate.toISOString()),
        supabase
          .from('meta_purchase_events')
          .select('order_id, value, created_at, send_status, attribution_source')
          .gte('created_at', startDate.toISOString()),
        supabase
          .from('google_purchase_events')
          .select('order_id, value, created_at, send_status, attribution_source')
          .gte('created_at', startDate.toISOString()),
      ]);

      // Helper to count attribution sources
      const countAttributionSources = (events: any[]) => ({
        click_id: events.filter((e: any) => e.attribution_source === 'click_id').length,
        email_match: events.filter((e: any) => e.attribution_source === 'email_match').length,
        unmatched: events.filter((e: any) => !e.attribution_source || e.attribution_source === 'unmatched').length,
      });

      // Process Pinterest
      const pinterestEvents = (pinterestResult.data || []).filter(
        (e: any) => !e.is_test && e.send_status === 'sent'
      );
      const pinterestValue = pinterestEvents.reduce((sum: number, e: any) => sum + (e.value || 0), 0);
      const pinterestOrderIds = new Set(pinterestEvents.map((e: any) => e.order_id));
      const pinterestAttrBreakdown = countAttributionSources(pinterestEvents);

      // Process Meta
      const metaEvents = (metaResult.data || []).filter((e: any) => e.send_status === 'sent');
      const metaValue = metaEvents.reduce((sum: number, e: any) => sum + (e.value || 0), 0);
      const metaOrderIds = new Set(metaEvents.map((e: any) => e.order_id));
      const metaAttrBreakdown = countAttributionSources(metaEvents);

      // Process Google
      const googleEvents = (googleResult.data || []).filter((e: any) => e.send_status?.includes('sent'));
      const googleValue = googleEvents.reduce((sum: number, e: any) => sum + (e.value || 0), 0);
      const googleOrderIds = new Set(googleEvents.map((e: any) => e.order_id));
      const googleAttrBreakdown = countAttributionSources(googleEvents);

      // Calculate overlap statistics
      const allOrderIds = new Set([...pinterestOrderIds, ...metaOrderIds, ...googleOrderIds]);
      let pinterestOnly = 0, metaOnly = 0, googleOnly = 0;
      let pinterestMeta = 0, pinterestGoogle = 0, metaGoogle = 0, allThree = 0;
      let uniqueValue = 0;

      // Build unique order value map (use max value if duplicates exist)
      const orderValueMap = new Map<string, number>();
      [...pinterestEvents, ...metaEvents, ...googleEvents].forEach((e: any) => {
        const existing = orderValueMap.get(e.order_id) || 0;
        orderValueMap.set(e.order_id, Math.max(existing, e.value || 0));
      });

      allOrderIds.forEach(orderId => {
        const inP = pinterestOrderIds.has(orderId);
        const inM = metaOrderIds.has(orderId);
        const inG = googleOrderIds.has(orderId);
        
        uniqueValue += orderValueMap.get(orderId) || 0;
        
        if (inP && inM && inG) allThree++;
        else if (inP && inM) pinterestMeta++;
        else if (inP && inG) pinterestGoogle++;
        else if (inM && inG) metaGoogle++;
        else if (inP) pinterestOnly++;
        else if (inM) metaOnly++;
        else if (inG) googleOnly++;
      });

      const multiTouchOrders = pinterestMeta + pinterestGoogle + metaGoogle + allThree;

      // Calculate daily breakdown
      const dailyData: Record<string, { date: string; pinterest: number; meta: number; google: number }> = {};
      
      const processDailyEvents = (events: any[], platform: 'pinterest' | 'meta' | 'google') => {
        events.forEach((e: any) => {
          const date = new Date(e.created_at).toISOString().split('T')[0];
          if (!dailyData[date]) {
            dailyData[date] = { date, pinterest: 0, meta: 0, google: 0 };
          }
          dailyData[date][platform]++;
        });
      };

      processDailyEvents(pinterestEvents, 'pinterest');
      processDailyEvents(metaEvents, 'meta');
      processDailyEvents(googleEvents, 'google');

      const sortedDaily = Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));

      setCombinedStats({
        totalEvents: pinterestEvents.length + metaEvents.length + googleEvents.length,
        totalValue: pinterestValue + metaValue + googleValue,
        platforms: [
          { platform: 'Pinterest', events: pinterestEvents.length, value: pinterestValue, color: PLATFORM_COLORS.pinterest, attributionBreakdown: pinterestAttrBreakdown },
          { platform: 'Meta', events: metaEvents.length, value: metaValue, color: PLATFORM_COLORS.meta, attributionBreakdown: metaAttrBreakdown },
          { platform: 'Google', events: googleEvents.length, value: googleValue, color: PLATFORM_COLORS.google, attributionBreakdown: googleAttrBreakdown },
        ],
        overlap: {
          uniqueOrders: allOrderIds.size,
          uniqueValue,
          multiTouchOrders,
          pinterestOnly,
          metaOnly,
          googleOnly,
          pinterestMeta,
          pinterestGoogle,
          metaGoogle,
          allThree,
        },
        dailyBreakdown: sortedDaily,
      });
    } catch (err) {
      console.error('Failed to fetch combined data:', err);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    if (activeSubTab === 'combined') {
      fetchCombinedData();
    }
  }, [activeSubTab, fetchCombinedData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 via-blue-500 to-amber-500 flex items-center justify-center">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Attribution Source Truth</h2>
            <p className="text-sm text-muted-foreground">Unified view of all conversion tracking platforms</p>
          </div>
        </div>
      </div>

      {/* Sub-tabs for platforms */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-lg">
          <TabsTrigger value="combined" className="flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Combined
          </TabsTrigger>
          <TabsTrigger value="pinterest" className="flex items-center gap-2">
            <Target className="w-4 h-4 text-red-500" />
            Pinterest
          </TabsTrigger>
          <TabsTrigger value="meta" className="flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-500" />
            Meta
          </TabsTrigger>
          <TabsTrigger value="google" className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            Google
          </TabsTrigger>
        </TabsList>

        {/* Combined View */}
        <TabsContent value="combined" className="mt-6">
          <div className="flex items-center justify-between mb-6">
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
              <Button variant="outline" size="icon" onClick={fetchCombinedData} disabled={loading}>
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : combinedStats ? (
            <div className="space-y-6">
              {/* Key Insight: Unique vs Platform Events */}
              <Card className="p-4 border-primary/20 bg-primary/5">
                <div className="flex items-start gap-3">
                  <Layers className="w-5 h-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-medium mb-1">Multi-Touch Attribution</h3>
                    <p className="text-xs text-muted-foreground mb-3">
                      Each platform receives conversions independently. One order can be attributed to multiple platforms
                      if the user clicked ads from different sources before purchasing.
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="text-center p-2 rounded-lg bg-background">
                        <p className="text-xl font-bold">{combinedStats.overlap.uniqueOrders}</p>
                        <p className="text-xs text-muted-foreground">Unique Orders</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-background">
                        <p className="text-xl font-bold">{formatCurrency(combinedStats.overlap.uniqueValue)}</p>
                        <p className="text-xs text-muted-foreground">Actual Revenue</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-background">
                        <p className="text-xl font-bold">{combinedStats.totalEvents}</p>
                        <p className="text-xs text-muted-foreground">Platform Events</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-background">
                        <p className="text-xl font-bold text-amber-600">{combinedStats.overlap.multiTouchOrders}</p>
                        <p className="text-xs text-muted-foreground">Multi-Touch</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {combinedStats.platforms.map((p) => (
                  <Card key={p.platform} className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                      <p className="text-lg font-bold">{p.events}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{p.platform} Events</p>
                    <p className="text-xs mt-1" style={{ color: p.color }}>{formatCurrency(p.value)}</p>
                  </Card>
                ))}
                {/* Overlap breakdown cards */}
                <Card className="p-4 border-dashed">
                  <p className="text-lg font-bold">{combinedStats.overlap.pinterestOnly + combinedStats.overlap.metaOnly + combinedStats.overlap.googleOnly}</p>
                  <p className="text-xs text-muted-foreground">Single-Platform</p>
                  <p className="text-xs mt-1 text-muted-foreground">
                    P:{combinedStats.overlap.pinterestOnly} M:{combinedStats.overlap.metaOnly} G:{combinedStats.overlap.googleOnly}
                  </p>
                </Card>
                <Card className="p-4 border-dashed border-amber-500/50">
                  <p className="text-lg font-bold text-amber-600">{combinedStats.overlap.multiTouchOrders}</p>
                  <p className="text-xs text-muted-foreground">Multi-Platform</p>
                  <p className="text-xs mt-1 text-muted-foreground">
                    {combinedStats.overlap.pinterestMeta > 0 && `P+M:${combinedStats.overlap.pinterestMeta} `}
                    {combinedStats.overlap.pinterestGoogle > 0 && `P+G:${combinedStats.overlap.pinterestGoogle} `}
                    {combinedStats.overlap.metaGoogle > 0 && `M+G:${combinedStats.overlap.metaGoogle} `}
                    {combinedStats.overlap.allThree > 0 && `All:${combinedStats.overlap.allThree}`}
                    {combinedStats.overlap.multiTouchOrders === 0 && "None"}
                  </p>
                </Card>
              </div>

              {/* Platform Distribution Chart */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-4">
                  <h3 className="text-sm font-medium mb-4">Event Distribution by Platform</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={combinedStats.platforms}
                          dataKey="events"
                          nameKey="platform"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ platform, events }) => `${platform}: ${events}`}
                        >
                          {combinedStats.platforms.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number, name: string) => [value, name]} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card className="p-4">
                  <h3 className="text-sm font-medium mb-4">Daily Events by Platform</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={combinedStats.dailyBreakdown}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 12 }}
                          tickFormatter={(v) => new Date(v).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                        />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip 
                          labelFormatter={(label) => new Date(label).toLocaleDateString()}
                        />
                        <Legend />
                        <Bar dataKey="pinterest" name="Pinterest" stackId="a" fill={PLATFORM_COLORS.pinterest} />
                        <Bar dataKey="meta" name="Meta" stackId="a" fill={PLATFORM_COLORS.meta} />
                        <Bar dataKey="google" name="Google" stackId="a" fill={PLATFORM_COLORS.google} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>

              {/* Attribution Source Classification */}
              <Card className="p-4">
                <h3 className="text-sm font-medium mb-4">Attribution Source Classification</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Shows how each platform can match conversions: <strong>click_id</strong> (best - has platform's click ID), 
                  <strong> email_match</strong> (good - platform matches on PII), <strong>unmatched</strong> (minimal data)
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {combinedStats.platforms.map((p) => (
                    <div key={p.platform} className="p-3 rounded-lg border" style={{ borderColor: p.color + '40' }}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                        <span className="font-medium">{p.platform}</span>
                      </div>
                      {p.attributionBreakdown ? (
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">🎯 Click ID</span>
                            <Badge variant="default" className="bg-green-600">{p.attributionBreakdown.click_id}</Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">📧 Email Match</span>
                            <Badge variant="secondary">{p.attributionBreakdown.email_match}</Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">❓ Unmatched</span>
                            <Badge variant="outline" className="text-muted-foreground">{p.attributionBreakdown.unmatched}</Badge>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">No data</span>
                      )}
                    </div>
                  ))}
                </div>
              </Card>

              {/* Platform Health Badges */}
              <Card className="p-4">
                <h3 className="text-sm font-medium mb-4">Platform Health</h3>
                <div className="flex flex-wrap gap-3">
                  {combinedStats.platforms.map((p) => (
                    <Badge 
                      key={p.platform} 
                      variant={p.events > 0 ? "default" : "secondary"}
                      className="px-3 py-1"
                      style={p.events > 0 ? { backgroundColor: p.color } : undefined}
                    >
                      {p.platform}: {p.events > 0 ? 'Active' : 'No events'}
                    </Badge>
                  ))}
                </div>
              </Card>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No data available
            </div>
          )}
        </TabsContent>

        {/* Pinterest View */}
        <TabsContent value="pinterest" className="mt-6">
          <PinterestSourceTruthTab />
        </TabsContent>

        {/* Meta View */}
        <TabsContent value="meta" className="mt-6">
          <MetaSourceTruthSection />
        </TabsContent>

        {/* Google View */}
        <TabsContent value="google" className="mt-6">
          <GoogleSourceTruthSection />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AttributionSourceTruthTab;
