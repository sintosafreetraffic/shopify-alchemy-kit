-- ============================================================
-- AFFILIATE PROGRAM ENHANCEMENT MIGRATION
-- P0: Commission tracking from Shopify orders
-- P1: Affiliate discount codes
-- ============================================================

-- Add ref_code tracking to enable affiliate attribution in orders
-- This column stores the referral code used at checkout
ALTER TABLE public.commissions 
ADD COLUMN IF NOT EXISTS discount_code TEXT;

-- Create affiliate_discount_codes table for personalized promo codes
-- Each affiliate can have unique codes that map to their referral
CREATE TABLE IF NOT EXISTS public.affiliate_discount_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed_amount')),
  discount_value NUMERIC(10,2) NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT true,
  usage_count INTEGER NOT NULL DEFAULT 0,
  max_uses INTEGER DEFAULT NULL,
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  ends_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookups by code (used during checkout attribution)
CREATE INDEX IF NOT EXISTS idx_affiliate_discount_codes_code 
ON public.affiliate_discount_codes(code) WHERE is_active = true;

-- Index for affiliate lookup
CREATE INDEX IF NOT EXISTS idx_affiliate_discount_codes_affiliate 
ON public.affiliate_discount_codes(affiliate_id);

-- Enable RLS
ALTER TABLE public.affiliate_discount_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for affiliate_discount_codes
-- Affiliates can view their own codes
CREATE POLICY "Affiliates can view their own discount codes"
ON public.affiliate_discount_codes
FOR SELECT
USING (
  affiliate_id IN (
    SELECT id FROM public.affiliates WHERE user_id = auth.uid()
  )
);

-- Admins can manage all discount codes
CREATE POLICY "Admins can manage all discount codes"
ON public.affiliate_discount_codes
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Public can check if code exists (for checkout validation)
CREATE POLICY "Anyone can check active codes"
ON public.affiliate_discount_codes
FOR SELECT
USING (is_active = true);

-- Create trigger for updated_at
CREATE OR REPLACE TRIGGER update_affiliate_discount_codes_updated_at
BEFORE UPDATE ON public.affiliate_discount_codes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index on commissions for faster affiliate lookups
CREATE INDEX IF NOT EXISTS idx_commissions_affiliate_status 
ON public.commissions(affiliate_id, status, fraud_flag);

-- Add affiliate first sale tracking flag
ALTER TABLE public.affiliates
ADD COLUMN IF NOT EXISTS first_sale_at TIMESTAMPTZ DEFAULT NULL;

-- Function to calculate commission rate based on tier
CREATE OR REPLACE FUNCTION get_tier_commission_rate(tier_name TEXT)
RETURNS NUMERIC AS $$
BEGIN
  RETURN CASE tier_name
    WHEN 'diamond' THEN 0.25
    WHEN 'platinum' THEN 0.20
    WHEN 'gold' THEN 0.15
    WHEN 'silver' THEN 0.12
    ELSE 0.10 -- bronze default
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;