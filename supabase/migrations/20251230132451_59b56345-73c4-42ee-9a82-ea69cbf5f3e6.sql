-- Create table for storing AI-generated decision insights
CREATE TABLE public.ads_decision_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level TEXT NOT NULL,
  date_range_start DATE NOT NULL,
  date_range_end DATE NOT NULL,
  granularity TEXT NOT NULL,
  data_hash TEXT NOT NULL,
  insights JSONB NOT NULL,
  summary TEXT,
  eqs_score INTEGER,
  totals_snapshot JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create unique constraint on level + date range + granularity for upsert
CREATE UNIQUE INDEX ads_decision_insights_lookup_idx 
ON public.ads_decision_insights (level, date_range_start, date_range_end, granularity);

-- Index for efficient lookups by date
CREATE INDEX ads_decision_insights_created_at_idx ON public.ads_decision_insights (created_at DESC);

-- Enable RLS
ALTER TABLE public.ads_decision_insights ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read (internal tool)
CREATE POLICY "Allow authenticated users to read insights"
ON public.ads_decision_insights
FOR SELECT
TO authenticated
USING (true);

-- Allow service role to insert/update (edge functions)
CREATE POLICY "Allow service role to manage insights"
ON public.ads_decision_insights
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_ads_decision_insights_updated_at
BEFORE UPDATE ON public.ads_decision_insights
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();