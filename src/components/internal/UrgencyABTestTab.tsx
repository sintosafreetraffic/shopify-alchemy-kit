/**
 * UrgencyABTestTab Component
 * 
 * Displays urgency/scarcity A/B test (Variant A vs B) tracking data.
 * Shows funnel comparison, conversion rates, and revenue metrics.
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { AB_TEST_CONFIG, setTestEnabled, setTrafficSplit, getTrafficSplit, forceVariant, clearVariant, getABDebugInfo, type ABVariant } from '@/lib/abTesting';
import { 
  Beaker, 
  TrendingUp, 
  Users, 
  DollarSign, 
  ShoppingCart,
  Eye,
  RefreshCw,
  CheckCircle,
  Bug,
  Trash2,
  SlidersHorizontal,
  Percent,
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

export default function UrgencyABTestTab() {
  const [funnelData, setFunnelData] = useState<FunnelData[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [testEnabled, setTestEnabledState] = useState(AB_TEST_CONFIG.enabled);
  const [debugInfo, setDebugInfo] = useState(getABDebugInfo());
  const [trafficSplit, setTrafficSplitState] = useState(getTrafficSplit());
  const [splitDrawerOpen, setSplitDrawerOpen] = useState(false);

  const fetchData = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggleTest = () => {
    const newState = !testEnabled;
    setTestEnabled(newState);
    setTestEnabledState(newState);
  };

  const handleForceVariant = (v: ABVariant) => {
    forceVariant(v);
    setDebugInfo(getABDebugInfo());
  };

  const handleClearVariant = () => {
    clearVariant();
    setDebugInfo(getABDebugInfo());
  };

  const refreshDebugInfo = () => {
    setDebugInfo(getABDebugInfo());
    setTrafficSplitState(getTrafficSplit());
  };

  const handleSplitChange = (value: number[]) => {
    const percentB = value[0];
    setTrafficSplit(percentB);
    setTrafficSplitState(percentB);
    setDebugInfo(getABDebugInfo());
  };

  // Preset split options
  const splitPresets = [
    { label: '100/0', percentB: 0 },
    { label: '90/10', percentB: 10 },
    { label: '70/30', percentB: 30 },
    { label: '50/50', percentB: 50 },
    { label: '30/70', percentB: 70 },
    { label: '10/90', percentB: 90 },
    { label: '0/100', percentB: 100 },
  ];
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center">
            <Beaker className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Urgency A/B Test</h2>
            <p className="text-sm text-muted-foreground">
              Product page urgency/scarcity elements test
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
                {testEnabled ? 'Running' : 'Paused'} • {100 - trafficSplit}/{trafficSplit} split (A/B)
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Sheet open={splitDrawerOpen} onOpenChange={setSplitDrawerOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm">
                    <SlidersHorizontal className="h-4 w-4 mr-2" />
                    Traffic Split
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[400px] sm:w-[540px]">
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                      <Percent className="h-5 w-5" />
                      Traffic Diversion
                    </SheetTitle>
                    <SheetDescription>
                      Adjust the percentage of traffic directed to each variant. 
                      Changes apply to NEW visitors only (existing assignments are preserved).
                    </SheetDescription>
                  </SheetHeader>
                  
                  <div className="mt-8 space-y-8">
                    {/* Current Split Display */}
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-4 mb-4">
                        <div className="text-center">
                          <p className="text-3xl font-bold">{100 - trafficSplit}%</p>
                          <p className="text-sm text-muted-foreground">Variant A</p>
                        </div>
                        <div className="text-2xl text-muted-foreground">/</div>
                        <div className="text-center">
                          <p className="text-3xl font-bold text-primary">{trafficSplit}%</p>
                          <p className="text-sm text-muted-foreground">Variant B</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Slider */}
                    <div className="px-2">
                      <Label className="text-sm text-muted-foreground mb-4 block">
                        Drag to adjust traffic split
                      </Label>
                      <Slider
                        value={[trafficSplit]}
                        onValueChange={handleSplitChange}
                        min={0}
                        max={100}
                        step={5}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-2">
                        <span>100% A</span>
                        <span>50/50</span>
                        <span>100% B</span>
                      </div>
                    </div>
                    
                    {/* Preset Buttons */}
                    <div>
                      <Label className="text-sm text-muted-foreground mb-3 block">
                        Quick presets (A/B)
                      </Label>
                      <div className="grid grid-cols-4 gap-2">
                        {splitPresets.map((preset) => (
                          <Button
                            key={preset.label}
                            variant={trafficSplit === preset.percentB ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleSplitChange([preset.percentB])}
                          >
                            {preset.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Visual Progress Bar */}
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Traffic distribution</Label>
                      <div className="h-8 w-full rounded-lg overflow-hidden flex">
                        <div 
                          className="bg-muted flex items-center justify-center text-xs font-medium transition-all duration-300"
                          style={{ width: `${100 - trafficSplit}%` }}
                        >
                          {100 - trafficSplit > 10 && `A: ${100 - trafficSplit}%`}
                        </div>
                        <div 
                          className="bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium transition-all duration-300"
                          style={{ width: `${trafficSplit}%` }}
                        >
                          {trafficSplit > 10 && `B: ${trafficSplit}%`}
                        </div>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="text-sm text-muted-foreground space-y-2">
                      <p><strong>Note:</strong></p>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li>Changes apply immediately to new visitors</li>
                        <li>Existing visitors keep their assigned variant</li>
                        <li>Use "Clear" in Debug Controls to reset your own assignment</li>
                      </ul>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
              <Badge variant={testEnabled ? 'default' : 'secondary'}>
                {testEnabled ? 'Active' : 'Paused'}
              </Badge>
            </div>
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

      {/* Debug Controls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bug className="h-4 w-4" />
            Debug Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <p className="text-sm">
              Current variant: <Badge variant="outline">{debugInfo.currentVariant}</Badge>
            </p>
            <p className="text-sm text-muted-foreground">
              Session: {debugInfo.sessionId?.slice(0, 8)}...
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => handleForceVariant('A')}>
              Force Variant A
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleForceVariant('B')}>
              Force Variant B
            </Button>
            <Button size="sm" variant="ghost" onClick={handleClearVariant}>
              <Trash2 className="h-4 w-4 mr-1" />
              Clear
            </Button>
            <Button size="sm" variant="ghost" onClick={refreshDebugInfo}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Note: Forcing a variant requires a page reload to take effect on the product page.
          </p>
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

      {/* Note */}
      <Card className="bg-muted/50">
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> This test tracks urgency elements on the product page. 
            Variant A shows the standard page, Variant B includes stock indicators, viewer counts, and scarcity bars.
            Data is tracked to the <code className="bg-muted px-1 rounded">ab_events</code> table.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
