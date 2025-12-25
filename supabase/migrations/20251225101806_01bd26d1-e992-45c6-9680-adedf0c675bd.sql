-- Add admin read policies for internal tracking tables

-- tracking_alerts
CREATE POLICY "Admins can view tracking alerts"
ON public.tracking_alerts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- tracking_jobs
CREATE POLICY "Admins can view tracking jobs"
ON public.tracking_jobs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- tracking_health_daily
CREATE POLICY "Admins can view tracking health"
ON public.tracking_health_daily
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- missing_purchase_events
CREATE POLICY "Admins can view missing purchases"
ON public.missing_purchase_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- recovery_purchase_attempts
CREATE POLICY "Admins can view recovery attempts"
ON public.recovery_purchase_attempts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- recovery_dead_letters
CREATE POLICY "Admins can view dead letters"
ON public.recovery_dead_letters
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);