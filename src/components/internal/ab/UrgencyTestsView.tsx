/**
 * Urgency Operations View
 * 
 * Shows experiments filtered to urgency_social impact zone.
 * Includes test controls, traffic split management, funnel comparisons,
 * and explicit Directional/Leading/Inconclusive status indicators.
 * 
 * v2.4 Production Hardening:
 * - Seeded RNG for deterministic P(B>A) per hour bucket (no refresh jitter)
 * - Dual-signal probability: P_ATC (early) + P_Purchase (when n≥10)
 * - Honest labeling: "Profit proxy: Rev/Session" with BIS availability note
 * - State machine uses P_ATC for early signal, P_Purchase when available
 * - Conflict handling: warning when ATC and Purchase signals disagree
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
  ArrowUpRight,
  Minus,
  HelpCircle,
  Info,
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

// ============================================================================
// Status State Logic (v2.4 - Seeded RNG + Dual Signal)
// ============================================================================

type TestStatusState = 'inconclusive' | 'directional' | 'leading' | 'winner_declared';

interface TestStatusResult {
  state: TestStatusState;
  label: string;
  description: string;
  variant?: 'A' | 'B';
  lift?: number;
  probabilityATC?: number;
  probabilityPurchase?: number | null; // null = insufficient data
  signalConflict?: boolean;
}

interface MetricValues {
  bisA: number | null;
  bisB: number | null;
  revenuePerSessionA: number | null;
  revenuePerSessionB: number | null;
  purchaseRateA: number;
  purchaseRateB: number;
  atcRateA: number;
  atcRateB: number;
  conversionsA: number; // purchases
  conversionsB: number;
  atcA: number; // add to carts
  atcB: number;
  sessionsA: number; // page views
  sessionsB: number;
}

const MIN_SAMPLE_SIZE = 300; // Configurable, matches platform default
const LIFT_DIR = 0.01; // 1% minimum lift for directional signal
const LIFT_LEAD = 0.02; // 2% minimum lift for leading status
const PROBABILITY_THRESHOLD = 0.90; // 90% probability for "Leading"
const MIN_SAMPLES_FOR_PROBABILITY = 30; // Min per variant for reliable P
const MIN_PURCHASES_FOR_PROBABILITY = 10; // Min purchases per variant for P_Purchase
const MIN_ATC_FOR_PROBABILITY = 5; // Min ATCs per variant for P_ATC

// ============================================================================
// Seeded RNG (deterministic per hour bucket)
// ============================================================================

/**
 * Simple seeded PRNG using a modified LCG algorithm.
 * Produces deterministic sequence given the same seed.
 */
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed % 2147483647;
    if (this.seed <= 0) this.seed += 2147483646;
  }

  /** Generate next random number in [0, 1) */
  next(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }
}

/**
 * Create a seed from test name + current hour bucket.
 * Same seed = same probability output for the entire hour.
 */
function createHourlySeed(testName: string): number {
  const hourBucket = Math.floor(Date.now() / 3600000); // hour bucket
  const seedString = `${testName}_${hourBucket}`;
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < seedString.length; i++) {
    const char = seedString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit int
  }
  return Math.abs(hash);
}

/**
 * Estimate P(B > A) using Monte Carlo simulation with Beta distributions.
 * Uses SEEDED random for deterministic results per hour.
 * Returns null if insufficient data for reliable estimate.
 */
