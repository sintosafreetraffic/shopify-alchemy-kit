import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { SleepProfile, SleepLog, CoachPlan, TrendData } from './useSleepApi';

interface DashboardData {
  profile: SleepProfile | null;
  logs: SleepLog[];
  trends: TrendData;
  coachPlan: CoachPlan | null;
}

interface UseSleepDashboardDataResult {
  data: DashboardData;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const DEFAULT_TRENDS: TrendData = {
  avgSleepQuality: 0,
  avgPain: 0,
  trend: 'stable',
  hotNights: 0,
  stressedNights: 0,
  goodNights: 0,
  poorNights: 0,
};

function calculateTrends(logs: SleepLog[]): TrendData {
  if (logs.length === 0) return DEFAULT_TRENDS;

  const avgSleepQuality = logs.reduce((sum, l) => sum + l.sleep_quality, 0) / logs.length;
  const avgPain = logs.reduce((sum, l) => sum + l.pain_level_morning, 0) / logs.length;
  const hotNights = logs.filter(l => l.felt_hot).length;
  const stressedNights = logs.filter(l => l.felt_stressed).length;
  const goodNights = logs.filter(l => l.sleep_quality >= 7).length;
  const poorNights = logs.filter(l => l.sleep_quality <= 4).length;

  const recent = logs.slice(0, 7);
  const older = logs.slice(7, 14);
  let trend: 'improving' | 'stable' | 'worsening' = 'stable';
  
  if (older.length >= 3) {
    const recentAvg = recent.reduce((s, l) => s + l.sleep_quality, 0) / recent.length;
    const olderAvg = older.reduce((s, l) => s + l.sleep_quality, 0) / older.length;
    if (recentAvg - olderAvg > 1) trend = 'improving';
    else if (olderAvg - recentAvg > 1) trend = 'worsening';
  }

  return { avgSleepQuality, avgPain, trend, hotNights, stressedNights, goodNights, poorNights };
}

/**
 * Hook that loads all dashboard data ONCE after authentication.
 * Prevents infinite loops by using refs to track fetch status.
 */
export function useSleepDashboardData(email: string | null): UseSleepDashboardDataResult {
  const [data, setData] = useState<DashboardData>({
    profile: null,
    logs: [],
    trends: DEFAULT_TRENDS,
    coachPlan: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Track if we've already fetched for this email
  const hasFetchedRef = useRef<string | null>(null);
  const isFetchingRef = useRef(false);

  const loadData = useCallback(async (emailToLoad: string) => {
    // Prevent concurrent fetches
    if (isFetchingRef.current) return;
    
    isFetchingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const [profileResult, logsResult, planResult] = await Promise.all([
        supabase
          .from('sleep_profiles')
          .select('*')
          .eq('email', emailToLoad)
          .maybeSingle(),
        supabase
          .from('sleep_logs')
          .select('*')
          .eq('email', emailToLoad)
          .order('date', { ascending: false })
          .limit(30),
        supabase
          .from('coach_plans')
          .select('*')
          .eq('email', emailToLoad)
          .order('generated_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      // Check for errors
      if (profileResult.error) throw profileResult.error;
      if (logsResult.error) throw logsResult.error;
      if (planResult.error) throw planResult.error;

      const logs = (logsResult.data || []) as SleepLog[];
      const trends = calculateTrends(logs);

      setData({
        profile: profileResult.data as SleepProfile | null,
        logs,
        trends,
        coachPlan: planResult.data as CoachPlan | null,
      });
      
      hasFetchedRef.current = emailToLoad;
    } catch (e: any) {
      console.error('Failed to load dashboard data:', e);
      setError(e.message || 'Failed to load data');
      // Don't retry on error - just show error state
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  // Load data once when email changes
  useEffect(() => {
    if (!email) {
      // Reset state when logged out
      setData({ profile: null, logs: [], trends: DEFAULT_TRENDS, coachPlan: null });
      hasFetchedRef.current = null;
      return;
    }

    // Only fetch if we haven't fetched for this email yet
    if (hasFetchedRef.current !== email) {
      loadData(email);
    }
  }, [email, loadData]);

  // Manual refetch function
  const refetch = useCallback(async () => {
    if (email) {
      hasFetchedRef.current = null; // Reset to allow refetch
      await loadData(email);
    }
  }, [email, loadData]);

  return { data, loading, error, refetch };
}
