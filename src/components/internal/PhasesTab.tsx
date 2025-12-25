/**
 * PhasesTab Component
 * 
 * Displays Phase 0-3.5 visibility for the tracking page.
 * ADDITIVE ONLY - does not modify existing tracking page content.
 * 
 * NO PII: Does not display email, phone, ip, user_agent, address, name
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Loader2, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Clock,
  Database,
  Activity,
  Zap,
  Eye,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Shield,
  RotateCcw,
  SkullIcon,
} from "lucide-react";

interface Phase1Data {
  purchase_events_created_24h: number;
  purchase_events_created_7d: number;
  unique_orders_24h: number;
  unique_orders_7d: number;
  pending_stale_over_5m: number;
  missing_detected_24h: number;
  missing_detected_7d: number;
  reconcile_last_run: {
    success: boolean;
    duration_ms: number | null;
    created_at: string;
  } | null;
}

interface Phase2Data {
  today: {
    day: string;
    orders_seen: number;
    success_count: number;
    error_count: number;
    pending_count: number;
    unknown_status: number;
    success_rate: number;
    error_rate: number;
    context_rows: number;
    with_epik: number;
    with_ip: number;
    with_ua: number;
    consent_granted: number;
    epik_rate: number;
    ip_rate: number;
    ua_rate: number;
    consent_rate: number;
    reconciliation_mismatches: number;
    total_value_eur: number;
  } | null;
  yesterday: {
    day: string;
    success_rate: number;
    error_rate: number;
  } | null;
  drift: {
    success_rate_drop_abs: number | null;
    error_rate_increase_abs: number | null;
    skipped: boolean;
  };
  alerts: Array<{
    id: string;
    severity: string;
    type: string;
    message: string;
    status: string;
  }>;
}

interface Phase3Data {
  recover_runs_7d: number;
  attempts_total_7d: number;
  dead_letters_total_7d: number;
  recovered_total_7d: number | null;
  last_recover_job: {
    success: boolean;
    duration_ms: number | null;
    created_at: string;
  } | null;
}

interface Phase35Data {
  chaos_supported_webhook: boolean;
  chaos_supported_recovery: boolean;
  chaos_supported_reconcile: boolean;
  chaos_rows_last_7d: number;
}

interface PhasesSummary {
  phase0: { checklist_state_local_only: true };
  phase1: Phase1Data;
  phase2: Phase2Data;
  phase3: Phase3Data;
  phase35: Phase35Data;
}

interface Phase0ChecklistState {
  landing_with_epik: boolean;
  landing_no_consent_then_grant: boolean;
  checkout_same_session: boolean;
  webhook_signature_valid: boolean;
  reconcile_run: boolean;
  recovery_run: boolean;
}

interface ChaosTestResult {
  test: string;
  success: boolean;
  dry_run: boolean;
  response: unknown;
  duration_ms: number;
  error?: string;
}

interface ChaosTestState {
  running: string | null;
  results: Record<string, ChaosTestResult>;
}

const PHASE0_STORAGE_KEY = 'phases_checklist_state';

const StatusPill = ({ status }: { status: 'ok' | 'warn' | 'error' | 'unknown' }) => {
  const variants = {
    ok: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-400',
    warn: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-400',
    error: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-400',
    unknown: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  };
  
  const labels = {
    ok: 'OK',
    warn: 'WARN',
    error: 'ERROR',
    unknown: 'UNKNOWN',
  };
  
  return (
    <Badge className={`${variants[status]} text-xs font-medium`}>
      {labels[status]}
    </Badge>
  );
};

const MetricRow = ({ 
  label, 
  value24h, 
  value7d, 
  status 
}: { 
  label: string; 
  value24h: number | string; 
  value7d: number | string;
  status?: 'ok' | 'warn' | 'error' | 'unknown';
}) => (
  <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
    <span className="text-sm text-muted-foreground">{label}</span>
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium tabular-nums">{value24h}</span>
      <span className="text-xs text-muted-foreground">/</span>
      <span className="text-sm font-medium tabular-nums">{value7d}</span>
      {status && <StatusPill status={status} />}
    </div>
  </div>
);

const SingleMetricRow = ({ 
  label, 
  value, 
  status,
  suffix = ''
}: { 
  label: string; 
  value: number | string; 
  status?: 'ok' | 'warn' | 'error' | 'unknown';
  suffix?: string;
}) => (
  <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
    <span className="text-sm text-muted-foreground">{label}</span>
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium tabular-nums">{value}{suffix}</span>
      {status && <StatusPill status={status} />}
    </div>
  </div>
);

export const PhasesTab = () => {
  const [data, setData] = useState<PhasesSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeWindow, setTimeWindow] = useState<'24h' | '7d'>('24h');
  
  // Phase 0 checklist (localStorage only)
  const [checklist, setChecklist] = useState<Phase0ChecklistState>(() => {
    try {
      const stored = localStorage.getItem(PHASE0_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
    return {
      landing_with_epik: false,
      landing_no_consent_then_grant: false,
      checkout_same_session: false,
      webhook_signature_valid: false,
      reconcile_run: false,
      recovery_run: false,
    };
  });

  // Chaos testing state
  const [chaosState, setChaosState] = useState<ChaosTestState>({
    running: null,
    results: {},
  });
  const [dryRunMode, setDryRunMode] = useState(true);

  const updateChecklist = (key: keyof Phase0ChecklistState, value: boolean) => {
    const newState = { ...checklist, [key]: value };
    setChecklist(newState);
    localStorage.setItem(PHASE0_STORAGE_KEY, JSON.stringify(newState));
  };

  const runChaosTest = async (testType: 'c4' | 'c5' | 'c7') => {
    setChaosState(prev => ({ ...prev, running: testType }));
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(
        `${supabaseUrl}/functions/v1/chaos-test-runner?test=${testType}&dry_run=${dryRunMode ? '1' : '0'}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );

      const result = await response.json();
      
      setChaosState(prev => ({
        running: null,
        results: {
          ...prev.results,
          [testType]: response.ok ? result : { 
            test: testType.toUpperCase(), 
            success: false, 
            dry_run: dryRunMode,
            error: result.error || `HTTP ${response.status}`,
            response: result,
            duration_ms: 0,
          },
        },
      }));
    } catch (err) {
      setChaosState(prev => ({
        running: null,
        results: {
          ...prev.results,
          [testType]: {
            test: testType.toUpperCase(),
            success: false,
            dry_run: dryRunMode,
            error: err instanceof Error ? err.message : 'Unknown error',
            response: null,
            duration_ms: 0,
          },
        },
      }));
    }
  };

  // Webhook-based chaos tests (C1, C2, C3, C6, C8, C9)
  const runWebhookChaosTest = async (testType: 'c1' | 'c2' | 'c3' | 'c6' | 'c8' | 'c9') => {
    setChaosState(prev => ({ ...prev, running: testType }));
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(
        `${supabaseUrl}/functions/v1/chaos-webhook-replay?test=${testType}&dry_run=${dryRunMode ? '1' : '0'}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );

      const result = await response.json();
      
      setChaosState(prev => ({
        running: null,
        results: {
          ...prev.results,
          [testType]: response.ok ? result : { 
            test: testType.toUpperCase(), 
            success: false, 
            dry_run: dryRunMode,
            error: result.error || `HTTP ${response.status}`,
            response: result,
            duration_ms: 0,
          },
        },
      }));
    } catch (err) {
      setChaosState(prev => ({
        running: null,
        results: {
          ...prev.results,
          [testType]: {
            test: testType.toUpperCase(),
            success: false,
            dry_run: dryRunMode,
            error: err instanceof Error ? err.message : 'Unknown error',
            response: null,
            duration_ms: 0,
          },
        },
      }));
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/tracking-phases-summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch phases data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatDuration = (ms: number | null) => {
    if (ms === null) return '—';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Loading phases data...</span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <Card className="p-6 border-destructive/50 bg-destructive/5">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive" />
          <div>
            <p className="font-medium text-destructive">Failed to load phases</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} className="ml-auto">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  const phase1 = data?.phase1;
  const phase2 = data?.phase2;
  const phase3 = data?.phase3;
  const phase35 = data?.phase35;

  return (
    <div className="space-y-6 mt-6">
      {/* Header with time toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <h2 className="font-semibold">Phase Visibility (0 – 3.5)</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setTimeWindow('24h')}
              className={`px-3 py-1.5 text-sm ${timeWindow === '24h' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}
            >
              24h
            </button>
            <button
              onClick={() => setTimeWindow('7d')}
              className={`px-3 py-1.5 text-sm ${timeWindow === '7d' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}
            >
              7d
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Section 0: Phase 0 "No Regression" Checklist */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Eye className="w-5 h-5 text-indigo-500" />
          <h3 className="font-semibold">Phase 0: No Regression Checklist</h3>
          <Badge variant="outline" className="text-xs">UI-only</Badge>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Manual verification checklist (stored in localStorage, no DB writes)
        </p>
        <div className="grid md:grid-cols-2 gap-3">
          {[
            { key: 'landing_with_epik', label: 'Landing with epik + UTMs' },
            { key: 'landing_no_consent_then_grant', label: 'Landing without consent → grant consent' },
            { key: 'checkout_same_session', label: 'Checkout same session' },
            { key: 'webhook_signature_valid', label: 'Webhook signature valid' },
            { key: 'reconcile_run', label: 'Reconcile run' },
            { key: 'recovery_run', label: 'Recovery run' },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50">
              <Checkbox 
                id={key} 
                checked={checklist[key as keyof Phase0ChecklistState]} 
                onCheckedChange={(v) => updateChecklist(key as keyof Phase0ChecklistState, !!v)}
              />
              <label htmlFor={key} className="text-sm cursor-pointer flex-1">{label}</label>
              {checklist[key as keyof Phase0ChecklistState] && (
                <CheckCircle className="w-4 h-4 text-emerald-500" />
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Section 1: Phase 1 "Ingestion + Idempotency" */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Database className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold">Phase 1: Ingestion + Idempotency</h3>
          <Badge variant="outline" className="text-xs">Evidence</Badge>
        </div>
        
        {!phase1 ? (
          <p className="text-sm text-muted-foreground">No events yet</p>
        ) : (
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
              <Clock className="w-3 h-3" />
              <span>24h / 7d comparison</span>
            </div>
            <MetricRow 
              label="purchase_events_created" 
              value24h={phase1.purchase_events_created_24h} 
              value7d={phase1.purchase_events_created_7d}
              status={phase1.purchase_events_created_24h > 0 ? 'ok' : 'unknown'}
            />
            <MetricRow 
              label="unique_orders" 
              value24h={phase1.unique_orders_24h} 
              value7d={phase1.unique_orders_7d}
            />
            <SingleMetricRow 
              label="pending_stale_over_5m" 
              value={phase1.pending_stale_over_5m}
              status={phase1.pending_stale_over_5m === 0 ? 'ok' : phase1.pending_stale_over_5m < 5 ? 'warn' : 'error'}
            />
            <MetricRow 
              label="missing_detected" 
              value24h={phase1.missing_detected_24h} 
              value7d={phase1.missing_detected_7d}
              status={phase1.missing_detected_24h === 0 ? 'ok' : 'warn'}
            />
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <span className="text-sm text-muted-foreground">reconcile_last_run</span>
              <div className="flex items-center gap-2">
                {phase1.reconcile_last_run ? (
                  <>
                    <Badge variant={phase1.reconcile_last_run.success ? 'default' : 'destructive'} className="text-xs">
                      {phase1.reconcile_last_run.success ? 'SUCCESS' : 'FAILED'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDuration(phase1.reconcile_last_run.duration_ms)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(phase1.reconcile_last_run.created_at)}
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">No runs yet</span>
                )}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Section 2: Phase 2 "Observability + Drift" */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-purple-500" />
          <h3 className="font-semibold">Phase 2: Observability + Drift</h3>
          <Badge variant="outline" className="text-xs">Read-only</Badge>
        </div>

        {!phase2?.today ? (
          <p className="text-sm text-muted-foreground">No tracking_health_daily data for today</p>
        ) : (
          <div className="space-y-4">
            {/* Core metrics */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Event Counts</h4>
                <SingleMetricRow label="orders_seen" value={phase2.today.orders_seen} />
                <SingleMetricRow label="success_count" value={phase2.today.success_count} status={phase2.today.success_count > 0 ? 'ok' : 'unknown'} />
                <SingleMetricRow label="error_count" value={phase2.today.error_count} status={phase2.today.error_count === 0 ? 'ok' : 'error'} />
                <SingleMetricRow label="pending_count" value={phase2.today.pending_count} />
                <SingleMetricRow label="unknown_status" value={phase2.today.unknown_status} />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Rates</h4>
                <SingleMetricRow label="success_rate" value={`${phase2.today.success_rate.toFixed(1)}%`} 
                  status={phase2.today.success_rate >= 90 ? 'ok' : phase2.today.success_rate >= 70 ? 'warn' : 'error'} />
                <SingleMetricRow label="error_rate" value={`${phase2.today.error_rate.toFixed(1)}%`} 
                  status={phase2.today.error_rate <= 5 ? 'ok' : phase2.today.error_rate <= 15 ? 'warn' : 'error'} />
                <SingleMetricRow label="reconciliation_mismatches" value={phase2.today.reconciliation_mismatches} 
                  status={phase2.today.reconciliation_mismatches === 0 ? 'ok' : 'warn'} />
                <SingleMetricRow label="total_value_eur" value={`€${phase2.today.total_value_eur.toFixed(0)}`} />
              </div>
            </div>

            {/* Context quality */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Context Quality</h4>
              <div className="grid md:grid-cols-4 gap-2">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold">{phase2.today.epik_rate.toFixed(0)}%</p>
                  <p className="text-xs text-muted-foreground">epik_rate</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold">{phase2.today.ip_rate.toFixed(0)}%</p>
                  <p className="text-xs text-muted-foreground">ip_rate</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold">{phase2.today.ua_rate.toFixed(0)}%</p>
                  <p className="text-xs text-muted-foreground">ua_rate</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold">{phase2.today.consent_rate.toFixed(0)}%</p>
                  <p className="text-xs text-muted-foreground">consent_rate</p>
                </div>
              </div>
            </div>

            {/* Drift indicators */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Drift (Today vs Yesterday)</h4>
              {phase2.drift.skipped ? (
                <p className="text-sm text-amber-600">SKIPPED (no baseline)</p>
              ) : (
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    {(phase2.drift.success_rate_drop_abs || 0) > 0 ? (
                      <TrendingDown className="w-5 h-5 text-red-500" />
                    ) : (
                      <TrendingUp className="w-5 h-5 text-emerald-500" />
                    )}
                    <div>
                      <p className="text-sm font-medium">
                        Success Rate Δ: {phase2.drift.success_rate_drop_abs?.toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(phase2.drift.success_rate_drop_abs || 0) > 5 ? 'Significant drop' : 'Stable'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    {(phase2.drift.error_rate_increase_abs || 0) > 0 ? (
                      <TrendingUp className="w-5 h-5 text-red-500" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-emerald-500" />
                    )}
                    <div>
                      <p className="text-sm font-medium">
                        Error Rate Δ: {phase2.drift.error_rate_increase_abs?.toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(phase2.drift.error_rate_increase_abs || 0) > 5 ? 'Elevated errors' : 'Stable'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Alerts */}
            {phase2.alerts.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Active Alerts</h4>
                <div className="space-y-2">
                  {phase2.alerts.map(alert => (
                    <div key={alert.id} className={`p-3 rounded-lg border ${
                      alert.severity === 'error' ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950' :
                      alert.severity === 'warn' ? 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950' :
                      'border-border bg-muted/50'
                    }`}>
                      <div className="flex items-center gap-2">
                        <Badge variant={alert.severity === 'error' ? 'destructive' : 'secondary'} className="text-xs">
                          {alert.type}
                        </Badge>
                        <span className="text-sm">{alert.message}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Section 3: Phase 3 "Recovery" */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <RotateCcw className="w-5 h-5 text-emerald-500" />
          <h3 className="font-semibold">Phase 3: Recovery</h3>
          <Badge variant="outline" className="text-xs">Operational</Badge>
        </div>

        {!phase3 ? (
          <p className="text-sm text-muted-foreground">No recovery data</p>
        ) : (
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground mb-2">Last 7 days</div>
            <SingleMetricRow label="recover_runs" value={phase3.recover_runs_7d} />
            <SingleMetricRow label="attempts_total" value={phase3.attempts_total_7d} />
            <SingleMetricRow label="dead_letters_total" value={phase3.dead_letters_total_7d} 
              status={phase3.dead_letters_total_7d === 0 ? 'ok' : 'warn'} />
            <SingleMetricRow 
              label="recovered_total" 
              value={phase3.recovered_total_7d !== null ? phase3.recovered_total_7d : 'UNKNOWN'}
              status={phase3.recovered_total_7d !== null ? 'ok' : 'unknown'}
            />
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <span className="text-sm text-muted-foreground">last_recover_job</span>
              <div className="flex items-center gap-2">
                {phase3.last_recover_job ? (
                  <>
                    <Badge variant={phase3.last_recover_job.success ? 'default' : 'destructive'} className="text-xs">
                      {phase3.last_recover_job.success ? 'SUCCESS' : 'FAILED'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDuration(phase3.last_recover_job.duration_ms)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(phase3.last_recover_job.created_at)}
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">No runs yet</span>
                )}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Section 4: Phase 3.5 "Chaos Readiness" */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-orange-500" />
          <h3 className="font-semibold">Phase 3.5: Chaos Readiness</h3>
          <Badge variant="outline" className="text-xs">Capability</Badge>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Chaos injection support detection (no execution from this UI)
        </p>

        {!phase35 ? (
          <p className="text-sm text-muted-foreground">No chaos data</p>
        ) : (
          <div className="space-y-3">
            <div className="grid md:grid-cols-3 gap-3">
              <div className={`p-3 rounded-lg border ${phase35.chaos_supported_webhook ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950' : 'border-border bg-muted/50'}`}>
                <div className="flex items-center gap-2 mb-1">
                  {phase35.chaos_supported_webhook ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className="text-sm font-medium">Webhook</span>
                </div>
                <p className="text-xs text-muted-foreground">shopify-order-webhook</p>
              </div>
              <div className={`p-3 rounded-lg border ${phase35.chaos_supported_recovery ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950' : 'border-border bg-muted/50'}`}>
                <div className="flex items-center gap-2 mb-1">
                  {phase35.chaos_supported_recovery ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className="text-sm font-medium">Recovery</span>
                </div>
                <p className="text-xs text-muted-foreground">recover-missing-purchases</p>
              </div>
              <div className={`p-3 rounded-lg border ${phase35.chaos_supported_reconcile ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950' : 'border-border bg-muted/50'}`}>
                <div className="flex items-center gap-2 mb-1">
                  {phase35.chaos_supported_reconcile ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className="text-sm font-medium">Reconcile</span>
                </div>
                <p className="text-xs text-muted-foreground">reconcile-shopify-orders</p>
              </div>
            </div>
            
            <SingleMetricRow 
              label="chaos_rows_last_7d" 
              value={phase35.chaos_rows_last_7d}
              status={phase35.chaos_rows_last_7d === 0 ? 'ok' : 'warn'}
            />
          </div>
        )}
      </Card>

      {/* Section 5: Chaos Test Panel */}
      <Card className="p-5 border-orange-200 dark:border-orange-900">
        <div className="flex items-center gap-2 mb-4">
          <SkullIcon className="w-5 h-5 text-orange-500" />
          <h3 className="font-semibold">Chaos Test Panel</h3>
          <Badge variant="outline" className="text-xs bg-orange-50 dark:bg-orange-950">Admin Only</Badge>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Execute chaos tests C4, C5, C7 directly. Uses stored CRON_SECRET internally.
        </p>

        {/* Dry Run Toggle */}
        <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-muted/50">
          <Checkbox 
            id="dry-run-mode" 
            checked={dryRunMode} 
            onCheckedChange={(v) => setDryRunMode(!!v)}
          />
          <label htmlFor="dry-run-mode" className="text-sm cursor-pointer flex-1">
            <span className="font-medium">Dry Run Mode</span>
            <span className="text-muted-foreground ml-2">(no DB writes, safe to test)</span>
          </label>
          {dryRunMode ? (
            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-400">SAFE</Badge>
          ) : (
            <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-400">LIVE</Badge>
          )}
        </div>

        {/* Test Buttons */}
        <div className="grid md:grid-cols-3 gap-3 mb-4">
          {[
            { id: 'c4' as const, label: 'C4: Retry Exhaustion', desc: 'chaos=always_fail' },
            { id: 'c5' as const, label: 'C5: Rate Limit', desc: 'chaos=rate_limit' },
            { id: 'c7' as const, label: 'C7: Timestamp Skew', desc: 'chaosMode=timestamp_skew' },
          ].map(({ id, label, desc }) => {
            const result = chaosState.results[id];
            const isRunning = chaosState.running === id;
            
            return (
              <div key={id} className="border rounded-lg p-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mb-2"
                  disabled={chaosState.running !== null}
                  onClick={() => runChaosTest(id)}
                >
                  {isRunning ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4 mr-2" />
                  )}
                  {isRunning ? 'Running...' : label}
                </Button>
                <p className="text-xs text-muted-foreground text-center">{desc}</p>
                
                {result && (
                  <div className={`mt-2 p-2 rounded text-xs ${result.success ? 'bg-emerald-50 dark:bg-emerald-950' : 'bg-red-50 dark:bg-red-950'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant={result.success ? 'default' : 'destructive'} className="text-xs">
                        {result.success ? 'PASS' : 'FAIL'}
                      </Badge>
                      <span className="text-muted-foreground">{result.duration_ms}ms</span>
                    </div>
                    <p className="text-muted-foreground">
                      dry_run: {result.dry_run ? 'true' : 'false'}
                    </p>
                    {result.error && (
                      <p className="text-red-600 dark:text-red-400 mt-1">{result.error}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Webhook-based Test Buttons (C1, C2, C3, C6, C8, C9) */}
        <h4 className="text-sm font-medium text-muted-foreground mb-2 mt-4">Webhook Replay Tests</h4>
        <div className="grid md:grid-cols-3 gap-3 mb-4">
          {[
            { id: 'c1' as const, label: 'C1: Pinterest Timeout', desc: 'chaos=pinterest_timeout' },
            { id: 'c2' as const, label: 'C2: Pinterest Partial', desc: 'chaos=pinterest_partial_success' },
            { id: 'c3' as const, label: 'C3: Duplicate Webhook', desc: 'idempotency test' },
            { id: 'c6' as const, label: 'C6: DB Fail Before Send', desc: 'chaos=db_write_fail_before_send' },
            { id: 'c8' as const, label: 'C8: DB Unavailable', desc: 'chaos=db_unavailable' },
            { id: 'c9' as const, label: 'C9: Auth Failure', desc: 'invalid HMAC signature' },
          ].map(({ id, label, desc }) => {
            const result = chaosState.results[id];
            const isRunning = chaosState.running === id;
            
            return (
              <div key={id} className="border rounded-lg p-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mb-2"
                  disabled={chaosState.running !== null}
                  onClick={() => runWebhookChaosTest(id)}
                >
                  {isRunning ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4 mr-2" />
                  )}
                  {isRunning ? 'Running...' : label}
                </Button>
                <p className="text-xs text-muted-foreground text-center">{desc}</p>
                
                {result && (
                  <div className={`mt-2 p-2 rounded text-xs ${result.success ? 'bg-emerald-50 dark:bg-emerald-950' : 'bg-red-50 dark:bg-red-950'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant={result.success ? 'default' : 'destructive'} className="text-xs">
                        {result.success ? 'PASS' : 'FAIL'}
                      </Badge>
                      <span className="text-muted-foreground">{result.duration_ms}ms</span>
                    </div>
                    <p className="text-muted-foreground">
                      dry_run: {result.dry_run ? 'true' : 'false'}
                    </p>
                    {result.error && (
                      <p className="text-red-600 dark:text-red-400 mt-1">{result.error}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Results Detail */}
        {Object.keys(chaosState.results).length > 0 && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <h4 className="text-sm font-medium mb-2">Last Test Response</h4>
            <pre className="text-xs overflow-auto max-h-48 p-2 bg-background rounded border">
              {JSON.stringify(
                chaosState.results[Object.keys(chaosState.results).pop() || '']?.response,
                null,
                2
              )}
            </pre>
          </div>
        )}
      </Card>
    </div>
  );
};

export default PhasesTab;
