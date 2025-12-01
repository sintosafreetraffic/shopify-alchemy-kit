-- Deny DELETE on affiliates (users shouldn't delete their affiliate record)
CREATE POLICY "No one can delete affiliate records"
ON public.affiliates
FOR DELETE
USING (false);

-- Deny INSERT on commissions (only backend/service role should create commissions)
CREATE POLICY "No direct commission inserts"
ON public.commissions
FOR INSERT
WITH CHECK (false);

-- Deny UPDATE on commissions (commissions should be immutable)
CREATE POLICY "No commission updates"
ON public.commissions
FOR UPDATE
USING (false);

-- Deny DELETE on commissions (commissions should never be deleted)
CREATE POLICY "No commission deletes"
ON public.commissions
FOR DELETE
USING (false);

-- Deny UPDATE on referrals (referrals should be immutable once created)
CREATE POLICY "No referral updates"
ON public.referrals
FOR UPDATE
USING (false);

-- Deny DELETE on referrals (referrals should never be deleted)
CREATE POLICY "No referral deletes"
ON public.referrals
FOR DELETE
USING (false);