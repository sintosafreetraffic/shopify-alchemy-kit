/**
 * Active Tests Tab - Main experimentation dashboard
 * Shows active tests with Executive Summary, BIS, and auto-stop indicators
 * 
 * HARDENED for production with:
 * - Safe number formatting (no NaN)
 * - Clear status labels (Exploratory vs Decision-Ready)
 * - Auto-stop RECOMMENDATIONS (never silent stops)
 * - Projected impact with disclaimer
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Beaker, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  PauseCircle,
  PlayCircle,
  Trophy,
  Target,
  Zap,
  RefreshCw,
  Plus,
  DollarSign,
  Info,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  type ABTest,
  fetchTests,
  updateTest,
  calculateBayesianSignificance,
  checkAutoStopRules,
  POWER_ZONES,
} from '@/lib/abExperimentation';
import {
  safeNumber,
  safePercent,
  safeBIS,
  safeLift,
  formatLift,
  validateTestData,
  getTestReadiness,
  getReadinessLabel,
  getReadinessColor,
  getAutoStopCopy,
  PROJECTED_IMPACT_DISCLAIMER,
} from '@/lib/abSafetyUtils';
import CreateTestDialog from './CreateTestDialog';
import FirstTestChecklist from './FirstTestChecklist';

interface ExecutiveSummaryProps {
  test: ABTest;
}

function ExecutiveSummary({ test }: ExecutiveSummaryProps) {
  const liftPercent = safeLift(test.bis_final_a, test.bis_final_b);
  const isPositive = liftPercent !== null && liftPercent > 0;
  const liftDisplay = formatLift(liftPercent, 'Calculating...');
  const annualImpact = test.projected_annual_impact;
  const hasValidImpact = Number.isFinite(annualImpact) && annualImpact !== 0;

  return (
    <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-4 border border-primary/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium">Executive Summary</span>
        </div>
        <Badge variant={isPositive ? 'default' : liftPercent === null ? 'secondary' : 'destructive'}>
          {liftDisplay} BIS
        </Badge>
      </div>
      <p className="text-lg font-semibold mt-2">
        {liftPercent !== null 
          ? `Variant ${isPositive ? 'B' : 'A'} is pacing ${liftDisplay} BIS`
          : 'Collecting baseline data...'
        }
      </p>
      <div className="flex items-center gap-1 mt-1">
        <p className="text-sm text-muted-foreground">
          Projected annual impact: {hasValidImpact ? `€${Math.abs(annualImpact).toLocaleString()}` : '—'}
        </p>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3 w-3 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-xs">{PROJECTED_IMPACT_DISCLAIMER}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

interface TestCardProps {
  test: ABTest;
  onRefresh: () => void;
}

function TestCard({ test, onRefresh }: TestCardProps) {
  const [updating, setUpdating] = useState(false);
  
  const totalSessions = (test.sessions_a || 0) + (test.sessions_b || 0);
  const minSampleTotal = (test.min_sample_size || 300) * 2;
  const progressToMinSample = Math.min((totalSessions / minSampleTotal) * 100, 100);

  const { probabilityBBetter, significanceReached } = calculateBayesianSignificance(
    test.conversions_a || 0,
    test.sessions_a || 0,
    test.conversions_b || 0,
    test.sessions_b || 0
  );

  const autoStopResult = checkAutoStopRules(test);
  const autoStopCopy = autoStopResult.shouldStop 
    ? getAutoStopCopy(autoStopResult.rule || '', autoStopResult.reason || '')
    : null;
  
  const readiness = getTestReadiness(test);
  const validation = validateTestData(test);

  const handleStatusChange = async (newStatus: 'active' | 'paused') => {
    setUpdating(true);
    await updateTest(test.id, { 
      status: newStatus,
      ...(newStatus === 'active' && !test.started_at ? { started_at: new Date().toISOString() } : {})
    });
    onRefresh();
    setUpdating(false);
  };

  const zoneConfig = POWER_ZONES[test.impact_zone];

  return (
    <Card className={autoStopResult.shouldStop ? 'border-amber-500/50' : ''}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Beaker className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {test.name}
                {test.status === 'active' && <Badge variant="default" className="text-xs">Live</Badge>}
                {test.status === 'paused' && <Badge variant="secondary" className="text-xs">Paused</Badge>}
                <Badge variant={getReadinessColor(readiness)} className="text-xs">
                  {getReadinessLabel(readiness)}
                </Badge>
              </CardTitle>
              <CardDescription>
                {test.impact_zone.replace('_', ' ')} • Power: {(zoneConfig.weight * 100).toFixed(0)}%
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {test.status === 'active' && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => handleStatusChange('paused')}
                disabled={updating}
              >
                <PauseCircle className="h-4 w-4 mr-1" />
                Pause
              </Button>
            )}
            {test.status === 'paused' && (
              <Button 
                size="sm" 
                variant="default" 
                onClick={() => handleStatusChange('active')}
                disabled={updating}
              >
                <PlayCircle className="h-4 w-4 mr-1" />
                Resume
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Validation warnings */}
        {validation.errors.length > 0 && (
          <div className="flex items-start gap-2 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-600 dark:text-red-400">Data Issue</p>
              {validation.errors.map((err, i) => (
                <p key={i} className="text-xs text-muted-foreground">{err}</p>
              ))}
            </div>
          </div>
        )}

        {/* Auto-stop recommendation (NOT auto-stopped) */}
        {autoStopCopy && (
          <div className={`flex items-center gap-2 p-3 rounded-lg border ${
            autoStopCopy.severity === 'warning' 
              ? 'bg-amber-500/10 border-amber-500/20' 
              : autoStopCopy.severity === 'success'
              ? 'bg-green-500/10 border-green-500/20'
              : 'bg-blue-500/10 border-blue-500/20'
          }`}>
            {autoStopCopy.severity === 'success' ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertTriangle className={`h-5 w-5 ${
                autoStopCopy.severity === 'warning' ? 'text-amber-500' : 'text-blue-500'
              }`} />
            )}
            <div>
              <p className={`text-sm font-medium ${
                autoStopCopy.severity === 'warning' 
                  ? 'text-amber-600 dark:text-amber-400'
                  : autoStopCopy.severity === 'success'
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-blue-600 dark:text-blue-400'
              }`}>
                {autoStopCopy.title}
              </p>
              <p className="text-xs text-muted-foreground">{autoStopCopy.description}</p>
            </div>
          </div>
        )}

        {/* Progress to minimum sample */}
        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-muted-foreground">Progress to min sample ({test.min_sample_size * 2})</span>
            <span className="font-medium">{totalSessions.toLocaleString()} sessions</span>
          </div>
          <Progress value={progressToMinSample} className="h-2" />
        </div>

        {/* Variant comparison */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Variant A</span>
              <span className="text-xs text-muted-foreground">{100 - test.traffic_split}%</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Sessions</span>
                <span>{safeNumber(test.sessions_a)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>CVR</span>
                <span>{safePercent(test.cvr_a, 2)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>BIS</span>
                <span>{safeBIS(test.bis_final_a)}</span>
              </div>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Variant B</span>
              <span className="text-xs text-muted-foreground">{test.traffic_split}%</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Sessions</span>
                <span>{safeNumber(test.sessions_b)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>CVR</span>
                <span>{safePercent(test.cvr_b, 2)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>BIS</span>
                <span className="font-medium">{safeBIS(test.bis_final_b)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Significance indicator */}
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Bayesian P(B&gt;A)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${
              significanceReached 
                ? probabilityBBetter > 0.5 ? 'text-green-600' : 'text-red-600'
                : ''
            }`}>
              {(probabilityBBetter * 100).toFixed(1)}%
            </span>
            {significanceReached && (
              <Badge variant={probabilityBBetter > 0.5 ? 'default' : 'destructive'}>
                {probabilityBBetter > 0.5 ? 'B Winning' : 'A Winning'}
              </Badge>
            )}
          </div>
        </div>

        {/* Executive Summary */}
        {test.status === 'active' && totalSessions > 100 && (
          <>
            <Separator />
            <ExecutiveSummary test={test} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function ActiveTestsTab() {
  const [tests, setTests] = useState<ABTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const loadTests = useCallback(async () => {
    setLoading(true);
    const activeTests = await fetchTests();
    setTests(activeTests.filter(t => t.status === 'active' || t.status === 'paused' || t.status === 'draft'));
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTests();
  }, [loadTests]);

  const activeCount = tests.filter(t => t.status === 'active').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Active Experiments</h3>
          <p className="text-sm text-muted-foreground">
            {activeCount}/3 active tests • {tests.length} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadTests} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setCreateDialogOpen(true)} disabled={activeCount >= 3}>
            <Plus className="h-4 w-4 mr-2" />
            New Test
          </Button>
        </div>
      </div>

      {/* Active tests warning */}
      {activeCount >= 3 && (
        <div className="flex items-center gap-2 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <p className="text-sm text-amber-600 dark:text-amber-400">
            Maximum 3 active tests reached. Complete or pause a test to create new ones.
          </p>
        </div>
      )}

      {/* Tests grid */}
      {tests.length === 0 && !loading ? (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <Beaker className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Active Tests</h3>
            <p className="text-muted-foreground mb-4">
              Create your first A/B test to start experimenting
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Test
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {tests.map(test => (
            <TestCard key={test.id} test={test} onRefresh={loadTests} />
          ))}
        </div>
      )}

      {/* First Test Checklist - show when no tests or first test */}
      {tests.length <= 1 && (
        <FirstTestChecklist />
      )}

      <CreateTestDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen}
        onCreated={loadTests}
      />
    </div>
  );
}
