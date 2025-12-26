-- Garmin Backend Hardening: ADD-ONLY migration
-- Adds indexed token hash lookup and timezone offset storage

-- A) Add garmin_token_hash column for O(1) indexed lookup
ALTER TABLE public.sleep_sources 
ADD COLUMN IF NOT EXISTS garmin_token_hash TEXT NULL;

ALTER TABLE public.sleep_sources 
ADD COLUMN IF NOT EXISTS garmin_token_hash_updated_at TIMESTAMPTZ NULL;

-- Create index for fast token hash lookup (only on non-null values)
CREATE INDEX IF NOT EXISTS idx_sleep_sources_garmin_token_hash 
ON public.sleep_sources(garmin_token_hash) 
WHERE garmin_token_hash IS NOT NULL;

-- B) Add timezone_offset_seconds for proper time handling
ALTER TABLE public.sleep_raw_events 
ADD COLUMN IF NOT EXISTS timezone_offset_seconds INTEGER NULL;

ALTER TABLE public.sleep_nights 
ADD COLUMN IF NOT EXISTS timezone_offset_seconds INTEGER NULL;