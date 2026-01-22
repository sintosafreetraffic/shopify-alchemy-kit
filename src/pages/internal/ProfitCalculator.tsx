import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useShopifyProducts } from "@/hooks/useShopifyProducts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  ArrowLeft,
  Loader2,
  TrendingUp,
  DollarSign,
  Package,
  Percent,
  Plus,
  RefreshCw,
  Calendar,
  BarChart3,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
} from "recharts";

interface CostPrice {
  id: string;
  product_handle: string;
  product_title: string;
  cost_single: number;
  cost_bulk: number;
  effective_from: string;
  effective_to: string | null;
  created_at: string;
}

interface DailyProfit {
  date: string;
  revenue: number;
  cost: number;
  profit: number;
  orderCount: number;
  productBreakdown: Record<string, { qty: number; revenue: number; cost: number; profit: number }>;
}

interface ProfitStats {
  profitData: DailyProfit[];
  totals: {
    revenue: number;
    cost: number;
    profit: number;
    orderCount: number;
    margin: number;
  };
  costPrices: CostPrice[];
  products: string[];
  currency: string;
  granularity: string;
  days: number;
}

export default function ProfitCalculator() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [stats, setStats] = useState<ProfitStats | null>(null);
  
  // Filters
  const [days, setDays] = useState(30);
  const [granularity, setGranularity] = useState<"daily" | "weekly" | "monthly">("daily");
  
  // Cost price editor
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCostPrice, setNewCostPrice] = useState({
    product_title: "",
    product_handle: "",
    cost_single: "",
    cost_bulk: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  // Check admin access
  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: hasRole } = await supabase.rpc("has_role", {
        _role: "admin",
        _user_id: user.id,
      });

      if (!hasRole) {
        toast.error("Access denied - Admin only");
        navigate("/");
        return;
      }

      setIsAdmin(true);
      setIsLoading(false);
    };

    checkAdmin();
  }, [navigate]);

  // Fetch profit data
  const fetchProfitData = useCallback(async () => {
    setIsFetching(true);
    try {
      const { data, error } = await supabase.functions.invoke("shopify-profit-stats", {
        body: { days, granularity },
      });

      if (error) throw error;
      setStats(data);
    } catch (err) {
      console.error("Error fetching profit data:", err);
      toast.error("Failed to fetch profit data");
    } finally {
      setIsFetching(false);
    }
  }, [days, granularity]);

  useEffect(() => {
    if (isAdmin) {
      fetchProfitData();
    }
  }, [isAdmin, fetchProfitData]);

  // Add new cost price
  const handleAddCostPrice = async () => {
    if (!newCostPrice.product_title || !newCostPrice.cost_single || !newCostPrice.cost_bulk) {
      toast.error("Please fill all required fields");
      return;
    }

    setIsSaving(true);
    try {
      // First, close out any existing active cost price for this product
      const { error: updateError } = await supabase
        .from("product_cost_prices")
        .update({ effective_to: new Date().toISOString() })
        .eq("product_title", newCostPrice.product_title)
        .is("effective_to", null);

      if (updateError) throw updateError;

      // Insert new cost price
      const { error: insertError } = await supabase
        .from("product_cost_prices")
        .insert({
          product_title: newCostPrice.product_title,
          product_handle: newCostPrice.product_handle || newCostPrice.product_title.toLowerCase().replace(/\s+/g, "-"),
          cost_single: parseFloat(newCostPrice.cost_single),
          cost_bulk: parseFloat(newCostPrice.cost_bulk),
        });

      if (insertError) throw insertError;

      toast.success("Cost price added successfully");
      setShowAddModal(false);
      setNewCostPrice({ product_title: "", product_handle: "", cost_single: "", cost_bulk: "" });
      fetchProfitData();
    } catch (err) {
      console.error("Error adding cost price:", err);
      toast.error("Failed to add cost price");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-destructive">Access denied</p>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-EU", {
      style: "currency",
      currency: stats?.currency || "EUR",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const chartData = stats?.profitData.map((d) => ({
    date: granularity === "monthly" 
      ? format(new Date(d.date), "MMM yyyy")
      : granularity === "weekly"
      ? format(new Date(d.date), "MMM d")
      : format(new Date(d.date), "MMM d"),
    revenue: Math.round(d.revenue * 100) / 100,
    cost: Math.round(d.cost * 100) / 100,
    profit: Math.round(d.profit * 100) / 100,
    orders: d.orderCount,
  })) || [];

  const currentCostPrices = stats?.costPrices.filter(cp => !cp.effective_to) || [];
  const historicalCostPrices = stats?.costPrices.filter(cp => cp.effective_to) || [];

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Profit Calculator</h1>
              <p className="text-muted-foreground text-sm">
                Track revenue, costs, and profit margins
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchProfitData}
              disabled={isFetching}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Cost Price
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="space-y-2">
                <Label>Time Period</Label>
                <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="14">Last 14 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="60">Last 60 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                    <SelectItem value="180">Last 180 days</SelectItem>
                    <SelectItem value="365">Last year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Granularity</Label>
                <Select value={granularity} onValueChange={(v: "daily" | "weekly" | "monthly") => setGranularity(v)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Revenue
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {stats ? formatCurrency(stats.totals.revenue) : "—"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Costs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-orange-600">
                {stats ? formatCurrency(stats.totals.cost) : "—"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Profit
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${stats && stats.totals.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                {stats ? formatCurrency(stats.totals.profit) : "—"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Percent className="h-4 w-4" />
                Margin
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {stats ? `${stats.totals.margin}%` : "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                {stats?.totals.orderCount || 0} orders
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Profit Over Time
            </CardTitle>
            <CardDescription>
              {granularity === "daily" ? "Daily" : granularity === "weekly" ? "Weekly" : "Monthly"} breakdown
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isFetching ? (
              <div className="h-[400px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v) => `€${v}`}
                    className="text-muted-foreground"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number, name: string) => [
                      formatCurrency(value),
                      name.charAt(0).toUpperCase() + name.slice(1),
                    ]}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary) / 0.2)"
                    strokeWidth={2}
                    name="Revenue"
                  />
                  <Area
                    type="monotone"
                    dataKey="cost"
                    stroke="hsl(25 95% 53%)"
                    fill="hsl(25 95% 53% / 0.2)"
                    strokeWidth={2}
                    name="Cost"
                  />
                  <Area
                    type="monotone"
                    dataKey="profit"
                    stroke="hsl(142 76% 36%)"
                    fill="hsl(142 76% 36% / 0.2)"
                    strokeWidth={2}
                    name="Profit"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                No data available for the selected period
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cost Prices Management */}
        <Tabs defaultValue="current" className="space-y-4">
          <TabsList>
            <TabsTrigger value="current">Current Prices ({currentCostPrices.length})</TabsTrigger>
            <TabsTrigger value="history">Price History ({historicalCostPrices.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="current">
            <Card>
              <CardHeader>
                <CardTitle>Current Cost Prices</CardTitle>
                <CardDescription>
                  Active pricing used for profit calculations. Bulk price applies when 2+ of the same item in one order.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {currentCostPrices.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No cost prices configured yet</p>
                    <p className="text-sm">Add cost prices to calculate profit margins</p>
                    <Button className="mt-4" onClick={() => setShowAddModal(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Cost Price
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Single (1x)</TableHead>
                        <TableHead className="text-right">Bulk (2x+)</TableHead>
                        <TableHead className="text-right">Savings</TableHead>
                        <TableHead>Effective From</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentCostPrices.map((cp) => (
                        <TableRow key={cp.id}>
                          <TableCell className="font-medium">{cp.product_title}</TableCell>
                          <TableCell className="text-right">{formatCurrency(cp.cost_single)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(cp.cost_bulk)}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant="secondary">
                              {Math.round((1 - cp.cost_bulk / cp.cost_single) * 100)}% off
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(cp.effective_from), "MMM d, yyyy")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Historical Prices</CardTitle>
                <CardDescription>
                  Past pricing used for accurate historical profit calculations
                </CardDescription>
              </CardHeader>
              <CardContent>
                {historicalCostPrices.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No historical prices yet</p>
                    <p className="text-sm">Previous prices will appear here when updated</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Single</TableHead>
                        <TableHead className="text-right">Bulk</TableHead>
                        <TableHead>Period</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historicalCostPrices.map((cp) => (
                        <TableRow key={cp.id}>
                          <TableCell className="font-medium">{cp.product_title}</TableCell>
                          <TableCell className="text-right">{formatCurrency(cp.cost_single)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(cp.cost_bulk)}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {format(new Date(cp.effective_from), "MMM d, yyyy")} — {" "}
                            {cp.effective_to ? format(new Date(cp.effective_to), "MMM d, yyyy") : "Now"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Products without cost prices */}
        {stats && stats.products.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Products Sold</CardTitle>
              <CardDescription>
                Products found in orders. Add cost prices to calculate accurate profit.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {stats.products.map((product) => {
                  const hasCostPrice = currentCostPrices.some(
                    cp => cp.product_title.toLowerCase().includes(product.toLowerCase()) ||
                          product.toLowerCase().includes(cp.product_title.toLowerCase())
                  );
                  return (
                    <Badge
                      key={product}
                      variant={hasCostPrice ? "default" : "outline"}
                      className={!hasCostPrice ? "border-orange-500 text-orange-600" : ""}
                    >
                      {product}
                      {!hasCostPrice && " (no cost)"}
                    </Badge>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Cost Price Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Cost Price</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <ProductSelectForm 
              newCostPrice={newCostPrice}
              setNewCostPrice={setNewCostPrice}
            />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cost (Single) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newCostPrice.cost_single}
                  onChange={(e) => setNewCostPrice({ ...newCostPrice, cost_single: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Cost when qty = 1
                </p>
              </div>
              <div className="space-y-2">
                <Label>Cost (Bulk 2+) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newCostPrice.cost_bulk}
                  onChange={(e) => setNewCostPrice({ ...newCostPrice, cost_bulk: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Cost when qty ≥ 2 in order
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCostPrice} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Cost Price
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Product selector component that uses Shopify products hook
function ProductSelectForm({
  newCostPrice,
  setNewCostPrice,
}: {
  newCostPrice: { product_title: string; product_handle: string; cost_single: string; cost_bulk: string };
  setNewCostPrice: React.Dispatch<React.SetStateAction<{ product_title: string; product_handle: string; cost_single: string; cost_bulk: string }>>;
}) {
  const { data: products, isLoading } = useShopifyProducts();

  const handleProductSelect = (handle: string) => {
    const product = products?.find((p) => p.node.handle === handle);
    if (product) {
      setNewCostPrice((prev) => ({
        ...prev,
        product_title: product.node.title,
        product_handle: product.node.handle,
      }));
    }
  };

  return (
    <div className="space-y-2">
      <Label>Product *</Label>
      <Select
        value={newCostPrice.product_handle}
        onValueChange={handleProductSelect}
      >
        <SelectTrigger>
          <SelectValue placeholder={isLoading ? "Loading products..." : "Select a product"} />
        </SelectTrigger>
        <SelectContent className="max-h-[300px] overflow-y-auto z-[9999]" position="popper" sideOffset={4}>
          {isLoading ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">Loading products...</div>
          ) : products && products.length > 0 ? (
            products.map((product) => (
              <SelectItem key={product.node.id} value={product.node.handle}>
                {product.node.title}
              </SelectItem>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-muted-foreground">No products found</div>
          )}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        Select from your Shopify products
      </p>
    </div>
  );
}
