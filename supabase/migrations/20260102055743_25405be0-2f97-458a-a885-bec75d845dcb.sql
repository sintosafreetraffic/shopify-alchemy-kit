-- TASK_04: Create coach_preview_plans table for quiz completers preview
-- TASK_07: Add session_id to sleep_profiles for anon quiz tracking

-- Create coach_preview_plans table
CREATE TABLE public.coach_preview_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  session_id TEXT NOT NULL,
  preview_plan JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enforce 1 preview per email
CREATE UNIQUE INDEX coach_preview_plans_email_unique ON public.coach_preview_plans(email);

-- Enable RLS
ALTER TABLE public.coach_preview_plans ENABLE ROW LEVEL SECURITY;

-- RLS: No direct anon access - all access via Edge Functions with service role
-- This policy allows read-only access for authenticated users to their own previews (fallback)
CREATE POLICY "Users can view their own preview"
  ON public.coach_preview_plans
  FOR SELECT
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Add session_id to sleep_profiles for anon quiz tracking
ALTER TABLE public.sleep_profiles
ADD COLUMN IF NOT EXISTS session_id TEXT;

-- Create index on session_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_sleep_profiles_session_id ON public.sleep_profiles(session_id);

-- Add comments for documentation
COMMENT ON TABLE public.coach_preview_plans IS 'Stores 1-day preview plans for quiz completers (no purchase required)';
COMMENT ON COLUMN public.coach_preview_plans.email IS 'Email from quiz completion';
COMMENT ON COLUMN public.coach_preview_plans.session_id IS 'Session ID for validation';
COMMENT ON COLUMN public.coach_preview_plans.preview_plan IS 'Truncated 1-day plan matching coach_plans.sleep_plan structure';