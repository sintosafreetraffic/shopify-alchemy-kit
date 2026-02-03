-- Fix ab_funnel_comparison view to match expected FunnelData interface
DROP VIEW IF EXISTS public.ab_funnel_comparison;

CREATE VIEW public.ab_funnel_comparison WITH (security_invoker = true) AS
SELECT 
  ab_variant,
  COUNT(DISTINCT session_id) AS page_views,
  COUNT(*) FILTER (WHERE event_name = 'add_to_cart') AS add_to_carts,
  COUNT(*) FILTER (WHERE event_name = 'begin_checkout') AS initiates,
  COUNT(*) FILTER (WHERE event_name = 'purchase') AS purchases,
  SUM(COALESCE(revenue, 0)) FILTER (WHERE event_name = 'purchase') AS total_revenue,
  ROUND(
    (COUNT(*) FILTER (WHERE event_name = 'add_to_cart')::numeric / NULLIF(COUNT(DISTINCT session_id), 0)) * 100, 
    2
  ) AS atc_rate,
  ROUND(
    (COUNT(*) FILTER (WHERE event_name = 'begin_checkout')::numeric / NULLIF(COUNT(*) FILTER (WHERE event_name = 'add_to_cart'), 0)) * 100, 
    2
  ) AS ic_rate,
  ROUND(
    (COUNT(*) FILTER (WHERE event_name = 'purchase')::numeric / NULLIF(COUNT(DISTINCT session_id), 0)) * 100, 
    2
  ) AS purchase_rate
FROM public.ab_events
GROUP BY ab_variant
ORDER BY ab_variant;