/**
 * Urgency Tests View
 * 
 * Shows experiments filtered to urgency_social impact zone.
 * Includes the original UrgencyABTestTab functionality + system health widget.
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { AB_TEST_CONFIG, setTestEnabled, setTrafficSplit, getTrafficSplit, fetchTrafficSplitFromDB, forceVariant, clearVariant, getABDebugInfo, type ABVariant } from '@/lib/abTesting';
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
  AlertTriangle,
} from 'lucide-react';
import FirstTestChecklist from './FirstTestChecklist';

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

export default function UrgencyTestsView() {
  const [funnelData, setFunnelData] = useState<FunnelData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testEnabled, setTestEnabledState] = useState(AB_TEST_CONFIG.enabled);
  const [debugInfo, setDebugInfo] = useState(getABDebugInfo());
  const [trafficSplit, setTrafficSplitState] = useState(getTrafficSplit());
  const [splitDrawerOpen, setSplitDrawerOpen] = useState(false);
  const [savingSplit, setSavingSplit] = useState(false);

  // Fetch traffic split from database on mount
  useEffect(() => {
    const loadTrafficSplit = async () => {
      const dbSplit = await fetchTrafficSplitFromDB();
      setTrafficSplitState(dbSplit);
    };
    loadTrafficSplit();
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch funnel comparison data
      const { data: funnel, error: funnelError } = await supabase
        .from('ab_funnel_comparison')
        .select('*');
      
      if (funnelError) throw funnelError;
      setFunnelData(funnel || []);
    } catch (e) {
      console.error('Failed to fetch A/B data:', e);
      setError('Failed to load urgency test data. Please retry.');
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

  const refreshDebugInfo = async () => {
    setDebugInfo(getABDebugInfo());
    const dbSplit = await fetchTrafficSplitFromDB();
    setTrafficSplitState(dbSplit);
  };

  const handleSplitChange = async (value: number[]) => {
    const percentB = value[0];
    setTrafficSplitState(percentB);
    setSavingSplit(true);
    await setTrafficSplit(percentB);
    setSavingSplit(false);
    setDebugInfo(getABDebugInfo());
  };

  const splitPresets = [
    { label: '100/0', percentB: 0 },
    { label: '90/10', percentB: 10 },
    { label: '70/30', percentB: 30 },
    { label: '50/50', percentB: 50 },
    { label: '30/70', percentB: 70 },
    { label: '10/90', percentB: 90 },
    { label: '0/100', percentB: 100 },
  ];

  const variantA = funnelData.find(d => d.ab_variant === 'A');
  const variantB = funnelData.find(d => d.ab_variant === 'B');
  
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
      {/* System Health Widget */}
      <FirstTestChecklist />

      {/* Error State */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">Connection Error</p>
                  <p className="text-sm text-muted-foreground">{error}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={fetchData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
                    
                    <div className="px-2">
                      <Label className="text-sm text-muted-foreground mb-4 flex items-center gap-2">
                        Drag to adjust traffic split
                        {savingSplit && (
                          <span className="text-xs text-primary animate-pulse">Saving...</span>
                        )}
                      </Label>
                      <Slider
                        value={[trafficSplit]}
                        onValueChange={handleSplitChange}
                        min={0}
                        max={100}
                        step={5}
                        className="w-full"
                        disabled={savingSplit}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-2">
                        <span>100% A</span>
                        <span>50/50</span>
                        <span>100% B</span>
                      </div>
                    </div>
                    
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
                        <li>Split is stored in database — applies globally to all visitors</li>
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
          <CardTitle className="text-base">Funnel Comparison</CardTitle>
          <CardDescription>Conversion rates at each stage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            {/* Variant A */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Variant A (Control)</h4>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>ATC Rate</span>
                    <span className="font-medium">{((variantA?.atc_rate || 0) * 100).toFixed(1)}%</span>
                  </div>
                  <Progress value={(variantA?.atc_rate || 0) * 100} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Checkout Rate</span>
                    <span className="font-medium">{((variantA?.ic_rate || 0) * 100).toFixed(1)}%</span>
                  </div>
                  <Progress value={(variantA?.ic_rate || 0) * 100} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Purchase Rate</span>
                    <span className="font-medium">{((variantA?.purchase_rate || 0) * 100).toFixed(1)}%</span>
                  </div>
                  <Progress value={(variantA?.purchase_rate || 0) * 100} className="h-2" />
                </div>
              </div>
            </div>
            
            {/* Variant B */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm flex items-center gap-2">
                Variant B (Treatment)
                {purchaseLift !== null && purchaseLift > 0 && (
                  <Badge className="text-xs">Winner</Badge>
                )}
              </h4>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>ATC Rate</span>
                    <span className="font-medium">{((variantB?.atc_rate || 0) * 100).toFixed(1)}%</span>
                  </div>
                  <Progress value={(variantB?.atc_rate || 0) * 100} className="h-2 [&>div]:bg-primary" />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Checkout Rate</span>
                    <span className="font-medium">{((variantB?.ic_rate || 0) * 100).toFixed(1)}%</span>
                  </div>
                  <Progress value={(variantB?.ic_rate || 0) * 100} className="h-2 [&>div]:bg-primary" />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Purchase Rate</span>
                    <span className="font-medium">{((variantB?.purchase_rate || 0) * 100).toFixed(1)}%</span>
                  </div>
                  <Progress value={(variantB?.purchase_rate || 0) * 100} className="h-2 [&>div]:bg-primary" />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
