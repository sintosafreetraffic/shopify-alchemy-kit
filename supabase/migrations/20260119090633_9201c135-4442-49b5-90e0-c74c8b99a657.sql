-- ============================================================================
-- v2.4.2 Database Schema: Preflight Runs Table
-- Stores automated test moment results before traffic exposure
-- ============================================================================

-- Create ab_preflight_runs table for storing preflight check results
CREATE TABLE public.ab_preflight_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_id TEXT NOT NULL,
  variant TEXT NOT NULL DEFAULT 'B',
  status TEXT NOT NULL DEFAULT 'pending', -- 'passed', 'degraded', 'failed', 'pending'
  trigger_type TEXT NOT NULL, -- 'variant_saved', 'traffic_increase', 'test_resumed', 'manual'
  checks_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary TEXT,
  run_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  commit_sha TEXT,
  traffic_before INTEGER,
  traffic_after INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for efficient test_id lookups
CREATE INDEX idx_ab_preflight_runs_test_id ON public.ab_preflight_runs(test_id);
CREATE INDEX idx_ab_preflight_runs_status ON public.ab_preflight_runs(status);
CREATE INDEX idx_ab_preflight_runs_run_at ON public.ab_preflight_runs(run_at DESC);

-- Enable RLS
ALTER TABLE public.ab_preflight_runs ENABLE ROW LEVEL SECURITY;

-- Public read access (tracking dashboard is internal-only via route)
CREATE POLICY "Allow public read access to preflight runs" 
ON public.ab_preflight_runs 
FOR SELECT 
USING (true);

-- Public insert access (from edge function or client)
CREATE POLICY "Allow public insert to preflight runs" 
ON public.ab_preflight_runs 
FOR INSERT 
WITH CHECK (true);

-- Public update for completing runs
CREATE POLICY "Allow public update to preflight runs" 
ON public.ab_preflight_runs 
FOR UPDATE 
USING (true);

-- Add comment for documentation
COMMENT ON TABLE public.ab_preflight_runs IS 'Stores automated preflight test results before A/B traffic exposure (v2.4.2)';
COMMENT ON COLUMN public.ab_preflight_runs.trigger_type IS 'What triggered this preflight: variant_saved, traffic_increase, test_resumed, manual';
COMMENT ON COLUMN public.ab_preflight_runs.checks_json IS 'Array of check results: [{name, status, message, duration_ms}]';