-- 1. Extend log_source enum with wearable values
ALTER TYPE public.log_source ADD VALUE IF NOT EXISTS 'wearable_apple_health';
ALTER TYPE public.log_source ADD VALUE IF NOT EXISTS 'wearable_garmin';

-- 2. Add last_sync_at column to sleep_sources if not exists
ALTER TABLE public.sleep_sources 
ADD COLUMN IF NOT EXISTS last_sync_at timestamptz;

-- 3. Add unique constraint on sleep_sources (user_id, source) for reconnect semantics
ALTER TABLE public.sleep_sources 
ADD CONSTRAINT sleep_sources_user_id_source_unique UNIQUE (user_id, source);

-- 4. Add unique constraint on sleep_raw_events.dedupe_key for idempotency
ALTER TABLE public.sleep_raw_events 
ADD CONSTRAINT sleep_raw_events_dedupe_key_unique UNIQUE (dedupe_key);