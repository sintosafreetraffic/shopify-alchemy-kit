-- ============================================================
-- Garmin Activity API Integration - Database Schema
-- Extends sleep_sources + creates Activity-specific tables
-- ============================================================

-- 1. EXTEND sleep_sources for Activity domain support
-- Add new columns (non-breaking, defaults for existing rows)
ALTER TABLE public.sleep_sources
ADD COLUMN IF NOT EXISTS domains text[] NOT NULL DEFAULT ARRAY['sleep'],
ADD COLUMN IF NOT EXISTS activity_last_sync_at timestamptz NULL,
ADD COLUMN IF NOT EXISTS activity_status text NOT NULL DEFAULT 'disabled',
ADD COLUMN IF NOT EXISTS activity_error_code text NULL,
ADD COLUMN IF NOT EXISTS activity_error_message text NULL;

-- Add check constraint for activity_status
ALTER TABLE public.sleep_sources
ADD CONSTRAINT sleep_sources_activity_status_check 
CHECK (activity_status IN ('disabled', 'enabled', 'permission_denied', 'error'));

-- Index for activity status queries
CREATE INDEX IF NOT EXISTS idx_sleep_sources_activity_status 
ON public.sleep_sources(activity_status) WHERE activity_status != 'disabled';

-- 2. CREATE garmin_events_raw - Raw Activity API events storage
CREATE TABLE public.garmin_events_raw (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  domain text NOT NULL DEFAULT 'activity',
  summary_type text NOT NULL,
  garmin_user_id text NOT NULL,
  summary_id text NULL,
  upload_window_start int NULL,
  upload_window_end int NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL,
  payload_hash text NOT NULL,
  CONSTRAINT garmin_events_raw_summary_type_check 
    CHECK (summary_type IN ('activities', 'activityDetails', 'activityFiles', 'moveIQActivities', 'manuallyUpdatedActivities'))
);

-- Unique constraint for deduplication
ALTER TABLE public.garmin_events_raw
ADD CONSTRAINT garmin_events_raw_payload_hash_unique UNIQUE (payload_hash);

-- Indexes for efficient querying
CREATE INDEX idx_garmin_events_raw_lookup 
ON public.garmin_events_raw(garmin_user_id, summary_type, received_at DESC);

CREATE INDEX idx_garmin_events_raw_summary_id 
ON public.garmin_events_raw(summary_id) WHERE summary_id IS NOT NULL;

-- RLS for garmin_events_raw (service role only, no user access)
ALTER TABLE public.garmin_events_raw ENABLE ROW LEVEL SECURITY;

-- 3. CREATE garmin_activity_summaries - Normalized activity data
CREATE TABLE public.garmin_activity_summaries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  garmin_user_id text NOT NULL,
  user_id uuid NULL,
  summary_id text NOT NULL,
  activity_type text NULL,
  activity_name text NULL,
  start_time_seconds int NOT NULL,
  start_time_offset_seconds int NULL,
  duration_seconds int NULL,
  distance_meters float NULL,
  avg_heart_rate_bpm int NULL,
  max_heart_rate_bpm int NULL,
  active_kilocalories int NULL,
  device_name text NULL,
  is_manual boolean NOT NULL DEFAULT false,
  is_web_upload boolean NOT NULL DEFAULT false,
  raw_event_id uuid NULL REFERENCES public.garmin_events_raw(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT garmin_activity_summaries_unique UNIQUE (garmin_user_id, summary_id)
);

-- Indexes
CREATE INDEX idx_garmin_activity_summaries_user 
ON public.garmin_activity_summaries(user_id) WHERE user_id IS NOT NULL;

CREATE INDEX idx_garmin_activity_summaries_time 
ON public.garmin_activity_summaries(garmin_user_id, start_time_seconds DESC);

-- RLS
ALTER TABLE public.garmin_activity_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own activity summaries"
ON public.garmin_activity_summaries
FOR SELECT
USING (user_id = auth.uid());

