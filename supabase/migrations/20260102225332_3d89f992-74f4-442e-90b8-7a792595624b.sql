-- Confidence decay function for stale hypotheses (no extension needed)
CREATE OR REPLACE FUNCTION public.decay_stale_hypotheses(stale_days INT DEFAULT 14)
RETURNS TABLE(
  hypothesis_id TEXT,
  email TEXT,
  old_confidence TEXT,
  new_confidence TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH stale AS (
    SELECT 
      el.hypothesis_id,
      el.email,
      el.confidence_level,
      CASE el.confidence_level
        WHEN 'HIGH' THEN 'MODERATE'
        WHEN 'MODERATE' THEN 'LOW'
        ELSE 'LOW'
      END AS decayed_level
    FROM epsr_epistemic_ledger el
    WHERE el.status IN ('active', 'pending')
      AND el.outcome IS NULL
      AND el.updated_at < (NOW() - (stale_days || ' days')::INTERVAL)
      AND el.confidence_level != 'LOW'
  ),
  updated AS (
    UPDATE epsr_epistemic_ledger el
    SET 
      confidence_level = s.decayed_level,
      confidence_change = COALESCE(el.confidence_change, '') || 
        CASE WHEN el.confidence_change IS NOT NULL THEN '; ' ELSE '' END ||
        'Auto-decayed from ' || el.confidence_level || ' after ' || stale_days || ' days without outcome (' || NOW()::DATE || ')',
      updated_at = NOW()
    FROM stale s
    WHERE el.email = s.email 
      AND el.hypothesis_id = s.hypothesis_id
    RETURNING el.hypothesis_id, el.email, s.confidence_level::TEXT AS old_conf, s.decayed_level::TEXT AS new_conf
  )
  SELECT 
    updated.hypothesis_id,
    updated.email,
    updated.old_conf,
    updated.new_conf
  FROM updated;
END;
$$;

-- Grant execute to service role only
REVOKE ALL ON FUNCTION public.decay_stale_hypotheses FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decay_stale_hypotheses TO service_role;