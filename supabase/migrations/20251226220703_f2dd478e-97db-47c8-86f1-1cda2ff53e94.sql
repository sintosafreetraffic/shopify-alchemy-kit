-- ============================================================
-- Garmin Backfill: Add data_origin tracking to sleep_nights
-- ADD-ONLY migration (safe, no breaking changes)
-- ============================================================

-- Create enum for data origin
CREATE TYPE public.sleep_data_origin AS ENUM ('webhook', 'backfill');

-- Add data_origin column to sleep_nights (nullable for existing rows)
ALTER TABLE public.sleep_nights
ADD COLUMN data_origin public.sleep_data_origin NULL;

-- Add ingested_at to track when we received the data
ALTER TABLE public.sleep_nights
ADD COLUMN ingested_at TIMESTAMPTZ NULL DEFAULT now();

-- Add backfill tracking to sleep_sources
ALTER TABLE public.sleep_sources
ADD COLUMN backfill_requested_at TIMESTAMPTZ NULL;

ALTER TABLE public.sleep_sources
ADD COLUMN backfill_completed_at TIMESTAMPTZ NULL;

ALTER TABLE public.sleep_sources
ADD COLUMN backfill_nights_count INTEGER NULL;

-- Set existing rows to 'webhook' origin (they came from real-time sync)
UPDATE public.sleep_nights 
SET data_origin = 'webhook', ingested_at = created_at
WHERE data_origin IS NULL;

-- Create index for baseline queries (filter by origin)
CREATE INDEX idx_sleep_nights_data_origin ON public.sleep_nights(data_origin);

-- Comment for documentation
COMMENT ON COLUMN public.sleep_nights.data_origin IS 'Source of data: webhook (real-time) or backfill (historical import)';
COMMENT ON COLUMN public.sleep_nights.ingested_at IS 'When we received/processed this data';
COMMENT ON COLUMN public.sleep_sources.backfill_requested_at IS 'When historical data request was sent to provider';
COMMENT ON COLUMN public.sleep_sources.backfill_completed_at IS 'When backfill finished (all data received)';
COMMENT ON COLUMN public.sleep_sources.backfill_nights_count IS 'Number of nights imported via backfill';