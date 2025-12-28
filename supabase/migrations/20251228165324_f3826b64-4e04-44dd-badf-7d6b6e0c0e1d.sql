-- Drop the problematic unique index with COALESCE
DROP INDEX IF EXISTS klaviyo_form_events_dedupe_idx;

-- Create a simpler unique constraint on the actual columns
-- For null form_id, we treat it as 'default' by using a partial index approach
-- But simpler: just add a default value to form_id column
ALTER TABLE public.klaviyo_form_events 
ALTER COLUMN form_id SET DEFAULT 'default';

-- Now create a simple unique constraint
CREATE UNIQUE INDEX klaviyo_form_events_dedupe_idx 
ON public.klaviyo_form_events (session_id, form_id, event_type);