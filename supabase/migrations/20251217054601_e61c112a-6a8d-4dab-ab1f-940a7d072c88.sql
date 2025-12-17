-- Create checkout_analytics table for tracking checkout reliability metrics
CREATE TABLE IF NOT EXISTS public.checkout_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  duration_ms INTEGER,
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  cart_item_count INTEGER,
  cart_total DECIMAL(10, 2),
  device_type TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.checkout_analytics ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts for tracking (read-only by admin via service role)
CREATE POLICY "Allow anonymous inserts for checkout analytics" 
  ON public.checkout_analytics 
  FOR INSERT 
  WITH CHECK (true);

-- Create index for efficient queries
CREATE INDEX idx_checkout_analytics_event_type_created 
  ON public.checkout_analytics (event_type, created_at DESC);

CREATE INDEX idx_checkout_analytics_session 
  ON public.checkout_analytics (session_id, created_at DESC);