function calculateProbabilityBBetterThanA(
  conversionsA: number,
  sessionsA: number,
  conversionsB: number,
  sessionsB: number,
  rng: SeededRandom,
  minConversions: number = 5 // Min conversions per variant
): number | null {
  // Require minimum samples and conversions for reliable estimate
  if (sessionsA < MIN_SAMPLES_FOR_PROBABILITY || sessionsB < MIN_SAMPLES_FOR_PROBABILITY) {
    return null;
  }
  if (conversionsA < minConversions || conversionsB < minConversions) {
    return null;
  }
  
  // Beta distribution parameters (using Jeffreys prior: add 0.5 each, rounded to 1)
  const alphaA = conversionsA + 1;
  const betaA = sessionsA - conversionsA + 1;
  const alphaB = conversionsB + 1;
  const betaB = sessionsB - conversionsB + 1;
  
  // Monte Carlo sampling (1000 draws) with seeded RNG
  const SAMPLES = 1000;
  let bWins = 0;
  
  for (let i = 0; i < SAMPLES; i++) {
    const sampleA = sampleBetaSeeded(alphaA, betaA, rng);
    const sampleB = sampleBetaSeeded(alphaB, betaB, rng);
    if (sampleB > sampleA) bWins++;
  }
  
  return bWins / SAMPLES;
}

/**
 * Sample from Beta distribution using seeded gamma sampling
 */
function sampleBetaSeeded(alpha: number, beta: number, rng: SeededRandom): number {
  const gammaA = sampleGammaSeeded(alpha, rng);
  const gammaB = sampleGammaSeeded(beta, rng);
  return gammaA / (gammaA + gammaB);
}

/**
 * Sample from Gamma distribution using Marsaglia and Tsang's method (seeded)
 */
function sampleGammaSeeded(shape: number, rng: SeededRandom): number {
  if (shape < 1) {
    return sampleGammaSeeded(shape + 1, rng) * Math.pow(rng.next(), 1 / shape);
  }
  
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  
  while (true) {
    let x: number, v: number;
    do {
      x = randnSeeded(rng);
      v = 1 + c * x;
    } while (v <= 0);
    
    v = v * v * v;
    const u = rng.next();
    
    if (u < 1 - 0.0331 * (x * x) * (x * x)) {
      return d * v;
    }
    
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
      return d * v;
    }
  }
}

/**
 * Standard normal random using Box-Muller transform (seeded)
 */
