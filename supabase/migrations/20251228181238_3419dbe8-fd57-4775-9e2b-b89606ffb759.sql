-- Create a function to get page visits stats with proper aggregation
CREATE OR REPLACE FUNCTION public.get_page_visits_stats(start_date timestamptz)
RETURNS TABLE(
  total_pageviews bigint,
  unique_sessions bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COUNT(*) as total_pageviews,
    COUNT(DISTINCT session_id) as unique_sessions
  FROM page_visits
  WHERE created_at >= start_date
$$;