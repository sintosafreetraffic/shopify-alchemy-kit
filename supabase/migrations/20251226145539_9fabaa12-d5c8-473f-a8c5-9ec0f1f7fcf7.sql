-- Add is_test column to sleep_raw_events
ALTER TABLE public.sleep_raw_events 
ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT FALSE;

-- Add is_test column to sleep_nights
ALTER TABLE public.sleep_nights 
ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT FALSE;

-- Index for filtering out test data in analytics
CREATE INDEX IF NOT EXISTS idx_sleep_raw_events_is_test ON public.sleep_raw_events(is_test) WHERE is_test = TRUE;
CREATE INDEX IF NOT EXISTS idx_sleep_nights_is_test ON public.sleep_nights(is_test) WHERE is_test = TRUE;