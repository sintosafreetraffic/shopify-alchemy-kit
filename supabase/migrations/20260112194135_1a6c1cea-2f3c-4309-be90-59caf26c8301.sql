-- Fix the overly permissive RLS policy and set search_path on function

-- Drop the overly permissive service role policy (edge functions use service role key which bypasses RLS anyway)
DROP POLICY IF EXISTS "Service role can manage variants" ON public.affiliate_campaign_variants;

-- Fix the function search_path
CREATE OR REPLACE FUNCTION public.update_storefront_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;