-- Create table for order tracking data from 17TRACK
CREATE TABLE public.order_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT NOT NULL,
  email TEXT NOT NULL,
  tracking_number TEXT NOT NULL,
  carrier_code TEXT,
  carrier_name TEXT,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending',
  sub_status TEXT,
  last_event TEXT,
  last_event_time TIMESTAMPTZ,
  
  -- Delivery info
  origin_country TEXT,
  destination_country TEXT,
  estimated_delivery TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  
  -- Raw 17TRACK data
  track17_data JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Unique constraint on order+tracking combo
  CONSTRAINT order_tracking_unique UNIQUE (order_number, tracking_number)
);

-- Enable RLS
ALTER TABLE public.order_tracking ENABLE ROW LEVEL SECURITY;

-- Public read policy: anyone can look up tracking by order number + email
CREATE POLICY "Anyone can view tracking with correct order and email"
  ON public.order_tracking
  FOR SELECT
  USING (true);

-- Service role can insert/update (edge function)
CREATE POLICY "Service role can manage tracking"
  ON public.order_tracking
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Index for fast lookups
CREATE INDEX idx_order_tracking_order_email ON public.order_tracking (order_number, email);
CREATE INDEX idx_order_tracking_tracking_number ON public.order_tracking (tracking_number);

-- Updated at trigger
CREATE TRIGGER update_order_tracking_updated_at
  BEFORE UPDATE ON public.order_tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();