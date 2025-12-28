-- Create dedicated table for Klaviyo popup events
CREATE TABLE public.klaviyo_form_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  session_id text NOT NULL,
  user_id uuid NULL,
  page_path text NOT NULL,
  form_id text NULL,
  form_version text NULL,
  event_type text NOT NULL CHECK (event_type IN ('viewed', 'submitted', 'dismissed')),
  source text NOT NULL DEFAULT 'web',
  meta jsonb NULL DEFAULT '{}'::jsonb
);

-- Create unique constraint to prevent double counting per session/form/event
CREATE UNIQUE INDEX klaviyo_form_events_dedupe_idx 
ON public.klaviyo_form_events (session_id, COALESCE(form_id, 'default'), event_type);

-- Create index for analytics queries
CREATE INDEX klaviyo_form_events_created_at_idx ON public.klaviyo_form_events (created_at DESC);
CREATE INDEX klaviyo_form_events_event_type_idx ON public.klaviyo_form_events (event_type);

-- Enable RLS
ALTER TABLE public.klaviyo_form_events ENABLE ROW LEVEL SECURITY;

-- Only admins can read raw events (analytics served via edge function)
CREATE POLICY "Admins can read klaviyo form events"
ON public.klaviyo_form_events
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid() 
  AND user_roles.role = 'admin'::app_role
));

-- No direct inserts allowed - must go through edge function with service role
CREATE POLICY "No direct inserts allowed"
ON public.klaviyo_form_events
FOR INSERT
WITH CHECK (false);

-- No updates allowed
CREATE POLICY "No updates allowed"
ON public.klaviyo_form_events
FOR UPDATE
USING (false);

-- No deletes allowed
CREATE POLICY "No deletes allowed"
ON public.klaviyo_form_events
FOR DELETE
USING (false);