function randnSeeded(rng: SeededRandom): number {
  const u1 = rng.next();
  const u2 = rng.next();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Get the best available metric for lift calculation (BIS-first)
 * Priority: BIS → Revenue/Session → Purchase Rate
 */
function getBestMetric(metrics: MetricValues): { 
  metricA: number; 
  metricB: number; 
  metricName: 'BIS' | 'Revenue/Session' | 'Purchase Rate';
} {
  // Priority 1: BIS (if available for BOTH variants)
  if (metrics.bisA !== null && metrics.bisB !== null && 
      metrics.bisA > 0 && metrics.bisB > 0) {
    return { 
      metricA: metrics.bisA, 
      metricB: metrics.bisB, 
      metricName: 'BIS' 
    };
  }
  
  // Priority 2: Revenue per session (if available for BOTH variants)
  if (metrics.revenuePerSessionA !== null && metrics.revenuePerSessionB !== null &&
      metrics.sessionsA > 0 && metrics.sessionsB > 0) {
    return { 
      metricA: metrics.revenuePerSessionA, 
      metricB: metrics.revenuePerSessionB, 
      metricName: 'Revenue/Session' 
    };
  }
  
  // Priority 3: Purchase rate (always available)
  return { 
    metricA: metrics.purchaseRateA, 
    metricB: metrics.purchaseRateB, 
    metricName: 'Purchase Rate' 
  };
}

/**
 * Calculate test status with dual-signal probability (v2.4)
 * Uses P_ATC for early signal, P_Purchase when available (≥10 conversions/variant)
 * Detects signal conflicts between ATC and Purchase probability
 */
function calculateTestStatus(
  metrics: MetricValues,
  testName: string,
  winnerDeclared: boolean = false
): TestStatusResult {
  const totalSessions = metrics.sessionsA + metrics.sessionsB;
  
  // Get best metric for lift calculation
  const { metricA, metricB, metricName } = getBestMetric(metrics);
  const lift = metricA > 0 ? (metricB - metricA) / metricA : null;
  const absLift = lift !== null ? Math.abs(lift) : 0;
  
  // Create seeded RNG for deterministic probability
  const rng = new SeededRandom(createHourlySeed(testName));
  
  // Calculate P_ATC (early signal) - requires MIN_ATC_FOR_PROBABILITY per variant
  const probabilityATC = calculateProbabilityBBetterThanA(
    metrics.atcA,
    metrics.sessionsA,
    metrics.atcB,
    metrics.sessionsB,
    rng,
    MIN_ATC_FOR_PROBABILITY
  );
  
  // Calculate P_Purchase (stable signal) - requires MIN_PURCHASES_FOR_PROBABILITY per variant
  const probabilityPurchase = calculateProbabilityBBetterThanA(
    metrics.conversionsA,
    metrics.sessionsA,
    metrics.conversionsB,
    metrics.sessionsB,
    rng,
    MIN_PURCHASES_FOR_PROBABILITY
  );
  
  // Detect signal conflict: P_ATC and P_Purchase strongly disagree
  const signalConflict = 
    probabilityATC !== null && 
    probabilityPurchase !== null &&
    ((probabilityATC >= 0.90 && probabilityPurchase < 0.70) ||
     (probabilityATC < 0.10 && probabilityPurchase > 0.30));
  
  // Use best available probability for state decisions
  // Prefer P_ATC for early signal, trust P_Purchase if available (later funnel = closer to revenue)
  const effectiveProbability = probabilityPurchase ?? probabilityATC;
  
  // Winner declared takes precedence (manual only)
  if (winnerDeclared) {
    return {
      state: 'winner_declared',
      label: 'Winner Declared',
      description: 'Manually confirmed via winner workflow.',
      variant: lift && lift > 0 ? 'B' : 'A',
      lift: lift ?? undefined,
      probabilityATC: probabilityATC ?? undefined,
      probabilityPurchase,
    };
  }
  
  // Inconclusive: not enough data OR lift too small
  if (totalSessions < MIN_SAMPLE_SIZE * 0.5 || absLift < LIFT_DIR) {
    const reason = totalSessions < MIN_SAMPLE_SIZE * 0.5 
      ? `Need ${Math.ceil(MIN_SAMPLE_SIZE * 0.5 - totalSessions)} more sessions for directional signal.`
      : `Lift is within noise threshold (<${LIFT_DIR * 100}%).`;
    return {
      state: 'inconclusive',
      label: 'Inconclusive',
      description: reason,
      lift: lift ?? undefined,
      probabilityATC: probabilityATC ?? undefined,
      probabilityPurchase,
    };
  }
  
  // Leading: full sample + lift threshold + probability threshold
  // Uses P_ATC (or P_Purchase if available) for probability check
  const meetsLeadingCriteria = 
    totalSessions >= MIN_SAMPLE_SIZE && 
    absLift >= LIFT_LEAD && 
    effectiveProbability !== null && 
    effectiveProbability >= PROBABILITY_THRESHOLD;
  
  if (meetsLeadingCriteria && lift !== null && lift > 0) {
    const probSource = probabilityPurchase !== null ? 'purchase' : 'ATC';
    return {
      state: 'leading',
      label: 'B Leading',
      description: `Min sample reached. B shows +${(lift * 100).toFixed(1)}% ${metricName} lift (P_${probSource}=${(effectiveProbability! * 100).toFixed(0)}%). Leading (not declared winner) — confirm via winner workflow once significance is met.`,
      variant: 'B',
      lift,
      probabilityATC: probabilityATC ?? undefined,
      probabilityPurchase,
      signalConflict,
    };
  } else if (meetsLeadingCriteria && lift !== null && lift < 0) {
    const probSource = probabilityPurchase !== null ? 'purchase' : 'ATC';
    return {
      state: 'leading',
      label: 'A Leading',
      description: `Min sample reached. A shows +${(Math.abs(lift) * 100).toFixed(1)}% ${metricName} advantage (P_${probSource}=${((1 - effectiveProbability!) * 100).toFixed(0)}%). Confirm via winner workflow.`,
      variant: 'A',
      lift,
      probabilityATC: probabilityATC ?? undefined,
      probabilityPurchase,
      signalConflict,
    };
  }
  
  // Directional: partial sample with signal (but not yet leading)
  if (totalSessions >= MIN_SAMPLE_SIZE * 0.5 && absLift >= LIFT_DIR) {
    const probText = probabilityATC !== null 
      ? ` (P_ATC=${(lift! > 0 ? probabilityATC : 1 - probabilityATC) * 100 | 0}%)` 
      : '';
    if (lift !== null && lift > 0) {
      return {
        state: 'directional',
        label: 'B Directional',
        description: `Early signal: B trending +${(lift * 100).toFixed(1)}% ${metricName}${probText}. Need ${Math.ceil(MIN_SAMPLE_SIZE - totalSessions)} more sessions or higher lift for "Leading".`,
        variant: 'B',
        lift,
        probabilityATC: probabilityATC ?? undefined,
        probabilityPurchase,
        signalConflict,
      };
    } else if (lift !== null) {
      return {
        state: 'directional',
        label: 'A Directional',
        description: `Early signal: A trending better. B is ${(lift * 100).toFixed(1)}% ${metricName}${probText}.`,
        variant: 'A',
        lift,
        probabilityATC: probabilityATC ?? undefined,
        probabilityPurchase,
        signalConflict,
      };
    }
  }
  
  return {
    state: 'inconclusive',
    label: 'Inconclusive',
    description: 'Not enough data to determine direction.',
    lift: lift ?? undefined,
    probabilityATC: probabilityATC ?? undefined,
    probabilityPurchase,
  };
}

// ============================================================================
// Component
// ============================================================================

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

  // Calculate test status using explicit BIS-first rules (v2.4)
  const testStatus = useMemo(() => {
    const sessionsA = variantA?.page_views || 0;
    const sessionsB = variantB?.page_views || 0;
    const revenueA = variantA?.total_revenue || 0;
    const revenueB = variantB?.total_revenue || 0;
    
    const metrics: MetricValues = {
      bisA: null, // BIS not available in funnel view, will fallback
      bisB: null,
      revenuePerSessionA: sessionsA > 0 ? revenueA / sessionsA : null,
      revenuePerSessionB: sessionsB > 0 ? revenueB / sessionsB : null,
      purchaseRateA: variantA?.purchase_rate || 0,
      purchaseRateB: variantB?.purchase_rate || 0,
      atcRateA: variantA?.atc_rate || 0,
      atcRateB: variantB?.atc_rate || 0,
      conversionsA: variantA?.purchases || 0,
      conversionsB: variantB?.purchases || 0,
      atcA: variantA?.add_to_carts || 0,
      atcB: variantB?.add_to_carts || 0,
      sessionsA,
      sessionsB,
    };
    
    return calculateTestStatus(metrics, AB_TEST_CONFIG.testName, false);
  }, [variantA, variantB]);
  
  // Calculate BIS lift and Revenue/Session lift for header display
  const bisMetrics = useMemo(() => {
    const sessionsA = variantA?.page_views || 0;
    const sessionsB = variantB?.page_views || 0;
    const revenueA = variantA?.total_revenue || 0;
    const revenueB = variantB?.total_revenue || 0;
    
    const rpsA = sessionsA > 0 ? revenueA / sessionsA : 0;
    const rpsB = sessionsB > 0 ? revenueB / sessionsB : 0;
    const rpsLift = rpsA > 0 ? ((rpsB - rpsA) / rpsA) * 100 : null;
    
    // ATC lift for early signal display
    const atcA = variantA?.add_to_carts || 0;
    const atcB = variantB?.add_to_carts || 0;
    const atcRateA = sessionsA > 0 ? atcA / sessionsA : 0;
    const atcRateB = sessionsB > 0 ? atcB / sessionsB : 0;
    const atcLift = atcRateA > 0 ? ((atcRateB - atcRateA) / atcRateA) * 100 : null;
    
    return {
      rpsLift,
      rpsA,
      rpsB,
      atcLift,
      bisLift: null as number | null, // BIS not in funnel view
    };
  }, [variantA, variantB]);

  // Status badge styling
  const getStatusBadge = () => {
    switch (testStatus.state) {
      case 'leading':
        return (
          <Badge variant="default" className="text-xs flex items-center gap-1">
            <ArrowUpRight className="h-3 w-3" />
            {testStatus.label}
          </Badge>
        );
      case 'directional':
        return (
          <Badge variant="secondary" className="text-xs flex items-center gap-1 bg-blue-500/10 text-blue-600 border-blue-500/20">
            <TrendingUp className="h-3 w-3" />
            {testStatus.label}
          </Badge>
        );
      case 'winner_declared':
        return (
          <Badge className="text-xs flex items-center gap-1 bg-green-500 text-white">
            <CheckCircle className="h-3 w-3" />
            {testStatus.label}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-xs flex items-center gap-1 text-muted-foreground">
            <Minus className="h-3 w-3" />
            {testStatus.label}
          </Badge>
        );
    }
  };

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

      {/* Compact Status Header (v2.4 - Dual Signal + Seeded RNG) */}
      <TooltipProvider>
        <Card className="bg-muted/30">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                {/* Status pill */}
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${testEnabled ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground'}`} />
                  <span className="text-sm font-medium">{testEnabled ? 'Running' : 'Paused'}</span>
                </div>
                
                {/* Split */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Split:</span>
                  <span className="font-medium text-foreground">{100 - trafficSplit}% A / {trafficSplit}% B</span>
                </div>
                
                {/* Test status */}
                <div className="flex items-center gap-2">
                  {getStatusBadge()}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
            
            {/* Profit-first metrics row (v2.4) */}
            <div className="flex items-center gap-6 mt-3 pl-4 border-t border-muted pt-3">
              {/* Profit proxy: Revenue/Session lift (primary) */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 cursor-help">
                    <span className="text-xs text-muted-foreground font-medium">Profit proxy:</span>
                    {bisMetrics.rpsLift !== null ? (
                      <Badge variant={bisMetrics.rpsLift > 0 ? 'default' : 'secondary'} className="text-xs">
                        {bisMetrics.rpsLift > 0 ? '+' : ''}{bisMetrics.rpsLift.toFixed(1)}% Rev/Session
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="text-xs">Revenue per session is the primary profit signal in this view.</p>
                  <p className="text-xs text-muted-foreground mt-1">BIS (CVR × AOV × Margin × Weight) available in Experimentation Analytics.</p>
                </TooltipContent>
              </Tooltip>
              
              {/* P_ATC (early signal) */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 cursor-help">
                    <span className="text-xs text-muted-foreground">P_ATC:</span>
                    {testStatus.probabilityATC !== undefined ? (
                      <Badge 
                        variant={testStatus.probabilityATC >= PROBABILITY_THRESHOLD ? 'default' : 'outline'} 
                        className="text-xs"
                      >
                        {(testStatus.probabilityATC * 100).toFixed(0)}%
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">Probability B beats A based on add-to-cart rate.</p>
                  <p className="text-xs text-muted-foreground mt-1">Early signal (higher volume than purchases).</p>
                </TooltipContent>
              </Tooltip>
              
              {/* P_Purchase (stable signal, only when ≥10 per variant) */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 cursor-help">
                    <span className="text-xs text-muted-foreground">P_Purchase:</span>
                    {testStatus.probabilityPurchase !== null && testStatus.probabilityPurchase !== undefined ? (
                      <Badge 
                        variant={testStatus.probabilityPurchase >= PROBABILITY_THRESHOLD ? 'default' : 'outline'} 
                        className="text-xs"
                      >
                        {(testStatus.probabilityPurchase * 100).toFixed(0)}%
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">
                    {testStatus.probabilityPurchase !== null 
                      ? 'Probability B beats A based on purchase rate.' 
                      : 'Insufficient purchases for stable estimate (need ≥10 per variant).'}
                  </p>
                </TooltipContent>
              </Tooltip>
              
              {/* Signal conflict warning */}
              {testStatus.signalConflict && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 text-amber-600 cursor-help">
                      <AlertTriangle className="h-3 w-3" />
                      <span className="text-xs font-medium">Signal conflict</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p className="text-xs">ATC and Purchase signals disagree significantly.</p>
                    <p className="text-xs text-muted-foreground mt-1">Trust P_Purchase (closer to revenue) when available.</p>
                  </TooltipContent>
                </Tooltip>
              )}
              
              {/* BIS tooltip */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="ml-auto flex items-center gap-1 cursor-help">
                    <HelpCircle className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">BIS formula</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="text-xs font-medium">BIS = CVR × AOV × Margin × Traffic Weight</p>
                  <p className="text-xs text-muted-foreground mt-1">Full BIS available in Experimentation Analytics where all inputs exist.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            
            {/* Status description */}
            <p className="text-xs text-muted-foreground mt-2 pl-4">
              {testStatus.description}
            </p>
            
            {/* Decision policy legend */}
            <div className="mt-3 pl-4 pt-2 border-t border-dashed border-muted">
              <div className="flex items-center gap-1 mb-1">
                <Info className="h-3 w-3 text-muted-foreground" />
                <span className="text-[10px] font-medium text-muted-foreground">Decision policy</span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-[10px] text-muted-foreground">
                <div><span className="font-medium">Inconclusive:</span> &lt;150 sessions or &lt;1% lift</div>
                <div><span className="font-medium">Directional:</span> ≥150 sessions + ≥1% lift</div>
                <div><span className="font-medium">Leading:</span> ≥300 sessions + ≥2% lift + P≥90%</div>
                <div><span className="font-medium">Winner:</span> Manual confirmation only</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TooltipProvider>

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
                {testStatus.state === 'leading' && testStatus.variant === 'B' && (
                  <Badge variant="secondary" className="text-xs">Leading</Badge>
                )}
                {testStatus.state === 'directional' && testStatus.variant === 'B' && (
                  <Badge variant="outline" className="text-xs">Directional</Badge>
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
      
      {/* Status Legend (v2.3 - includes probability thresholds) */}
      <Card className="bg-muted/30">
        <CardContent className="py-4">
          <div className="flex items-start gap-2">
            <HelpCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p><strong>Status definitions (v2.3):</strong></p>
              <ul className="space-y-0.5 ml-2">
                <li><span className="font-medium">Inconclusive</span> — &lt;{MIN_SAMPLE_SIZE * 0.5} sessions OR lift &lt;{LIFT_DIR * 100}%</li>
                <li><span className="font-medium">Directional</span> — {MIN_SAMPLE_SIZE * 0.5}+ sessions + lift ≥{LIFT_DIR * 100}% (early signal)</li>
                <li><span className="font-medium">Leading</span> — {MIN_SAMPLE_SIZE}+ sessions + lift ≥{LIFT_LEAD * 100}% + P(B&gt;A) ≥{PROBABILITY_THRESHOLD * 100}%</li>
                <li><span className="font-medium">Winner Declared</span> — Manually confirmed via winner workflow only</li>
              </ul>
              <p className="mt-2 pt-2 border-t border-muted text-muted-foreground/80">
                <strong>Metric priority:</strong> BIS (if available) → Revenue/Session → Purchase Rate
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
