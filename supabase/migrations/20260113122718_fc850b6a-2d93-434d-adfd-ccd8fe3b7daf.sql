-- Fix views to use SECURITY INVOKER instead of default SECURITY DEFINER
-- This ensures RLS policies are evaluated using the querying user's permissions

DROP VIEW IF EXISTS public.ab_performance_overview;
DROP VIEW IF EXISTS public.ab_funnel_comparison;
DROP VIEW IF EXISTS public.ab_revenue_split;

-- Recreate views with SECURITY INVOKER
CREATE VIEW public.ab_performance_overview 
WITH (security_invoker = true) AS
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

CREATE VIEW public.ab_funnel_comparison 
WITH (security_invoker = true) AS
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

CREATE VIEW public.ab_revenue_split 
WITH (security_invoker = true) AS
SELECT 
  ab_variant,
  COUNT(DISTINCT session_id) as total_sessions,
  SUM(COALESCE(revenue, 0)) as total_revenue,
  AVG(COALESCE(revenue, 0)) FILTER (WHERE revenue > 0) as avg_order_value,
  COUNT(*) FILTER (WHERE event_name = 'purchase') as total_orders
FROM public.ab_events
GROUP BY ab_variant
ORDER BY ab_variant;