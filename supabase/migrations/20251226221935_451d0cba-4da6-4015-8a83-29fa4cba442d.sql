-- Add backfill hardening columns to sleep_sources
ALTER TABLE public.sleep_sources 
ADD COLUMN IF NOT EXISTS backfill_error TEXT NULL,
ADD COLUMN IF NOT EXISTS backfill_days INT NULL,
ADD COLUMN IF NOT EXISTS backfill_status TEXT NULL;

-- Add comment for backfill_status allowed values
COMMENT ON COLUMN public.sleep_sources.backfill_status IS 'Values: requested | in_progress | completed | failed';

-- Create composite index for efficient baseline/webhook queries
CREATE INDEX IF NOT EXISTS idx_sleep_nights_user_origin_date 
ON public.sleep_nights (user_id, source, data_origin, night_date);

-- Create index for raw events if needed for deduplication
CREATE INDEX IF NOT EXISTS idx_sleep_raw_events_user_source 
ON public.sleep_raw_events (user_id, source, received_at);