-- Create table to log Google Enhanced Conversions events
CREATE TABLE public.google_purchase_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  value NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  email_hash TEXT,
  phone_hash TEXT,
  gclid TEXT,
  send_status TEXT NOT NULL DEFAULT 'pending',
  response_status INTEGER,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for order lookups
CREATE INDEX idx_google_purchase_events_order_id ON public.google_purchase_events(order_id);
CREATE INDEX idx_google_purchase_events_created_at ON public.google_purchase_events(created_at DESC);

-- Enable RLS
ALTER TABLE public.google_purchase_events ENABLE ROW LEVEL SECURITY;

-- Admin-only access policy
CREATE POLICY "Admin users can view google purchase events"
ON public.google_purchase_events
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));