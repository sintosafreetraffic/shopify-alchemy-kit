-- Day 1-2 Migration: Eliminate Compliance Risk
-- ADD-ONLY: PII hashing columns + event_id + delivery_state

-- ============================================================================
-- 1. Add PII hash columns to pinterest_context (for hashed email/phone storage)
-- ============================================================================
ALTER TABLE public.pinterest_context
  ADD COLUMN IF NOT EXISTS email_hash TEXT,
  ADD COLUMN IF NOT EXISTS phone_hash TEXT;

-- Index for email_hash lookups (attribution matching)
CREATE INDEX IF NOT EXISTS idx_pinterest_context_email_hash 
  ON public.pinterest_context(email_hash) 
  WHERE email_hash IS NOT NULL;

-- ============================================================================
-- 2. Add event_id and delivery_state to pinterest_purchase_events
-- ============================================================================
ALTER TABLE public.pinterest_purchase_events
  ADD COLUMN IF NOT EXISTS event_id TEXT,
  ADD COLUMN IF NOT EXISTS delivery_state TEXT DEFAULT 'pending';

-- Index for event_id deduplication lookups
CREATE INDEX IF NOT EXISTS idx_pinterest_purchase_events_event_id 
  ON public.pinterest_purchase_events(event_id) 
  WHERE event_id IS NOT NULL;

-- Index for delivery_state monitoring (find stuck/pending events)
CREATE INDEX IF NOT EXISTS idx_pinterest_purchase_events_delivery_state 
  ON public.pinterest_purchase_events(delivery_state);

-- Composite index for stuck event detection (pending + older than threshold)
CREATE INDEX IF NOT EXISTS idx_pinterest_purchase_events_delivery_pending_created 
  ON public.pinterest_purchase_events(delivery_state, created_at) 
  WHERE delivery_state = 'pending';

-- ============================================================================
-- 3. Add comment documentation for delivery_state values
-- ============================================================================
COMMENT ON COLUMN public.pinterest_purchase_events.delivery_state IS 
  'Operational delivery state machine: pending (queued), sent (API call succeeded), failed (API call failed), blocked_* (gated by attribution/test/disabled). Used for deduplication and stuck event detection, NOT for analytics.';

COMMENT ON COLUMN public.pinterest_purchase_events.event_id IS 
  'Pinterest event_id for idempotent sends. Generated BEFORE API call, stored BEFORE send. Used for deduplication.';

COMMENT ON COLUMN public.pinterest_context.email_hash IS 
  'SHA-256 hash of lowercase trimmed email. Raw PII must not persist beyond ingestion.';

COMMENT ON COLUMN public.pinterest_context.phone_hash IS 
  'SHA-256 hash of normalized phone (E.164 format). Raw PII must not persist beyond ingestion.';