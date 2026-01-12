/**
 * AmbassadorProfilePage
 * 
 * Public-facing profile page for top-tier affiliates/ambassadors.
 * Features:
 * - Ambassador bio and social proof
 * - Their unique discount code (if any)
 * - Direct link to shop with attribution
 * - Trust signals and verification badges
 * 
 * Route: /ambassador/:code
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  Award, 
  Star, 
  Gem, 
  Crown, 
  CheckCircle, 
  ExternalLink, 
  Copy, 
  Check,
  Loader2,
  Moon,
  Sparkles,
  ArrowRight
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

// Production domain
const SITE_URL = "https://www.risebynight.com";
const SHOP_URL = "https://www.risebynight.com/products/rise-by-night";

interface AmbassadorData {
  referral_code: string;
  tier: string;
  status: string;
  total_referrals: number;
  discount_code?: string;
  discount_value?: number;
}

const tierConfig: Record<string, { 
  color: string; 
  bgColor: string; 
  borderColor: string;
  Icon: React.ElementType; 
  label: string;
  description: string;
}> = {
  'bronze': { 
    color: 'text-amber-700', 
    bgColor: 'bg-amber-50', 
    borderColor: 'border-amber-200',
    Icon: Shield, 
    label: 'Partner',
    description: 'Official RBN Partner'
  },
  'silver': { 
    color: 'text-slate-600', 
    bgColor: 'bg-slate-50', 
    borderColor: 'border-slate-200',
    Icon: Award, 
    label: 'Silver Partner',
    description: 'Verified RBN Partner'
  },
  'gold': { 
    color: 'text-yellow-700', 
    bgColor: 'bg-yellow-50', 
    borderColor: 'border-yellow-200',
    Icon: Star, 
    label: 'Gold Partner',
    description: 'Top Performing Partner'
  },
  'platinum': { 
    color: 'text-slate-700', 
    bgColor: 'bg-slate-100', 
    borderColor: 'border-slate-300',
    Icon: Gem, 
    label: 'Platinum Ambassador',
    description: 'Elite RBN Ambassador'
  },
  'diamond': { 
    color: 'text-sky-700', 
    bgColor: 'bg-sky-50', 
    borderColor: 'border-sky-200',
    Icon: Crown, 
    label: 'Diamond Ambassador',
    description: 'Exclusive RBN Ambassador'
  },
};

export default function AmbassadorProfilePage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [ambassador, setAmbassador] = useState<AmbassadorData | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAmbassador() {
      if (!code) {
        setError("No ambassador code provided");
        setLoading(false);
        return;
      }

      try {
        // Fetch affiliate by referral code
        const { data: affiliate, error: affError } = await supabase
          .from('affiliates')
          .select('referral_code, tier, status, total_referrals')
          .eq('referral_code', code.toLowerCase())
          .eq('status', 'active')
          .maybeSingle();

        if (affError) throw affError;

        if (!affiliate) {
          setError("Ambassador not found");
          setLoading(false);
          return;
        }

        // Only show profiles for gold+ tier affiliates
        const eligibleTiers = ['gold', 'platinum', 'diamond'];
        if (!eligibleTiers.includes(affiliate.tier || 'bronze')) {
          setError("Ambassador profile not available");
          setLoading(false);
          return;
        }

        // Check for active discount code
        const { data: discountCode } = await supabase
          .from('affiliate_discount_codes')
          .select('code, discount_value, is_active')
          .eq('affiliate_id', affiliate.referral_code)
          .eq('is_active', true)
          .maybeSingle();

        setAmbassador({
          ...affiliate,
          discount_code: discountCode?.code,
          discount_value: discountCode?.discount_value,
        });

        // Store attribution
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('rbn_ref_code', affiliate.referral_code);
          sessionStorage.setItem('rbn_ref_source', 'ambassador_profile');
        }

        setLoading(false);
      } catch (err) {
        console.error('[AmbassadorProfile] Error:', err);
        setError("Failed to load ambassador profile");
        setLoading(false);
      }
    }

    fetchAmbassador();
  }, [code]);

  const handleCopyCode = async () => {
    if (!ambassador?.discount_code) return;
    
    try {
      await navigator.clipboard.writeText(ambassador.discount_code);
      setCopied(true);
      toast({
        title: "Code copied!",
        description: `Use ${ambassador.discount_code} at checkout.`,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please copy the code manually.",
        variant: "destructive",
      });
    }
  };

  const handleShopNow = () => {
    const url = new URL(SHOP_URL);
    url.searchParams.set('ref', code || '');
    if (ambassador?.discount_code) {
      url.searchParams.set('discount', ambassador.discount_code);
    }
    window.open(url.toString(), '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !ambassador) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-6 text-center">
            <Moon className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h1 className="text-xl font-semibold mb-2">Profile Not Available</h1>
            <p className="text-muted-foreground mb-6">
              {error || "This ambassador profile is not publicly available."}
            </p>
            <Button onClick={() => navigate('/')} variant="outline">
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tier = ambassador.tier || 'bronze';
  const tierData = tierConfig[tier] || tierConfig.bronze;
  const TierIcon = tierData.Icon;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Moon className="h-6 w-6 text-primary" />
            <span className="font-semibold">Rise By Night</span>
          </div>
          <Badge variant="secondary" className={`${tierData.bgColor} ${tierData.color} border ${tierData.borderColor}`}>
            <TierIcon className="h-3 w-3 mr-1" />
            {tierData.label}
          </Badge>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto text-center">
          {/* Ambassador Badge */}
          <div className="mb-8">
            <div className={`w-24 h-24 rounded-full ${tierData.bgColor} border-2 ${tierData.borderColor} flex items-center justify-center mx-auto mb-4 shadow-lg`}>
              <TierIcon className={`h-12 w-12 ${tierData.color}`} />
            </div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium text-green-600">Verified Ambassador</span>
            </div>
            <h1 className="text-3xl font-bold mb-2">{tierData.description}</h1>
            <p className="text-muted-foreground">
              Shop through this ambassador's link for exclusive benefits
            </p>
          </div>

          {/* Discount Code Card */}
          {ambassador.discount_code && (
            <Card className="mb-8 border-2 border-primary/20 bg-primary/5">
              <CardContent className="py-6">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium text-primary">
                    Exclusive {ambassador.discount_value}% Off
                  </span>
                </div>
                <div className="flex items-center justify-center gap-3">
                  <code className="text-2xl font-mono font-bold tracking-wider">
                    {ambassador.discount_code}
                  </code>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleCopyCode}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-3">
                  Use this code at checkout
                </p>
              </CardContent>
            </Card>
          )}

          {/* Shop Button */}
          <Button 
            onClick={handleShopNow}
            size="lg"
            className="w-full sm:w-auto px-8 py-6 text-lg gap-2 shadow-lg"
          >
            Shop Rise By Night
            <ArrowRight className="h-5 w-5" />
          </Button>

          {/* Trust Signals */}
          <div className="mt-12 grid grid-cols-3 gap-4">
            <div className="text-center p-4">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <p className="text-sm font-medium">Verified Partner</p>
              <p className="text-xs text-muted-foreground">Official RBN program</p>
            </div>
            <div className="text-center p-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-2">
                <Shield className="h-5 w-5 text-blue-600" />
              </div>
              <p className="text-sm font-medium">Secure Shopping</p>
              <p className="text-xs text-muted-foreground">SSL protected</p>
            </div>
            <div className="text-center p-4">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-2">
                <Star className="h-5 w-5 text-purple-600" />
              </div>
              <p className="text-sm font-medium">30-Day Trial</p>
              <p className="text-xs text-muted-foreground">Risk-free purchase</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 mt-16 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Rise By Night. All rights reserved.</p>
          <p className="mt-2">
            <a href={SITE_URL} className="hover:underline">risebynight.com</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
