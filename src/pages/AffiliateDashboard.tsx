import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Users, DollarSign, TrendingUp } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface AffiliateData {
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
    await fetchAffiliateData(session.user.id);
  };

  const fetchAffiliateData = async (userId: string) => {
    try {
      // Fetch affiliate data
      const { data: affiliate, error: affiliateError } = await (supabase as any)
        .from("affiliates")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (affiliateError) {
        if (affiliateError.code === "PGRST116") {
          // No affiliate record found
          setLoading(false);
          return;
        }
        throw affiliateError;
      }

      setAffiliateData(affiliate);

      // Fetch commissions
      const { data: commissionsData, error: commissionsError } = await (supabase as any)
        .from("commissions")
        .select("*")
        .eq("affiliate_id", affiliate?.id)
        .order("created_at", { ascending: false });

      if (commissionsError) throw commissionsError;

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
    try {
      const { error } = await (supabase as any)
        .from("affiliates")
        .insert({ user_id: user.id });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "You are now an affiliate",
      });

      await fetchAffiliateData(user.id);
    } catch (error) {
      console.error("Error becoming affiliate:", error);
      toast({
        title: "Error",
        description: "Failed to become affiliate",
        variant: "destructive",
      });
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
      <div className="container mx-auto px-4 py-8">
        <p>Loading...</p>
      </div>
    );
  }

  if (!affiliateData) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Become an Affiliate</CardTitle>
            <CardDescription>
              Join our affiliate program and earn commissions on every sale
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              Earn up to 15% commission on sales from your referrals. Our multi-level
              affiliate program rewards you for building a strong network.
            </p>
            <ul className="list-disc list-inside mb-6 space-y-2">
              <li>Level 1: 15% commission on direct referrals</li>
              <li>Level 2: 7% commission on second-tier referrals</li>
              <li>Level 3: 3% commission on third-tier referrals</li>
            </ul>
            <Button onClick={becomeAffiliate} className="w-full">
              Join Affiliate Program
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Affiliate Dashboard</h1>

      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{affiliateData.total_referrals}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${affiliateData.total_commissions.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Affiliate Level</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Level {affiliateData.level}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Your Referral Link</CardTitle>
          <CardDescription>Share this link to earn commissions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={`${window.location.origin}?ref=${affiliateData.referral_code}`}
              className="flex-1 px-3 py-2 border rounded-md bg-muted"
            />
            <Button onClick={copyReferralLink} variant="outline">
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Commission History</CardTitle>
          <CardDescription>Your recent commission earnings</CardDescription>
        </CardHeader>
        <CardContent>
          {commissions.length === 0 ? (
            <p className="text-muted-foreground">No commissions yet</p>
          ) : (
            <div className="space-y-4">
              {commissions.map((commission) => (
                <div
                  key={commission.id}
                  className="flex items-center justify-between border-b pb-4"
                >
                  <div>
                    <p className="font-medium">${commission.amount.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">
                      Level {commission.level} commission
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm capitalize">{commission.status}</p>
                    <p className="text-xs text-muted-foreground">
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
