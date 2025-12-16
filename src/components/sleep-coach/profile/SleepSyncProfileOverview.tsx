// Design tokens: calm system-level summary, brand blue for active, dusty blue for awaiting
import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/integrations/supabase/client';

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
    if (!state) return { label: 'Awaiting initial data', hasData: false };
    const score = state.log_consistency_score;
    if (score >= 70) return { label: `${score}% consistency`, hasData: true };
    if (score >= 30) return { label: `${score}% — building`, hasData: true };
    if (score > 0) return { label: `${score}% — starting`, hasData: true };
    return { label: 'Awaiting initial data', hasData: false };
  };

  const getEngagementLabel = () => {
    if (!state) return 'Emerging';
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

  const renderIcon = (type: string) => {
    const style = { stroke: '#A7B4C2', strokeWidth: 1.5, fill: 'none' };
    
    switch (type) {
      case 'chart':
        return (
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" style={style}>
            <path d="M3 3v18h18" />
            <path d="m19 9-5 5-4-4-3 3" />
          </svg>
        );
      case 'calendar':
        return (
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" style={style}>
            <rect width="18" height="18" x="3" y="4" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
        );
      case 'users':
        return (
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" style={style}>
            <circle cx="9" cy="7" r="4" />
            <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
          </svg>
        );
      case 'activity':
        return (
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" style={style}>
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        );
      default:
        return null;
    }
  };

  const consistency = getConsistencyLabel();
  const syncStatus = getSyncStatus();

  if (loading) {
    return (
      <Card className="border-0 shadow-[0_1px_3px_rgba(0,0,0,0.03)]" style={{ backgroundColor: '#FAFAF8' }}>
        <CardContent className="py-10">
          <div className="animate-pulse space-y-4">
            <div className="h-4 rounded w-1/3" style={{ backgroundColor: '#E6E6E4' }} />
            <div className="h-16 rounded" style={{ backgroundColor: '#E6E6E4' }} />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-[0_1px_3px_rgba(0,0,0,0.03)]" style={{ backgroundColor: '#FAFAF8' }}>
      <CardHeader className="pb-4 pt-7 px-7">
        <CardTitle className="text-sm font-medium" style={{ color: '#2D2B29' }}>
          Sleep Data Overview
        </CardTitle>
        <p className="text-xs" style={{ color: '#A7A29C' }}>
          A summary of your sleep tracking engagement
        </p>
      </CardHeader>
      
      <CardContent className="px-7 pb-7">
        <div className="grid grid-cols-2 gap-4">
          {/* Log Consistency */}
          <div 
            className="p-4 rounded-lg space-y-2"
            style={{ backgroundColor: 'rgba(247, 247, 246, 0.8)' }}
          >
            <div className="flex items-center gap-2">
              {renderIcon('chart')}
              <span className="text-xs" style={{ color: '#A7A29C' }}>Log consistency</span>
            </div>
            <p className="text-sm font-medium" style={{ color: consistency.hasData ? '#2D2B29' : '#A7A29C' }}>
              {consistency.label}
            </p>
          </div>

          {/* Plans Generated */}
          <div 
            className="p-4 rounded-lg space-y-2"
            style={{ backgroundColor: 'rgba(247, 247, 246, 0.8)' }}
          >
            <div className="flex items-center gap-2">
              {renderIcon('calendar')}
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

          {/* Engagement Level */}
          <div 
            className="p-4 rounded-lg space-y-2"
            style={{ backgroundColor: 'rgba(247, 247, 246, 0.8)' }}
          >
            <div className="flex items-center gap-2">
              {renderIcon('users')}
              <span className="text-xs" style={{ color: '#A7A29C' }}>Engagement</span>
            </div>
            <p className="text-sm font-medium" style={{ color: '#2D2B29' }}>
              {getEngagementLabel()}
            </p>
          </div>

          {/* Sync Status */}
          <div 
            className="p-4 rounded-lg space-y-2"
            style={{ backgroundColor: 'rgba(247, 247, 246, 0.8)' }}
          >
            <div className="flex items-center gap-2">
              {renderIcon('activity')}
              <span className="text-xs" style={{ color: '#A7A29C' }}>Sync status</span>
            </div>
            <Badge 
              variant="outline"
              className="font-normal border-0 text-xs"
              style={{ 
                backgroundColor: syncStatus.active 
                  ? 'rgba(60, 131, 246, 0.1)' 
                  : 'rgba(167, 180, 194, 0.12)',
                color: syncStatus.active 
                  ? 'rgba(60, 131, 246, 0.85)' 
                  : '#6F6A66',
              }}
            >
              {syncStatus.label}
            </Badge>
          </div>
        </div>

        {/* Footer note for new users */}
        {!state && (
          <p className="text-xs mt-5 text-center leading-relaxed" style={{ color: '#A7A29C' }}>
            We'll learn more about your sleep patterns as you continue logging.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
