-- ============================================================
-- Garmin Health API Integration - Database Schema
-- Extends existing Garmin infrastructure for Health API (dailies, sleeps)
-- ============================================================

-- 1. Extend sleep_sources with health-specific fields
ALTER TABLE public.sleep_sources 
ADD COLUMN IF NOT EXISTS health_last_sync_at timestamptz NULL,
ADD COLUMN IF NOT EXISTS on_hold boolean NOT NULL DEFAULT false;

-- 2. Drop the existing constraint on garmin_events_raw to allow health summary types
ALTER TABLE public.garmin_events_raw 
DROP CONSTRAINT IF EXISTS garmin_events_raw_summary_type_check;

-- 3. Add new constraint that includes health summary types
ALTER TABLE public.garmin_events_raw 
ADD CONSTRAINT garmin_events_raw_summary_type_check 
CHECK (summary_type IN (
  -- Activity types (existing)
  'activities', 'activityDetails', 'activityFiles', 'moveIQActivities', 'manuallyUpdatedActivities',
  -- Health API types (new)
  'dailies', 'sleeps', 'epochs', 'bodyComps', 'pulseOx', 'respiration', 'stress', 'userMetrics',
  'hrv', 'bloodPressure', 'allDayRespiration', 'healthSnapshot', 'thirdPartyDailies'
));

-- 4. Create garmin_dailies table (normalized daily summaries)
CREATE TABLE IF NOT EXISTS public.garmin_dailies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NULL,  -- Mapped user (may be null if pending mapping)
  garmin_user_id text NOT NULL,
  calendar_date date NOT NULL,
  summary_id text NOT NULL,
  start_time_seconds int NOT NULL,
  duration_seconds int NULL,
  -- Core fields for coach signals
  steps int NULL,
  active_seconds int NULL,
  vigorous_activity_seconds int NULL,
  floors_climbed int NULL,
  intensity_minutes_goal int NULL,
  -- Raw reference
  raw_event_id uuid NULL REFERENCES public.garmin_events_raw(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT garmin_dailies_unique UNIQUE (garmin_user_id, calendar_date)
);

-- 5. Create garmin_sleeps table (normalized sleep summaries from Health API)
CREATE TABLE IF NOT EXISTS public.garmin_sleeps (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NULL,  -- Mapped user (may be null if pending mapping)
  garmin_user_id text NOT NULL,
  summary_id text NOT NULL,
  calendar_date date NOT NULL,
  start_time_seconds int NOT NULL,
  duration_sleep_seconds int NULL,
  awake_seconds int NULL,
  light_seconds int NULL,
  deep_seconds int NULL,
  rem_seconds int NULL,
  validation text NULL,
  -- Raw reference
  raw_event_id uuid NULL REFERENCES public.garmin_events_raw(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT garmin_sleeps_unique UNIQUE (garmin_user_id, start_time_seconds)
);

-- 6. Create sleep_coach_metrics_daily (qualitative coach signals)
CREATE TABLE IF NOT EXISTS public.sleep_coach_metrics_daily (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  calendar_date date NOT NULL,
  signal_key text NOT NULL,  -- e.g., 'bedtime_consistency', 'sleep_fragmentation', 'recovery_proxy'
  signal_value text NOT NULL,  -- e.g., 'consistent', 'irregular', 'improving', 'stable'
  data_sources text[] NOT NULL DEFAULT ARRAY['garmin_health'],
  computed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sleep_coach_metrics_unique UNIQUE (user_id, calendar_date, signal_key)
);

-- 7. Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_garmin_dailies_user_date 
ON public.garmin_dailies (garmin_user_id, calendar_date DESC);

CREATE INDEX IF NOT EXISTS idx_garmin_dailies_user_id 
ON public.garmin_dailies (user_id) WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_garmin_sleeps_user_date 
ON public.garmin_sleeps (garmin_user_id, calendar_date DESC);

CREATE INDEX IF NOT EXISTS idx_garmin_sleeps_user_id 
ON public.garmin_sleeps (user_id) WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sleep_coach_metrics_user_date 
ON public.sleep_coach_metrics_daily (user_id, calendar_date DESC);

CREATE INDEX IF NOT EXISTS idx_garmin_events_raw_health 
ON public.garmin_events_raw (garmin_user_id, summary_type, received_at DESC)
WHERE domain = 'health';

-- 8. RLS Policies
ALTER TABLE public.garmin_dailies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garmin_sleeps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sleep_coach_metrics_daily ENABLE ROW LEVEL SECURITY;

-- Users can only read their own dailies
CREATE POLICY "Users can view own garmin_dailies"
ON public.garmin_dailies FOR SELECT
USING (user_id = auth.uid());

-- Users can only read their own sleeps
CREATE POLICY "Users can view own garmin_sleeps"
ON public.garmin_sleeps FOR SELECT
USING (user_id = auth.uid());

-- Users can only read their own coach metrics
CREATE POLICY "Users can view own coach metrics"
ON public.sleep_coach_metrics_daily FOR SELECT
USING (user_id = auth.uid());

-- 9. Add trigger for updated_at on new tables
CREATE TRIGGER update_garmin_dailies_updated_at
BEFORE UPDATE ON public.garmin_dailies
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_garmin_sleeps_updated_at
BEFORE UPDATE ON public.garmin_sleeps
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 10. Add feature flags for health API
INSERT INTO public.app_settings (key, value)
VALUES 
  ('garmin_health_api_enabled', 'true'::jsonb),
  ('garmin_health_dailies_enabled', 'true'::jsonb),
  ('garmin_health_sleeps_enabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;