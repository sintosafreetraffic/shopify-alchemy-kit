-- A/B Testing Events Table
-- Tracks all funnel events with variant assignment for statistical analysis

CREATE TABLE public.ab_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  session_id TEXT NOT NULL,
  ab_variant TEXT NOT NULL CHECK (ab_variant IN ('A', 'B')),
  revenue NUMERIC,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.ab_events ENABLE ROW LEVEL SECURITY;

-- Public insert policy (analytics events from anonymous users)
CREATE POLICY "Allow public insert for ab_events"
ON public.ab_events
FOR INSERT
WITH CHECK (true);

-- Read policy for authenticated admin users only
CREATE POLICY "Allow authenticated read for ab_events"
ON public.ab_events
FOR SELECT
USING (auth.role() = 'authenticated');

-- Indexes for query performance
CREATE INDEX idx_ab_events_variant ON public.ab_events(ab_variant);
CREATE INDEX idx_ab_events_event_name ON public.ab_events(event_name);
CREATE INDEX idx_ab_events_timestamp ON public.ab_events(timestamp DESC);
CREATE INDEX idx_ab_events_session_variant ON public.ab_events(session_id, ab_variant);

-- View: Performance Overview by Variant
CREATE OR REPLACE VIEW public.ab_performance_overview AS
SELECT 
  ab_variant,
  event_name,
  COUNT(*) as event_count,
  COUNT(DISTINCT session_id) as unique_sessions,
  SUM(COALESCE(revenue, 0)) as total_revenue,
  AVG(COALESCE(revenue, 0)) FILTER (WHERE revenue > 0) as avg_revenue_per_conversion
FROM public.ab_events
GROUP BY ab_variant, event_name
ORDER BY ab_variant, event_name;

-- View: Funnel Comparison (conversion rates by variant)
CREATE OR REPLACE VIEW public.ab_funnel_comparison AS
WITH event_counts AS (
  SELECT 
    ab_variant,
    COUNT(DISTINCT session_id) FILTER (WHERE event_name = 'page_view') as page_views,
    COUNT(DISTINCT session_id) FILTER (WHERE event_name = 'add_to_cart') as add_to_carts,
    COUNT(DISTINCT session_id) FILTER (WHERE event_name = 'initiate_checkout') as initiates,
    COUNT(DISTINCT session_id) FILTER (WHERE event_name = 'purchase') as purchases,
    SUM(COALESCE(revenue, 0)) FILTER (WHERE event_name = 'purchase') as total_revenue
  FROM public.ab_events
  GROUP BY ab_variant
)
SELECT 
  ab_variant,
  page_views,
  add_to_carts,
  initiates,
  purchases,
  total_revenue,
  ROUND((add_to_carts::numeric / NULLIF(page_views, 0) * 100), 2) as atc_rate,
  ROUND((initiates::numeric / NULLIF(page_views, 0) * 100), 2) as ic_rate,
  ROUND((purchases::numeric / NULLIF(page_views, 0) * 100), 2) as purchase_rate
FROM event_counts
ORDER BY ab_variant;

-- View: Revenue Split
CREATE OR REPLACE VIEW public.ab_revenue_split AS
SELECT 
  ab_variant,
  COUNT(DISTINCT session_id) as total_sessions,
  SUM(COALESCE(revenue, 0)) as total_revenue,
  AVG(COALESCE(revenue, 0)) FILTER (WHERE revenue > 0) as avg_order_value,
  COUNT(*) FILTER (WHERE event_name = 'purchase') as total_orders
FROM public.ab_events
GROUP BY ab_variant
ORDER BY ab_variant;

-- Enable realtime for ab_events table (for live dashboard updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.ab_events;