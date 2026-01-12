-- =====================================================
-- Seasonal Campaigns Table (P0: Database-driven campaigns)
-- =====================================================

CREATE TABLE public.affiliate_campaigns (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    icon_name TEXT DEFAULT 'Sparkles',
    icon_color TEXT DEFAULT 'text-purple-500',
    bg_color TEXT DEFAULT 'bg-purple-50',
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    bonus_rate NUMERIC(5,2) NOT NULL DEFAULT 5.00,
    is_active BOOLEAN DEFAULT true,
    eligible_tiers TEXT[] DEFAULT ARRAY['bronze', 'silver', 'gold', 'platinum', 'diamond'],
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT valid_date_range CHECK (end_date > start_date),
    CONSTRAINT valid_bonus_rate CHECK (bonus_rate >= 0 AND bonus_rate <= 100)
);

-- Enable RLS
ALTER TABLE public.affiliate_campaigns ENABLE ROW LEVEL SECURITY;

-- Public read for active campaigns (needed for dashboard display)
CREATE POLICY "Anyone can view active campaigns"
ON public.affiliate_campaigns
FOR SELECT
USING (is_active = true);

-- Admin-only write access
CREATE POLICY "Admins can manage campaigns"
ON public.affiliate_campaigns
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Auto-update timestamp trigger
CREATE TRIGGER update_affiliate_campaigns_updated_at
BEFORE UPDATE ON public.affiliate_campaigns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for date-range queries
CREATE INDEX idx_affiliate_campaigns_dates ON public.affiliate_campaigns(start_date, end_date);

-- Seed initial campaign (New Year 2026)
INSERT INTO public.affiliate_campaigns (campaign_key, name, description, icon_name, icon_color, bg_color, start_date, end_date, bonus_rate, eligible_tiers)
VALUES 
('new_year_2026', 'New Year Boost', 'Celebrate the new year with boosted commissions', 'Sparkles', 'text-purple-500', 'bg-purple-50', '2026-01-01T00:00:00Z', '2026-01-31T23:59:59Z', 5.00, ARRAY['bronze', 'silver', 'gold', 'platinum', 'diamond']),
('valentines_2026', 'Valentine''s Special', 'Share the love of better sleep', 'Heart', 'text-rose-500', 'bg-rose-50', '2026-02-01T00:00:00Z', '2026-02-14T23:59:59Z', 10.00, ARRAY['bronze', 'silver', 'gold', 'platinum', 'diamond']),
('spring_sleep', 'Spring Renewal', 'Fresh season, fresh sleep habits', 'Leaf', 'text-green-500', 'bg-green-50', '2026-03-20T00:00:00Z', '2026-04-20T23:59:59Z', 5.00, ARRAY['bronze', 'silver', 'gold', 'platinum', 'diamond']),
('holiday_2026', 'Holiday Season', 'Give the gift of better sleep', 'Gift', 'text-red-500', 'bg-red-50', '2026-11-15T00:00:00Z', '2026-12-31T23:59:59Z', 15.00, ARRAY['bronze', 'silver', 'gold', 'platinum', 'diamond'])
ON CONFLICT (campaign_key) DO NOTHING;

-- =====================================================
-- Add streak tracking to affiliates table
-- =====================================================
ALTER TABLE public.affiliates 
ADD COLUMN IF NOT EXISTS current_streak_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS best_streak_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_sale_date DATE;