/**
 * TBLS Funnel Tab
 * Shows full-funnel metrics from TBLS (The Big Landing Store) attribution:
 * Page Visits → Add to Carts (by product) → Checkouts → Purchases
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
  Eye,
  ShoppingCart,
  CreditCard,
  Package,
  TrendingUp,
  ExternalLink,
  Layers,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface TBLSStats {
  pageVisits: {
    total: number;
    uniqueSessions: number;
    byPage: Record<string, number>;
    byTemplate: Record<string, number>;
  };
  addToCarts: {
    total: number;
    uniqueSessions: number;
    byPage: Record<string, number>;
    byProduct: Record<string, { count: number; pageId: string | null }>;
  };
  checkouts: {
    total: number;
    uniqueSessions: number;
    byPage: Record<string, number>;
  };
  purchases: {
    total: number;
    totalRevenue: number;
    currency: string;
    byPage: Record<string, { count: number; revenue: number }>;
    byTemplate: Record<string, { count: number; revenue: number }>;
  };
}

interface RecentEvent {
  id: string;
  type: 'visit' | 'atc' | 'checkout' | 'purchase';
  tbls_page_id: string | null;
  tbls_template: string | null;
  product_title?: string;
  value?: number;
  created_at: string;
}

const COLORS = ['#E60023', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];

const TBLSFunnelTab = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<TBLSStats | null>(null);
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [days, setDays] = useState("7");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const daysNum = parseInt(days);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysNum);
      const startIso = startDate.toISOString();

      // Fetch all data in parallel
      const [pageVisitsRes, atcRes, checkoutRes, purchasesRes] = await Promise.all([
        // Page visits from TBLS
        supabase
          .from('page_visits')
          .select('id, session_id, tbls_page_id, tbls_template, created_at')
          .gte('created_at', startIso)
          .not('tbls_page_id', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1000),
        
        // Add to carts from TBLS
        supabase
          .from('add_to_cart_analytics')
          .select('id, session_id, tbls_page_id, tbls_template, product_title, created_at')
          .gte('created_at', startIso)
          .not('tbls_page_id', 'is', null)
          .order('created_at', { ascending: false })
          .limit(500),
        
        // Checkouts from TBLS
        supabase
          .from('checkout_analytics')
          .select('id, session_id, tbls_page_id, tbls_template, event_type, created_at')
          .gte('created_at', startIso)
          .eq('event_type', 'checkout_initiated')
          .not('tbls_page_id', 'is', null)
          .order('created_at', { ascending: false })
          .limit(500),
        
        // Purchases from TBLS
        supabase
          .from('tbls_purchase_attribution')
          .select('id, tbls_page_id, tbls_template, order_value, currency, created_at')
          .gte('created_at', startIso)
          .order('created_at', { ascending: false })
          .limit(500),
      ]);

      // Process page visits
      const pageVisits = pageVisitsRes.data || [];
      const pvByPage: Record<string, number> = {};
      const pvByTemplate: Record<string, number> = {};
      const pvSessions = new Set<string>();
      
      for (const pv of pageVisits) {
        pvSessions.add(pv.session_id);
        if (pv.tbls_page_id) {
          pvByPage[pv.tbls_page_id] = (pvByPage[pv.tbls_page_id] || 0) + 1;
        }
        if (pv.tbls_template) {
          pvByTemplate[pv.tbls_template] = (pvByTemplate[pv.tbls_template] || 0) + 1;
        }
      }

      // Process add to carts
      const atcs = atcRes.data || [];
      const atcByPage: Record<string, number> = {};
      const atcByProduct: Record<string, { count: number; pageId: string | null }> = {};
      const atcSessions = new Set<string>();
      
      for (const atc of atcs) {
        atcSessions.add(atc.session_id);
        if (atc.tbls_page_id) {
          atcByPage[atc.tbls_page_id] = (atcByPage[atc.tbls_page_id] || 0) + 1;
        }
        if (atc.product_title) {
          if (!atcByProduct[atc.product_title]) {
            atcByProduct[atc.product_title] = { count: 0, pageId: atc.tbls_page_id };
          }
          atcByProduct[atc.product_title].count++;
        }
      }

      // Process checkouts
      const checkouts = checkoutRes.data || [];
      const coByPage: Record<string, number> = {};
      const coSessions = new Set<string>();
      
      for (const co of checkouts) {
        coSessions.add(co.session_id);
        if (co.tbls_page_id) {
          coByPage[co.tbls_page_id] = (coByPage[co.tbls_page_id] || 0) + 1;
        }
      }

      // Process purchases
      const purchases = purchasesRes.data || [];
      const purchByPage: Record<string, { count: number; revenue: number }> = {};
      const purchByTemplate: Record<string, { count: number; revenue: number }> = {};
      let totalRevenue = 0;
      let currency = 'EUR';
      
      for (const p of purchases) {
        const value = parseFloat(String(p.order_value)) || 0;
        totalRevenue += value;
        currency = p.currency || 'EUR';
        
        if (p.tbls_page_id) {
          if (!purchByPage[p.tbls_page_id]) {
            purchByPage[p.tbls_page_id] = { count: 0, revenue: 0 };
          }
          purchByPage[p.tbls_page_id].count++;
          purchByPage[p.tbls_page_id].revenue += value;
        }
        if (p.tbls_template) {
          if (!purchByTemplate[p.tbls_template]) {
            purchByTemplate[p.tbls_template] = { count: 0, revenue: 0 };
          }
          purchByTemplate[p.tbls_template].count++;
          purchByTemplate[p.tbls_template].revenue += value;
        }
      }

      setStats({
        pageVisits: {
          total: pageVisits.length,
          uniqueSessions: pvSessions.size,
          byPage: pvByPage,
          byTemplate: pvByTemplate,
        },
        addToCarts: {
          total: atcs.length,
          uniqueSessions: atcSessions.size,
          byPage: atcByPage,
          byProduct: atcByProduct,
        },
        checkouts: {
          total: checkouts.length,
          uniqueSessions: coSessions.size,
          byPage: coByPage,
        },
        purchases: {
          total: purchases.length,
          totalRevenue,
          currency,
          byPage: purchByPage,
          byTemplate: purchByTemplate,
        },
      });

      // Build recent events list (most recent from each type)
      const recent: RecentEvent[] = [];
      
      for (const pv of pageVisits.slice(0, 5)) {
        recent.push({
          id: pv.id,
          type: 'visit',
          tbls_page_id: pv.tbls_page_id,
          tbls_template: pv.tbls_template,
          created_at: pv.created_at,
        });
      }
      for (const atc of atcs.slice(0, 5)) {
        recent.push({
          id: atc.id,
          type: 'atc',
          tbls_page_id: atc.tbls_page_id,
          tbls_template: atc.tbls_template,
          product_title: atc.product_title,
          created_at: atc.created_at,
        });
      }
      for (const co of checkouts.slice(0, 5)) {
        recent.push({
          id: co.id,
          type: 'checkout',
          tbls_page_id: co.tbls_page_id,
          tbls_template: co.tbls_template,
          created_at: co.created_at,
        });
      }
      for (const p of purchases.slice(0, 5)) {
        recent.push({
          id: p.id,
          type: 'purchase',
          tbls_page_id: p.tbls_page_id,
          tbls_template: p.tbls_template,
          value: parseFloat(String(p.order_value)),
          created_at: p.created_at,
        });
      }
      
      recent.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setRecentEvents(recent.slice(0, 20));

    } catch (err) {
      console.error('[TBLS Funnel] Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Prepare chart data
  const funnelData = stats ? [
    { name: 'Page Visits', value: stats.pageVisits.total, fill: '#6366F1' },
    { name: 'Add to Carts', value: stats.addToCarts.total, fill: '#F59E0B' },
    { name: 'Checkouts', value: stats.checkouts.total, fill: '#8B5CF6' },
    { name: 'Purchases', value: stats.purchases.total, fill: '#10B981' },
  ] : [];

  const topPagesData = stats ? Object.entries(stats.pageVisits.byPage)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([pageId, visits]) => ({
      pageId: pageId.length > 20 ? pageId.slice(0, 17) + '...' : pageId,
      fullPageId: pageId,
      visits,
      atcs: stats.addToCarts.byPage[pageId] || 0,
      checkouts: stats.checkouts.byPage[pageId] || 0,
      purchases: stats.purchases.byPage[pageId]?.count || 0,
      revenue: stats.purchases.byPage[pageId]?.revenue || 0,
    })) : [];

  const productAtcData = stats ? Object.entries(stats.addToCarts.byProduct)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([product, data], i) => ({
      product: product.length > 25 ? product.slice(0, 22) + '...' : product,
      fullProduct: product,
      count: data.count,
      fill: COLORS[i % COLORS.length],
    })) : [];

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">TBLS Funnel Attribution</h2>
            <p className="text-sm text-muted-foreground">
              Traffic & conversions from The Big Landing Store
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
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
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
              <Eye className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.pageVisits.total.toLocaleString() || 0}</p>
              <p className="text-xs text-muted-foreground">Page Visits</p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.addToCarts.total || 0}</p>
              <p className="text-xs text-muted-foreground">Add to Carts</p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.checkouts.total || 0}</p>
              <p className="text-xs text-muted-foreground">Checkouts</p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
              <Package className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.purchases.total || 0}</p>
              <p className="text-xs text-muted-foreground">Purchases</p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {stats?.purchases.currency === 'EUR' ? '€' : '$'}
                {stats?.purchases.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || 0}
              </p>
              <p className="text-xs text-muted-foreground">Revenue</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Conversion Rates */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-5 text-center">
          <p className="text-3xl font-bold text-amber-600">
            {stats && stats.pageVisits.total > 0
              ? `${((stats.addToCarts.total / stats.pageVisits.total) * 100).toFixed(1)}%`
              : '—'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">Visit → ATC Rate</p>
        </Card>
        <Card className="p-5 text-center">
          <p className="text-3xl font-bold text-violet-600">
            {stats && stats.addToCarts.total > 0
              ? `${((stats.checkouts.total / stats.addToCarts.total) * 100).toFixed(1)}%`
              : '—'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">ATC → Checkout Rate</p>
        </Card>
        <Card className="p-5 text-center">
          <p className="text-3xl font-bold text-emerald-600">
            {stats && stats.pageVisits.total > 0
              ? `${((stats.purchases.total / stats.pageVisits.total) * 100).toFixed(2)}%`
              : '—'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">Visit → Purchase CVR</p>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Funnel Chart */}
        <Card className="p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Funnel Overview
          </h3>
          <div className="h-64">
            {funnelData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={100} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {funnelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No TBLS data for selected period
              </div>
            )}
          </div>
        </Card>

        {/* ATCs by Product */}
        <Card className="p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-amber-500" />
            Add to Carts by Product
          </h3>
          <div className="h-64">
            {productAtcData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={productAtcData}
                    dataKey="count"
                    nameKey="product"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ product, count }) => `${product}: ${count}`}
                    labelLine={false}
                  >
                    {productAtcData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value, name, props) => [value, props.payload.fullProduct]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No product ATCs from TBLS
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Top Pages Table */}
      <Card className="p-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" />
          Top TBLS Pages
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 font-medium text-muted-foreground">Page ID</th>
                <th className="text-right py-2 px-3 font-medium text-muted-foreground">Visits</th>
                <th className="text-right py-2 px-3 font-medium text-muted-foreground">ATCs</th>
                <th className="text-right py-2 px-3 font-medium text-muted-foreground">Checkouts</th>
                <th className="text-right py-2 px-3 font-medium text-muted-foreground">Purchases</th>
                <th className="text-right py-2 px-3 font-medium text-muted-foreground">Revenue</th>
                <th className="text-right py-2 px-3 font-medium text-muted-foreground">CVR</th>
              </tr>
            </thead>
            <tbody>
              {topPagesData.length > 0 ? (
                topPagesData.map((row) => (
                  <tr key={row.fullPageId} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2 px-3">
                      <Badge variant="outline" className="font-mono text-xs" title={row.fullPageId}>
                        {row.pageId}
                      </Badge>
                    </td>
                    <td className="py-2 px-3 text-right font-medium">{row.visits}</td>
                    <td className="py-2 px-3 text-right">{row.atcs}</td>
                    <td className="py-2 px-3 text-right">{row.checkouts}</td>
                    <td className="py-2 px-3 text-right font-medium text-emerald-600">{row.purchases}</td>
                    <td className="py-2 px-3 text-right font-medium">
                      €{row.revenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </td>
                    <td className="py-2 px-3 text-right">
                      {row.visits > 0 ? `${((row.purchases / row.visits) * 100).toFixed(1)}%` : '—'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground">
                    No TBLS page data for selected period
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Recent Events */}
      <Card className="p-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <ExternalLink className="w-4 h-4 text-primary" />
          Recent TBLS Events
        </h3>
        <ScrollArea className="h-[300px]">
          {recentEvents.length > 0 ? (
            <div className="space-y-2">
              {recentEvents.map((event) => (
                <div
                  key={event.id}
                  className="p-3 rounded-lg border bg-white dark:bg-background"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          event.type === 'purchase' ? 'default' :
                          event.type === 'checkout' ? 'secondary' :
                          event.type === 'atc' ? 'outline' : 'outline'
                        }
                        className={
                          event.type === 'purchase' ? 'bg-emerald-600' :
                          event.type === 'checkout' ? 'bg-violet-600 text-white' :
                          event.type === 'atc' ? 'border-amber-500 text-amber-600' : ''
                        }
                      >
                        {event.type === 'visit' && 'Visit'}
                        {event.type === 'atc' && 'ATC'}
                        {event.type === 'checkout' && 'Checkout'}
                        {event.type === 'purchase' && 'Purchase'}
                      </Badge>
                      {event.tbls_page_id && (
                        <span className="text-xs text-muted-foreground font-mono">
                          {event.tbls_page_id}
                        </span>
                      )}
                      {event.product_title && (
                        <span className="text-xs text-foreground">
                          {event.product_title}
                        </span>
                      )}
                      {event.value && (
                        <span className="text-xs font-medium text-emerald-600">
                          €{event.value.toLocaleString()}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(event.created_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No recent TBLS events
            </div>
          )}
        </ScrollArea>
      </Card>
    </div>
  );
};

export default TBLSFunnelTab;
