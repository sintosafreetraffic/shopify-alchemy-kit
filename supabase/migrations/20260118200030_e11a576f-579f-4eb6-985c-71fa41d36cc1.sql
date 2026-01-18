-- ============================================================================
-- v2.4.1 Quality Events Table for Customer Quality / Refund Proxy
-- ============================================================================

-- Create quality_events table for tracking refunds, cancellations, chargebacks, returns
CREATE TABLE public.quality_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT NOT NULL,
  ab_variant TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('refund', 'cancel', 'chargeback', 'return', 'support_ticket')),
  amount NUMERIC(10, 2),
  currency TEXT DEFAULT 'USD',
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for faster lookups by variant and event type
CREATE INDEX idx_quality_events_variant ON public.quality_events(ab_variant);
CREATE INDEX idx_quality_events_type ON public.quality_events(event_type);
CREATE INDEX idx_quality_events_order ON public.quality_events(order_id);
CREATE INDEX idx_quality_events_created ON public.quality_events(created_at);

-- Enable Row Level Security
ALTER TABLE public.quality_events ENABLE ROW LEVEL SECURITY;

-- Allow public read for analytics dashboard (no auth required for internal tool)
CREATE POLICY "Allow public read for quality_events"
  ON public.quality_events
  FOR SELECT
  USING (true);

-- Allow insert from edge functions (service role)
CREATE POLICY "Allow service role insert for quality_events"
  ON public.quality_events
  FOR INSERT
  WITH CHECK (true);

-- Add comment for documentation
COMMENT ON TABLE public.quality_events IS 'Tracks post-purchase quality signals (refunds, cancellations, chargebacks) per A/B variant for customer quality analysis';

-- ============================================================================
-- Create view for quality metrics aggregation per variant
-- ============================================================================

CREATE OR REPLACE VIEW public.ab_quality_metrics AS
SELECT 
  ab_variant,
  COUNT(*) FILTER (WHERE event_type = 'refund') as refund_count,
  COUNT(*) FILTER (WHERE event_type = 'cancel') as cancel_count,
  COUNT(*) FILTER (WHERE event_type = 'chargeback') as chargeback_count,
  COUNT(*) FILTER (WHERE event_type = 'return') as return_count,
  COUNT(*) FILTER (WHERE event_type = 'support_ticket') as support_ticket_count,
  COUNT(*) as total_quality_events,
  COALESCE(SUM(amount) FILTER (WHERE event_type = 'refund'), 0) as refund_amount,
  COALESCE(SUM(amount) FILTER (WHERE event_type = 'chargeback'), 0) as chargeback_amount
FROM public.quality_events
GROUP BY ab_variant;

COMMENT ON VIEW public.ab_quality_metrics IS 'Aggregated quality metrics per A/B variant for refund proxy calculation';