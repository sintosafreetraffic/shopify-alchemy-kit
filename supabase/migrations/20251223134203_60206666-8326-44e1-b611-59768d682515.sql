-- ============================================================
-- TRACKING HARDENING PHASE 1: DATABASE CHANGES
-- ============================================================

-- A) Add UNIQUE constraint on pinterest_purchase_events.order_id
-- This prevents duplicate Pinterest events for the same order
ALTER TABLE public.pinterest_purchase_events
ADD CONSTRAINT pinterest_purchase_events_order_id_unique UNIQUE (order_id);

-- B) Create missing_purchase_events table for reconciliation
CREATE TABLE public.missing_purchase_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL,
  order_created_at timestamptz NOT NULL,
  detected_at timestamptz NOT NULL DEFAULT now(),
  window_start timestamptz NOT NULL,
  window_end timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'detected' CHECK (status IN ('detected', 'reviewed', 'ignored', 'recovered')),
  notes text NULL
);

-- Add UNIQUE constraint on order_id to prevent duplicate entries
ALTER TABLE public.missing_purchase_events
ADD CONSTRAINT missing_purchase_events_order_id_unique UNIQUE (order_id);

-- Enable RLS (no public policies - service role only)
ALTER TABLE public.missing_purchase_events ENABLE ROW LEVEL SECURITY;

-- Add index for efficient lookups
CREATE INDEX idx_missing_purchase_events_status ON public.missing_purchase_events(status);
CREATE INDEX idx_missing_purchase_events_detected_at ON public.missing_purchase_events(detected_at DESC);

-- Add comment documenting the table purpose
COMMENT ON TABLE public.missing_purchase_events IS 'Detection table for orders missing from pinterest_purchase_events. Phase 1: detection only, no automatic recovery.';

-- Document render_status lifecycle values (as comment, not enforced)
COMMENT ON COLUMN public.pinterest_purchase_events.render_status IS 'Lifecycle values: pending, success_direct, fallback_render, error_direct_fallback_render';