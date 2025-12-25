-- Phase 4.2a: Add source-truth fields for Pinterest attribution gating
-- ADD ONLY - no modifications to existing columns

-- Attribution fields
ALTER TABLE public.pinterest_purchase_events 
ADD COLUMN IF NOT EXISTS attribution_source TEXT NULL;

ALTER TABLE public.pinterest_purchase_events 
ADD COLUMN IF NOT EXISTS attribution_confidence TEXT NULL;

ALTER TABLE public.pinterest_purchase_events 
ADD COLUMN IF NOT EXISTS attribution_reason TEXT NULL;

-- Send decision fields
ALTER TABLE public.pinterest_purchase_events 
ADD COLUMN IF NOT EXISTS send_status TEXT NOT NULL DEFAULT 'pending';

ALTER TABLE public.pinterest_purchase_events 
ADD COLUMN IF NOT EXISTS send_status_reason TEXT NULL;

-- Settings snapshot for audit trail
ALTER TABLE public.pinterest_purchase_events 
ADD COLUMN IF NOT EXISTS send_mode TEXT NULL;

-- Add check constraints for allowed values (non-blocking, just documentation)
COMMENT ON COLUMN public.pinterest_purchase_events.attribution_source IS 'Allowed: pinterest, organic, other, unknown';
COMMENT ON COLUMN public.pinterest_purchase_events.attribution_confidence IS 'Allowed: high, medium, low';
COMMENT ON COLUMN public.pinterest_purchase_events.send_status IS 'Allowed: pending, sent, blocked_attribution, blocked_disabled, blocked_test, blocked_error';

-- Add index for filtering by send_status (useful for dashboard queries)
CREATE INDEX IF NOT EXISTS idx_pinterest_purchase_events_send_status 
ON public.pinterest_purchase_events(send_status);

-- Add index for attribution analysis
CREATE INDEX IF NOT EXISTS idx_pinterest_purchase_events_attribution 
ON public.pinterest_purchase_events(attribution_source, created_at);

-- Insert kill switch setting (ADD ONLY - won't conflict if exists)
INSERT INTO public.app_settings (key, value)
VALUES ('pinterest_purchase_send_mode', '{"mode": "pinterest_only"}'::jsonb)
ON CONFLICT (key) DO NOTHING;