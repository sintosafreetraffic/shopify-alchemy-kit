/**
 * CreatorStorefrontPage
 * 
 * Public-facing customizable storefront for Gold+ affiliates.
 * Features:
 * - Custom branding and colors
 * - Personal testimonial
 * - Discount code display
 * - Attribution-tracked shop link
 * 
 * Route: /creator/:slug
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Moon,
  CheckCircle, 
  Copy, 
  Check,
  Loader2,
  Sparkles,
  ArrowRight,
  Quote,
  Star,
  Shield,
  Crown,
  Gem,
  Award
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

// Production domain
const SHOP_URL = "https://www.risebynight.com/products/rise-by-night";

interface StorefrontData {
  id: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  theme_color: string;
  accent_color: string;
  testimonial: string | null;
  affiliate: {
    referral_code: string;
    tier: string;
    discount_code?: string;
    discount_value?: number;
  };
}

const tierIcons: Record<string, React.ElementType> = {
  'gold': Star,
  'platinum': Gem,
  'diamond': Crown,
};

const tierLabels: Record<string, string> = {
  'gold': 'Gold Partner',
  'platinum': 'Platinum Ambassador',
  'diamond': 'Diamond Ambassador',
};

export default function CreatorStorefrontPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [storefront, setStorefront] = useState<StorefrontData | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStorefront() {
      if (!slug) {
        setError("Invalid creator page");
        setLoading(false);
        return;
      }

      try {
        // Try to find by custom_slug first, then by referral_code
        let storefrontData: any = null;
        let affiliateData: any = null;

        // Check custom slug
        const { data: bySlug } = await supabase
          .from('affiliate_storefronts')
          .select('*')
          .eq('custom_slug', slug.toLowerCase())
          .eq('is_published', true)
          .maybeSingle();

        if (bySlug) {
          storefrontData = bySlug;
          // Get affiliate info
          const { data: aff } = await supabase
            .from('affiliates')
            .select('referral_code, tier')
            .eq('id', bySlug.affiliate_id)
            .single();
          affiliateData = aff;
        } else {
          // Try by referral code
          const { data: aff } = await supabase
            .from('affiliates')
            .select('id, referral_code, tier')
            .eq('referral_code', slug.toLowerCase())
            .eq('status', 'active')
            .maybeSingle();

          if (aff) {
            affiliateData = aff;
            const { data: sf } = await supabase
              .from('affiliate_storefronts')
              .select('*')
              .eq('affiliate_id', aff.id)
              .eq('is_published', true)
              .maybeSingle();
            storefrontData = sf;
          }
        }

        if (!storefrontData || !affiliateData) {
          setError("Creator page not found");
          setLoading(false);
          return;
        }

        // Check tier eligibility
        const eligibleTiers = ['gold', 'platinum', 'diamond'];
        if (!eligibleTiers.includes(affiliateData.tier || 'bronze')) {
          setError("Creator page not available");
          setLoading(false);
          return;
        }

        // Get discount code if any
        const { data: discountCode } = await supabase
          .from('affiliate_discount_codes')
          .select('code, discount_value')
          .eq('affiliate_id', storefrontData.affiliate_id)
          .eq('is_active', true)
          .maybeSingle();

        setStorefront({
          id: storefrontData.id,
          display_name: storefrontData.display_name,
          bio: storefrontData.bio,
          avatar_url: storefrontData.avatar_url,
          banner_url: storefrontData.banner_url,
          theme_color: storefrontData.theme_color || '#1a1a2e',
          accent_color: storefrontData.accent_color || '#0ea5e9',
          testimonial: storefrontData.testimonial,
          affiliate: {
            referral_code: affiliateData.referral_code,
            tier: affiliateData.tier,
            discount_code: discountCode?.code,
            discount_value: discountCode?.discount_value,
          },
        });

        // Track view
        await supabase
          .from('affiliate_storefronts')
          .update({ view_count: (storefrontData.view_count || 0) + 1 })
          .eq('id', storefrontData.id);

        // Store attribution
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('rbn_ref_code', affiliateData.referral_code);
          sessionStorage.setItem('rbn_ref_source', 'creator_storefront');
        }

        setLoading(false);
      } catch (err) {
        console.error('[CreatorStorefront] Error:', err);
        setError("Failed to load creator page");
        setLoading(false);
      }
    }

    fetchStorefront();
  }, [slug]);

  const handleCopyCode = async () => {
    if (!storefront?.affiliate.discount_code) return;
    
    try {
      await navigator.clipboard.writeText(storefront.affiliate.discount_code);
      setCopied(true);
      toast({
        title: "Code copied!",
        description: `Use ${storefront.affiliate.discount_code} at checkout.`,
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

  const handleShopNow = async () => {
    if (storefront) {
      // Track click
      await supabase
        .from('affiliate_storefronts')
        .update({ click_count: (storefront as any).click_count + 1 || 1 })
        .eq('id', storefront.id);
    }

    const url = new URL(SHOP_URL);
    url.searchParams.set('ref', storefront?.affiliate.referral_code || '');
    if (storefront?.affiliate.discount_code) {
      url.searchParams.set('discount', storefront.affiliate.discount_code);
    }
    window.open(url.toString(), '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !storefront) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-6 text-center">
            <Moon className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h1 className="text-xl font-semibold mb-2">Page Not Found</h1>
            <p className="text-muted-foreground mb-6">
              {error || "This creator page is not available."}
            </p>
            <Button onClick={() => navigate('/')} variant="outline">
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const TierIcon = tierIcons[storefront.affiliate.tier] || Award;
  const tierLabel = tierLabels[storefront.affiliate.tier] || 'Partner';

  return (
    <div 
      className="min-h-screen"
      style={{ 
        background: `linear-gradient(135deg, ${storefront.theme_color} 0%, ${storefront.theme_color}ee 100%)` 
      }}
    >
      {/* Banner */}
      {storefront.banner_url && (
        <div 
          className="h-48 bg-cover bg-center"
          style={{ backgroundImage: `url(${storefront.banner_url})` }}
        />
      )}

      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-sm sticky top-0 z-10 bg-black/20">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <Moon className="h-6 w-6" />
            <span className="font-semibold">Rise By Night</span>
          </div>
          <Badge 
            className="border-0"
            style={{ 
              backgroundColor: `${storefront.accent_color}20`,
              color: storefront.accent_color 
            }}
          >
            <TierIcon className="h-3 w-3 mr-1" />
            {tierLabel}
          </Badge>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto text-center">
          {/* Avatar & Name */}
          <div className="mb-8">
            {storefront.avatar_url ? (
              <img 
                src={storefront.avatar_url} 
                alt={storefront.display_name || 'Creator'}
                className="w-24 h-24 rounded-full mx-auto mb-4 border-4 object-cover"
                style={{ borderColor: storefront.accent_color }}
              />
            ) : (
              <div 
                className="w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ backgroundColor: `${storefront.accent_color}20` }}
              >
                <TierIcon className="h-10 w-10" style={{ color: storefront.accent_color }} />
              </div>
            )}
            
            <div className="flex items-center justify-center gap-2 mb-3">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <span className="text-sm text-green-400 font-medium">Verified Ambassador</span>
            </div>
            
            <h1 className="text-3xl font-bold text-white mb-2">
              {storefront.display_name || tierLabel}
            </h1>
            
            {storefront.bio && (
              <p className="text-white/70 max-w-md mx-auto">
                {storefront.bio}
              </p>
            )}
          </div>

          {/* Testimonial */}
          {storefront.testimonial && (
            <Card className="mb-8 bg-white/5 border-white/10 backdrop-blur-sm">
              <CardContent className="py-6">
                <Quote className="h-8 w-8 text-white/20 mx-auto mb-3" />
                <p className="text-white/90 italic text-lg leading-relaxed">
                  "{storefront.testimonial}"
                </p>
              </CardContent>
            </Card>
          )}

          {/* Discount Code */}
          {storefront.affiliate.discount_code && (
            <Card 
              className="mb-8 border-2"
              style={{ 
                backgroundColor: `${storefront.accent_color}10`,
                borderColor: `${storefront.accent_color}40`
              }}
            >
              <CardContent className="py-6">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Sparkles className="h-5 w-5" style={{ color: storefront.accent_color }} />
                  <span className="text-sm font-medium" style={{ color: storefront.accent_color }}>
                    Exclusive {storefront.affiliate.discount_value}% Off
                  </span>
                </div>
                <div className="flex items-center justify-center gap-3">
                  <code className="text-2xl font-mono font-bold text-white tracking-wider">
                    {storefront.affiliate.discount_code}
                  </code>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleCopyCode}
                    className="shrink-0 bg-white/10 border-white/20 text-white hover:bg-white/20"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-sm text-white/60 mt-3">
                  Use this code at checkout
                </p>
              </CardContent>
            </Card>
          )}

          {/* Shop Button */}
          <Button 
            onClick={handleShopNow}
            size="lg"
            className="w-full sm:w-auto px-10 py-6 text-lg gap-2 font-semibold shadow-lg"
            style={{ 
              backgroundColor: storefront.accent_color,
              color: 'white'
            }}
          >
            Shop Rise By Night
            <ArrowRight className="h-5 w-5" />
          </Button>

          {/* Trust Signals */}
          <div className="mt-12 grid grid-cols-3 gap-4">
            {[
              { icon: CheckCircle, label: 'Verified Partner', sub: 'Official RBN program' },
              { icon: Shield, label: 'Secure Shopping', sub: 'SSL protected' },
              { icon: Star, label: '30-Day Trial', sub: 'Risk-free purchase' },
            ].map((item, i) => (
              <div key={i} className="text-center p-4">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2"
                  style={{ backgroundColor: `${storefront.accent_color}20` }}
                >
                  <item.icon className="h-5 w-5" style={{ color: storefront.accent_color }} />
                </div>
                <p className="text-sm font-medium text-white">{item.label}</p>
                <p className="text-xs text-white/50">{item.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-16 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-white/50">
          <p>© {new Date().getFullYear()} Rise By Night. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
