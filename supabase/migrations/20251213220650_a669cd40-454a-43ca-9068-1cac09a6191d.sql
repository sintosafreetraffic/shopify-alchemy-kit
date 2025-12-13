-- Drop the commissions_safe view to eliminate RLS bypass vulnerability
-- All commission access is properly handled by get_affiliate_commissions_safe() function
-- which enforces row-level security by filtering on user's affiliate_id

DROP VIEW IF EXISTS public.commissions_safe;