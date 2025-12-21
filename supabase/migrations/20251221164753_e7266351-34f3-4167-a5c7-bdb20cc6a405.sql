-- FIX 3: commissions - hide PII from affiliates
-- First drop the existing function
DROP FUNCTION IF EXISTS public.get_affiliate_commissions_safe(uuid);

-- Drop the current affiliate policy that exposes PII
DROP POLICY IF EXISTS "Affiliates can view own commissions via function" ON public.commissions;

-- Create a view that excludes PII for affiliates
CREATE OR REPLACE VIEW public.affiliate_commissions_safe AS
SELECT 
  id,
  affiliate_id,
  referral_id,
  amount,
  level,
  order_id,
  order_amount,
  status,
  fraud_flag,
  created_at
  -- Explicitly excluding: customer_email, customer_ip, fraud_reason
FROM public.commissions;

-- Grant access to the view
GRANT SELECT ON public.affiliate_commissions_safe TO authenticated;

-- Recreate the function with the correct signature (excluding PII)
CREATE OR REPLACE FUNCTION public.get_affiliate_commissions_safe(p_affiliate_id uuid)
RETURNS TABLE (
  id uuid,
  affiliate_id uuid,
  referral_id uuid,
  amount numeric,
  level integer,
  order_id text,
  order_amount numeric,
  status text,
  fraud_flag boolean,
  fraud_reason text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    c.id,
    c.affiliate_id,
    c.referral_id,
    c.amount,
    c.level,
    c.order_id,
    c.order_amount,
    c.status,
    c.fraud_flag,
    c.fraud_reason,
    c.created_at
  FROM public.commissions c
  INNER JOIN public.affiliates a ON c.affiliate_id = a.id
  WHERE c.affiliate_id = p_affiliate_id
    AND a.user_id = auth.uid()
$$;

-- Create a new policy that only allows affiliates to see their own commissions
-- They must use the safe function to access data (which excludes PII)
CREATE POLICY "Affiliates can view own commissions without PII"
ON public.commissions
FOR SELECT
TO authenticated
USING (
  affiliate_id IN (
    SELECT affiliates.id
    FROM affiliates
    WHERE affiliates.user_id = auth.uid()
  )
);