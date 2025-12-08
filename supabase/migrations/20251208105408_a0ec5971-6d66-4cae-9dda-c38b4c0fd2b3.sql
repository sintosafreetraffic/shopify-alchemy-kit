-- Add quiz_data and sleep_assessment columns to sleep_profiles
ALTER TABLE public.sleep_profiles 
ADD COLUMN IF NOT EXISTS quiz_data jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS sleep_assessment jsonb DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.sleep_profiles.quiz_data IS 'Raw quiz answers from the sleep assessment';
COMMENT ON COLUMN public.sleep_profiles.sleep_assessment IS 'AI-generated analysis including scores, detected issues, and recommendations';