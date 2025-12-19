-- Fix 1: Allow affiliates to view their own commissions (addresses commissions_customer_data_exposure)
-- The existing function get_affiliate_commissions_safe already masks PII, but we also need RLS policy

CREATE POLICY "Affiliates can view own commissions via function"
ON public.commissions
FOR SELECT
USING (
  affiliate_id IN (
    SELECT id FROM public.affiliates WHERE user_id = auth.uid()
  )
);

-- Fix 2: Add validation for checkout_analytics inserts (addresses checkout_analytics_unlimited_inserts)
-- Drop the overly permissive policy and replace with one that validates event_type

DROP POLICY IF EXISTS "Allow anonymous inserts for checkout analytics" ON public.checkout_analytics;

-- Create a more restrictive insert policy with validation
CREATE POLICY "Allow validated anonymous inserts for checkout analytics"
ON public.checkout_analytics
FOR INSERT
WITH CHECK (
  -- Only allow known event types to prevent pollution
  event_type IN (
    'checkout_initiated',
    'checkout_success', 
    'checkout_error',
    'checkout_abandoned',
    'checkout_retry',
    'add_to_cart',
    'remove_from_cart',
    'view_cart'
  )
  -- Require session_id to be present and reasonable length
  AND session_id IS NOT NULL
  AND length(session_id) BETWEEN 10 AND 100
);