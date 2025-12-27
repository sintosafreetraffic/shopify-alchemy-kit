-- Create garmin_backfill_jobs table for resilient job processing
CREATE TABLE public.garmin_backfill_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  summary_type TEXT NOT NULL,
  start_seconds INTEGER NOT NULL,
  end_seconds INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'rate_limited', 'retrying', 'success', 'failed', 'needs_permission')),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMP WITH TIME ZONE,
  last_http_status INTEGER,
  last_error_message TEXT,
  last_response_kind TEXT CHECK (last_response_kind IN ('json', 'html', 'empty', NULL)),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for worker to find due jobs
CREATE INDEX idx_backfill_jobs_due ON public.garmin_backfill_jobs (status, next_attempt_at) 
WHERE status IN ('queued', 'rate_limited', 'retrying');

-- Create index for user lookups
CREATE INDEX idx_backfill_jobs_user ON public.garmin_backfill_jobs (user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.garmin_backfill_jobs ENABLE ROW LEVEL SECURITY;

-- Users can view their own jobs
CREATE POLICY "Users can view their own backfill jobs" 
ON public.garmin_backfill_jobs 
FOR SELECT 
USING (user_id = auth.uid());

-- Only service role can insert/update (edge functions)
CREATE POLICY "Service role manages backfill jobs" 
ON public.garmin_backfill_jobs 
FOR ALL
USING (false)
WITH CHECK (false);

-- Add trigger for updated_at
CREATE TRIGGER update_garmin_backfill_jobs_updated_at
BEFORE UPDATE ON public.garmin_backfill_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();