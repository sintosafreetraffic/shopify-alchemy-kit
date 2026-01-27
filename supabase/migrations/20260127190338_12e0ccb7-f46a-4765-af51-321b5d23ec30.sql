-- Drop and recreate the ab_funnel_comparison view to exclude internal team sessions
-- Internal sessions are identified by the payload->>'is_internal' = 'true' flag

DROP VIEW IF EXISTS ab_funnel_comparison;

CREATE OR REPLACE VIEW ab_funnel_comparison AS
WITH event_counts AS (
    SELECT 
        ab_variant,
        COUNT(DISTINCT session_id) FILTER (WHERE event_name = 'page_view') AS page_views,
        COUNT(DISTINCT session_id) FILTER (WHERE event_name = 'add_to_cart') AS add_to_carts,
        COUNT(DISTINCT session_id) FILTER (WHERE event_name = 'initiate_checkout') AS initiates,
        COUNT(DISTINCT session_id) FILTER (WHERE event_name = 'purchase') AS purchases,
        SUM(COALESCE(revenue, 0)) FILTER (WHERE event_name = 'purchase') AS total_revenue
    FROM ab_events
    WHERE COALESCE(payload->>'is_internal', 'false') != 'true'
    GROUP BY ab_variant
)
SELECT 
    ab_variant,
    page_views,
    add_to_carts,
    initiates,
    purchases,
    total_revenue,
    ROUND((add_to_carts::numeric / NULLIF(page_views, 0)::numeric) * 100, 2) AS atc_rate,
    ROUND((initiates::numeric / NULLIF(page_views, 0)::numeric) * 100, 2) AS ic_rate,
    ROUND((purchases::numeric / NULLIF(page_views, 0)::numeric) * 100, 2) AS purchase_rate
FROM event_counts
ORDER BY ab_variant;