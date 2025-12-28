-- garmin_events_raw has RLS enabled but no policies
-- This table stores raw Garmin webhook data, accessed only by service role (Edge Functions)
-- Add a restrictive policy that blocks all client access (service role bypasses RLS)

CREATE POLICY "No direct client access - service role only"
ON public.garmin_events_raw
FOR ALL
USING (false)
WITH CHECK (false);

-- This ensures the table is completely locked down for client access
-- Edge Functions using service role key will still have full access