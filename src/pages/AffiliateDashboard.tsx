// Performance: Chart component is lazy-loaded to reduce initial bundle size
import { useEffect, useState, useCallback, Suspense, lazy } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Users, DollarSign, Loader2, Award, Share2, TrendingUp, Check, Sparkles, UserPlus, ShieldCheck, AlertTriangle, Package, Trophy, BarChart3, History, Wallet, Target, BookOpen, FileText, ExternalLink, Image, Star, Crown, Gem, Shield, Upload, Link as LinkIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { TierProgressCard } from "@/components/affiliate/TierProgressCard";
import { UGCSubmissionForm } from "@/components/affiliate/UGCSubmissionForm";

// Lazy load the chart component to reduce initial bundle size
const AffiliateAnalyticsChart = lazy(() => import("@/components/affiliate/AffiliateAnalyticsChart"));

// Production domain for referral links
const SITE_URL = "https://www.risebynight.com";

// ============ Type Definitions ============
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

// ============ Tier Configuration - Monoline Icons ============
const tierConfig: Record<string, { color: string; bgColor: string; borderColor: string; Icon: React.ElementType }> = {
  'bronze': { color: 'text-amber-700', bgColor: 'bg-amber-50/50', borderColor: 'border-amber-200/60', Icon: Shield },
  'silver': { color: 'text-slate-600', bgColor: 'bg-slate-50/50', borderColor: 'border-slate-200/60', Icon: Award },
  'gold': { color: 'text-yellow-700', bgColor: 'bg-yellow-50/50', borderColor: 'border-yellow-200/60', Icon: Star },
  'platinum': { color: 'text-slate-700', bgColor: 'bg-slate-100/50', borderColor: 'border-slate-300/60', Icon: Gem },
  'diamond': { color: 'text-sky-700', bgColor: 'bg-sky-50/50', borderColor: 'border-sky-200/60', Icon: Crown },
};

const allTiers = [
  { name: 'bronze', displayName: 'Bronze', rate: 10, requirement: 'Default' },
  { name: 'silver', displayName: 'Silver', rate: 15, requirement: '10+ sales' },
  { name: 'gold', displayName: 'Gold', rate: 20, requirement: '25+ sales' },
  { name: 'platinum', displayName: 'Platinum', rate: 25, requirement: '50+ sales' },
  { name: 'diamond', displayName: 'Diamond', rate: 35, requirement: 'Invite only' },
];

// ============ Default Values ============
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

const AffiliateDashboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteCode = searchParams.get('invite');

  // ============ Auth & UI State ============
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [copied, setCopied] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);

  // ============ Primary Data State ============
  const [affiliateData, setAffiliateData] = useState<AffiliateData | null>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [subAffiliates, setSubAffiliates] = useState<SubAffiliate[]>([]);
  const [tierInfo, setTierInfo] = useState<TierInfo>(DEFAULT_TIER_INFO);
  const [directSalesLast30, setDirectSalesLast30] = useState(0);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats>({ sales: 0, revenue: 0 });
  const [commissionBreakdown, setCommissionBreakdown] = useState<CommissionBreakdown>(DEFAULT_BREAKDOWN);

  // ============ Secondary Data State (loaded in parallel) ============
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  
  const [payoutHistory, setPayoutHistory] = useState<PayoutHistoryEntry[]>([]);
  const [payoutHistoryLoading, setPayoutHistoryLoading] = useState(true);
  
  const [goals, setGoals] = useState<AffiliateGoal[]>([]);
  const [goalsLoading, setGoalsLoading] = useState(true);
  
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(true);

  // ============ Goal Form State ============
  const [commissionGoalTarget, setCommissionGoalTarget] = useState("");
  const [revenueGoalTarget, setRevenueGoalTarget] = useState("");
  const [savingGoal, setSavingGoal] = useState(false);
  const [activeGoalTab, setActiveGoalTab] = useState<"commission" | "revenue">("commission");

  // ============ Data Fetching ============
  
  /**
   * Fetch secondary data in parallel (leaderboard, analytics, goals, resources, payouts)
   */
  const fetchSecondaryData = useCallback(async (affiliateId: string) => {
    // Set all secondary loading states
    setLeaderboardLoading(true);
    setAnalyticsLoading(true);
    setGoalsLoading(true);
    setResourcesLoading(true);
    setPayoutHistoryLoading(true);

    const [leaderboardRes, analyticsRes, goalsRes, resourcesRes, payoutRes] = await Promise.all([
      supabase.functions.invoke('affiliate-api', { body: { action: 'get-leaderboard', data: {} } }),
      supabase.functions.invoke('affiliate-api', { body: { action: 'get-analytics', data: {} } }),
      supabase.functions.invoke('affiliate-api', { body: { action: 'get-goals', data: {} } }),
      supabase.functions.invoke('affiliate-api', { body: { action: 'get-resources', data: {} } }),
      supabase
        .from('affiliate_payouts')
        .select('id, amount, currency, processed_at, method, note')
        .eq('affiliate_id', affiliateId)
        .order('processed_at', { ascending: false }),
    ]);

    // Update leaderboard
    if (leaderboardRes.data?.leaderboard) {
      setLeaderboard(leaderboardRes.data.leaderboard);
    }
    setLeaderboardLoading(false);

    // Update analytics
    if (analyticsRes.data?.analytics) {
      setAnalytics(analyticsRes.data.analytics);
    }
    setAnalyticsLoading(false);

    // Update goals + pre-fill inputs
    if (goalsRes.data?.goals) {
      const fetchedGoals = goalsRes.data.goals;
      setGoals(fetchedGoals);
      const commissionGoal = fetchedGoals.find((g: AffiliateGoal) => g.goal_type === '30d_commission');
      const revenueGoal = fetchedGoals.find((g: AffiliateGoal) => g.goal_type === '30d_revenue');
      if (commissionGoal) {
        setCommissionGoalTarget(commissionGoal.target_amount.toString());
      }
      if (revenueGoal) {
        setRevenueGoalTarget(revenueGoal.target_amount.toString());
      }
    }
    setGoalsLoading(false);

    // Update resources
    if (resourcesRes.data?.resources) {
      setResources(resourcesRes.data.resources);
    }
    setResourcesLoading(false);

    // Update payout history
    if (payoutRes.data) {
      setPayoutHistory(payoutRes.data);
    }
    setPayoutHistoryLoading(false);
  }, []);

  /**
   * Fetch primary affiliate data, then trigger secondary fetch in parallel
   */
  const fetchAffiliateData = useCallback(async () => {
    setLoading(true);

    try {
      const response = await supabase.functions.invoke('affiliate-api', {
        body: { action: 'get-affiliate', data: {} }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const {
        affiliate,
        commissions: commissionsData,
        tierInfo: tierData,
        directSalesLast30Days,
        subAffiliates: subAffiliatesData,
        monthlyStats: stats,
        commissionBreakdown: breakdown
      } = response.data;

      // Set primary data
      setAffiliateData(affiliate || null);
      setCommissions(commissionsData || []);
      setSubAffiliates(subAffiliatesData || []);
      setTierInfo(tierData || DEFAULT_TIER_INFO);
      setDirectSalesLast30(directSalesLast30Days || 0);
      setMonthlyStats(stats || { sales: 0, revenue: 0 });
      setCommissionBreakdown(breakdown || DEFAULT_BREAKDOWN);

      // Primary data loaded - show UI immediately
      setLoading(false);

      // If affiliate exists, fetch secondary data in parallel
      if (affiliate?.id) {
        fetchSecondaryData(affiliate.id);
      } else {
        // No affiliate, clear secondary loading states
        setLeaderboardLoading(false);
        setAnalyticsLoading(false);
        setGoalsLoading(false);
        setResourcesLoading(false);
        setPayoutHistoryLoading(false);
      }
    } catch (error) {
      console.error("Error fetching affiliate data:", error);
      setLoading(false);
    }
  }, [fetchSecondaryData]);

  /**
   * Check authentication and load data
   */
  const checkAuth = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      if (inviteCode) {
        sessionStorage.setItem('affiliate_invite_code', inviteCode);
      }
      navigate("/auth");
      return;
    }

    setUser(session.user);
    fetchAffiliateData();
  }, [inviteCode, navigate, fetchAffiliateData]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // ============ Actions ============

  const saveGoal = async (goalType: '30d_commission' | '30d_revenue') => {
    const targetValue = goalType === '30d_commission' ? commissionGoalTarget : revenueGoalTarget;
    const targetAmount = parseFloat(targetValue);
    
    if (isNaN(targetAmount) || targetAmount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a positive number for your goal.",
        variant: "destructive",
      });
      return;
    }

    setSavingGoal(true);
    try {
      const response = await supabase.functions.invoke('affiliate-api', {
        body: { 
          action: 'set-goal', 
          data: { 
            goal_type: goalType,
            target_amount: targetAmount 
          } 
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const goalLabel = goalType === '30d_commission' ? 'commission' : 'revenue';
      toast({
        title: "Goal saved!",
        description: `Your 30-day ${goalLabel} goal is now $${targetAmount.toFixed(2)}.`,
      });

      // Refresh goals
      if (affiliateData?.id) {
        const goalsRes = await supabase.functions.invoke('affiliate-api', {
          body: { action: 'get-goals', data: {} }
        });
        if (goalsRes.data?.goals) {
          setGoals(goalsRes.data.goals);
        }
      }
    } catch (error) {
      console.error("Error saving goal:", error);
      toast({
        title: "Error",
        description: "Failed to save goal. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingGoal(false);
    }
  };

  const becomeAffiliate = async () => {
    setJoining(true);
    try {
      const storedInviteCode = inviteCode || sessionStorage.getItem('affiliate_invite_code');
      
      const response = await supabase.functions.invoke('affiliate-api', {
        body: { 
          action: 'become-affiliate', 
          data: { inviteCode: storedInviteCode } 
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      sessionStorage.removeItem('affiliate_invite_code');

      toast({
        title: "Success!",
        description: storedInviteCode 
          ? "You are now an affiliate, connected to your referrer!" 
          : "You are now an affiliate. Welcome to the program!",
      });

      // Refresh all data
      await fetchAffiliateData();
    } catch (error) {
      console.error("Error becoming affiliate:", error);
      toast({
        title: "Error",
        description: "Failed to join affiliate program. Please try again.",
        variant: "destructive",
      });
    } finally {
      setJoining(false);
    }
  };

  const copyReferralLink = () => {
    if (!affiliateData) return;
    const referralLink = `${SITE_URL}?ref=${affiliateData.referral_code}`;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast({ title: "Copied!", description: "Referral link copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  const copyInviteLink = () => {
    if (!affiliateData) return;
    const inviteLink = `${SITE_URL}/affiliate-dashboard?invite=${affiliateData.referral_code}`;
    navigator.clipboard.writeText(inviteLink);
    setInviteCopied(true);
    toast({ title: "Copied!", description: "Affiliate invite link copied to clipboard" });
    setTimeout(() => setInviteCopied(false), 2000);
  };

  // ============ Computed Values ============

  const commissionGoal = goals.find(g => g.goal_type === '30d_commission');
  const revenueGoal = goals.find(g => g.goal_type === '30d_revenue');

  const getProgressToNextTier = () => {
    if (tierInfo.tier === 'diamond' || tierInfo.tier === 'platinum') return 100;
    const thresholds: Record<string, number> = { 'bronze': 10, 'silver': 25, 'gold': 50 };
    const currentThreshold = thresholds[tierInfo.tier] || 10;
    const prevThreshold = tierInfo.tier === 'bronze' ? 0 : tierInfo.tier === 'silver' ? 10 : 25;
    const progress = ((directSalesLast30 - prevThreshold) / (currentThreshold - prevThreshold)) * 100;
    return Math.min(Math.max(progress, 0), 100);
  };

  const formatTierName = (tier: string) => {
    return tier.charAt(0).toUpperCase() + tier.slice(1);
  };

  // ============ Loading State ============

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary/30 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // ============ Not An Affiliate State ============

  if (!affiliateData) {
    return (
      <div className="min-h-screen bg-secondary/30">
        <div className="container mx-auto px-4 py-12 max-w-3xl">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-3">Affiliate Program</h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Partner with Rise By Night™ and earn generous commissions by sharing our premium sleep products.
            </p>
            {(inviteCode || sessionStorage.getItem('affiliate_invite_code')) && (
              <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-lg inline-block">
                <p className="text-sm text-primary font-medium flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  You've been invited. Join to connect with your referrer.
                </p>
              </div>
            )}
          </div>

          <Card className="border-0 shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-primary/5 to-primary/10 p-6 border-b">
              <h2 className="text-xl font-semibold mb-1">Commission Structure</h2>
              <p className="text-sm text-muted-foreground">Earn on every sale you refer</p>
            </div>
            <CardContent className="p-6 space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <DollarSign className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">Direct Sales</p>
                      <p className="text-2xl font-bold text-primary">10-25%</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">Commission on sales from your referral link</p>
                </div>
                <div className="p-4 rounded-lg bg-secondary/50 border">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-secondary rounded-full">
                      <Users className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold">Sub-Affiliate Sales</p>
                      <p className="text-2xl font-bold">5%</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">Commission on sales from affiliates you recruit</p>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Performance Tiers
                </h3>
                <div className="grid gap-2">
                  {allTiers.map((tier, index) => {
                    const TierIcon = tierConfig[tier.name]?.Icon || Shield;
                    return (
                      <div key={tier.name} className={`flex items-center justify-between p-3 rounded-lg ${tierConfig[tier.name]?.bgColor || 'bg-secondary/30'} border ${tierConfig[tier.name]?.borderColor || 'border-border'}`}>
                        <div className="flex items-center gap-2">
                          <TierIcon className={`h-4 w-4 ${tierConfig[tier.name]?.color || 'text-muted-foreground'}`} />
                          <span className="font-medium">{tier.displayName}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold">{tier.rate}%</span>
                          <span className="text-xs text-muted-foreground ml-2">({tier.requirement})</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4">
                <Button 
                  onClick={becomeAffiliate} 
                  disabled={joining}
                  className="w-full h-12 text-lg"
                >
                  {joining ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-5 w-5" />
                      Join Affiliate Program
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ============ Main Dashboard ============

  const currentTierConfig = tierConfig[tierInfo.tier] || tierConfig['bronze'];

  return (
    <div className="min-h-screen bg-secondary/30">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Affiliate Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, partner!</p>
          </div>
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${currentTierConfig.bgColor} ${currentTierConfig.borderColor} border`}>
            <currentTierConfig.Icon className={`h-5 w-5 ${currentTierConfig.color}`} />
            <span className={`font-semibold ${currentTierConfig.color}`}>
              {formatTierName(tierInfo.tier)} Partner
            </span>
            <span className="text-sm text-muted-foreground">({tierInfo.commissionRate}%)</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-full">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Earnings</p>
                  <p className="text-2xl font-bold">${(affiliateData.total_commissions || 0).toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-full">
                  <Package className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Referrals</p>
                  <p className="text-2xl font-bold">{affiliateData.total_referrals || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-full">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">30-Day Sales</p>
                  <p className="text-2xl font-bold">{monthlyStats.sales}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-full">
                  <Users className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sub-Affiliates</p>
                  <p className="text-2xl font-bold">{subAffiliates.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Referral Links */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Share2 className="h-5 w-5 text-primary" />
                Your Referral Link
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input 
                  value={`${SITE_URL}?ref=${affiliateData.referral_code}`}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button onClick={copyReferralLink} variant="outline">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Share this link to earn commissions on sales</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <UserPlus className="h-5 w-5 text-blue-600" />
                Invite Affiliates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input 
                  value={`${SITE_URL}/affiliate-dashboard?invite=${affiliateData.referral_code}`}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button onClick={copyInviteLink} variant="outline">
                  {inviteCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Earn 5% on sales from affiliates you recruit</p>
            </CardContent>
          </Card>
        </div>

        {/* Tier Progress */}
        {tierInfo.nextTier && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Award className="h-5 w-5 text-yellow-600" />
                Tier Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>{formatTierName(tierInfo.tier)}</span>
                  <span>{formatTierName(tierInfo.nextTier)}</span>
                </div>
                <Progress value={getProgressToNextTier()} className="h-3" />
                <p className="text-sm text-muted-foreground text-center">
                  {tierInfo.salesNeeded > 0 
                    ? `${tierInfo.salesNeeded} more sales needed for ${formatTierName(tierInfo.nextTier)} tier`
                    : `You've reached ${formatTierName(tierInfo.tier)} tier!`
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Commission Breakdown */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="h-5 w-5 text-green-600" />
              Commission Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Level 1</p>
                <p className="text-xl font-bold">${commissionBreakdown.level1.total.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">{commissionBreakdown.level1.count} sales</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Level 2</p>
                <p className="text-xl font-bold">${commissionBreakdown.level2.total.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">{commissionBreakdown.level2.count} sales</p>
              </div>
              <div className="p-4 bg-amber-50 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-xl font-bold">${commissionBreakdown.pending.total.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">{commissionBreakdown.pending.count} commissions</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Paid</p>
                <p className="text-xl font-bold">${commissionBreakdown.paid.total.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">{commissionBreakdown.paid.count} commissions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Analytics Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Performance Analytics (Last 30 Days)
            </CardTitle>
            <p className="text-sm text-muted-foreground">Track your daily sales and commissions</p>
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !analytics || analytics.totals.total_30d_sales === 0 ? (
              <div className="text-center py-12">
                <BarChart3 className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-muted-foreground">No analytics data yet. Once you generate sales, your 30-day performance will appear here.</p>
              </div>
            ) : (
              <Suspense fallback={
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading chart...</span>
                </div>
              }>
                <AffiliateAnalyticsChart 
                  daily={analytics.daily} 
                  totals={analytics.totals} 
                />
              </Suspense>
            )}
          </CardContent>
        </Card>

        {/* Payout History */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wallet className="h-5 w-5 text-green-600" />
              Payout History
            </CardTitle>
            <p className="text-sm text-muted-foreground">Your processed payouts</p>
          </CardHeader>
          <CardContent>
            {payoutHistoryLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : payoutHistory.length === 0 ? (
              <div className="text-center py-8">
                <History className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-muted-foreground">No payouts yet. Once you reach the payout threshold, your payouts will appear here.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payoutHistory.map((payout) => (
                    <TableRow key={payout.id}>
                      <TableCell>{format(parseISO(payout.processed_at), 'MMM d, yyyy')}</TableCell>
                      <TableCell className="font-medium">${payout.amount.toFixed(2)} {payout.currency}</TableCell>
                      <TableCell>{payout.method}</TableCell>
                      <TableCell className="text-muted-foreground">{payout.note || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Goals Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5 text-purple-600" />
              Your Goals
            </CardTitle>
            <p className="text-sm text-muted-foreground">Set 30-day targets and track your progress</p>
          </CardHeader>
          <CardContent>
            {goalsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Tabs value={activeGoalTab} onValueChange={(v) => setActiveGoalTab(v as "commission" | "revenue")}>
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="commission">Commission Goal</TabsTrigger>
                  <TabsTrigger value="revenue">Revenue Goal</TabsTrigger>
                </TabsList>
                <TabsContent value="commission">
                  <div className="space-y-4">
                    {commissionGoal ? (
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <div className="flex justify-between mb-2">
                          <span className="font-medium">Target: ${commissionGoal.target_amount.toFixed(2)}</span>
                          <span className="text-sm text-muted-foreground">{commissionGoal.progress_percentage.toFixed(0)}%</span>
                        </div>
                        <Progress value={commissionGoal.progress_percentage} className="h-2 mb-2" />
                        <p className="text-sm text-muted-foreground">
                          ${commissionGoal.current_progress.toFixed(2)} of ${commissionGoal.target_amount.toFixed(2)}
                        </p>
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">No commission goal set yet.</p>
                    )}
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Enter target amount"
                        value={commissionGoalTarget}
                        onChange={(e) => setCommissionGoalTarget(e.target.value)}
                      />
                      <Button onClick={() => saveGoal('30d_commission')} disabled={savingGoal}>
                        {savingGoal ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Set Goal'}
                      </Button>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="revenue">
                  <div className="space-y-4">
                    {revenueGoal ? (
                      <div className="p-4 bg-green-50 rounded-lg">
                        <div className="flex justify-between mb-2">
                          <span className="font-medium">Target: ${revenueGoal.target_amount.toFixed(2)}</span>
                          <span className="text-sm text-muted-foreground">{revenueGoal.progress_percentage.toFixed(0)}%</span>
                        </div>
                        <Progress value={revenueGoal.progress_percentage} className="h-2 mb-2" />
                        <p className="text-sm text-muted-foreground">
                          ${revenueGoal.current_progress.toFixed(2)} of ${revenueGoal.target_amount.toFixed(2)}
                        </p>
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">No revenue goal set yet.</p>
                    )}
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Enter target amount"
                        value={revenueGoalTarget}
                        onChange={(e) => setRevenueGoalTarget(e.target.value)}
                      />
                      <Button onClick={() => saveGoal('30d_revenue')} disabled={savingGoal}>
                        {savingGoal ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Set Goal'}
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>

        {/* Resources Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="h-5 w-5 text-blue-600" />
              Affiliate Resources
            </CardTitle>
            <p className="text-sm text-muted-foreground">Everything you need to promote Rise By Night</p>
          </CardHeader>
          <CardContent>
            {resourcesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : resources.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-muted-foreground">No resources are available yet. Check back soon for affiliate guides and assets.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {resources.map((resource) => (
                  <div key={resource.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium">{resource.title}</h4>
                      {resource.badge && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">{resource.badge}</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{resource.description}</p>
                    {resource.link_url && (
                      <a 
                        href={resource.link_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        {resource.link_label || 'View'} <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Leaderboard */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Trophy className="h-5 w-5 text-yellow-600" />
              Leaderboard
            </CardTitle>
            <p className="text-sm text-muted-foreground">Top partners by 30-day revenue</p>
          </CardHeader>
          <CardContent>
            {leaderboardLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="text-center py-8">
                <Trophy className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-muted-foreground">No leaderboard data available yet.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Rank</TableHead>
                    <TableHead>Partner</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead className="text-right">30-Day Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboard.map((entry) => (
                    <TableRow key={entry.rank} className={entry.is_current_user ? 'bg-primary/5' : ''}>
                      <TableCell className="font-medium">
                        {entry.rank <= 3 ? (
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                            entry.rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                            entry.rank === 2 ? 'bg-slate-100 text-slate-600' :
                            'bg-amber-100 text-amber-700'
                          }`}>{entry.rank}</span>
                        ) : `#${entry.rank}`}
                      </TableCell>
                      <TableCell className={entry.is_current_user ? 'font-semibold' : ''}>
                        {entry.display_label}
                        {entry.is_current_user && <span className="ml-2 text-xs text-primary">(You)</span>}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const EntryTierIcon = tierConfig[entry.tier]?.Icon || Shield;
                          return (
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${tierConfig[entry.tier]?.bgColor || 'bg-secondary'}`}>
                              <EntryTierIcon className="h-3 w-3" /> {formatTierName(entry.tier)}
                            </span>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${entry.monthly_revenue_generated.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Recent Commissions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <History className="h-5 w-5 text-slate-600" />
              Recent Commissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {commissions.length === 0 ? (
              <div className="text-center py-8">
                <DollarSign className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-muted-foreground">No commissions yet. Share your referral link to start earning!</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissions.slice(0, 10).map((commission) => (
                    <TableRow key={commission.id}>
                      <TableCell>{format(parseISO(commission.created_at), 'MMM d, yyyy')}</TableCell>
                      <TableCell>${(commission.order_amount || 0).toFixed(2)}</TableCell>
                      <TableCell>Level {commission.level}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${
                          commission.fraud_flag 
                            ? 'bg-red-100 text-red-700' 
                            : commission.status === 'paid'
                            ? 'bg-green-100 text-green-700'
                            : commission.status === 'approved'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {commission.fraud_flag ? (
                            <><AlertTriangle className="h-3 w-3" /> Flagged</>
                          ) : (
                            <>{commission.status === 'paid' ? <Check className="h-3 w-3" /> : null} {commission.status}</>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">${commission.amount.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AffiliateDashboard;
