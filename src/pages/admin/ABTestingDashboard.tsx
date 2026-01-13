/**
 * A/B Testing Admin Dashboard
 * 
 * Route: /admin/ab-testing
 * Auth-guarded admin page for managing and monitoring A/B tests.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { AB_TEST_CONFIG, setTestEnabled } from '@/lib/abTesting';
import { 
  Beaker, 
  TrendingUp, 
  Users, 
  DollarSign, 
  ShoppingCart,
  Eye,
  RefreshCw,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';

interface FunnelData {
  ab_variant: string;
  page_views: number;
  add_to_carts: number;
  initiates: number;
  purchases: number;
  total_revenue: number;
  atc_rate: number;
  ic_rate: number;
  purchase_rate: number;
}

interface PerformanceData {
  ab_variant: string;
  event_name: string;
  event_count: number;
  unique_sessions: number;
  total_revenue: number;
  avg_revenue_per_conversion: number;
}

export default function ABTestingDashboard() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [funnelData, setFunnelData] = useState<FunnelData[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [testEnabled, setTestEnabledState] = useState(AB_TEST_CONFIG.enabled);

  // Check auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch funnel comparison data
      const { data: funnel, error: funnelError } = await supabase
        .from('ab_funnel_comparison')
        .select('*');
      
      if (funnelError) throw funnelError;
      setFunnelData(funnel || []);

      // Fetch performance overview
      const { data: performance, error: perfError } = await supabase
        .from('ab_performance_overview')
        .select('*');
      
      if (perfError) throw perfError;
      setPerformanceData(performance || []);
    } catch (e) {
      console.error('Failed to fetch A/B data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  const handleToggleTest = () => {
    const newState = !testEnabled;
    setTestEnabled(newState);
    setTestEnabledState(newState);
  };

  // Auth loading state
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
            <p className="text-muted-foreground mb-4">
              Please sign in to access the A/B testing dashboard.
            </p>
            <Button onClick={() => navigate('/auth')}>
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get variant data
  const variantA = funnelData.find(d => d.ab_variant === 'A');
  const variantB = funnelData.find(d => d.ab_variant === 'B');
  
  // Calculate lift
  const calculateLift = (a: number | undefined, b: number | undefined) => {
    if (!a || a === 0) return null;
    if (!b) return null;
    return ((b - a) / a) * 100;
  };

  const atcLift = calculateLift(variantA?.atc_rate, variantB?.atc_rate);
  const purchaseLift = calculateLift(variantA?.purchase_rate, variantB?.purchase_rate);
  const revenueLift = calculateLift(variantA?.total_revenue, variantB?.total_revenue);

  return (
    <div className="min-h-screen bg-muted/30 py-8">
      <div className="container max-w-6xl mx-auto px-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Beaker className="h-6 w-6" />
                A/B Testing Dashboard
              </h1>
              <p className="text-muted-foreground">
                Product Page Urgency Test
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch 
                id="test-toggle" 
                checked={testEnabled}
                onCheckedChange={handleToggleTest}
              />
              <Label htmlFor="test-toggle" className="text-sm">
                Test {testEnabled ? 'Enabled' : 'Disabled'}
              </Label>
            </div>
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Test Status */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{AB_TEST_CONFIG.testName}</CardTitle>
                <CardDescription>
                  {testEnabled ? 'Running' : 'Paused'} • 50/50 split
                </CardDescription>
              </div>
              <Badge variant={testEnabled ? 'default' : 'secondary'}>
                {testEnabled ? 'Active' : 'Paused'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm font-medium mb-1">Variant A (Control)</p>
                <p className="text-xs text-muted-foreground">Current product page - no urgency elements</p>
              </div>
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-sm font-medium mb-1">Variant B (Treatment)</p>
                <p className="text-xs text-muted-foreground">Urgency elements: stock indicator, viewer count, scarcity bar</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <Eye className="h-5 w-5 text-muted-foreground" />
                <Badge variant="outline" className="text-xs">Total</Badge>
              </div>
              <p className="text-2xl font-bold mt-2">
                {((variantA?.page_views || 0) + (variantB?.page_views || 0)).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Page Views</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <ShoppingCart className="h-5 w-5 text-muted-foreground" />
                {atcLift !== null && (
                  <Badge variant={atcLift > 0 ? 'default' : 'destructive'} className="text-xs">
                    {atcLift > 0 ? '+' : ''}{atcLift.toFixed(1)}%
                  </Badge>
                )}
              </div>
              <p className="text-2xl font-bold mt-2">
                {((variantA?.add_to_carts || 0) + (variantB?.add_to_carts || 0)).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Add to Carts</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <CheckCircle className="h-5 w-5 text-muted-foreground" />
                {purchaseLift !== null && (
                  <Badge variant={purchaseLift > 0 ? 'default' : 'destructive'} className="text-xs">
                    {purchaseLift > 0 ? '+' : ''}{purchaseLift.toFixed(1)}%
                  </Badge>
                )}
              </div>
              <p className="text-2xl font-bold mt-2">
                {((variantA?.purchases || 0) + (variantB?.purchases || 0)).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Purchases</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
                {revenueLift !== null && (
                  <Badge variant={revenueLift > 0 ? 'default' : 'destructive'} className="text-xs">
                    {revenueLift > 0 ? '+' : ''}{revenueLift.toFixed(1)}%
                  </Badge>
                )}
              </div>
              <p className="text-2xl font-bold mt-2">
                ${((variantA?.total_revenue || 0) + (variantB?.total_revenue || 0)).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Total Revenue</p>
            </CardContent>
          </Card>
        </div>

        {/* Funnel Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Funnel Comparison
            </CardTitle>
            <CardDescription>
              Conversion rates at each stage of the funnel
            </CardDescription>
          </CardHeader>
          <CardContent>
            {funnelData.length > 0 ? (
              <div className="space-y-6">
                {/* Add to Cart Rate */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Add to Cart Rate</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xs w-20 text-muted-foreground">Variant A</span>
                      <Progress value={variantA?.atc_rate || 0} className="flex-1" />
                      <span className="text-sm font-medium w-16 text-right">
                        {(variantA?.atc_rate || 0).toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs w-20 text-muted-foreground">Variant B</span>
                      <Progress value={variantB?.atc_rate || 0} className="flex-1 [&>div]:bg-primary" />
                      <span className="text-sm font-medium w-16 text-right">
                        {(variantB?.atc_rate || 0).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Purchase Rate */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Purchase Rate</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xs w-20 text-muted-foreground">Variant A</span>
                      <Progress value={(variantA?.purchase_rate || 0) * 10} className="flex-1" />
                      <span className="text-sm font-medium w-16 text-right">
                        {(variantA?.purchase_rate || 0).toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs w-20 text-muted-foreground">Variant B</span>
                      <Progress value={(variantB?.purchase_rate || 0) * 10} className="flex-1 [&>div]:bg-primary" />
                      <span className="text-sm font-medium w-16 text-right">
                        {(variantB?.purchase_rate || 0).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Revenue */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Total Revenue</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-muted/50 text-center">
                      <p className="text-2xl font-bold">${(variantA?.total_revenue || 0).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Variant A</p>
                    </div>
                    <div className="p-4 rounded-lg bg-primary/10 text-center">
                      <p className="text-2xl font-bold">${(variantB?.total_revenue || 0).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Variant B</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                {loading ? 'Loading funnel data...' : 'No data collected yet. Start the test to see results.'}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Raw Data Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Detailed Event Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {performanceData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3">Variant</th>
                      <th className="text-left py-2 px-3">Event</th>
                      <th className="text-right py-2 px-3">Count</th>
                      <th className="text-right py-2 px-3">Unique Sessions</th>
                      <th className="text-right py-2 px-3">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {performanceData.map((row, idx) => (
                      <tr key={idx} className="border-b last:border-0">
                        <td className="py-2 px-3">
                          <Badge variant={row.ab_variant === 'B' ? 'default' : 'secondary'}>
                            {row.ab_variant}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 font-mono text-xs">{row.event_name}</td>
                        <td className="py-2 px-3 text-right">{row.event_count}</td>
                        <td className="py-2 px-3 text-right">{row.unique_sessions}</td>
                        <td className="py-2 px-3 text-right">${(row.total_revenue || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                {loading ? 'Loading event data...' : 'No events recorded yet'}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
