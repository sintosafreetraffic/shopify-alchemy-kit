// Design tokens: calm system-level summary, brand blue for active, dusty blue for awaiting
import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/integrations/supabase/client';
import { Activity, Calendar, BarChart3, Users } from "lucide-react";

interface SleepSyncState {
  log_consistency_score: number;
  total_plans_generated: number;
  last_plan_generated_at: string | null;
  engagement_level: string;
  generated_at: string;
  environment_updated_at: string | null;
}

interface SleepSyncProfileOverviewProps {
  email: string;
}

export function SleepSyncProfileOverview({ email }: SleepSyncProfileOverviewProps) {
  const [state, setState] = useState<SleepSyncState | null>(null);
  const [loading, setLoading] = useState(true);

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

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getConsistencyLabel = () => {
    if (!state) return { label: 'Not enough data yet', hasData: false };
    const score = state.log_consistency_score;
    if (score >= 70) return { label: `${score}% over last 30 days`, hasData: true };
    if (score >= 30) return { label: `${score}% — building momentum`, hasData: true };
    if (score > 0) return { label: `${score}% — just getting started`, hasData: true };
    return { label: 'Not enough data yet', hasData: false };
  };

  const getEngagementLabel = () => {
    if (!state) return 'Awaiting data';
    const level = state.engagement_level;
    const labels: Record<string, string> = {
      high: 'Deeply engaged',
      medium: 'Steady',
      low: 'Emerging',
    };
    return labels[level] || 'Emerging';
  };

  const getSyncStatus = () => {
    if (!state) return { label: 'Awaiting more data', active: false };
    const hasRecentActivity = state.log_consistency_score > 0 || state.total_plans_generated > 0;
    return {
      label: hasRecentActivity ? 'Active syncing' : 'Awaiting more data',
      active: hasRecentActivity,
    };
  };

  const consistency = getConsistencyLabel();
  const syncStatus = getSyncStatus();

  if (loading) {
    return (
      <Card className="border-0 shadow-[0_1px_3px_rgba(0,0,0,0.03)]" style={{ backgroundColor: '#FAFAF8' }}>
        <CardContent className="py-8">
          <div className="animate-pulse space-y-3">
            <div className="h-4 rounded w-1/3" style={{ backgroundColor: '#E6E6E4' }} />
            <div className="h-8 rounded" style={{ backgroundColor: '#E6E6E4' }} />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-[0_1px_3px_rgba(0,0,0,0.03)]" style={{ backgroundColor: '#FAFAF8' }}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium" style={{ color: '#2D2B29' }}>
          Sleep Data Overview
        </CardTitle>
        <p className="text-xs" style={{ color: '#A7A29C' }}>
          How much we know about your sleep patterns
        </p>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {/* Data Coverage */}
          <div 
            className="p-3 rounded-lg space-y-1"
            style={{ backgroundColor: 'rgba(247, 247, 246, 0.8)' }}
          >
            <div className="flex items-center gap-1.5">
              <BarChart3 className="h-3 w-3" style={{ color: '#A7B4C2' }} strokeWidth={1.5} />
              <span className="text-xs" style={{ color: '#A7A29C' }}>Log consistency</span>
            </div>
            <p className="text-sm font-medium" style={{ color: consistency.hasData ? '#2D2B29' : '#A7A29C' }}>
              {consistency.label}
            </p>
          </div>

          {/* Plan History */}
          <div 
            className="p-3 rounded-lg space-y-1"
            style={{ backgroundColor: 'rgba(247, 247, 246, 0.8)' }}
          >
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3 w-3" style={{ color: '#A7B4C2' }} strokeWidth={1.5} />
              <span className="text-xs" style={{ color: '#A7A29C' }}>Plans generated</span>
            </div>
            <p className="text-sm font-medium" style={{ color: '#2D2B29' }}>
              {state?.total_plans_generated || 0}
            </p>
            {state?.last_plan_generated_at && (
              <p className="text-xs" style={{ color: '#A7A29C' }}>
                Last: {formatDate(state.last_plan_generated_at)}
              </p>
            )}
          </div>

          {/* Engagement Profile */}
          <div 
            className="p-3 rounded-lg space-y-1"
            style={{ backgroundColor: 'rgba(247, 247, 246, 0.8)' }}
          >
            <div className="flex items-center gap-1.5">
              <Users className="h-3 w-3" style={{ color: '#A7B4C2' }} strokeWidth={1.5} />
              <span className="text-xs" style={{ color: '#A7A29C' }}>Engagement</span>
            </div>
            <p className="text-sm font-medium" style={{ color: '#2D2B29' }}>
              {getEngagementLabel()}
            </p>
          </div>

          {/* Sync Status */}
          <div 
            className="p-3 rounded-lg space-y-1"
            style={{ backgroundColor: 'rgba(247, 247, 246, 0.8)' }}
          >
            <div className="flex items-center gap-1.5">
              <Activity className="h-3 w-3" style={{ color: '#A7B4C2' }} strokeWidth={1.5} />
              <span className="text-xs" style={{ color: '#A7A29C' }}>Sync status</span>
            </div>
            <Badge 
              variant="outline"
              className="font-normal border-0 text-xs"
              style={{ 
                backgroundColor: syncStatus.active 
                  ? 'rgba(60, 131, 246, 0.1)' 
                  : 'rgba(167, 180, 194, 0.15)',
                color: syncStatus.active 
                  ? 'rgba(60, 131, 246, 0.85)' 
                  : '#6F6A66',
              }}
            >
              {syncStatus.label}
            </Badge>
          </div>
        </div>

        {/* Footer note */}
        {!state && (
          <p className="text-xs mt-4 text-center" style={{ color: '#A7A29C' }}>
            We'll learn more as you continue logging your sleep.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
