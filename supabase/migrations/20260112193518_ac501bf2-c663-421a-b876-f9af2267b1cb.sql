-- ============================================================
-- P3: A/B Testing Infrastructure for Affiliate Campaigns
-- ============================================================

-- Add variant tracking to affiliate_campaigns
ALTER TABLE public.affiliate_campaigns 
ADD COLUMN IF NOT EXISTS ab_test_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ab_variants JSONB DEFAULT '[]'::jsonb;

-- Create campaign variant assignments table
CREATE TABLE IF NOT EXISTS public.affiliate_campaign_variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.affiliate_campaigns(id) ON DELETE CASCADE,
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  variant_key TEXT NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  converted BOOLEAN DEFAULT false,
  converted_at TIMESTAMP WITH TIME ZONE,
  conversion_value NUMERIC(10,2),
  UNIQUE(campaign_id, affiliate_id)
);

-- Enable RLS
ALTER TABLE public.affiliate_campaign_variants ENABLE ROW LEVEL SECURITY;

-- RLS: Affiliates can view their own variant assignments
CREATE POLICY "Affiliates can view own variant assignments"
ON public.affiliate_campaign_variants
FOR SELECT
USING (
  affiliate_id IN (
    SELECT id FROM public.affiliates WHERE user_id = auth.uid()
  )
);

-- RLS: Service role can manage all (for edge functions)
CREATE POLICY "Service role can manage variants"
ON public.affiliate_campaign_variants
FOR ALL
USING (true)
WITH CHECK (true);

-- ============================================================
-- P3: Creator Storefront Customization
-- ============================================================

-- Create storefront profiles table for ambassador customization
CREATE TABLE IF NOT EXISTS public.affiliate_storefronts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE UNIQUE,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  banner_url TEXT,
  theme_color TEXT DEFAULT '#1a1a2e',
  accent_color TEXT DEFAULT '#0ea5e9',
  social_links JSONB DEFAULT '[]'::jsonb,
  featured_products TEXT[] DEFAULT '{}',
  testimonial TEXT,
  is_published BOOLEAN DEFAULT false,
  custom_slug TEXT UNIQUE,
  view_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.affiliate_storefronts ENABLE ROW LEVEL SECURITY;

-- RLS: Published storefronts are publicly readable
CREATE POLICY "Published storefronts are public"
ON public.affiliate_storefronts
FOR SELECT
USING (is_published = true);

-- RLS: Affiliates can manage their own storefront
CREATE POLICY "Affiliates can manage own storefront"
ON public.affiliate_storefronts
FOR ALL
USING (
  affiliate_id IN (
    SELECT id FROM public.affiliates WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  affiliate_id IN (
    SELECT id FROM public.affiliates WHERE user_id = auth.uid()
  )
);

-- Create index for custom slug lookups
CREATE INDEX IF NOT EXISTS idx_storefront_slug ON public.affiliate_storefronts(custom_slug) WHERE custom_slug IS NOT NULL;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_storefront_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_affiliate_storefronts_updated_at
BEFORE UPDATE ON public.affiliate_storefronts
FOR EACH ROW
EXECUTE FUNCTION public.update_storefront_updated_at();

-- ============================================================
-- Enable realtime for new tables
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.affiliate_campaign_variants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.affiliate_storefronts;