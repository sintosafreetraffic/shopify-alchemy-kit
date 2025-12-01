-- Drop any existing SELECT policies that might be too permissive
DROP POLICY IF EXISTS "Users can view their own affiliate data" ON public.affiliates;
DROP POLICY IF EXISTS "Users can view their own commissions" ON public.commissions;
DROP POLICY IF EXISTS "Users can view their own referrals" ON public.referrals;

-- Create secure SELECT policies that require authentication and restrict to own data
CREATE POLICY "Authenticated users can view own affiliate data"
ON public.affiliates
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can view own commissions"
ON public.commissions
FOR SELECT
TO authenticated
USING (affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid()));

CREATE POLICY "Authenticated users can view own referrals"
ON public.referrals
FOR SELECT
TO authenticated
USING (affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid()));

-- Also secure INSERT policy for affiliates (users can only create their own)
DROP POLICY IF EXISTS "Users can create their own affiliate record" ON public.affiliates;
CREATE POLICY "Authenticated users can create own affiliate record"
ON public.affiliates
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Secure INSERT for referrals (only service role should create, but allow authenticated insert for tracking)
DROP POLICY IF EXISTS "Users can create referrals" ON public.referrals;
DROP POLICY IF EXISTS "No direct referral inserts" ON public.referrals;
CREATE POLICY "Authenticated users can create referrals"
ON public.referrals
FOR INSERT
TO authenticated
WITH CHECK (affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid()));