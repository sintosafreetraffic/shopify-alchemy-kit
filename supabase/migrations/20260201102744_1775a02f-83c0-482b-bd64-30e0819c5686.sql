-- Add attribution_source column to meta_purchase_events
-- Classifies how the event can be matched: click_id, email_match, or unmatched
ALTER TABLE public.meta_purchase_events 
ADD COLUMN IF NOT EXISTS attribution_source TEXT;

-- Add attribution_source column to google_purchase_events
ALTER TABLE public.google_purchase_events 
ADD COLUMN IF NOT EXISTS attribution_source TEXT;

-- Add comment explaining the classification
COMMENT ON COLUMN public.meta_purchase_events.attribution_source IS 
'Attribution classification: click_id (has fbc/fbp), email_match (has email but no click ID), unmatched (minimal data)';

COMMENT ON COLUMN public.google_purchase_events.attribution_source IS 
'Attribution classification: click_id (has gclid), email_match (has email but no gclid), unmatched (minimal data)';