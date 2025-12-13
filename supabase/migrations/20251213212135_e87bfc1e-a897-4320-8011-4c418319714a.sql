-- Fix: Customer PII Exposed to Affiliates
-- Create a secure view that excludes PII fields (customer_email, customer_ip)
-- Affiliates will query this view instead of the base table

-- Step 1: Create a view without PII fields for affiliate access
CREATE OR REPLACE VIEW public.commissions_safe AS
SELECT 
  id,
  affiliate_id,
  amount,
  order_amount,
  order_id,
  level,
  status,
  fraud_flag,
  fraud_reason,
  referral_id,
  created_at
FROM public.commissions;

-- Step 2: Enable RLS on the view
ALTER VIEW public.commissions_safe SET (security_invoker = true);

-- Step 3: Grant SELECT on the view to authenticated users
GRANT SELECT ON public.commissions_safe TO authenticated;

-- Step 4: Drop the existing affiliate SELECT policies on the base commissions table
DROP POLICY IF EXISTS "Users can view own commissions" ON public.commissions;
DROP POLICY IF EXISTS "Authenticated users can view own commissions" ON public.commissions;

-- Step 5: Create admin-only SELECT policy for the base commissions table (with PII)
CREATE POLICY "Only admins can view full commissions with PII" 
ON public.commissions 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Step 6: Create RLS policy on the view for affiliates to see only their commissions
-- Note: Views with security_invoker inherit the calling user's permissions
-- We need to create a policy that allows affiliates to see their own records via the view

-- Create a function to safely get affiliate commissions without PII
CREATE OR REPLACE FUNCTION public.get_affiliate_commissions_safe(p_affiliate_id uuid)
RETURNS TABLE (
  id uuid,
  affiliate_id uuid,
  amount numeric,
  order_amount numeric,
  order_id text,
  level integer,
  status text,
  fraud_flag boolean,
  fraud_reason text,
  referral_id uuid,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    c.id,
    c.affiliate_id,
    c.amount,
    c.order_amount,
    c.order_id,
    c.level,
    c.status,
    c.fraud_flag,
    c.fraud_reason,
    c.referral_id,
    c.created_at
  FROM public.commissions c
  INNER JOIN public.affiliates a ON c.affiliate_id = a.id
  WHERE c.affiliate_id = p_affiliate_id
    AND a.user_id = auth.uid()
$$;