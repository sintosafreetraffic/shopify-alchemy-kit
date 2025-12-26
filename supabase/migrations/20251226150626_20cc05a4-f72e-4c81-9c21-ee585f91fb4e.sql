-- Fix: Recreate views with SECURITY INVOKER (uses querying user's permissions)
DROP VIEW IF EXISTS public.sleep_nights_live;
DROP VIEW IF EXISTS public.sleep_raw_events_live;

CREATE VIEW public.sleep_nights_live 
WITH (security_invoker = true) AS
SELECT * FROM public.sleep_nights WHERE is_test = FALSE;

CREATE VIEW public.sleep_raw_events_live 
WITH (security_invoker = true) AS
SELECT id, user_id, source, dedupe_key, external_night_id, start_time, end_time, stages, received_at, is_test
FROM public.sleep_raw_events WHERE is_test = FALSE;