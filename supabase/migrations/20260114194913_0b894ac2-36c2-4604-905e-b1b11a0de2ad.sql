-- A/B Experimentation Platform - Full Schema
-- Phase 1: Core test management with BIS, auto-stop, and power zones

-- Main tests table
CREATE TABLE public.ab_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'stopped')),
  impact_zone TEXT NOT NULL CHECK (impact_zone IN ('hero', 'price_cta', 'urgency_social', 'other')),
  power_zone_weight NUMERIC(3,2) DEFAULT 0.7 CHECK (power_zone_weight >= 0 AND power_zone_weight <= 1),
  
  -- Variant configs stored as JSON
  variant_a_config JSONB NOT NULL DEFAULT '{}',
  variant_b_config JSONB NOT NULL DEFAULT '{}',
  
  -- Traffic management
  traffic_split INTEGER NOT NULL DEFAULT 50 CHECK (traffic_split >= 0 AND traffic_split <= 100),
  min_sample_size INTEGER NOT NULL DEFAULT 300,
  significance_method TEXT NOT NULL DEFAULT 'bayesian' CHECK (significance_method IN ('bayesian', 'frequentist')),
  significance_threshold NUMERIC(4,2) NOT NULL DEFAULT 0.95,
  
  -- Timing
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  
  -- Winner determination
  winner_variant TEXT CHECK (winner_variant IN ('A', 'B', 'inconclusive')),
  winner_declared_at TIMESTAMPTZ,
  winner_reason TEXT,
  
  -- Business Impact Score
  bis_raw_a NUMERIC(12,2) DEFAULT 0,
  bis_raw_b NUMERIC(12,2) DEFAULT 0,
  bis_final_a NUMERIC(12,2) DEFAULT 0,
  bis_final_b NUMERIC(12,2) DEFAULT 0,
  confidence_adjuster_a NUMERIC(3,2) DEFAULT 0.5,
  confidence_adjuster_b NUMERIC(3,2) DEFAULT 0.5,
  projected_annual_impact NUMERIC(12,2) DEFAULT 0,
  
  -- Auto-stop
  auto_stopped BOOLEAN DEFAULT FALSE,
  auto_stop_reason TEXT,
  auto_stop_rule TEXT CHECK (auto_stop_rule IN ('performance_gap', 'significance_reached', 'plateau', 'conflict')),
  
  -- Metrics cache
  sessions_a INTEGER DEFAULT 0,
  sessions_b INTEGER DEFAULT 0,
  conversions_a INTEGER DEFAULT 0,
  conversions_b INTEGER DEFAULT 0,
  revenue_a NUMERIC(12,2) DEFAULT 0,
  revenue_b NUMERIC(12,2) DEFAULT 0,
  aov_a NUMERIC(10,2) DEFAULT 0,
  aov_b NUMERIC(10,2) DEFAULT 0,
  cvr_a NUMERIC(6,4) DEFAULT 0,
  cvr_b NUMERIC(6,4) DEFAULT 0
);

-- Intent-only element tracking (no vanity clicks)
CREATE TABLE public.ab_intent_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_id UUID REFERENCES public.ab_tests(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  ab_variant TEXT NOT NULL CHECK (ab_variant IN ('A', 'B')),
  element_type TEXT NOT NULL CHECK (element_type IN ('cta_button', 'price_section', 'gallery', 'sticky_atc', 'hero_props', 'benefits', 'urgency', 'reviews')),
  event_type TEXT NOT NULL CHECK (event_type IN ('click', 'hover', 'scroll_into_view')),
  led_to_atc BOOLEAN DEFAULT FALSE,
  led_to_checkout BOOLEAN DEFAULT FALSE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  page_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Test archive with learning memory
CREATE TABLE public.ab_test_archive (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_id UUID NOT NULL,
  test_name TEXT NOT NULL,
  
  -- Full snapshot for restore
  snapshot_json JSONB NOT NULL,
  
  -- Summary metrics
  metrics_summary JSONB NOT NULL DEFAULT '{}',
  winner TEXT CHECK (winner IN ('A', 'B', 'inconclusive')),
  lift_percent NUMERIC(6,2),
  total_sessions INTEGER DEFAULT 0,
  total_revenue NUMERIC(12,2) DEFAULT 0,
  
  -- Learning template (compounding knowledge)
  learning_template JSONB DEFAULT '{"what_changed": "", "why_worked": "", "future_use": ""}',
  
  -- Archive metadata
  is_restorable BOOLEAN DEFAULT TRUE,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_by TEXT
);

-- Auto-stop events log
CREATE TABLE public.ab_auto_stop_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_id UUID REFERENCES public.ab_tests(id) ON DELETE CASCADE,
  rule_triggered TEXT NOT NULL,
  metrics_at_trigger JSONB NOT NULL,
  action_taken TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ab_intent_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ab_test_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ab_auto_stop_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow all operations for now (internal admin tool)
CREATE POLICY "Allow all access to ab_tests" ON public.ab_tests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to ab_intent_events" ON public.ab_intent_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to ab_test_archive" ON public.ab_test_archive FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to ab_auto_stop_log" ON public.ab_auto_stop_log FOR ALL USING (true) WITH CHECK (true);

-- Index for fast queries
CREATE INDEX idx_ab_tests_status ON public.ab_tests(status);
CREATE INDEX idx_ab_tests_impact_zone ON public.ab_tests(impact_zone);
CREATE INDEX idx_ab_intent_events_test_id ON public.ab_intent_events(test_id);
CREATE INDEX idx_ab_intent_events_session ON public.ab_intent_events(session_id);
CREATE INDEX idx_ab_test_archive_test_id ON public.ab_test_archive(test_id);
CREATE INDEX idx_ab_test_archive_archived_at ON public.ab_test_archive(archived_at DESC);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.ab_tests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ab_intent_events;