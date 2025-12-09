import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AffiliateData {
  id: string;
  referral_code: string;
  total_referrals: number;
  total_commissions: number;
  level: number;
  status: string;
  tier: string;
  tier_expires_at: string | null;
  monthly_sales_count: number;
  monthly_revenue_generated: number;
  parent_affiliate_id: string | null;
}

interface Commission {
  id: string;
  amount: number;
  order_amount: number | null;
  level: number;
  status: string;
  fraud_flag: boolean;
  fraud_reason: string | null;
  created_at: string;
}

interface SubAffiliate {
  id: string;
  referral_code: string;
  total_referrals: number;
  total_commissions: number;
  created_at: string;
  status: string;
  tier: string;
  email: string;
}

interface TierInfo {
  tier: string;
  commissionRate: number;
  nextTier: string | null;
  salesNeeded: number;
}

interface CommissionBreakdown {
  level1: { count: number; total: number };
  level2: { count: number; total: number };
  pending: { count: number; total: number };
  paid: { count: number; total: number };
}

interface MonthlyStats {
  sales: number;
  revenue: number;
}

interface LeaderboardEntry {
  rank: number;
  display_label: string;
  tier: string;
  monthly_sales_count: number;
  monthly_revenue_generated: number;
  total_commissions: number;
  is_current_user: boolean;
}

interface DailyAnalytics {
  date: string;
  sales_count: number;
  commission_amount: number;
}

interface AnalyticsData {
  daily: DailyAnalytics[];
  totals: {
    total_30d_sales: number;
    total_30d_commissions: number;
  };
}

interface PayoutHistoryEntry {
  id: string;
  amount: number;
  currency: string;
  processed_at: string;
  method: string;
  note: string | null;
}

interface AffiliateGoal {
  id: string;
  goal_type: string;
  target_amount: number;
  currency: string;
  period_start: string;
  period_end: string;
  current_progress: number;
  progress_percentage: number;
}

interface ResourceItem {
  id: string;
  category: string;
  title: string;
  description: string;
  link_label: string | null;
  link_url: string | null;
  badge: string | null;
  sort_order: number;
}

interface AffiliateDashboardData {
  affiliate: AffiliateData | null;
  commissions: Commission[];
  subAffiliates: SubAffiliate[];
  tierInfo: TierInfo;
  directSalesLast30: number;
  monthlyStats: MonthlyStats;
  commissionBreakdown: CommissionBreakdown;
  leaderboard: LeaderboardEntry[];
  analytics: AnalyticsData | null;
  payoutHistory: PayoutHistoryEntry[];
  goals: AffiliateGoal[];
  resources: ResourceItem[];
}

const DEFAULT_TIER_INFO: TierInfo = {
  tier: 'bronze',
  commissionRate: 10,
  nextTier: 'silver',
  salesNeeded: 10
};

const DEFAULT_BREAKDOWN: CommissionBreakdown = {
  level1: { count: 0, total: 0 },
  level2: { count: 0, total: 0 },
  pending: { count: 0, total: 0 },
  paid: { count: 0, total: 0 }
};

/**
 * Optimized hook for fetching all affiliate dashboard data in parallel.
 * Reduces waterfall requests from 7 sequential calls to 2 parallel batches.
 */
export function useAffiliateDashboard() {
  const [data, setData] = useState<AffiliateDashboardData>({
    affiliate: null,
    commissions: [],
    subAffiliates: [],
    tierInfo: DEFAULT_TIER_INFO,
    directSalesLast30: 0,
    monthlyStats: { sales: 0, revenue: 0 },
    commissionBreakdown: DEFAULT_BREAKDOWN,
    leaderboard: [],
    analytics: null,
    payoutHistory: [],
    goals: [],
    resources: [],
  });
  const [loading, setLoading] = useState(true);
  const [secondaryLoading, setSecondaryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  const fetchDashboardData = useCallback(async () => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    
    setLoading(true);
    setError(null);

    try {
      // BATCH 1: Primary data (critical path - must complete first)
      const primaryResponse = await supabase.functions.invoke('affiliate-api', {
        body: { action: 'get-affiliate', data: {} }
      });

      if (primaryResponse.error) {
        throw new Error(primaryResponse.error.message);
      }

      const {
        affiliate,
        commissions: commissionsData,
        tierInfo: tierData,
        directSalesLast30Days,
        subAffiliates: subAffiliatesData,
        monthlyStats: stats,
        commissionBreakdown: breakdown
      } = primaryResponse.data;

      // Update primary data immediately
      setData(prev => ({
        ...prev,
        affiliate,
        commissions: commissionsData || [],
        subAffiliates: subAffiliatesData || [],
        tierInfo: tierData || DEFAULT_TIER_INFO,
        directSalesLast30: directSalesLast30Days || 0,
        monthlyStats: stats || { sales: 0, revenue: 0 },
        commissionBreakdown: breakdown || DEFAULT_BREAKDOWN,
      }));
      
      setLoading(false);

      // If no affiliate, stop here
      if (!affiliate) {
        setSecondaryLoading(false);
        return;
      }

      // BATCH 2: Secondary data (non-blocking, fetched in parallel)
      const [
        leaderboardRes,
        analyticsRes,
        goalsRes,
        resourcesRes,
        payoutHistoryRes
      ] = await Promise.all([
        supabase.functions.invoke('affiliate-api', {
          body: { action: 'get-leaderboard', data: {} }
        }),
        supabase.functions.invoke('affiliate-api', {
          body: { action: 'get-analytics', data: {} }
        }),
        supabase.functions.invoke('affiliate-api', {
          body: { action: 'get-goals', data: {} }
        }),
        supabase.functions.invoke('affiliate-api', {
          body: { action: 'get-resources', data: {} }
        }),
        supabase
          .from('affiliate_payouts')
          .select('id, amount, currency, processed_at, method, note')
          .eq('affiliate_id', affiliate.id)
          .order('processed_at', { ascending: false })
      ]);

      // Update secondary data
      setData(prev => ({
        ...prev,
        leaderboard: leaderboardRes.data?.leaderboard || [],
        analytics: analyticsRes.data?.analytics || null,
        goals: goalsRes.data?.goals || [],
        resources: resourcesRes.data?.resources || [],
        payoutHistory: payoutHistoryRes.data || [],
      }));

    } catch (err) {
      console.error("Error fetching affiliate data:", err);
      setError(err instanceof Error ? err.message : "Failed to load affiliate data");
    } finally {
      setLoading(false);
      setSecondaryLoading(false);
    }
  }, []);

  const refetch = useCallback(async () => {
    hasFetched.current = false;
    await fetchDashboardData();
  }, [fetchDashboardData]);

  return {
    data,
    loading,
    secondaryLoading,
    error,
    fetchDashboardData,
    refetch,
  };
}

export type {
  AffiliateData,
  Commission,
  SubAffiliate,
  TierInfo,
  CommissionBreakdown,
  MonthlyStats,
  LeaderboardEntry,
  AnalyticsData,
  PayoutHistoryEntry,
  AffiliateGoal,
  ResourceItem,
  AffiliateDashboardData,
};
