import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Activity, 
  Calendar,
  Flame,
  Moon,
  Bed,
  ThermometerSun,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SleepSyncState {
  schema_version: number;
  source: string;
  generated_at: string;
  
  // Layer 1: Static Identity
  sleep_position: string;
  pain_points: string[];
  products_owned: string[];
  
  // Layer 2: Environment
  mattress_firmness: string;
  co_sleeping: string;
  room_brightness: string;
  environment_updated_at: string | null;
  
  // Layer 3: Dynamic
  sleep_trend: string;
  pain_trend: string;
  avg_sleep_quality_7d: number | null;
  avg_pain_7d: number | null;
  streak_days: number;
  last_log_days_ago: number | null;
  log_consistency_score: number;
  engagement_level: string;
  risk_level: string;
  upsell_score: number;
  
  // Plan tracking
  last_plan_generated_at: string | null;
  days_since_last_plan: number | null;
  total_plans_generated: number;
}

interface SleepSyncOverviewProps {
  email: string;
  onRefresh?: () => void;
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === 'improving') return <TrendingUp className="h-4 w-4 text-green-500" />;
  if (trend === 'worsening') return <TrendingDown className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

function TrendBadge({ trend }: { trend: string }) {
  const variant = trend === 'improving' ? 'default' : trend === 'worsening' ? 'destructive' : 'secondary';
  return (
    <Badge variant={variant} className="capitalize">
      {trend}
    </Badge>
  );
}

export function SleepSyncOverview({ email, onRefresh }: SleepSyncOverviewProps) {
  const [state, setState] = useState<SleepSyncState | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchState = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('sleep_attributes_state')
        .select('data')
        .eq('email', email)
        .single();
      
      if (data?.data) {
        setState(data.data as unknown as SleepSyncState);
      }
    } catch (error) {
      console.error('Failed to fetch sleep sync state:', error);
    } finally {
      setLoading(false);
    }
  }, [email]);

  useEffect(() => {
    if (email) {
      fetchState();
    }
  }, [email, fetchState]);

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      const { error } = await supabase.functions.invoke('sleep-attributes-sync', {
        body: { source: 'manual', email },
      });
      
      if (error) throw error;
      
      toast.success('Sleep data synced successfully');
      await fetchState();
      onRefresh?.();
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Failed to sync sleep data');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-8 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!state) {
    return (
      <Card>
        <CardContent className="p-6 text-center space-y-4">
          <Activity className="h-8 w-8 mx-auto opacity-50 text-muted-foreground" />
          <p className="text-muted-foreground">No sync data available yet.</p>
          <Button onClick={handleManualSync} disabled={syncing} size="sm">
            {syncing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Sync Now
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              SleepSync Overview
            </CardTitle>
            <CardDescription>
              Your personalized sleep intelligence across all layers
            </CardDescription>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleManualSync} 
            disabled={syncing}
          >
            {syncing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Trends Section */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Sleep Trend</span>
              <TrendIcon trend={state.sleep_trend} />
            </div>
            <TrendBadge trend={state.sleep_trend} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Pain Trend</span>
              <TrendIcon trend={state.pain_trend} />
            </div>
            <TrendBadge trend={state.pain_trend} />
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <Moon className="h-5 w-5 mx-auto mb-1 text-primary" />
            <div className="text-2xl font-bold">
              {state.avg_sleep_quality_7d?.toFixed(1) || '—'}
            </div>
            <div className="text-xs text-muted-foreground">Avg Quality (7d)</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <Flame className="h-5 w-5 mx-auto mb-1 text-orange-500" />
            <div className="text-2xl font-bold">{state.streak_days}</div>
            <div className="text-xs text-muted-foreground">Day Streak</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <ThermometerSun className="h-5 w-5 mx-auto mb-1 text-blue-500" />
            <div className="text-2xl font-bold">
              {state.avg_pain_7d?.toFixed(1) || '—'}
            </div>
            <div className="text-xs text-muted-foreground">Avg Pain (7d)</div>
          </div>
        </div>

        {/* Consistency Score */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Log Consistency</span>
            <span className="font-medium">{state.log_consistency_score}%</span>
          </div>
          <Progress value={state.log_consistency_score} className="h-2" />
        </div>

        {/* Environment Summary */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Bed className="h-4 w-4" />
            Environment Profile
          </h4>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{state.mattress_firmness} mattress</Badge>
            <Badge variant="outline">{state.co_sleeping}</Badge>
            <Badge variant="outline">{state.room_brightness} room</Badge>
          </div>
          {state.environment_updated_at && (
            <p className="text-xs text-muted-foreground">
              Last updated: {formatDate(state.environment_updated_at)}
            </p>
          )}
        </div>

        {/* Plan Info */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Plan Status
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Last Plan:</span>
              <p className="font-medium">{formatDate(state.last_plan_generated_at)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Total Plans:</span>
              <p className="font-medium">{state.total_plans_generated}</p>
            </div>
          </div>
        </div>

        {/* Risk & Opportunity */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Risk Level</span>
            <Badge 
              variant={state.risk_level === 'high' ? 'destructive' : state.risk_level === 'medium' ? 'secondary' : 'default'}
              className="capitalize"
            >
              {state.risk_level}
            </Badge>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Engagement</span>
            <Badge variant="outline" className="capitalize">
              {state.engagement_level}
            </Badge>
          </div>
        </div>

        {/* Last Sync */}
        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          Last synced: {formatDate(state.generated_at)} • Source: {state.source}
        </div>
      </CardContent>
    </Card>
  );
}
