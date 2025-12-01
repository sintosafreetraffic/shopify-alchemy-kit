import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Copy, Users, DollarSign, Loader2, Award, Share2, TrendingUp, Check, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface AffiliateData {
  id: string;
  referral_code: string;
  total_referrals: number;
  total_commissions: number;
  level: number;
  status: string;
}

interface Commission {
  id: string;
  amount: number;
  level: number;
  status: string;
  created_at: string;
}

interface TierInfo {
  tier: string;
  commissionRate: number;
  nextTier: string | null;
  salesNeeded: number;
}

const tierConfig: Record<string, { color: string; bgColor: string; borderColor: string; icon: string }> = {
  'Bronze': { color: 'text-amber-700', bgColor: 'bg-amber-100', borderColor: 'border-amber-300', icon: '🥉' },
  'Silver': { color: 'text-slate-600', bgColor: 'bg-slate-100', borderColor: 'border-slate-300', icon: '🥈' },
  'Gold': { color: 'text-yellow-700', bgColor: 'bg-yellow-100', borderColor: 'border-yellow-400', icon: '🥇' },
  'Platinum': { color: 'text-slate-700', bgColor: 'bg-gradient-to-r from-slate-100 to-slate-200', borderColor: 'border-slate-400', icon: '💎' },
  'Diamond': { color: 'text-cyan-700', bgColor: 'bg-gradient-to-r from-cyan-100 to-blue-100', borderColor: 'border-cyan-400', icon: '👑' },
};

const allTiers = [
  { name: 'Bronze', rate: 15, requirement: 'Default' },
  { name: 'Silver', rate: 20, requirement: '10+ sales' },
  { name: 'Gold', rate: 25, requirement: '25+ sales' },
  { name: 'Platinum', rate: 30, requirement: '50+ sales' },
  { name: 'Diamond', rate: 35, requirement: 'Invite only' },
];

const AffiliateDashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [affiliateData, setAffiliateData] = useState<AffiliateData | null>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [tierInfo, setTierInfo] = useState<TierInfo>({ tier: 'Bronze', commissionRate: 15, nextTier: 'Silver', salesNeeded: 10 });
  const [directSalesLast30, setDirectSalesLast30] = useState(0);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    setUser(session.user);
    await fetchAffiliateData();
  };

  const fetchAffiliateData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await supabase.functions.invoke('affiliate-api', {
        body: { action: 'get-affiliate', data: {} }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const { affiliate, commissions: commissionsData, tierInfo: tierData, directSalesLast30Days } = response.data;
      setAffiliateData(affiliate);
      setCommissions(commissionsData || []);
      if (tierData) {
        setTierInfo(tierData);
      }
      setDirectSalesLast30(directSalesLast30Days || 0);
    } catch (error) {
      console.error("Error fetching affiliate data:", error);
      toast({
        title: "Error",
        description: "Failed to load affiliate data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const becomeAffiliate = async () => {
    setJoining(true);
    try {
      const response = await supabase.functions.invoke('affiliate-api', {
        body: { action: 'become-affiliate', data: {} }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      toast({
        title: "Success!",
        description: "You are now an affiliate. Welcome to the program!",
      });

      setAffiliateData(response.data.affiliate);
      if (response.data.tierInfo) {
        setTierInfo(response.data.tierInfo);
      }
      setDirectSalesLast30(response.data.directSalesLast30Days || 0);
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
    
    const referralLink = `${window.location.origin}?ref=${affiliateData.referral_code}`;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    
    toast({
      title: "Copied!",
      description: "Referral link copied to clipboard",
    });

    setTimeout(() => setCopied(false), 2000);
  };

  const getProgressToNextTier = () => {
    if (tierInfo.tier === 'Diamond' || tierInfo.tier === 'Platinum') return 100;
    const thresholds: Record<string, number> = {
      'Bronze': 10,
      'Silver': 25,
      'Gold': 50,
    };
    const currentThreshold = thresholds[tierInfo.tier] || 10;
    const prevThreshold = tierInfo.tier === 'Bronze' ? 0 : tierInfo.tier === 'Silver' ? 10 : 25;
    const progress = ((directSalesLast30 - prevThreshold) / (currentThreshold - prevThreshold)) * 100;
    return Math.min(Math.max(progress, 0), 100);
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
          {/* Hero Section */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-3">Affiliate Program</h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Partner with Rise By Night™ and earn generous commissions by sharing our premium sleep products.
            </p>
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
                  <p className="text-2xl font-bold text-primary">10%</p>
                  <p className="text-sm text-muted-foreground">Commission on direct sales</p>
                </div>
                <div className="p-4 rounded-lg bg-secondary border">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-muted-foreground/20 flex items-center justify-center">
                      <span className="text-sm font-bold text-muted-foreground">L2</span>
                    </div>
                    <span className="font-semibold">Sub-Affiliates</span>
                  </div>
                  <p className="text-2xl font-bold">5%</p>
                  <p className="text-sm text-muted-foreground">From your referrals' sales</p>
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
                        <span className="font-medium">{tier.name}</span>
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

  const currentTierConfig = tierConfig[tierInfo.tier] || tierConfig['Bronze'];

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
              <span className={`font-semibold ${currentTierConfig.color}`}>{tierInfo.tier} Partner</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 md:py-8 space-y-6">
        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Total Referrals */}
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

          {/* Total Earnings */}
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

          {/* Current Commission Rate */}
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
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Referral Link Card */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Share2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Your Referral Link</h3>
                  <p className="text-sm text-muted-foreground">Share to earn commissions</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}?ref=${affiliateData.referral_code}`}
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

          {/* Tier Progress Card */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Tier Progress</h3>
                  <p className="text-sm text-muted-foreground">{directSalesLast30} sales in last 30 days</p>
                </div>
              </div>
              
              {tierInfo.nextTier && tierInfo.salesNeeded > 0 ? (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{tierInfo.tier}</span>
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
                  <p className="font-medium">You've reached {tierInfo.tier}!</p>
                  <p className="text-sm text-muted-foreground">Maximum tier achieved</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Commission Rates & Tiers */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Commission Rates */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Commission Structure</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-xs font-bold text-primary">L1</span>
                    </div>
                    <span className="text-sm">Direct Sales</span>
                  </div>
                  <span className="font-bold text-primary">10%</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted-foreground/20 flex items-center justify-center">
                      <span className="text-xs font-bold text-muted-foreground">L2</span>
                    </div>
                    <span className="text-sm">Sub-Affiliate Sales</span>
                  </div>
                  <span className="font-bold">5%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* All Tiers */}
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
                      <span className={`text-sm ${tierInfo.tier === tier.name ? 'font-semibold' : ''}`}>{tier.name}</span>
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
                    className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        commission.level === 1 ? 'bg-primary/10' : 'bg-secondary'
                      }`}>
                        <DollarSign className={`h-5 w-5 ${commission.level === 1 ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <p className="font-semibold">${commission.amount.toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground">
                          {commission.level === 1 ? 'Direct sale' : 'Sub-affiliate sale'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block text-xs font-medium px-3 py-1 rounded-full ${
                        commission.status === 'paid' 
                          ? 'bg-green-100 text-green-700' 
                          : commission.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-secondary text-muted-foreground'
                      }`}>
                        {commission.status.charAt(0).toUpperCase() + commission.status.slice(1)}
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