-- 4. CREATE garmin_activity_details - Detailed activity data (minimal, no samples)
CREATE TABLE public.garmin_activity_details (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  garmin_user_id text NOT NULL,
  user_id uuid NULL,
  summary_id text NOT NULL,
  activity_id text NULL,
  start_time_seconds int NOT NULL,
  duration_seconds int NULL,
  has_samples boolean NOT NULL DEFAULT false,
  samples_count int NULL,
  lap_count int NULL,
  raw_event_id uuid NULL REFERENCES public.garmin_events_raw(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT garmin_activity_details_unique UNIQUE (garmin_user_id, summary_id)
);

-- Indexes
CREATE INDEX idx_garmin_activity_details_user 
ON public.garmin_activity_details(user_id) WHERE user_id IS NOT NULL;

-- RLS
ALTER TABLE public.garmin_activity_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own activity details"
ON public.garmin_activity_details
FOR SELECT
USING (user_id = auth.uid());

-- 5. CREATE garmin_moveiq_events - Auto-detected activities
CREATE TABLE public.garmin_moveiq_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  garmin_user_id text NOT NULL,
  user_id uuid NULL,
  summary_id text NOT NULL,
  calendar_date date NOT NULL,
  start_time_seconds int NOT NULL,
  offset_seconds int NULL,
  duration_seconds int NULL,
  activity_type text NULL,
  activity_subtype text NULL,
  raw_event_id uuid NULL REFERENCES public.garmin_events_raw(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT garmin_moveiq_events_unique UNIQUE (garmin_user_id, summary_id)
);

-- Indexes
CREATE INDEX idx_garmin_moveiq_events_user 
ON public.garmin_moveiq_events(user_id) WHERE user_id IS NOT NULL;

CREATE INDEX idx_garmin_moveiq_events_date 
ON public.garmin_moveiq_events(calendar_date);

-- RLS
ALTER TABLE public.garmin_moveiq_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own moveiq events"
ON public.garmin_moveiq_events
FOR SELECT
USING (user_id = auth.uid());

-- 6. CREATE garmin_activity_files - Activity file metadata + download tracking
CREATE TABLE public.garmin_activity_files (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  garmin_user_id text NOT NULL,
  user_id uuid NULL,
  summary_id text NOT NULL,
  activity_id text NULL,
  activity_type text NULL,
  activity_name text NULL,
  file_type text NULL,
  device_name text NULL,
  start_time_seconds int NULL,
  is_manual boolean NOT NULL DEFAULT false,
  callback_url_hash text NULL,
  callback_expires_at timestamptz NULL,
  download_status text NOT NULL DEFAULT 'pending',
  downloaded_at timestamptz NULL,
  storage_path text NULL,
  raw_event_id uuid NULL REFERENCES public.garmin_events_raw(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT garmin_activity_files_unique UNIQUE (garmin_user_id, summary_id),
  CONSTRAINT garmin_activity_files_download_status_check 
    CHECK (download_status IN ('pending', 'downloading', 'completed', 'rejected_410', 'expired', 'disabled'))
);

-- Indexes
CREATE INDEX idx_garmin_activity_files_user 
ON public.garmin_activity_files(user_id) WHERE user_id IS NOT NULL;

CREATE INDEX idx_garmin_activity_files_download 
ON public.garmin_activity_files(download_status) WHERE download_status = 'pending';

-- RLS
ALTER TABLE public.garmin_activity_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own activity files"
ON public.garmin_activity_files
FOR SELECT
USING (user_id = auth.uid());

-- 7. CREATE sleep_coach_activity_signals_daily - Coach-facing activity signals
CREATE TABLE public.sleep_coach_activity_signals_daily (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  date date NOT NULL,
  training_load_label text NOT NULL DEFAULT 'unknown',
  workouts_count_7d int NULL,
  baseline_workouts_count_30d int NULL,
  most_common_activity_type text NULL,
  late_workout_flag boolean NOT NULL DEFAULT false,
  late_workout_days_7d int NULL,
  signal_freshness text NOT NULL DEFAULT 'insufficient_data',
  computed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sleep_coach_activity_signals_unique UNIQUE (user_id, date),
  CONSTRAINT training_load_label_check 
    CHECK (training_load_label IN ('unknown', 'low', 'moderate', 'high', 'very_high')),
  CONSTRAINT signal_freshness_check 
    CHECK (signal_freshness IN ('fresh', 'stale', 'insufficient_data'))
);

-- Indexes
CREATE INDEX idx_activity_signals_user_date 
ON public.sleep_coach_activity_signals_daily(user_id, date DESC);

-- RLS
ALTER TABLE public.sleep_coach_activity_signals_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own activity signals"
ON public.sleep_coach_activity_signals_daily
FOR SELECT
USING (user_id = auth.uid());

-- 8. INSERT default feature flags (if app_settings exists)
INSERT INTO public.app_settings (key, value)
VALUES 
  ('garmin_activity_enabled', 'false'::jsonb),
  ('garmin_activity_backfill_enabled', 'false'::jsonb),
  ('garmin_file_downloads_enabled', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;