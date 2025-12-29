-- Pinterest EQS (Event Quality Score) Snapshots table
-- Append-only for trend analysis and regression detection
CREATE TABLE public.pinterest_eqs_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ad_account_id TEXT NOT NULL,
  overall_status TEXT NOT NULL, -- 'GOOD', 'FAIR', 'NEEDS_IMPROVEMENT'
  source_platform TEXT NOT NULL DEFAULT 'WEB',
  ingestion_source TEXT NOT NULL DEFAULT 'CONVERSIONS_API',
  lookback_period TEXT NOT NULL DEFAULT '14d',
  
  -- Raw Pinterest response
  quality_components JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Derived insights (machine-readable)
  coverage_email NUMERIC, -- 0-100%
  coverage_external_id NUMERIC,
  coverage_order_id NUMERIC,
  coverage_click_id NUMERIC,
  
  -- Blocking issues (max 3, stored as array of objects)
  blocking_issues JSONB DEFAULT '[]'::jsonb,
  
  -- API response metadata
  api_response_status INTEGER,
  api_error_message TEXT
);

-- Add index for efficient queries by date
CREATE INDEX idx_pinterest_eqs_snapshots_created_at 
  ON public.pinterest_eqs_snapshots(created_at DESC);

-- Enable RLS
ALTER TABLE public.pinterest_eqs_snapshots ENABLE ROW LEVEL SECURITY;

-- Only admins can view EQS snapshots
CREATE POLICY "Admins can view EQS snapshots"
  ON public.pinterest_eqs_snapshots
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- No direct client inserts/updates/deletes - service role only
CREATE POLICY "No client modifications"
  ON public.pinterest_eqs_snapshots
  FOR ALL
  USING (false)
  WITH CHECK (false);