-- Add persona fields to sleep_profiles for persistent storage
-- This makes persona queryable and serves as single source of truth

-- Create enum for persona clusters
CREATE TYPE public.persona_cluster AS ENUM ('pain_sleeper', 'stress_insomnia', 'optimizer');

-- Add persona columns to sleep_profiles
ALTER TABLE public.sleep_profiles
ADD COLUMN persona_cluster public.persona_cluster,
ADD COLUMN persona_label text,
ADD COLUMN persona_rationale text,
ADD COLUMN persona_recommended_modules integer[] DEFAULT '{}'::integer[];

-- Create index for persona-based queries
CREATE INDEX idx_sleep_profiles_persona ON public.sleep_profiles(persona_cluster);

-- Add comment for documentation
COMMENT ON COLUMN public.sleep_profiles.persona_cluster IS 'Primary persona classification: pain_sleeper, stress_insomnia, or optimizer';
COMMENT ON COLUMN public.sleep_profiles.persona_label IS 'Human-readable persona label';
COMMENT ON COLUMN public.sleep_profiles.persona_rationale IS 'Explanation of why this persona was assigned';
COMMENT ON COLUMN public.sleep_profiles.persona_recommended_modules IS 'Array of recommended module IDs for this persona';