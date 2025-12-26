-- Create view for live (non-test) sleep nights
CREATE OR REPLACE VIEW public.sleep_nights_live AS
SELECT * FROM public.sleep_nights WHERE is_test = FALSE;

-- Create view for live (non-test) raw events
CREATE OR REPLACE VIEW public.sleep_raw_events_live AS
SELECT id, user_id, source, dedupe_key, external_night_id, start_time, end_time, stages, received_at, is_test
FROM public.sleep_raw_events WHERE is_test = FALSE;

-- Composite index for Sleep Coach queries (user_id, night_date) excluding test data
CREATE INDEX IF NOT EXISTS idx_sleep_nights_user_date_live 
ON public.sleep_nights(user_id, night_date) 
WHERE is_test = FALSE;

-- Composite index for raw events queries
CREATE INDEX IF NOT EXISTS idx_sleep_raw_events_user_source_live 
ON public.sleep_raw_events(user_id, source) 
WHERE is_test = FALSE;