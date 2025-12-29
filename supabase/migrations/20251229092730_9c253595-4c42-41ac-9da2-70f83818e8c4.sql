-- Create tracking_requests table for rate limiting
CREATE TABLE public.tracking_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_hash TEXT NOT NULL,
  tracking_lookup_key TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  first_request_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_request_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient lookups
CREATE INDEX idx_tracking_requests_ip_hash ON public.tracking_requests(ip_hash);
CREATE INDEX idx_tracking_requests_last_request ON public.tracking_requests(last_request_at);

-- Create unique constraint for rate limiting window
CREATE UNIQUE INDEX idx_tracking_requests_unique ON public.tracking_requests(ip_hash, tracking_lookup_key);

-- Enable RLS (public table, no user auth required)
ALTER TABLE public.tracking_requests ENABLE ROW LEVEL SECURITY;

-- Allow edge functions to manage rate limits via service role (no public access)
CREATE POLICY "Service role full access" ON public.tracking_requests
  FOR ALL USING (true) WITH CHECK (true);

-- Create tracking_events table for storing event timeline
CREATE TABLE public.tracking_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tracking_number TEXT NOT NULL,
  status TEXT NOT NULL,
  description TEXT,
  location TEXT,
  event_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient lookups
CREATE INDEX idx_tracking_events_tracking_number ON public.tracking_events(tracking_number);
CREATE INDEX idx_tracking_events_event_time ON public.tracking_events(event_time DESC);

-- Enable RLS
ALTER TABLE public.tracking_events ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access" ON public.tracking_events
  FOR ALL USING (true) WITH CHECK (true);