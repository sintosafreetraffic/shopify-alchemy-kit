/**
 * RefLandingPage - Personalized Affiliate Landing Page
 * 
 * Route: /ref/:code
 * 
 * Elite-tier landing page for affiliate referrals.
 * Captures attribution, shows affiliate's tier/badge, 
 * and provides a premium, conversion-optimized path to purchase.
 * 
 * Design principles:
 * - Scandinavian calm, premium feel
 * - Trust-first messaging with social proof
 * - Mobile-first responsive design
 * - Clear value proposition
 */

import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { captureAttribution } from "@/lib/attribution";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ArrowRight, Check, Star, Shield, Award, Gem, Crown, Moon, Sparkles, Package, Clock, BadgeCheck } from "lucide-react";
import { useShopifyProducts } from "@/hooks/useShopifyProducts";
import { formatPrice } from "@/lib/formatPrice";
import { getCompareAtFromRatio } from "@/lib/compareAtPriceRatios";
import { getBuyerCountrySync } from "@/lib/buyerContext";
import { getCurrencyForCountry } from "@/lib/countryCode";

interface AffiliateInfo {
  referral_code: string;
  tier: string;
  track: string | null;
  total_referrals: number;
}

// Tier icons and styling
const tierConfig: Record<string, { Icon: React.ElementType; color: string; bgColor: string; label: string }> = {
  bronze: { Icon: Shield, color: "text-amber-700", bgColor: "bg-amber-50", label: "Partner" },
  silver: { Icon: Award, color: "text-slate-600", bgColor: "bg-slate-50", label: "Silver Partner" },
  gold: { Icon: Star, color: "text-yellow-600", bgColor: "bg-yellow-50", label: "Gold Partner" },
  platinum: { Icon: Gem, color: "text-slate-700", bgColor: "bg-slate-100", label: "Platinum Partner" },
  diamond: { Icon: Crown, color: "text-sky-600", bgColor: "bg-sky-50", label: "Diamond Partner" },
};

// Product info (prices are fetched dynamically from Shopify)
const PRODUCT = {
  handle: "ergonomic-pillow",
  title: "Ergonomic Sleep Pillow",
  tagline: "Wake up without pain. Sleep aligned.",
  benefits: [
    { text: "Cervical support for side and back sleepers", icon: Moon },
    { text: "Memory foam that adapts to your shape", icon: Sparkles },
    { text: "Breathable, cooling cover", icon: Package },
    { text: "30-night risk-free trial", icon: Clock },
  ],
};

const testimonials = [
  {
    quote: "Finally wake up without that familiar neck tension. Life-changing.",
    name: "Sarah M.",
    role: "Desk Worker",
    rating: 5,
  },
  {
    quote: "Switching positions used to wake me up. Now I sleep through the night.",
    name: "Marcus L.",
    role: "Side Sleeper",
    rating: 5,
  },
  {
    quote: "My posture has improved both day and night. Worth every penny.",
    name: "Lisa T.",
    role: "Remote Worker",
    rating: 5,
  },
];

