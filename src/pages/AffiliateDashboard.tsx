import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Users, DollarSign, Loader2, Award, Share2, TrendingUp, Check, Sparkles, UserPlus, ShieldCheck, AlertTriangle, Package, Trophy, BarChart3, History, Wallet, Target, BookOpen, FileText, ExternalLink, Image } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from "recharts";
import { format, parseISO } from "date-fns";
import { useAffiliateDashboard } from "@/hooks/useAffiliateDashboard";
import type { AffiliateGoal } from "@/hooks/useAffiliateDashboard";

// Production domain for referral links
const SITE_URL = "https://www.risebynight.com";

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

// Types imported from useAffiliateDashboard hook

const tierConfig: Record<string, { color: string; bgColor: string; borderColor: string; icon: string }> = {
  'bronze': { color: 'text-amber-700', bgColor: 'bg-amber-100', borderColor: 'border-amber-300', icon: '🥉' },
  'silver': { color: 'text-slate-600', bgColor: 'bg-slate-100', borderColor: 'border-slate-300', icon: '🥈' },
  'gold': { color: 'text-yellow-700', bgColor: 'bg-yellow-100', borderColor: 'border-yellow-400', icon: '🥇' },
  'platinum': { color: 'text-slate-700', bgColor: 'bg-gradient-to-r from-slate-100 to-slate-200', borderColor: 'border-slate-400', icon: '💎' },
  'diamond': { color: 'text-cyan-700', bgColor: 'bg-gradient-to-r from-cyan-100 to-blue-100', borderColor: 'border-cyan-400', icon: '👑' },
};

// Updated tier rates: 10%, 15%, 20%, 25%
const allTiers = [
  { name: 'bronze', displayName: 'Bronze', rate: 10, requirement: 'Default' },
  { name: 'silver', displayName: 'Silver', rate: 15, requirement: '10+ sales' },
  { name: 'gold', displayName: 'Gold', rate: 20, requirement: '25+ sales' },
  { name: 'platinum', displayName: 'Platinum', rate: 25, requirement: '50+ sales' },
  { name: 'diamond', displayName: 'Diamond', rate: 25, requirement: 'Invite only' },
];

const AffiliateDashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [commissionGoalTarget, setCommissionGoalTarget] = useState("");
  const [revenueGoalTarget, setRevenueGoalTarget] = useState("");
  const [savingGoal, setSavingGoal] = useState(false);
  const [activeGoalTab, setActiveGoalTab] = useState<"commission" | "revenue">("commission");
  const [joining, setJoining] = useState(false);
  const [copied, setCopied] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteCode = searchParams.get('invite');

  // Use optimized hook for parallel data fetching
  const { 
    data: dashboardData, 
    loading, 
    secondaryLoading,
    fetchDashboardData,
    refetch
  } = useAffiliateDashboard();

  // Destructure dashboard data for compatibility
  const {
    affiliate: affiliateData,
    commissions,
    subAffiliates,
    tierInfo,
    directSalesLast30,
    monthlyStats,
    commissionBreakdown,
    leaderboard,
    analytics,
    payoutHistory,
    goals,
    resources,
  } = dashboardData;

  // Pre-fill goal inputs when goals load
  useEffect(() => {
    const commissionGoal = goals.find((g: AffiliateGoal) => g.goal_type === '30d_commission');
    const revenueGoal = goals.find((g: AffiliateGoal) => g.goal_type === '30d_revenue');
    if (commissionGoal) {
      setCommissionGoalTarget(commissionGoal.target_amount.toString());
    }
    if (revenueGoal) {
      setRevenueGoalTarget(revenueGoal.target_amount.toString());
    }
  }, [goals]);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      if (inviteCode) {
        sessionStorage.setItem('affiliate_invite_code', inviteCode);
      }
      navigate("/auth");
      return;
    }

    setUser(session.user);
    fetchDashboardData();
  };

  // All fetch functions are now handled by useAffiliateDashboard hook

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

      // Refresh all dashboard data
      await refetch();
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

  // Derive goals by type
  const commissionGoal = goals.find(g => g.goal_type === '30d_commission');
  const revenueGoal = goals.find(g => g.goal_type === '30d_revenue');

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

      // Refresh dashboard data to show the new affiliate info
      await refetch();
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
                <p className="text-sm text-primary font-medium">
                  🎉 You've been invited! Join to connect with your referrer.
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
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">L1</span>
                    </div>
                    <span className="font-semibold">Direct Referrals</span>
                  </div>
                  <p className="text-2xl font-bold text-primary">10-25%</p>
                  <p className="text-sm text-muted-foreground">Based on your tier level</p>
                </div>
                <div className="p-4 rounded-lg bg-secondary border">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-muted-foreground/20 flex items-center justify-center">
                      <span className="text-sm font-bold text-muted-foreground">L2</span>
                    </div>
                    <span className="font-semibold">Sub-Affiliates</span>
                  </div>
                  <p className="text-2xl font-bold">5%</p>
                  <p className="text-sm text-muted-foreground">Fixed rate on referrals' sales</p>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Performance Tiers
                </h3>
                <div className="space-y-2">
                  {allTiers.map((tier) => (
                    <div key={tier.name} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{tierConfig[tier.name]?.icon}</span>
                        <span className="font-medium">{tier.displayName}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">{tier.requirement}</span>
                        <span className="font-bold text-primary">{tier.rate}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold mb-3">Program Benefits</h3>
                <ul className="space-y-2">
                  {[
                    'Unique referral link to track all your sales',
                    'Invite other affiliates and earn 5% on their sales',
                    'Real-time dashboard to monitor earnings',
                    'Monthly payouts via PayPal or bank transfer',
                    'No minimum payout threshold'
                  ].map((benefit, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-success shrink-0" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>

              <Button 
                onClick={becomeAffiliate} 
                className="w-full h-12 text-base" 
                size="lg"
                disabled={joining}
              >
                {joining ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Joining...
                  </>
                ) : (
                  "Join Affiliate Program"
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const currentTierConfig = tierConfig[tierInfo.tier] || tierConfig['bronze'];

  return (
    <div className="min-h-screen bg-secondary/30">
      {/* Header */}
      <div className="bg-background border-b">
        <div className="container mx-auto px-4 py-6 md:py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Affiliate Dashboard</h1>
              <p className="text-muted-foreground">Welcome back! Here's your performance overview.</p>
            </div>
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${currentTierConfig.bgColor} ${currentTierConfig.borderColor}`}>
              <span className="text-xl">{currentTierConfig.icon}</span>
              <span className={`font-semibold ${currentTierConfig.color}`}>{formatTierName(tierInfo.tier)} Partner</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 md:py-8 space-y-6">
        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <span className="text-xs font-medium text-muted-foreground bg-secondary px-2 py-1 rounded">All Time</span>
              </div>
              <p className="text-3xl font-bold mb-1">{affiliateData.total_referrals || 0}</p>
              <p className="text-sm text-muted-foreground">Total Referrals</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <span className="text-xs font-medium text-muted-foreground bg-secondary px-2 py-1 rounded">Lifetime</span>
              </div>
              <p className="text-3xl font-bold mb-1">${(affiliateData.total_commissions || 0).toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">Total Earnings</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                  <Award className="h-6 w-6 text-purple-600" />
                </div>
                <span className="text-xs font-medium text-muted-foreground bg-secondary px-2 py-1 rounded">Current Rate</span>
              </div>
              <p className="text-3xl font-bold mb-1">{tierInfo.commissionRate}%</p>
              <p className="text-sm text-muted-foreground">Commission Rate</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                  <UserPlus className="h-6 w-6 text-orange-600" />
                </div>
                <span className="text-xs font-medium text-muted-foreground bg-secondary px-2 py-1 rounded">Team</span>
              </div>
              <p className="text-3xl font-bold mb-1">{subAffiliates.length}</p>
              <p className="text-sm text-muted-foreground">Sub-Affiliates</p>
            </CardContent>
          </Card>
        </div>

        {/* Tier Progress & Commission Breakdown */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Tier Progress Widget */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5 text-yellow-600" />
                Tier Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 p-4 rounded-lg bg-secondary/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">30-Day Performance</span>
                  <span className="text-sm text-muted-foreground">{directSalesLast30} sales</span>
                </div>
                <div className="text-xs text-muted-foreground mb-1">
                  ${monthlyStats.revenue.toFixed(2)} revenue generated
                </div>
              </div>
              
              {tierInfo.nextTier && tierInfo.salesNeeded > 0 ? (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium flex items-center gap-1">
                      {currentTierConfig.icon} {formatTierName(tierInfo.tier)}
                    </span>
                    <span className="font-medium">{tierInfo.nextTier}</span>
                  </div>
                  <Progress value={getProgressToNextTier()} className="h-3" />
                  <p className="text-sm text-muted-foreground text-center">
                    {tierInfo.salesNeeded} more sales to unlock {tierInfo.nextTier}
                  </p>
                </div>
              ) : (
                <div className="text-center py-4">
                  <span className="text-2xl mb-2 block">{currentTierConfig.icon}</span>
                  <p className="font-medium">You've reached {formatTierName(tierInfo.tier)}!</p>
                  <p className="text-sm text-muted-foreground">Maximum tier achieved</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Commission Breakdown Widget */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <DollarSign className="h-5 w-5 text-green-600" />
                Commission Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="text-xs text-muted-foreground mb-1">Direct Sales (L1)</div>
                  <div className="font-bold text-primary">${commissionBreakdown.level1.total.toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">{commissionBreakdown.level1.count} sales</div>
                </div>
                <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
                  <div className="text-xs text-muted-foreground mb-1">Sub-Affiliate (L2)</div>
                  <div className="font-bold text-orange-700">${commissionBreakdown.level2.total.toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">{commissionBreakdown.level2.count} sales</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                  <div className="text-xs text-muted-foreground mb-1">Pending</div>
                  <div className="font-bold text-yellow-700">${commissionBreakdown.pending.total.toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">{commissionBreakdown.pending.count} awaiting</div>
                </div>
                <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                  <div className="text-xs text-muted-foreground mb-1">Paid Out</div>
                  <div className="font-bold text-green-700">${commissionBreakdown.paid.total.toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">{commissionBreakdown.paid.count} payouts</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Analytics Section */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Performance Analytics (Last 30 Days)
            </CardTitle>
            <p className="text-sm text-muted-foreground">Track your daily sales and commissions</p>
          </CardHeader>
          <CardContent>
            {secondaryLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !analytics || analytics.totals.total_30d_sales === 0 ? (
              <div className="text-center py-12">
                <BarChart3 className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-muted-foreground">No analytics data yet. Once you generate sales, your 30-day performance will appear here.</p>
              </div>
            ) : (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                    <div className="text-xs text-muted-foreground mb-1">Sales (30d)</div>
                    <div className="text-2xl font-bold text-blue-700">{analytics.totals.total_30d_sales}</div>
                  </div>
                  <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                    <div className="text-xs text-muted-foreground mb-1">Commissions (30d)</div>
                    <div className="text-2xl font-bold text-green-700">${analytics.totals.total_30d_commissions.toFixed(2)}</div>
                  </div>
                </div>

                {/* Chart */}
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics.daily} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorCommission" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 10 }} 
                        tickFormatter={(value) => format(parseISO(value), 'MMM d')}
                        interval={6}
                        stroke="hsl(var(--muted-foreground))"
                      />
                      <YAxis 
                        tick={{ fontSize: 10 }} 
                        tickFormatter={(value) => `$${value}`}
                        stroke="hsl(var(--muted-foreground))"
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                        formatter={(value: number, name: string) => [
                          name === 'commission_amount' ? `$${value.toFixed(2)}` : value,
                          name === 'commission_amount' ? 'Commission' : 'Sales'
                        ]}
                        labelFormatter={(label) => format(parseISO(label), 'MMM d, yyyy')}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="commission_amount" 
                        stroke="hsl(var(--primary))" 
                        fillOpacity={1}
                        fill="url(#colorCommission)" 
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Payout History Section */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wallet className="h-5 w-5 text-green-600" />
              Payout History
            </CardTitle>
            <p className="text-sm text-muted-foreground">Your processed payouts</p>
          </CardHeader>
          <CardContent>
            {secondaryLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : payoutHistory.length === 0 ? (
              <div className="text-center py-8">
                <History className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-muted-foreground">No payouts processed yet. Once your pending amount reaches the threshold and is paid out, it will appear here.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payoutHistory.map((payout) => (
                    <TableRow key={payout.id}>
                      <TableCell className="text-sm">
                        {format(new Date(payout.processed_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="font-semibold text-green-600">
                        ${payout.amount.toFixed(2)}
                      </TableCell>
                      <TableCell>{payout.currency}</TableCell>
                      <TableCell className="capitalize">{payout.method.replace('_', ' ')}</TableCell>
                      <TableCell className="text-muted-foreground">{payout.note || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Goal Tracking Section */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5 text-purple-600" />
              Your Goals
            </CardTitle>
            <p className="text-sm text-muted-foreground">Set 30-day targets and track your progress</p>
          </CardHeader>
          <CardContent>
            {secondaryLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Tabs value={activeGoalTab} onValueChange={(v) => setActiveGoalTab(v as "commission" | "revenue")}>
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="commission">Commission Goal</TabsTrigger>
                  <TabsTrigger value="revenue">Revenue Goal</TabsTrigger>
                </TabsList>

                {/* Commission Goal Tab */}
                <TabsContent value="commission" className="space-y-4">
                  {commissionGoal ? (
                    <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">30-Day Commission Goal</span>
                        <span className="text-xs text-muted-foreground">
                          {format(parseISO(commissionGoal.period_start), 'MMM d')} - {format(parseISO(commissionGoal.period_end), 'MMM d')}
                        </span>
                      </div>
                      <div className="flex items-end justify-between mb-2">
                        <div>
                          <span className="text-2xl font-bold text-purple-700">${commissionGoal.current_progress.toFixed(2)}</span>
                          <span className="text-sm text-muted-foreground"> / ${commissionGoal.target_amount.toFixed(2)}</span>
                        </div>
                        <span className="text-sm font-medium text-purple-600">{commissionGoal.progress_percentage.toFixed(0)}%</span>
                      </div>
                      <Progress value={commissionGoal.progress_percentage} className="h-3" />
                      {commissionGoal.progress_percentage >= 100 ? (
                        <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                          <Check className="h-4 w-4" />
                          Goal achieved! Great work!
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground mt-2">
                          ${(commissionGoal.target_amount - commissionGoal.current_progress).toFixed(2)} more to reach your goal
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <Target className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                      <p className="text-muted-foreground text-sm">Set your first 30-day commission goal to stay focused.</p>
                    </div>
                  )}
                  
                  <div className="border-t pt-4">
                    <label className="text-sm font-medium mb-2 block">Set Commission Goal (30 days)</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        <Input
                          type="number"
                          placeholder="500"
                          value={commissionGoalTarget}
                          onChange={(e) => setCommissionGoalTarget(e.target.value)}
                          className="pl-7"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <Button onClick={() => saveGoal('30d_commission')} disabled={savingGoal}>
                        {savingGoal ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Goal'}
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                {/* Revenue Goal Tab */}
                <TabsContent value="revenue" className="space-y-4">
                  {revenueGoal ? (
                    <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">30-Day Revenue Goal</span>
                        <span className="text-xs text-muted-foreground">
                          {format(parseISO(revenueGoal.period_start), 'MMM d')} - {format(parseISO(revenueGoal.period_end), 'MMM d')}
                        </span>
                      </div>
                      <div className="flex items-end justify-between mb-2">
                        <div>
                          <span className="text-2xl font-bold text-green-700">${revenueGoal.current_progress.toFixed(2)}</span>
                          <span className="text-sm text-muted-foreground"> / ${revenueGoal.target_amount.toFixed(2)}</span>
                        </div>
                        <span className="text-sm font-medium text-green-600">{revenueGoal.progress_percentage.toFixed(0)}%</span>
                      </div>
                      <Progress value={revenueGoal.progress_percentage} className="h-3" />
                      {revenueGoal.progress_percentage >= 100 ? (
                        <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                          <Check className="h-4 w-4" />
                          Goal achieved! Great work!
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground mt-2">
                          ${(revenueGoal.target_amount - revenueGoal.current_progress).toFixed(2)} more to reach your goal
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <TrendingUp className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                      <p className="text-muted-foreground text-sm">Set your first 30-day revenue goal to track your impact.</p>
                    </div>
                  )}
                  
                  <div className="border-t pt-4">
                    <label className="text-sm font-medium mb-2 block">Set Revenue Goal (30 days)</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        <Input
                          type="number"
                          placeholder="2000"
                          value={revenueGoalTarget}
                          onChange={(e) => setRevenueGoalTarget(e.target.value)}
                          className="pl-7"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <Button onClick={() => saveGoal('30d_revenue')} disabled={savingGoal}>
                        {savingGoal ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Goal'}
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>

        {/* Affiliate Resources Section */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="h-5 w-5 text-blue-600" />
              Affiliate Resources
            </CardTitle>
            <p className="text-sm text-muted-foreground">Everything you need to promote Rise By Night</p>
          </CardHeader>
          <CardContent>
            {secondaryLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : resources.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-muted-foreground">No resources are available yet. Check back soon for affiliate guides and assets.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {(['Getting Started', 'Content Ideas', 'Brand Assets', 'FAQ'] as const).map(category => {
                  const categoryResources = resources.filter(r => r.category === category);
                  if (categoryResources.length === 0) return null;
                  
                  const categoryIcons: Record<string, React.ReactNode> = {
                    'Getting Started': <Sparkles className="h-4 w-4" />,
                    'Content Ideas': <FileText className="h-4 w-4" />,
                    'Brand Assets': <Image className="h-4 w-4" />,
                    'FAQ': <BookOpen className="h-4 w-4" />
                  };
                  
                  return (
                    <div key={category}>
                      <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                        {categoryIcons[category]}
                        {category}
                      </h4>
                      <div className="grid gap-3 md:grid-cols-2">
                        {categoryResources.map(resource => (
                          <div 
                            key={resource.id}
                            className="p-4 rounded-lg border bg-secondary/30 hover:bg-secondary/50 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h5 className="font-medium text-sm">{resource.title}</h5>
                              {resource.badge && (
                                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
                                  {resource.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mb-3">{resource.description}</p>
                            {resource.link_url && resource.link_label && (
                              <a 
                                href={resource.link_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                              >
                                {resource.link_label}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Referral & Invite Links */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Share2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Your Referral Link</h3>
                  <p className="text-sm text-muted-foreground">Share to earn commissions on sales</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${SITE_URL}?ref=${affiliateData.referral_code}`}
                    className="flex-1 px-4 py-3 border rounded-lg bg-secondary/50 text-sm font-mono truncate"
                  />
                  <Button onClick={copyReferralLink} size="lg" className="shrink-0 px-6">
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Code: <span className="font-mono font-semibold">{affiliateData.referral_code}</span>
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm border-orange-200 bg-gradient-to-br from-orange-50/50 to-background">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <UserPlus className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Invite Sub-Affiliates</h3>
                  <p className="text-sm text-muted-foreground">Earn 5% on their sales</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${SITE_URL}/affiliate-dashboard?invite=${affiliateData.referral_code}`}
                    className="flex-1 px-4 py-3 border rounded-lg bg-secondary/50 text-sm font-mono truncate"
                  />
                  <Button onClick={copyInviteLink} size="lg" variant="outline" className="shrink-0 px-6 border-orange-300 hover:bg-orange-50">
                    {inviteCopied ? <Check className="h-4 w-4 text-orange-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Share this link to invite other affiliates and build your team
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Leaderboard Section */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Trophy className="h-5 w-5 text-yellow-600" />
              Leaderboard
            </CardTitle>
            <p className="text-sm text-muted-foreground">Top partners by 30-day revenue</p>
          </CardHeader>
          <CardContent>
            {secondaryLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="text-center py-8">
                <Trophy className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-muted-foreground">No leaderboard data yet. Start sharing your link to climb the ranks.</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Rank</TableHead>
                      <TableHead>Partner</TableHead>
                      <TableHead>30-Day Revenue</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead className="text-right">Total Earned</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaderboard.map((entry) => {
                      const entryTierConfig = tierConfig[entry.tier] || tierConfig.bronze;
                      return (
                        <TableRow 
                          key={entry.rank} 
                          className={entry.is_current_user ? 'bg-primary/5 border-l-2 border-l-primary' : ''}
                        >
                          <TableCell>
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                              entry.rank === 1 
                                ? 'bg-yellow-100 text-yellow-700' 
                                : entry.rank === 2 
                                ? 'bg-slate-100 text-slate-600'
                                : entry.rank === 3
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-secondary text-muted-foreground'
                            }`}>
                              {entry.rank}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={entry.is_current_user ? 'font-semibold text-primary' : ''}>
                              {entry.display_label}
                            </span>
                          </TableCell>
                          <TableCell className="font-medium text-green-600">
                            ${entry.monthly_revenue_generated.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <span className="flex items-center gap-1">
                              <span>{entryTierConfig.icon}</span>
                              <span className={`capitalize ${entryTierConfig.color}`}>{entry.tier}</span>
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            ${entry.total_commissions.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <p className="text-xs text-muted-foreground mt-4 text-center">
                  Leaderboard ranks are based on the last 30 days of revenue and update daily.
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Sub-Affiliates Section */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <UserPlus className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold">Your Team (Sub-Affiliates)</h3>
                <p className="text-sm text-muted-foreground">Affiliates you've invited - earn 5% on their sales</p>
              </div>
            </div>
            
            {subAffiliates.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-secondary mx-auto mb-4 flex items-center justify-center">
                  <UserPlus className="h-8 w-8 text-muted-foreground/40" />
                </div>
                <p className="font-medium text-muted-foreground mb-1">No sub-affiliates yet</p>
                <p className="text-sm text-muted-foreground">Share your invite link above to build your team!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {subAffiliates.map((subAffiliate) => (
                  <div
                    key={subAffiliate.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                        <Users className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="font-medium">{subAffiliate.email}</p>
                        <p className="text-sm text-muted-foreground">
                          {subAffiliate.total_referrals} referrals · ${(subAffiliate.total_commissions || 0).toFixed(2)} earned
                          {subAffiliate.tier && ` · ${tierConfig[subAffiliate.tier]?.icon || ''} ${formatTierName(subAffiliate.tier)}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block text-xs font-medium px-3 py-1 rounded-full ${
                        subAffiliate.status === 'active' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-secondary text-muted-foreground'
                      }`}>
                        {subAffiliate.status.charAt(0).toUpperCase() + subAffiliate.status.slice(1)}
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">
                        Joined {new Date(subAffiliate.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Commission Rates & Tiers */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Commission Structure</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-xs font-bold text-primary">L1</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Direct Sales</span>
                      <p className="text-xs text-muted-foreground">Based on your tier</p>
                    </div>
                  </div>
                  <span className="font-bold text-primary">{tierInfo.commissionRate}%</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-orange-50 border border-orange-200">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-orange-200 flex items-center justify-center">
                      <span className="text-xs font-bold text-orange-700">L2</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Sub-Affiliate Sales</span>
                      <p className="text-xs text-muted-foreground">Fixed rate</p>
                    </div>
                  </div>
                  <span className="font-bold text-orange-700">5%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Performance Tiers</h3>
              <div className="space-y-2">
                {allTiers.map((tier) => (
                  <div 
                    key={tier.name} 
                    className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                      tierInfo.tier === tier.name 
                        ? `${tierConfig[tier.name]?.bgColor} ${tierConfig[tier.name]?.borderColor} border` 
                        : 'bg-secondary/50 hover:bg-secondary'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{tierConfig[tier.name]?.icon}</span>
                      <span className={`text-sm ${tierInfo.tier === tier.name ? 'font-semibold' : ''}`}>{tier.displayName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">{tier.requirement}</span>
                      <span className={`font-bold ${tierInfo.tier === tier.name ? 'text-primary' : ''}`}>{tier.rate}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Commission History */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Commission History</h3>
            {commissions.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-secondary mx-auto mb-4 flex items-center justify-center">
                  <DollarSign className="h-8 w-8 text-muted-foreground/40" />
                </div>
                <p className="font-medium text-muted-foreground mb-1">No commissions yet</p>
                <p className="text-sm text-muted-foreground">Share your referral link to start earning!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {commissions.map((commission) => (
                  <div
                    key={commission.id}
                    className={`flex items-center justify-between p-4 rounded-lg transition-colors ${
                      commission.fraud_flag 
                        ? 'bg-red-50 border border-red-200' 
                        : 'bg-secondary/50 hover:bg-secondary'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        commission.fraud_flag 
                          ? 'bg-red-100'
                          : commission.level === 1 ? 'bg-primary/10' : 'bg-orange-100'
                      }`}>
                        {commission.fraud_flag ? (
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                        ) : (
                          <DollarSign className={`h-5 w-5 ${commission.level === 1 ? 'text-primary' : 'text-orange-600'}`} />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold">${commission.amount.toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground">
                          {commission.level === 1 ? 'Direct sale' : 'Sub-affiliate sale'}
                          {commission.order_amount && ` · $${commission.order_amount.toFixed(2)} order`}
                        </p>
                        {commission.fraud_flag && commission.fraud_reason && (
                          <p className="text-xs text-red-600 mt-1">
                            Flagged: {commission.fraud_reason.replace(/_/g, ' ')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block text-xs font-medium px-3 py-1 rounded-full ${
                        commission.fraud_flag
                          ? 'bg-red-100 text-red-700'
                          : commission.status === 'paid' 
                          ? 'bg-green-100 text-green-700'
                          : commission.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-secondary text-muted-foreground'
                      }`}>
                        {commission.fraud_flag ? 'Flagged' : commission.status.charAt(0).toUpperCase() + commission.status.slice(1)}
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(commission.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AffiliateDashboard;
