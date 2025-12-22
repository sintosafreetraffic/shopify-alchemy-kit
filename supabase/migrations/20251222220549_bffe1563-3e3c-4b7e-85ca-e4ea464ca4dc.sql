-- Fix: Remove direct SELECT access for affiliates to commissions table
-- They should use the get_affiliate_commissions_safe function instead which excludes PII

DROP POLICY IF EXISTS "Affiliates can view own commissions without PII" ON public.commissions;