export default function RefLandingPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [affiliate, setAffiliate] = useState<AffiliateInfo | null>(null);
  const [error, setError] = useState(false);
  const buyerCountry = getBuyerCountrySync() || 'US';
  const buyerCurrency = getCurrencyForCountry(buyerCountry);

  // Fetch live Shopify product data for localized pricing
  const { data: products } = useShopifyProducts(10);
  const shopifyProduct = products?.find(p => p.node.handle === PRODUCT.handle);
  const variant = shopifyProduct?.node.variants.edges[0]?.node;
  const shopifyCurrency = variant?.price.currencyCode || 'USD';
  const currencyCode = shopifyCurrency === 'USD' ? buyerCurrency : shopifyCurrency;
  const productPrice = variant ? parseFloat(variant.price.amount) : 119.99;
  const compareAtRaw = variant?.compareAtPrice?.amount ? variant.compareAtPrice.amount : getCompareAtFromRatio(PRODUCT.handle, variant?.price.amount);
  const compareAtPrice = compareAtRaw ? parseFloat(compareAtRaw) : null;
  const formattedPrice = formatPrice(productPrice, currencyCode);
  const formattedComparePrice = compareAtPrice ? formatPrice(compareAtPrice, currencyCode) : null;
  const savingsPercent = compareAtPrice ? Math.round((1 - productPrice / compareAtPrice) * 100) : 31;

  useEffect(() => {
    // Capture attribution on mount (stores ref code)
    captureAttribution();

    // Validate affiliate code
    const validateCode = async () => {
      if (!code) {
        setError(true);
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from("affiliates")
          .select("referral_code, tier, track, total_referrals")
          .eq("referral_code", code.toUpperCase())
          .eq("status", "active")
          .maybeSingle();

        if (fetchError || !data) {
          console.log("[Ref] Code not found:", code);
          setError(true);
        } else {
          setAffiliate(data);
        }
      } catch (e) {
        console.error("[Ref] Error validating code:", e);
      } finally {
        setLoading(false);
      }
    };

    validateCode();
  }, [code]);

  // Redirect to product with ref param preserved
  const handleShopNow = () => {
    navigate(`/products/${PRODUCT.handle}?ref=${code}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const tierInfo = affiliate ? tierConfig[affiliate.tier] || tierConfig.bronze : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/20">
      {/* Hero Section */}
      <section className="container mx-auto px-4 pt-12 pb-16 max-w-4xl">
        {/* Referral badge */}
        {affiliate && tierInfo && (
          <div className="flex justify-center mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${tierInfo.bgColor} border border-current/10`}>
              <tierInfo.Icon className={`h-4 w-4 ${tierInfo.color}`} />
              <span className="text-sm font-medium text-foreground/80">
                Referred by a{" "}
                <span className={`font-semibold ${tierInfo.color}`}>
                  {tierInfo.label}
                </span>
              </span>
              {affiliate.total_referrals >= 10 && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <BadgeCheck className="h-3 w-3" />
                  Trusted
                </span>
              )}
            </div>
          </div>
        )}

        {/* Invalid code - subtle welcome */}
        {error && (
          <div className="flex justify-center mb-8">
            <p className="text-sm text-muted-foreground">
              Welcome to Rise By Night
            </p>
          </div>
        )}

        {/* Main headline */}
        <div className="text-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-light tracking-tight mb-6 text-foreground">
            {PRODUCT.tagline}
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            The {PRODUCT.title} adapts to your body, supporting your spine 
            through every sleep position. No more waking up stiff.
          </p>
        </div>

        {/* Product visual with pricing */}
        <div className="relative max-w-xl mx-auto mb-10 animate-in fade-in zoom-in-95 duration-700 delay-200">
          <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-secondary/80 to-muted/60">
            <CardContent className="p-8 text-center">
              <div className="mb-6">
                <Moon className="h-20 w-20 mx-auto text-primary/60" strokeWidth={1} />
              </div>
              <h3 className="text-xl font-medium mb-2">{PRODUCT.title}</h3>
              <div className="flex items-center justify-center gap-3">
                <span className="text-3xl font-bold text-foreground">{formattedPrice}</span>
                {formattedComparePrice && (
                  <span className="text-lg text-muted-foreground line-through">{formattedComparePrice}</span>
                )}
                <span className="text-sm font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded">
                  Save {savingsPercent}%
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Benefits list */}
        <div className="max-w-md mx-auto mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
          <ul className="space-y-3">
            {PRODUCT.benefits.map((benefit, i) => (
              <li key={i} className="flex items-center gap-3 p-3 rounded-lg bg-card/50 border border-border/30">
                <div className="p-1.5 rounded-md bg-green-50">
                  <Check className="h-4 w-4 text-green-600" />
                </div>
                <span className="text-foreground/90 text-sm">{benefit.text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-700 delay-400">
          <Button
            size="lg"
            onClick={handleShopNow}
            className="h-14 px-10 text-lg gap-2 shadow-lg hover:shadow-xl transition-shadow"
          >
            Shop Now
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div className="flex items-center justify-center gap-4 mt-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Package className="h-4 w-4" /> Free shipping
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" /> 30-night trial
            </span>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="border-t bg-card/30">
        <div className="container mx-auto px-4 py-16 max-w-4xl">
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-1 mb-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="h-5 w-5 fill-[hsl(var(--star))] text-[hsl(var(--star))]" />
              ))}
            </div>
            <h2 className="text-2xl font-display font-light mb-2">
              Loved by thousands
            </h2>
            <p className="text-muted-foreground">
              Real people, real results
            </p>
          </div>

          {/* Testimonial grid */}
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, i) => (
              <Card key={i} className="border-border/50 hover:border-border/80 transition-colors">
                <CardContent className="p-6">
                  <div className="flex gap-0.5 mb-3">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star 
                        key={s} 
                        className={`h-4 w-4 ${s <= testimonial.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted'}`} 
                      />
                    ))}
                  </div>
                  <p className="text-foreground/90 mb-4 text-sm leading-relaxed">
                    "{testimonial.quote}"
                  </p>
                  <div className="text-sm">
                    <p className="font-medium">{testimonial.name}</p>
                    <p className="text-muted-foreground text-xs">{testimonial.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Trust signals footer */}
      <section className="border-t py-12 bg-muted/30">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <span>Secure checkout</span>
            </div>
            <div className="flex items-center gap-2">
              <BadgeCheck className="h-5 w-5" />
              <span>Quality guaranteed</span>
            </div>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              <span>Easy returns</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Rise By Night™
          </Link>
        </div>
      </footer>
    </div>
  );
}
