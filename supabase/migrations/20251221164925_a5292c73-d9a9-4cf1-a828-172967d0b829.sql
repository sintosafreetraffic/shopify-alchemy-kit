-- Fix the SECURITY DEFINER view issue by dropping it
-- The function already provides safe access, so the view is redundant
DROP VIEW IF EXISTS public.affiliate_commissions_safe;