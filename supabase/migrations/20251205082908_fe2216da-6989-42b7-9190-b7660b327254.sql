-- Create a security definer function to get current user's email
CREATE OR REPLACE FUNCTION public.get_auth_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM auth.users WHERE id = auth.uid()
$$;

-- Drop existing permissive policies on sleep_profiles
DROP POLICY IF EXISTS "Allow public insert access to profiles" ON public.sleep_profiles;
DROP POLICY IF EXISTS "Allow public read access to profiles" ON public.sleep_profiles;
DROP POLICY IF EXISTS "Allow public update access to profiles" ON public.sleep_profiles;

-- Create secure policies for sleep_profiles
CREATE POLICY "Users can read own profile"
ON public.sleep_profiles
FOR SELECT
TO authenticated
USING (email = public.get_auth_email());

CREATE POLICY "Users can insert own profile"
ON public.sleep_profiles
FOR INSERT
TO authenticated
WITH CHECK (email = public.get_auth_email());

CREATE POLICY "Users can update own profile"
ON public.sleep_profiles
FOR UPDATE
TO authenticated
USING (email = public.get_auth_email());

-- Drop existing permissive policies on sleep_logs
DROP POLICY IF EXISTS "Allow public delete access to logs" ON public.sleep_logs;
DROP POLICY IF EXISTS "Allow public insert access to logs" ON public.sleep_logs;
DROP POLICY IF EXISTS "Allow public read access to logs" ON public.sleep_logs;
DROP POLICY IF EXISTS "Allow public update access to logs" ON public.sleep_logs;

-- Create secure policies for sleep_logs
CREATE POLICY "Users can read own logs"
ON public.sleep_logs
FOR SELECT
TO authenticated
USING (email = public.get_auth_email());

CREATE POLICY "Users can insert own logs"
ON public.sleep_logs
FOR INSERT
TO authenticated
WITH CHECK (email = public.get_auth_email());

CREATE POLICY "Users can update own logs"
ON public.sleep_logs
FOR UPDATE
TO authenticated
USING (email = public.get_auth_email());

CREATE POLICY "Users can delete own logs"
ON public.sleep_logs
FOR DELETE
TO authenticated
USING (email = public.get_auth_email());

-- Drop existing permissive policies on coach_plans
DROP POLICY IF EXISTS "Allow public insert access to plans" ON public.coach_plans;
DROP POLICY IF EXISTS "Allow public read access to plans" ON public.coach_plans;

-- Create secure policies for coach_plans
CREATE POLICY "Users can read own plans"
ON public.coach_plans
FOR SELECT
TO authenticated
USING (email = public.get_auth_email());

CREATE POLICY "Users can insert own plans"
ON public.coach_plans
FOR INSERT
TO authenticated
WITH CHECK (email = public.get_auth_email());

-- Drop existing permissive policies on engagement_meta
DROP POLICY IF EXISTS "Allow public insert access to engagement_meta" ON public.engagement_meta;
DROP POLICY IF EXISTS "Allow public read access to engagement_meta" ON public.engagement_meta;
DROP POLICY IF EXISTS "Allow public update access to engagement_meta" ON public.engagement_meta;

-- Create secure policies for engagement_meta
CREATE POLICY "Users can read own engagement"
ON public.engagement_meta
FOR SELECT
TO authenticated
USING (email = public.get_auth_email());

CREATE POLICY "Users can insert own engagement"
ON public.engagement_meta
FOR INSERT
TO authenticated
WITH CHECK (email = public.get_auth_email());

CREATE POLICY "Users can update own engagement"
ON public.engagement_meta
FOR UPDATE
TO authenticated
USING (email = public.get_auth_email());

-- Drop existing permissive policies on whatsapp_user_links
DROP POLICY IF EXISTS "Allow public insert access to whatsapp_user_links" ON public.whatsapp_user_links;
DROP POLICY IF EXISTS "Allow public read access to whatsapp_user_links" ON public.whatsapp_user_links;
DROP POLICY IF EXISTS "Allow public update access to whatsapp_user_links" ON public.whatsapp_user_links;

-- Create secure policies for whatsapp_user_links
CREATE POLICY "Users can read own whatsapp links"
ON public.whatsapp_user_links
FOR SELECT
TO authenticated
USING (email = public.get_auth_email());

CREATE POLICY "Users can insert own whatsapp links"
ON public.whatsapp_user_links
FOR INSERT
TO authenticated
WITH CHECK (email = public.get_auth_email());

CREATE POLICY "Users can update own whatsapp links"
ON public.whatsapp_user_links
FOR UPDATE
TO authenticated
USING (email = public.get_auth_email());

-- Drop existing permissive policies on whatsapp_message_logs
DROP POLICY IF EXISTS "Allow public insert access to whatsapp_message_logs" ON public.whatsapp_message_logs;
DROP POLICY IF EXISTS "Allow public read access to whatsapp_message_logs" ON public.whatsapp_message_logs;

-- Create secure policies for whatsapp_message_logs
CREATE POLICY "Users can read own message logs"
ON public.whatsapp_message_logs
FOR SELECT
TO authenticated
USING (email = public.get_auth_email());

CREATE POLICY "Users can insert own message logs"
ON public.whatsapp_message_logs
FOR INSERT
TO authenticated
WITH CHECK (email = public.get_auth_email());