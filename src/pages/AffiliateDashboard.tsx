import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Users, DollarSign, TrendingUp, Loader2 } from "lucide-react";
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

const AffiliateDashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [affiliateData, setAffiliateData] = useState<AffiliateData | null>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
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

      const { affiliate, commissions: commissionsData } = response.data;
      setAffiliateData(affiliate);
      setCommissions(commissionsData || []);
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
    
    toast({
      title: "Copied!",
      description: "Referral link copied to clipboard",
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!affiliateData) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Join Our Affiliate Program</CardTitle>
            <CardDescription>
              Earn commissions on every sale you refer
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-muted-foreground">
              Partner with Rise By Night™ and earn generous commissions by sharing our 
              premium sleep products with your audience. Our multi-level program rewards 
              you for building a strong referral network.
            </p>
            
            <div className="space-y-3 bg-muted/50 p-4 rounded-lg">
              <h4 className="font-semibold">Commission Structure:</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary"></span>
                  <span><strong>Level 1:</strong> 10% commission on direct referrals</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary/70"></span>
                  <span><strong>Level 2:</strong> 5% commission on sub-affiliate sales</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3 bg-primary/5 p-4 rounded-lg border border-primary/20">
              <h4 className="font-semibold">Direct Sales Tiers:</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• <strong>Bronze:</strong> 15% (default)</li>
                <li>• <strong>Silver:</strong> 20% (10+ sales in last 30 days)</li>
                <li>• <strong>Gold:</strong> 25% (25+ sales in last 30 days)</li>
                <li>• <strong>Platinum:</strong> 30% (50+ sales in last 30 days)</li>
                <li>• <strong>Diamond:</strong> 35% (invite only)</li>
              </ul>
            </div>

            <div className="space-y-3 bg-muted/30 p-4 rounded-lg">
              <h4 className="font-semibold">Program Benefits:</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Unique referral link to track all your sales</li>
                <li>• Real-time dashboard to monitor earnings</li>
                <li>• Monthly payouts via PayPal or bank transfer</li>
                <li>• No minimum payout threshold</li>
              </ul>
            </div>

            <Button 
              onClick={becomeAffiliate} 
              className="w-full" 
              size="lg"
              disabled={joining}
            >
              {joining ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Joining...
                </>
              ) : (
                "Join Affiliate Program"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-16">
      <h1 className="text-3xl font-bold mb-8">Affiliate Dashboard</h1>

      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{affiliateData.total_referrals || 0}</div>
            <p className="text-xs text-muted-foreground mb-3">People who signed up using your link</p>
            <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
              <p className="font-medium text-foreground mb-1">How it works:</p>
              <p>When someone clicks your referral link and makes a purchase, they become your referral. You earn commission on their order and any future orders they place.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(affiliateData.total_commissions || 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mb-3">Lifetime commission earnings</p>
            <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
              <p className="font-medium text-foreground mb-1">Commission rates:</p>
              <ul className="space-y-1">
                <li>• Level 1: 10% on direct sales</li>
                <li>• Level 2: 5% on sub-affiliate sales</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Affiliate Level</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Level {affiliateData.level || 1}</div>
            <p className="text-xs text-muted-foreground mb-3">Your current tier in the program</p>
            <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
              <p className="font-medium text-foreground mb-1">Direct Sales Tiers:</p>
              <ul className="space-y-1">
                <li>• <strong>Bronze:</strong> 15% (default)</li>
                <li>• <strong>Silver:</strong> 20% (10+ sales/30 days)</li>
                <li>• <strong>Gold:</strong> 25% (25+ sales/30 days)</li>
                <li>• <strong>Platinum:</strong> 30% (50+ sales/30 days)</li>
                <li>• <strong>Diamond:</strong> 35% (invite only)</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Your Referral Link</CardTitle>
          <CardDescription>Share this link to earn commissions on every sale</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              readOnly
              value={`${window.location.origin}?ref=${affiliateData.referral_code}`}
              className="flex-1 px-3 py-2 border rounded-md bg-muted text-sm"
            />
            <Button onClick={copyReferralLink} variant="outline" className="shrink-0">
              <Copy className="h-4 w-4 mr-2" />
              Copy Link
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Your referral code: <span className="font-mono font-semibold">{affiliateData.referral_code}</span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Commission History</CardTitle>
          <CardDescription>Your recent commission earnings</CardDescription>
        </CardHeader>
        <CardContent>
          {commissions.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No commissions yet</p>
              <p className="text-sm text-muted-foreground">Share your referral link to start earning!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {commissions.map((commission) => (
                <div
                  key={commission.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0"
                >
                  <div>
                    <p className="font-medium">${commission.amount.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">
                      Level {commission.level} commission
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm capitalize px-2 py-1 rounded-full ${
                      commission.status === 'paid' 
                        ? 'bg-green-100 text-green-800' 
                        : commission.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {commission.status}
                    </p>
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
  );
};

export default AffiliateDashboard;
