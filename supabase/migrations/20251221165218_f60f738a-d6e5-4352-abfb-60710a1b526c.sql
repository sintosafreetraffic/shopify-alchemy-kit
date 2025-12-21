-- FIX 1: sleep_profiles - ensure RLS is enabled and no anonymous access
-- First, ensure RLS is enabled (it should already be, but let's be safe)
ALTER TABLE public.sleep_profiles ENABLE ROW LEVEL SECURITY;

-- Force RLS for table owner as well (prevents bypassing RLS)
ALTER TABLE public.sleep_profiles FORCE ROW LEVEL SECURITY;

-- Revoke direct access from anon role
REVOKE ALL ON public.sleep_profiles FROM anon;

-- Grant only to authenticated users (RLS will further restrict)
GRANT SELECT, INSERT, UPDATE ON public.sleep_profiles TO authenticated;

-- FIX 2: whatsapp_user_links - ensure RLS is enabled and no anonymous access
ALTER TABLE public.whatsapp_user_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_user_links FORCE ROW LEVEL SECURITY;

-- Revoke direct access from anon role
REVOKE ALL ON public.whatsapp_user_links FROM anon;

-- Grant only to authenticated users (RLS will further restrict)
GRANT SELECT, INSERT, UPDATE ON public.whatsapp_user_links TO authenticated;