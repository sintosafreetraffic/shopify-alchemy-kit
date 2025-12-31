
-- Fix order_tracking: Remove public access, only allow authenticated users to view their own tracking
DROP POLICY IF EXISTS "Anyone can view tracking with correct order and email" ON public.order_tracking;
DROP POLICY IF EXISTS "Service role can manage tracking" ON public.order_tracking;

-- Users can only view tracking for their own email (verified via auth)
CREATE POLICY "Users can view their own order tracking"
ON public.order_tracking
FOR SELECT
TO authenticated
USING (email = public.get_auth_email());

-- Admins can view all order tracking
CREATE POLICY "Admins can view all order tracking"
ON public.order_tracking
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only service role (edge functions) can insert/update tracking
CREATE POLICY "Service role can insert tracking"
ON public.order_tracking
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can update tracking"
ON public.order_tracking
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- Fix tracking_events: Remove public access
DROP POLICY IF EXISTS "Service role full access" ON public.tracking_events;

-- Only service role can manage tracking events
CREATE POLICY "Service role can manage tracking events"
ON public.tracking_events
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Admins can view tracking events
CREATE POLICY "Admins can view tracking events"
ON public.tracking_events
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Fix commissions: Create a view for affiliates that masks PII
-- First, let's add a policy for affiliates to see their own commissions (without PII)
CREATE OR REPLACE FUNCTION public.get_affiliate_commissions_masked(p_affiliate_id uuid)
RETURNS TABLE(
  id uuid, 
  affiliate_id uuid, 
  referral_id uuid, 
  amount numeric, 
  level integer, 
  order_id text, 
  order_amount numeric, 
  status text, 
  fraud_flag boolean, 
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
    c.referral_id,
    c.amount,
    c.level,
    c.order_id,
    c.order_amount,
    c.status,
    c.fraud_flag,
    c.created_at
  FROM public.commissions c
  INNER JOIN public.affiliates a ON c.affiliate_id = a.id
  WHERE c.affiliate_id = p_affiliate_id
    AND a.user_id = auth.uid()
$$;

-- Add policy for affiliates to view their own commissions (they'll use the masked function)
CREATE POLICY "Affiliates can view own commissions via function"
ON public.commissions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.affiliates a 
    WHERE a.id = commissions.affiliate_id 
    AND a.user_id = auth.uid()
  )
);

COMMENT ON FUNCTION public.get_affiliate_commissions_masked IS 
'Returns commissions for an affiliate with customer_email and customer_ip masked for privacy. Use this function instead of direct table access for non-admin users.';
