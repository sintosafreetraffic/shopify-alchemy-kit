-- ============================================
-- SHIPMENT TRACKING NOTIFICATION SYSTEM
-- Tables for 17TRACK → Klaviyo email flows
-- ============================================

-- A) shipment_trackings - Main tracking records with current state
CREATE TABLE public.shipment_trackings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT NOT NULL,
  email TEXT NOT NULL,
  tracking_number TEXT NOT NULL,
  carrier TEXT,
  current_status TEXT NOT NULL DEFAULT 'pending',
  last_status_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Unique per order+tracking combination
  CONSTRAINT shipment_trackings_unique UNIQUE (order_id, tracking_number)
);

-- Enable RLS
ALTER TABLE public.shipment_trackings ENABLE ROW LEVEL SECURITY;

-- Only service role can manage (no client access)
CREATE POLICY "Service role manages shipment_trackings"
  ON public.shipment_trackings
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- Admins can view
CREATE POLICY "Admins can view shipment_trackings"
  ON public.shipment_trackings
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- B) shipment_tracking_events - Append-only audit log
CREATE TABLE public.shipment_tracking_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT NOT NULL,
  tracking_number TEXT NOT NULL,
  status TEXT NOT NULL,
  status_detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload_hash TEXT UNIQUE -- Dedupe raw webhook repeats
);

-- Enable RLS
ALTER TABLE public.shipment_tracking_events ENABLE ROW LEVEL SECURITY;

-- Only service role can insert
CREATE POLICY "Service role manages shipment_tracking_events"
  ON public.shipment_tracking_events
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- Admins can view
CREATE POLICY "Admins can view shipment_tracking_events"
  ON public.shipment_tracking_events
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- C) shipment_notifications - Email notification tracking with dedupe/rate limit states
CREATE TABLE public.shipment_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT NOT NULL,
  tracking_number TEXT NOT NULL,
  status TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'email',
  provider TEXT NOT NULL DEFAULT 'klaviyo',
  status_state TEXT NOT NULL CHECK (status_state IN ('pending', 'sent', 'skipped_dedupe', 'skipped_rate_limit', 'skipped_cap', 'failed')),
  reason TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Dedupe: only one notification per (order, tracking, status, channel)
  CONSTRAINT shipment_notifications_unique UNIQUE (order_id, tracking_number, status, channel)
);

-- Enable RLS
ALTER TABLE public.shipment_notifications ENABLE ROW LEVEL SECURITY;

-- Only service role can manage
CREATE POLICY "Service role manages shipment_notifications"
  ON public.shipment_notifications
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- Admins can view
CREATE POLICY "Admins can view shipment_notifications"
  ON public.shipment_notifications
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add indexes for efficient queries
CREATE INDEX idx_shipment_trackings_order_id ON public.shipment_trackings(order_id);
CREATE INDEX idx_shipment_trackings_email ON public.shipment_trackings(email);
CREATE INDEX idx_shipment_trackings_tracking_number ON public.shipment_trackings(tracking_number);

CREATE INDEX idx_shipment_tracking_events_order_id ON public.shipment_tracking_events(order_id);
CREATE INDEX idx_shipment_tracking_events_tracking_number ON public.shipment_tracking_events(tracking_number);
CREATE INDEX idx_shipment_tracking_events_occurred_at ON public.shipment_tracking_events(occurred_at DESC);

CREATE INDEX idx_shipment_notifications_pending ON public.shipment_notifications(status_state) WHERE status_state = 'pending';
CREATE INDEX idx_shipment_notifications_order_id ON public.shipment_notifications(order_id);
CREATE INDEX idx_shipment_notifications_sent_at ON public.shipment_notifications(sent_at DESC) WHERE sent_at IS NOT NULL;

-- Add shipping email settings to app_settings if not exists
INSERT INTO public.app_settings (key, value)
VALUES 
  ('shipping_email_info_received_enabled', 'false'::jsonb),
  ('shipping_email_pickup_enabled', 'false'::jsonb),
  ('shipping_email_cooldown_hours', '12'::jsonb),
  ('shipping_email_max_per_order', '6'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_shipment_trackings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_shipment_trackings_updated_at
  BEFORE UPDATE ON public.shipment_trackings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_shipment_trackings_updated_at();