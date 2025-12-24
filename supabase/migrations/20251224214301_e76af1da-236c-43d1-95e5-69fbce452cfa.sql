-- Phase 3: Recovery Tables (without CHECK constraint modification)

-- 1. Create recovery_purchase_attempts (immutable audit log)
CREATE TABLE public.recovery_purchase_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  order_id text NOT NULL,
  attempt_no integer NOT NULL,
  method text NOT NULL CHECK (method IN ('direct_capi', 'render', 'none')),
  payload_fingerprint text NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('success', 'failed', 'skipped')),
  http_status integer NULL,
  error_code text NULL,
  error_message text NULL,
  response_json jsonb NULL,
  duration_ms integer NULL,
  CONSTRAINT unique_order_attempt UNIQUE (order_id, attempt_no)
);

-- Index for fast lookups by order_id
CREATE INDEX idx_recovery_attempts_order_id ON public.recovery_purchase_attempts(order_id);

-- Enable RLS (service-role only)
ALTER TABLE public.recovery_purchase_attempts ENABLE ROW LEVEL SECURITY;

-- 2. Create recovery_dead_letters (terminal failures)
CREATE TABLE public.recovery_dead_letters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  order_id text UNIQUE NOT NULL,
  final_status text NOT NULL DEFAULT 'dead_lettered',
  reason text NOT NULL,
  last_attempt_no integer NOT NULL,
  last_error_code text NULL,
  last_error_message text NULL
);

-- Index for fast lookups
CREATE INDEX idx_dead_letters_order_id ON public.recovery_dead_letters(order_id);

-- Enable RLS (service-role only)
ALTER TABLE public.recovery_dead_letters ENABLE ROW LEVEL SECURITY;