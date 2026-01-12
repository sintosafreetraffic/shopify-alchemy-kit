/**
 * RefLandingPage - Personalized Affiliate Landing Page
 * 
 * Route: /ref/:code
 * 
 * Scandinavian-minimal landing page for affiliate referrals.
 * Shows affiliate's name/message (if set), captures attribution,
 * and provides a calm, premium path to purchase.
 * 
 * Design principles:
 * - No hype, no loud visuals
 * - Trust-first messaging
 * - Clean typography
 * - Subtle social proof
 */

import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { captureAttribution } from "@/lib/attribution";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight, Check, Star } from "lucide-react";

interface AffiliateInfo {
  referral_code: string;
  tier: string;
  display_name?: string;
  message?: string;
}

// Default product info
const PRODUCT = {
  handle: "ergonomic-pillow",
  title: "Ergonomic Sleep Pillow",
  tagline: "Wake up without pain. Sleep aligned.",
  price: "$89",
  benefits: [
    "Cervical support for side and back sleepers",
    "Memory foam that adapts to your shape",
    "Breathable, cooling cover",
    "30-night risk-free trial",
  ],
};

export default function RefLandingPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [affiliate, setAffiliate] = useState<AffiliateInfo | null>(null);
  const [error, setError] = useState(false);

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
          .select("referral_code, tier")
          .eq("referral_code", code.toUpperCase())
          .eq("status", "active")
          .maybeSingle();

        if (fetchError || !data) {
          // Invalid code - still allow browsing but note it
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

  return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/30">
        {/* Hero Section */}
        <section className="container mx-auto px-4 pt-16 pb-20 max-w-4xl">
          {/* Referral badge */}
          {affiliate && (
            <div className="flex justify-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/10 text-sm">
                <Star className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">
                  You were referred by a{" "}
                  <span className="font-medium text-foreground capitalize">
                    {affiliate.tier}
                  </span>{" "}
                  partner
                </span>
              </div>
            </div>
          )}

          {/* Invalid code notice - subtle */}
          {error && (
            <div className="flex justify-center mb-8">
              <p className="text-sm text-muted-foreground">
                Welcome to Rise By Night
              </p>
            </div>
          )}

          {/* Main headline */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-light tracking-tight mb-6">
              {PRODUCT.tagline}
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              The {PRODUCT.title} adapts to your body, supporting your spine 
              through every sleep position. No more waking up stiff.
            </p>
          </div>

          {/* Product visual placeholder - would be replaced with actual product image */}
          <div className="relative aspect-[16/9] max-w-2xl mx-auto mb-12 rounded-2xl overflow-hidden bg-gradient-to-br from-secondary to-muted">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-6xl mb-4">🌙</p>
                <p className="text-muted-foreground font-medium">Premium Sleep Pillow</p>
                <p className="text-3xl font-bold mt-2">{PRODUCT.price}</p>
              </div>
            </div>
          </div>

          {/* Benefits list */}
          <div className="max-w-lg mx-auto mb-12">
            <ul className="space-y-3">
              {PRODUCT.benefits.map((benefit, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                  <span className="text-foreground/80">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA */}
          <div className="text-center">
            <Button
              size="lg"
              onClick={handleShopNow}
              className="h-14 px-8 text-lg gap-2"
            >
              Shop Now
              <ArrowRight className="h-5 w-5" />
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
              Free shipping • 30-night trial • Easy returns
            </p>
          </div>
        </section>

        {/* Trust section */}
        <section className="border-t bg-card/50">
          <div className="container mx-auto px-4 py-16 max-w-4xl">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-display font-light mb-2">
                Trusted by thousands of sleepers
              </h2>
              <p className="text-muted-foreground">
                Real people, real results
              </p>
            </div>

            {/* Testimonial snippets */}
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  quote: "Finally wake up without that familiar neck tension.",
                  name: "Sarah M.",
                  role: "Desk Worker",
                },
                {
                  quote: "Switching positions used to wake me. Now I sleep through.",
                  name: "Marcus L.",
                  role: "Side Sleeper",
                },
                {
                  quote: "My posture has improved both day and night.",
                  name: "Lisa T.",
                  role: "Remote Worker",
                },
              ].map((testimonial, i) => (
                <div
                  key={i}
                  className="p-6 rounded-xl bg-card border border-border/50"
                >
                  <p className="text-foreground/80 mb-4">"{testimonial.quote}"</p>
                  <div className="text-sm">
                    <p className="font-medium">{testimonial.name}</p>
                    <p className="text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t py-8">
          <div className="container mx-auto px-4 text-center">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
              Rise By Night™
            </Link>
          </div>
        </footer>
      </div>
  );
}
