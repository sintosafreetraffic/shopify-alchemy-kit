/**
 * A/B Testing Debug Page
 * 
 * Internal debug endpoint showing A/B test status, variant assignment,
 * and controls for testing.
 * 
 * Route: /debug/ab-status
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  getABDebugInfo, 
  forceVariant, 
  clearVariant,
  AB_TEST_CONFIG,
  type ABVariant,
} from '@/lib/abTesting';
import { useABVariant } from '@/hooks/useABVariant';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, CheckCircle, XCircle, Beaker, Cookie, Database } from 'lucide-react';

interface ABStats {
  variantA: { pageViews: number; atc: number; purchases: number; revenue: number };
  variantB: { pageViews: number; atc: number; purchases: number; revenue: number };
}

export default function ABTestingDebug() {
  const { variant, isVariantB, trackEvent } = useABVariant();
  const [debugInfo, setDebugInfo] = useState(getABDebugInfo());
  const [stats, setStats] = useState<ABStats | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshDebugInfo = () => {
    setDebugInfo(getABDebugInfo());
  };

  const handleForceVariant = (v: ABVariant) => {
    forceVariant(v);
    refreshDebugInfo();
    window.location.reload();
  };

  const handleClearVariant = () => {
    clearVariant();
    refreshDebugInfo();
    window.location.reload();
  };

  const handleTestEvent = () => {
    trackEvent('page_view', undefined, { source: 'debug_page' });
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ab_funnel_comparison')
        .select('*');
      
      if (error) throw error;
      
      const statsMap: ABStats = {
        variantA: { pageViews: 0, atc: 0, purchases: 0, revenue: 0 },
        variantB: { pageViews: 0, atc: 0, purchases: 0, revenue: 0 },
      };
      
      data?.forEach(row => {
        const key = row.ab_variant === 'A' ? 'variantA' : 'variantB';
        statsMap[key] = {
          pageViews: row.page_views || 0,
          atc: row.add_to_carts || 0,
          purchases: row.purchases || 0,
          revenue: row.total_revenue || 0,
        };
      });
      
      setStats(statsMap);
    } catch (e) {
      console.error('Failed to fetch stats:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Only show in development or with debug flag
  const isDev = import.meta.env.DEV || localStorage.getItem('DEBUG_AB') === '1';
  
  if (!isDev) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">
              This debug page is only available in development mode.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8">
      <div className="container max-w-4xl mx-auto px-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Beaker className="h-6 w-6" />
              A/B Testing Debug
            </h1>
            <p className="text-muted-foreground">
              Internal debug endpoint for A/B test status
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={refreshDebugInfo}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Current Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cookie className="h-5 w-5" />
              Current Assignment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Test Enabled</p>
                <div className="flex items-center gap-2 mt-1">
                  {debugInfo.enabled ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                  <span className="font-medium">{debugInfo.enabled ? 'Yes' : 'No'}</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current Variant</p>
                <Badge variant={isVariantB ? 'default' : 'secondary'} className="mt-1">
                  Variant {variant}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Test Name</p>
                <p className="font-mono text-sm mt-1">{debugInfo.testName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Session ID</p>
                <p className="font-mono text-xs mt-1 truncate">{debugInfo.sessionId}</p>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Cookie Value</p>
                <code className="text-sm bg-muted px-2 py-1 rounded mt-1 block">
                  {debugInfo.cookieValue || '(not set)'}
                </code>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">LocalStorage Value</p>
                <code className="text-sm bg-muted px-2 py-1 rounded mt-1 block">
                  {debugInfo.localStorageValue || '(not set)'}
                </code>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Test Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Button 
                variant={variant === 'A' ? 'default' : 'outline'}
                onClick={() => handleForceVariant('A')}
              >
                Force Variant A
              </Button>
              <Button 
                variant={variant === 'B' ? 'default' : 'outline'}
                onClick={() => handleForceVariant('B')}
              >
                Force Variant B
              </Button>
              <Button variant="destructive" onClick={handleClearVariant}>
                Clear Assignment
              </Button>
              <Button variant="secondary" onClick={handleTestEvent}>
                Track Test Event
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Forcing a variant or clearing will reload the page to apply changes.
            </p>
          </CardContent>
        </Card>

        {/* Live Stats */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Live Statistics
            </CardTitle>
            <Button variant="outline" size="sm" onClick={fetchStats} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            {stats ? (
              <div className="grid grid-cols-2 gap-6">
                {/* Variant A */}
                <div className="space-y-3">
                  <h3 className="font-semibold">Variant A (Control)</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Page Views</span>
                      <span className="font-medium">{stats.variantA.pageViews}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Add to Cart</span>
                      <span className="font-medium">{stats.variantA.atc}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Purchases</span>
                      <span className="font-medium">{stats.variantA.purchases}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Revenue</span>
                      <span className="font-medium">${stats.variantA.revenue.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Variant B */}
                <div className="space-y-3">
                  <h3 className="font-semibold">Variant B (Urgency)</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Page Views</span>
                      <span className="font-medium">{stats.variantB.pageViews}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Add to Cart</span>
                      <span className="font-medium">{stats.variantB.atc}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Purchases</span>
                      <span className="font-medium">{stats.variantB.purchases}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Revenue</span>
                      <span className="font-medium">${stats.variantB.revenue.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                {loading ? 'Loading statistics...' : 'No data available yet'}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Test Config */}
        <Card>
          <CardHeader>
            <CardTitle>Test Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto max-h-64">
              {JSON.stringify(AB_TEST_CONFIG, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
