/**
 * First Test Checklist - Sanity check before going live
 * 
 * Ensures operators verify critical items before running their first real test
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle,
  AlertTriangle,
  Rocket,
  RefreshCw,
  ExternalLink,
  ClipboardCheck,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  checkFn?: () => Promise<boolean>;
  manualOnly?: boolean;
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  {
    id: 'variant_assignment',
    label: 'A/B variant assignment is stable',
    description: 'Verify users don\'t flip between variants on page refresh',
    manualOnly: true,
  },
  {
    id: 'events_flowing',
    label: 'Events are flowing to ab_intent_events',
    description: 'Check that clicks on CTA, price, etc. are being tracked',
    checkFn: async () => {
      const { count } = await supabase
        .from('ab_intent_events')
        .select('*', { count: 'exact', head: true });
      return (count || 0) > 0;
    },
  },
  {
    id: 'test_created',
    label: 'At least one test exists in ab_tests',
    description: 'Create a test to verify the system is working',
    checkFn: async () => {
      const { count } = await supabase
        .from('ab_tests')
        .select('*', { count: 'exact', head: true });
      return (count || 0) > 0;
    },
  },
  {
    id: 'bis_reasonable',
    label: 'BIS values look reasonable',
    description: 'Verify BIS is not NaN, negative, or absurdly high (>€100)',
    manualOnly: true,
  },
  {
    id: 'auto_stop_works',
    label: 'Auto-stop recommendations appear correctly',
    description: 'Simulate a scenario where auto-stop should trigger',
    manualOnly: true,
  },
  {
    id: 'archive_restore',
    label: 'Archive and restore works',
    description: 'Test archiving a dummy test and restoring it as draft',
    manualOnly: true,
  },
  {
    id: 'clarity_tagged',
    label: 'Clarity is tagging A/B variants',
    description: 'Open Clarity and verify ab_variant filter is available',
    manualOnly: true,
  },
  {
    id: 'pdp_tracking',
    label: 'PDP elements are tracked',
    description: 'Verify main ATC, sticky ATC, price section fire events',
    manualOnly: true,
  },
];

interface CheckState {
  checked: boolean;
  loading: boolean;
  autoVerified?: boolean;
}

export default function FirstTestChecklist() {
  const [checks, setChecks] = useState<Record<string, CheckState>>({});
  const [runningAll, setRunningAll] = useState(false);

  // Initialize check states
  useEffect(() => {
    const initial: Record<string, CheckState> = {};
    CHECKLIST_ITEMS.forEach(item => {
      initial[item.id] = { checked: false, loading: false };
    });
    setChecks(initial);
  }, []);

  const runAutoChecks = async () => {
    setRunningAll(true);
    
    for (const item of CHECKLIST_ITEMS) {
      if (item.checkFn) {
        setChecks(prev => ({
          ...prev,
          [item.id]: { ...prev[item.id], loading: true },
        }));

        try {
          const result = await item.checkFn();
          setChecks(prev => ({
            ...prev,
            [item.id]: { checked: result, loading: false, autoVerified: true },
          }));
        } catch (e) {
          setChecks(prev => ({
            ...prev,
            [item.id]: { checked: false, loading: false, autoVerified: true },
          }));
        }
      }
    }
    
    setRunningAll(false);
  };

  const toggleManualCheck = (id: string) => {
    setChecks(prev => ({
      ...prev,
      [id]: { ...prev[id], checked: !prev[id]?.checked },
    }));
  };

  const completedCount = Object.values(checks).filter(c => c.checked).length;
  const progress = (completedCount / CHECKLIST_ITEMS.length) * 100;
  const allComplete = completedCount === CHECKLIST_ITEMS.length;

  return (
    <Card className="border-dashed">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <ClipboardCheck className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                First Test Checklist
                <Badge variant="secondary" className="text-xs">
                  {completedCount}/{CHECKLIST_ITEMS.length}
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Verify before running real traffic
              </CardDescription>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={runAutoChecks}
            disabled={runningAll}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${runningAll ? 'animate-spin' : ''}`} />
            Run Auto-Checks
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">Completion</span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Checklist items */}
        <div className="space-y-2">
          {CHECKLIST_ITEMS.map(item => {
            const state = checks[item.id] || { checked: false, loading: false };
            
            return (
              <div
                key={item.id}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                  state.checked 
                    ? 'bg-green-500/5 border-green-500/20' 
                    : 'bg-muted/30 border-transparent'
                }`}
              >
                <Checkbox
                  id={item.id}
                  checked={state.checked}
                  onCheckedChange={() => toggleManualCheck(item.id)}
                  disabled={state.loading}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <label
                    htmlFor={item.id}
                    className={`text-sm font-medium cursor-pointer ${
                      state.checked ? 'line-through text-muted-foreground' : ''
                    }`}
                  >
                    {item.label}
                  </label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {item.description}
                  </p>
                </div>
                <div className="shrink-0">
                  {state.loading ? (
                    <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : state.autoVerified ? (
                    state.checked ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                    )
                  ) : item.manualOnly ? (
                    <Badge variant="outline" className="text-[10px]">Manual</Badge>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {/* Completion message */}
        {allComplete && (
          <div className="flex items-center gap-3 p-4 bg-green-500/10 rounded-lg border border-green-500/20">
            <Rocket className="h-6 w-6 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-700 dark:text-green-400">
                Ready for Real Traffic!
              </p>
              <p className="text-xs text-muted-foreground">
                All checks passed. Your experimentation platform is production-ready.
              </p>
            </div>
          </div>
        )}

        {/* Clarity link */}
        <div className="pt-2 border-t">
          <a
            href="https://clarity.microsoft.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            Open Microsoft Clarity
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
