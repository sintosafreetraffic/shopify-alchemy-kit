-- Add quiz completion tracking columns to sleep_profiles
ALTER TABLE public.sleep_profiles
  ADD COLUMN IF NOT EXISTS quiz_completed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS quiz_completed_at timestamptz;