-- Phase 2: Observability & Drift Detection Tables
-- tracking_health_daily - Daily metrics snapshot
CREATE TABLE tracking_health_daily (
  day date PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  window_start timestamptz NOT NULL,
  window_end timestamptz NOT NULL,

  -- Order-side metrics
  orders_seen integer NOT NULL DEFAULT 0,
  success_count integer NOT NULL DEFAULT 0,
  error_count integer NOT NULL DEFAULT 0,
  pending_count integer NOT NULL DEFAULT 0,
  unknown_status integer NOT NULL DEFAULT 0,

  -- Context-side metrics (NO JOIN with orders)
  context_rows integer NOT NULL DEFAULT 0,
  with_epik integer NOT NULL DEFAULT 0,
  with_ip integer NOT NULL DEFAULT 0,
  with_ua integer NOT NULL DEFAULT 0,
  consent_granted integer NOT NULL DEFAULT 0,

  -- Reconciliation
  reconciliation_mismatches integer NOT NULL DEFAULT 0,

  -- Value (EUR only)
  total_value_eur numeric NOT NULL DEFAULT 0,

  -- Rates (division-safe, 0 if denominator is 0)
  success_rate numeric NOT NULL DEFAULT 0,
  error_rate numeric NOT NULL DEFAULT 0,
  epik_rate numeric NOT NULL DEFAULT 0,
  ip_rate numeric NOT NULL DEFAULT 0,
  ua_rate numeric NOT NULL DEFAULT 0,
  consent_rate numeric NOT NULL DEFAULT 0
);

-- Enable RLS (service-role only - no user policies)
ALTER TABLE tracking_health_daily ENABLE ROW LEVEL SECURITY;

-- tracking_alerts - Drift detection alerts
CREATE TABLE tracking_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  day date NOT NULL,

  severity text NOT NULL CHECK (severity IN ('info', 'warn', 'critical')),
  type text NOT NULL CHECK (
    type IN (
      'success_rate_drop',
      'error_spike',
      'epik_collapse',
      'context_capture_failure',
      'reconciliation_mismatch'
    )
  ),

  message text NOT NULL,
  context jsonb NULL,

  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'acknowledged', 'resolved')),
  acknowledged_at timestamptz NULL
);

-- Enable RLS (service-role only - no user policies)
ALTER TABLE tracking_alerts ENABLE ROW LEVEL SECURITY;

-- tracking_jobs - Job execution audit log
CREATE TABLE tracking_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),

  job_name text NOT NULL CHECK (
    job_name IN ('aggregate-tracking-health', 'reconcile-shopify-orders')
  ),

  window_start timestamptz NULL,
  window_end timestamptz NULL,

  success boolean NOT NULL DEFAULT false,
  duration_ms integer NULL,
  stats jsonb NULL,
  error text NULL
);

-- Enable RLS (service-role only - no user policies)
ALTER TABLE tracking_jobs ENABLE ROW LEVEL SECURITY;

-- Index for efficient alert deduplication checks
CREATE INDEX idx_tracking_alerts_day_type_status 
ON tracking_alerts (day, type, status);

-- Index for job history queries
CREATE INDEX idx_tracking_jobs_job_name_created 
ON tracking_jobs (job_name, created_at DESC);