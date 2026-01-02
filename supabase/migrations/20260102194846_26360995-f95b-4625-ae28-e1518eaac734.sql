-- Add coach onboarding completion tracking to engagement_meta
ALTER TABLE public.engagement_meta 
ADD COLUMN IF NOT EXISTS coach_onboarding_completed_at timestamp with time zone DEFAULT NULL;