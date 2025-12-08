-- =====================================================
-- AFFILIATE SYSTEM UPGRADE: Tiered Commissions & Fraud Protection
-- =====================================================

-- Add new fields to affiliates table
ALTER TABLE public.affiliates 
ADD COLUMN IF NOT EXISTS tier text DEFAULT 'bronze',
ADD COLUMN IF NOT EXISTS tier_expires_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS monthly_sales_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS monthly_revenue_generated numeric DEFAULT 0;

-- Add new fields to commissions table for fraud tracking
ALTER TABLE public.commissions
ADD COLUMN IF NOT EXISTS fraud_flag boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS fraud_reason text,
ADD COLUMN IF NOT EXISTS customer_email text,
ADD COLUMN IF NOT EXISTS customer_ip text,
ADD COLUMN IF NOT EXISTS order_amount numeric;

-- Create index for faster tier calculations
CREATE INDEX IF NOT EXISTS idx_commissions_affiliate_created ON public.commissions(affiliate_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_commissions_fraud_flag ON public.commissions(fraud_flag) WHERE fraud_flag = true;

-- Add constraint for tier values
ALTER TABLE public.affiliates DROP CONSTRAINT IF EXISTS affiliates_tier_check;
ALTER TABLE public.affiliates ADD CONSTRAINT affiliates_tier_check 
CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond'));