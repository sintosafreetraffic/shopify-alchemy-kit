-- Create table to log Meta CAPI purchase events
CREATE TABLE IF NOT EXISTS public.meta_purchase_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  value NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  fbc TEXT,
  fbp TEXT,
  send_status TEXT NOT NULL DEFAULT 'pending',
  response_status INTEGER,
  events_received INTEGER,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique index on order_id to prevent duplicate sends
CREATE UNIQUE INDEX IF NOT EXISTS idx_meta_purchase_events_order_id ON public.meta_purchase_events(order_id);

-- Create index for querying by status
CREATE INDEX IF NOT EXISTS idx_meta_purchase_events_status ON public.meta_purchase_events(send_status);

-- Enable RLS
ALTER TABLE public.meta_purchase_events ENABLE ROW LEVEL SECURITY;

-- Create admin-only policy (no public access)
CREATE POLICY "Admin access only for meta_purchase_events"
ON public.meta_purchase_events
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Add comment
COMMENT ON TABLE public.meta_purchase_events IS 'Logs server-side Meta Conversions API purchase events sent from Shopify webhooks';