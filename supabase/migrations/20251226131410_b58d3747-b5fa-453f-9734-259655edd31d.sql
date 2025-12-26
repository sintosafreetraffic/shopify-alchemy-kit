-- ============================================================
-- Sleep Data Integration Foundation v2.1
-- ============================================================

-- Create sleep_source enum type
DO $$ BEGIN
  CREATE TYPE sleep_source AS ENUM ('apple_health', 'garmin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create sleep_stage enum type
DO $$ BEGIN
  CREATE TYPE sleep_stage AS ENUM ('awake', 'light', 'deep', 'rem');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- 1) sleep_sources - Unified provider connection table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sleep_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source text NOT NULL CHECK (source IN ('apple_health', 'garmin')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'connected', 'revoked')),
  connected_at timestamptz,
  revoked_at timestamptz,
  user_timezone text, -- IANA timezone e.g. 'Europe/Amsterdam'
  metadata jsonb DEFAULT '{}'::jsonb, -- vendor-specific data
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, source)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sleep_sources_user_id ON public.sleep_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_sleep_sources_status ON public.sleep_sources(status);

-- Enable RLS
ALTER TABLE public.sleep_sources ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own sleep sources"
  ON public.sleep_sources FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own sleep sources"
  ON public.sleep_sources FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own sleep sources"
  ON public.sleep_sources FOR UPDATE
  USING (user_id = auth.uid());

-- Updated at trigger
CREATE TRIGGER update_sleep_sources_updated_at
  BEFORE UPDATE ON public.sleep_sources
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 2) sleep_raw_events - Append-only vault (never exposed to client)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sleep_raw_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source text NOT NULL CHECK (source IN ('apple_health', 'garmin')),
  dedupe_key text NOT NULL UNIQUE, -- deterministic idempotency key
  external_night_id text, -- vendor's night/session ID
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  stages jsonb, -- array of stage segments
  raw_payload jsonb, -- NEVER exposed to client, NEVER logged
  received_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sleep_raw_events_user_id ON public.sleep_raw_events(user_id);
CREATE INDEX IF NOT EXISTS idx_sleep_raw_events_source ON public.sleep_raw_events(source);
CREATE INDEX IF NOT EXISTS idx_sleep_raw_events_external_night_id ON public.sleep_raw_events(external_night_id) WHERE external_night_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sleep_raw_events_received_at ON public.sleep_raw_events(received_at);

-- Enable RLS (strict - service role only for writes)
ALTER TABLE public.sleep_raw_events ENABLE ROW LEVEL SECURITY;

-- RLS: Users can only read their own raw events (but raw_payload should be filtered in code)
CREATE POLICY "Users can view own raw events metadata"
  ON public.sleep_raw_events FOR SELECT
  USING (user_id = auth.uid());

-- No direct inserts from client - only via edge function with service role
CREATE POLICY "Service role only inserts"
  ON public.sleep_raw_events FOR INSERT
  WITH CHECK (false);

-- ============================================================
-- 3) sleep_nights - Normalized nightly summary (Sleep Coach uses this)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sleep_nights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source text NOT NULL CHECK (source IN ('apple_health', 'garmin')),
  night_date date NOT NULL, -- local-to-user date
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  total_sleep_minutes int,
  sleep_efficiency numeric(5,2), -- percentage 0-100
  wake_events int DEFAULT 0,
  is_split_segment boolean DEFAULT false, -- for split-night handling
  normalization_version int NOT NULL DEFAULT 1,
  raw_event_id uuid REFERENCES public.sleep_raw_events(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Composite unique: prefer external_night_id when present, else dedupe via night_date
-- Using dedupe_key from raw_event for simplicity
CREATE UNIQUE INDEX IF NOT EXISTS idx_sleep_nights_unique 
  ON public.sleep_nights(user_id, source, raw_event_id);

-- Query indexes
CREATE INDEX IF NOT EXISTS idx_sleep_nights_user_id ON public.sleep_nights(user_id);
CREATE INDEX IF NOT EXISTS idx_sleep_nights_night_date ON public.sleep_nights(night_date);
CREATE INDEX IF NOT EXISTS idx_sleep_nights_source ON public.sleep_nights(source);

-- Enable RLS
ALTER TABLE public.sleep_nights ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own sleep nights"
  ON public.sleep_nights FOR SELECT
  USING (user_id = auth.uid());

-- No direct client inserts
CREATE POLICY "Service role only inserts nights"
  ON public.sleep_nights FOR INSERT
  WITH CHECK (false);

-- ============================================================
-- 4) processed_webhook_ids - Replay protection stub
-- ============================================================
CREATE TABLE IF NOT EXISTS public.processed_webhook_ids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL CHECK (source IN ('apple_health', 'garmin')),
  webhook_id text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, webhook_id)
);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_processed_webhook_ids_lookup 
  ON public.processed_webhook_ids(source, webhook_id);

-- Enable RLS (admin only)
ALTER TABLE public.processed_webhook_ids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view processed webhooks"
  ON public.processed_webhook_ids FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 5) Add sleep_night_id to existing sleep_logs for linkage
-- ============================================================
ALTER TABLE public.sleep_logs 
  ADD COLUMN IF NOT EXISTS sleep_night_id uuid REFERENCES public.sleep_nights(id);

-- Index for the FK
CREATE INDEX IF NOT EXISTS idx_sleep_logs_sleep_night_id 
  ON public.sleep_logs(sleep_night_id) WHERE sleep_night_id IS NOT NULL;

-- ============================================================
-- 6) Rate limiting table for intake endpoint
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sleep_intake_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source text NOT NULL CHECK (source IN ('apple_health', 'garmin')),
  request_count int NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, source, window_start)
);

-- Index for rate limit lookups
CREATE INDEX IF NOT EXISTS idx_sleep_intake_rate_limits_lookup 
  ON public.sleep_intake_rate_limits(user_id, source, window_start);

-- Enable RLS
ALTER TABLE public.sleep_intake_rate_limits ENABLE ROW LEVEL SECURITY;

-- No client access
CREATE POLICY "No client access to rate limits"
  ON public.sleep_intake_rate_limits FOR ALL
  USING (false);

-- ============================================================
-- 7) Store current normalization version in app_settings
-- ============================================================
INSERT INTO public.app_settings (key, value)
VALUES ('sleep_normalization_version', '{"version": 1, "updated_at": "2025-12-26"}'::jsonb)
ON CONFLICT (key) DO NOTHING;