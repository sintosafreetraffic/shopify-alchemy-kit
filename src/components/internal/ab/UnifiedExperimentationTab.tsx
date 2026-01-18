/**
 * Unified Experimentation Tab
 * 
 * Combines the ABExperimentationPlatform with urgency-specific filtering.
 * Replaces both the standalone Experiments tab and provides context for Urgency A/B.
 * 
 * Features:
 * - Dual tab view: Urgency Tests | All Tests
 * - Default urgency filter for focused experience
 * - Full platform access via "All Tests" toggle
 */

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Beaker, 
  Sparkles, 
  Archive,
  TrendingUp,
  Shield,
  Zap,
  FlaskConical,
} from 'lucide-react';
import ActiveTestsTab from './ActiveTestsTab';
import ElementInsightsTab from './ElementInsightsTab';
import TestHistoryTab from './TestHistoryTab';
import UrgencyTestsView from './UrgencyTestsView';

type ExperimentScope = 'urgency' | 'all';

export default function UnifiedExperimentationTab() {
  const [scope, setScope] = useState<ExperimentScope>('urgency');
  const [activeSubTab, setActiveSubTab] = useState('active');

  return (
    <div className="space-y-6">
      {/* Platform Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-primary/10 flex items-center justify-center">
            <FlaskConical className="w-6 h-6 text-orange-500" />
          </div>
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              Experimentation Platform
              <Badge variant="secondary" className="text-xs">v2.2</Badge>
            </h2>
            <p className="text-sm text-muted-foreground">
              Measure impact, decide winners, archive learnings
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Shield className="h-4 w-4" />
            <span>Zone-protected</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4" />
            <span>BIS-driven</span>
          </div>
        </div>
      </div>

      {/* Mental Model Explanation */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">This is a tracking &amp; decision system — not a page editor.</p>
              <p className="text-xs text-muted-foreground">
                Variants are implemented in code (e.g. <code className="px-1 py-0.5 bg-muted rounded text-xs">HeroVariantB</code>, <code className="px-1 py-0.5 bg-muted rounded text-xs">useABVariant()</code>). 
                This UI registers experiments, measures impact, recommends actions, and archives learnings.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scope Selector: Urgency Operations | Experimentation Platform */}
      <Tabs value={scope} onValueChange={(v) => setScope(v as ExperimentScope)} className="space-y-4">
        <div className="space-y-2">
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
            <TabsTrigger value="urgency" className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-orange-500" />
              <span>Urgency Operations</span>
            </TabsTrigger>
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Beaker className="h-4 w-4" />
              <span>Experimentation Platform</span>
            </TabsTrigger>
          </TabsList>
          <p className="text-xs text-muted-foreground pl-1">
            {scope === 'urgency' 
              ? 'Operate the urgency experiment + see core health.' 
              : 'All experiments across the store: decide winners, archive learnings.'}
          </p>
        </div>

        {/* Urgency Tests View - Default */}
        <TabsContent value="urgency" className="mt-4">
          <UrgencyTestsView />
        </TabsContent>

        {/* All Tests View - Full Platform */}
        <TabsContent value="all" className="mt-4 space-y-4">
          <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
              <TabsTrigger value="active" className="flex items-center gap-2">
                <Beaker className="h-4 w-4" />
                <span className="hidden sm:inline">Active Tests</span>
                <span className="sm:hidden">Active</span>
              </TabsTrigger>
              <TabsTrigger value="insights" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                <span className="hidden sm:inline">Element Insights</span>
                <span className="sm:hidden">Insights</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <Archive className="h-4 w-4" />
                <span className="hidden sm:inline">Test History</span>
                <span className="sm:hidden">History</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="mt-6">
              <ActiveTestsTab />
            </TabsContent>

            <TabsContent value="insights" className="mt-6">
              <ElementInsightsTab />
            </TabsContent>

            <TabsContent value="history" className="mt-6">
              <TestHistoryTab />
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>

      {/* Platform info footer */}
      <Card className="bg-muted/30">
        <CardContent className="py-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-xs text-muted-foreground">
            <div>
              <p className="font-medium text-foreground mb-1">Statistical Method</p>
              <p>Bayesian with 95% credible interval, min 300 sessions/variant</p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">Auto-Stop Rules</p>
              <p>Recommendation only — never auto-stops without confirmation</p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">Overlap Rules</p>
              <p>Max 3 active tests, only 1 may affect pricing/CTA/urgency</p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">Winner Declaration</p>
              <p>Manual confirm required. Min sample + BIS comparison shown.</p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">Archive Policy</p>
              <p>Last 12 fully restorable. Older = summary-only.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
