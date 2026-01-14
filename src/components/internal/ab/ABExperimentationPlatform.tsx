/**
 * A/B Experimentation Platform - Main Container
 * Premium Scandinavian-styled experimentation dashboard
 */

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Beaker, 
  Sparkles, 
  Archive,
  TrendingUp,
  Shield,
} from 'lucide-react';
import ActiveTestsTab from './ActiveTestsTab';
import ElementInsightsTab from './ElementInsightsTab';
import TestHistoryTab from './TestHistoryTab';

export default function ABExperimentationPlatform() {
  const [activeTab, setActiveTab] = useState('active');

  return (
    <div className="space-y-6">
      {/* Platform Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
            <Beaker className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              Experimentation Platform
              <Badge variant="secondary" className="text-xs">v2.0</Badge>
            </h2>
            <p className="text-sm text-muted-foreground">
              Scientific A/B testing with Bayesian analysis & auto-stop rules
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

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
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

      {/* Platform info footer */}
      <Card className="bg-muted/30">
        <CardContent className="py-4">
          <div className="flex items-start gap-4 text-xs text-muted-foreground">
            <div>
              <p className="font-medium text-foreground mb-1">Statistical Method</p>
              <p>Bayesian with 95% credible interval, minimum 300 sessions per variant</p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">Auto-Stop Rules</p>
              <p>Performance gap (&gt;20% worse), significance reached, 48h plateau</p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">Zone Guardrails</p>
              <p>Max 3 tests, price/urgency exclusive, no overlapping impact zones</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
