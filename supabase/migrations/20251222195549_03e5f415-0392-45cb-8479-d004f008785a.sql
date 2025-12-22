-- Create pinterest_purchase_events table for local record of server-confirmed purchases
CREATE TABLE public.pinterest_purchase_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id TEXT,
  order_id TEXT NOT NULL,
  event_id TEXT,
  value NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  epik TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  landing_page TEXT,
  source TEXT NOT NULL DEFAULT 'shopify_webhook',
  render_status TEXT NOT NULL,
  render_response JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index on order_id for lookups
CREATE INDEX idx_pinterest_purchase_events_order_id ON public.pinterest_purchase_events(order_id);

-- Add index on created_at for time-based queries
CREATE INDEX idx_pinterest_purchase_events_created_at ON public.pinterest_purchase_events(created_at DESC);

-- Enable RLS
ALTER TABLE public.pinterest_purchase_events ENABLE ROW LEVEL SECURITY;

-- Only allow inserts from service role (edge functions) - no direct user access
CREATE POLICY "Service role can insert purchase events"
ON public.pinterest_purchase_events
FOR INSERT
WITH CHECK (true);

-- Only admins can view purchase events
CREATE POLICY "Admins can view purchase events"
ON public.pinterest_purchase_events
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'::app_role
));

-- No updates or deletes allowed
CREATE POLICY "No updates on purchase events"
ON public.pinterest_purchase_events
FOR UPDATE
USING (false);

CREATE POLICY "No deletes on purchase events"
ON public.pinterest_purchase_events
FOR DELETE
USING (false);