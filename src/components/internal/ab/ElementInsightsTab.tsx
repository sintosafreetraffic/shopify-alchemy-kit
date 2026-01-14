/**
 * Element Insights Tab - Clarity integration + intent-only tracking
 * Shows high-intent element performance with conversion attribution
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  MousePointer2,
  ShoppingCart,
  CreditCard,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  ExternalLink,
  Eye,
  Target,
  Sparkles,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { ElementType } from '@/lib/abExperimentation';

interface ElementStats {
  element_type: ElementType;
  total_interactions: number;
  led_to_atc: number;
  led_to_checkout: number;
  atc_rate: number;
  checkout_rate: number;
  variant_a_interactions: number;
  variant_b_interactions: number;
  variant_a_atc_rate: number;
  variant_b_atc_rate: number;
}

const ELEMENT_LABELS: Record<ElementType, { label: string; icon: string }> = {
  cta_button: { label: 'CTA Buttons', icon: '🎯' },
  price_section: { label: 'Price Section', icon: '💰' },
  gallery: { label: 'Image Gallery', icon: '🖼️' },
  sticky_atc: { label: 'Sticky Add to Cart', icon: '📌' },
  hero_props: { label: 'Hero Value Props', icon: '✨' },
  benefits: { label: 'Benefits Block', icon: '✅' },
  urgency: { label: 'Urgency Elements', icon: '⏰' },
  reviews: { label: 'Reviews Section', icon: '⭐' },
};

function ElementCard({ stats }: { stats: ElementStats }) {
  const config = ELEMENT_LABELS[stats.element_type];
  const lift = stats.variant_a_atc_rate > 0 
    ? ((stats.variant_b_atc_rate - stats.variant_a_atc_rate) / stats.variant_a_atc_rate) * 100 
    : 0;
  const isPositive = lift > 0;

  // Distraction score: high interactions but low ATC = distraction
  const distractionScore = stats.total_interactions > 0 && stats.atc_rate < 0.05 
    ? 'High' 
    : stats.atc_rate < 0.1 
      ? 'Medium' 
      : 'Low';

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{config.icon}</span>
            <CardTitle className="text-base">{config.label}</CardTitle>
          </div>
          {stats.total_interactions > 50 && (
            <Badge 
              variant={isPositive ? 'default' : 'secondary'}
              className="text-xs"
            >
              {isPositive ? '+' : ''}{lift.toFixed(1)}% B vs A
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Interaction stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 bg-muted/50 rounded-lg">
            <p className="text-lg font-bold">{stats.total_interactions.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Interactions</p>
          </div>
          <div className="p-2 bg-green-500/10 rounded-lg">
            <p className="text-lg font-bold text-green-600">{stats.led_to_atc}</p>
            <p className="text-xs text-muted-foreground">→ ATC</p>
          </div>
          <div className="p-2 bg-primary/10 rounded-lg">
            <p className="text-lg font-bold text-primary">{stats.led_to_checkout}</p>
            <p className="text-xs text-muted-foreground">→ Checkout</p>
          </div>
        </div>

        {/* Conversion rates */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">ATC Rate</span>
            <span className="font-medium">{(stats.atc_rate * 100).toFixed(1)}%</span>
          </div>
          <Progress value={stats.atc_rate * 100} className="h-2" />
        </div>

        {/* Variant comparison */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 bg-muted/30 rounded">
            <p className="text-muted-foreground">Variant A</p>
            <p className="font-medium">
              {stats.variant_a_interactions} clicks • {(stats.variant_a_atc_rate * 100).toFixed(1)}% ATC
            </p>
          </div>
          <div className="p-2 bg-primary/10 rounded border border-primary/20">
            <p className="text-muted-foreground">Variant B</p>
            <p className="font-medium">
              {stats.variant_b_interactions} clicks • {(stats.variant_b_atc_rate * 100).toFixed(1)}% ATC
            </p>
          </div>
        </div>

        {/* Distraction indicator */}
        {distractionScore === 'High' && (
          <div className="flex items-center gap-2 p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
            <Eye className="h-4 w-4 text-amber-500" />
            <p className="text-xs text-amber-600 dark:text-amber-400">
              High clicks, low ATC — potential distraction
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ElementInsightsTab() {
  const [stats, setStats] = useState<ElementStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [testFilter, setTestFilter] = useState<string>('all');
  const [tests, setTests] = useState<{ id: string; name: string }[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    
    // Fetch available tests
    const { data: testData } = await supabase
      .from('ab_tests')
      .select('id, name')
      .in('status', ['active', 'paused', 'completed']);
    
    setTests(testData || []);

    // Fetch intent events with aggregation
    let query = supabase.from('ab_intent_events').select('*');
    
    if (testFilter !== 'all') {
      query = query.eq('test_id', testFilter);
    }

    const { data: events, error } = await query;

    if (error) {
      console.error('Failed to fetch intent events:', error);
      setLoading(false);
      return;
    }

    // Aggregate stats by element type
    const aggregated: Record<ElementType, ElementStats> = {} as Record<ElementType, ElementStats>;
    
    const elementTypes: ElementType[] = [
      'cta_button', 'price_section', 'gallery', 'sticky_atc',
      'hero_props', 'benefits', 'urgency', 'reviews'
    ];

    elementTypes.forEach(type => {
      aggregated[type] = {
        element_type: type,
        total_interactions: 0,
        led_to_atc: 0,
        led_to_checkout: 0,
        atc_rate: 0,
        checkout_rate: 0,
        variant_a_interactions: 0,
        variant_b_interactions: 0,
        variant_a_atc_rate: 0,
        variant_b_atc_rate: 0,
      };
    });

    (events || []).forEach((event: any) => {
      const elementType = event.element_type as ElementType;
      const stat = aggregated[elementType];
      if (!stat) return;

      stat.total_interactions++;
      if (event.led_to_atc) stat.led_to_atc++;
      if (event.led_to_checkout) stat.led_to_checkout++;

      if (event.ab_variant === 'A') {
        stat.variant_a_interactions++;
      } else {
        stat.variant_b_interactions++;
      }
    });

    // Calculate rates
    Object.values(aggregated).forEach(stat => {
      stat.atc_rate = stat.total_interactions > 0 ? stat.led_to_atc / stat.total_interactions : 0;
      stat.checkout_rate = stat.total_interactions > 0 ? stat.led_to_checkout / stat.total_interactions : 0;
      
      // Variant-specific rates (simplified - would need more data)
      const aAtc = (events || []).filter((e: any) => 
        e.element_type === stat.element_type && e.ab_variant === 'A' && e.led_to_atc
      ).length;
      const bAtc = (events || []).filter((e: any) => 
        e.element_type === stat.element_type && e.ab_variant === 'B' && e.led_to_atc
      ).length;
      
      stat.variant_a_atc_rate = stat.variant_a_interactions > 0 ? aAtc / stat.variant_a_interactions : 0;
      stat.variant_b_atc_rate = stat.variant_b_interactions > 0 ? bAtc / stat.variant_b_interactions : 0;
    });

    setStats(Object.values(aggregated).filter(s => s.total_interactions > 0));
    setLoading(false);
  }, [testFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalInteractions = stats.reduce((sum, s) => sum + s.total_interactions, 0);
  const totalAtc = stats.reduce((sum, s) => sum + s.led_to_atc, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Element Insights
          </h3>
          <p className="text-sm text-muted-foreground">
            High-intent element tracking with conversion attribution
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={testFilter} onValueChange={setTestFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by test" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tests</SelectItem>
              {tests.map(test => (
                <SelectItem key={test.id} value={test.id}>{test.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <MousePointer2 className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Interactions</span>
            </div>
            <p className="text-3xl font-bold">{totalInteractions.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <ShoppingCart className="h-5 w-5 text-green-600" />
              <span className="text-sm text-muted-foreground">Led to ATC</span>
            </div>
            <p className="text-3xl font-bold text-green-600">{totalAtc.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">Avg Conversion</span>
            </div>
            <p className="text-3xl font-bold">
              {totalInteractions > 0 ? ((totalAtc / totalInteractions) * 100).toFixed(1) : 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Clarity integration note */}
      <Card className="bg-muted/30">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Eye className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-medium">Microsoft Clarity Integration</p>
                <p className="text-xs text-muted-foreground">
                  View heatmaps and session recordings filtered by A/B variant
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild>
              <a href="https://clarity.microsoft.com" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Clarity
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Element cards */}
      {stats.length === 0 && !loading ? (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <MousePointer2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Element Data Yet</h3>
            <p className="text-muted-foreground">
              Element interactions will appear here once tracking is active
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {stats
            .sort((a, b) => b.total_interactions - a.total_interactions)
            .map(stat => (
              <ElementCard key={stat.element_type} stats={stat} />
            ))}
        </div>
      )}
    </div>
  );
}
