-- Create affiliate_payouts table for payout history tracking
CREATE TABLE public.affiliate_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  processed_at timestamptz NOT NULL DEFAULT now(),
  processed_by_user_id uuid,
  method text NOT NULL DEFAULT 'manual_review',
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.affiliate_payouts ENABLE ROW LEVEL SECURITY;

-- Admins can see all payout rows
CREATE POLICY "Admins can view all payouts"
ON public.affiliate_payouts
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can insert payouts
CREATE POLICY "Admins can insert payouts"
ON public.affiliate_payouts
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Affiliates can only see rows where affiliate_id belongs to them
CREATE POLICY "Affiliates can view own payouts"
ON public.affiliate_payouts
FOR SELECT
USING (
  affiliate_id IN (
    SELECT id FROM public.affiliates WHERE user_id = auth.uid()
  )
);

-- No updates allowed (payouts are immutable records)
CREATE POLICY "No payout updates"
ON public.affiliate_payouts
FOR UPDATE
USING (false);

-- No deletes allowed
CREATE POLICY "No payout deletes"
ON public.affiliate_payouts
FOR DELETE
USING (false);

-- Add index for faster affiliate lookups
CREATE INDEX idx_affiliate_payouts_affiliate_id ON public.affiliate_payouts(affiliate_id);
CREATE INDEX idx_affiliate_payouts_processed_at ON public.affiliate_payouts(processed_at DESC);