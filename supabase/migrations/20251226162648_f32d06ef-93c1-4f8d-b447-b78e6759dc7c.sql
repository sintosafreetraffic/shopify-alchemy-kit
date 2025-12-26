-- Add consent tracking columns to sleep_sources
ALTER TABLE public.sleep_sources 
ADD COLUMN IF NOT EXISTS consent_version TEXT NULL,
ADD COLUMN IF NOT EXISTS consent_granted_at TIMESTAMPTZ NULL;

-- Add device_model to sleep_raw_events for attribution
ALTER TABLE public.sleep_raw_events 
ADD COLUMN IF NOT EXISTS device_model TEXT NULL;

-- Add device_model to sleep_nights for easier UI attribution queries
ALTER TABLE public.sleep_nights 
ADD COLUMN IF NOT EXISTS device_model TEXT NULL;

-- Add index for device_model queries on sleep_nights (for attribution display)
CREATE INDEX IF NOT EXISTS idx_sleep_nights_device_model ON public.sleep_nights(device_model) WHERE device_model IS NOT NULL;

-- Comment for clarity
COMMENT ON COLUMN public.sleep_sources.consent_version IS 'Version string of consent agreement (e.g. v1)';
COMMENT ON COLUMN public.sleep_sources.consent_granted_at IS 'Timestamp when user granted consent for this source';
COMMENT ON COLUMN public.sleep_raw_events.device_model IS 'Device model from wearable (e.g. Forerunner 965)';
COMMENT ON COLUMN public.sleep_nights.device_model IS 'Device model propagated from raw event for UI attribution';