-- Allow admins to read checkout analytics (needed for /risebynight/tracking TBLS tab)
CREATE POLICY "Admins can read checkout analytics"
ON public.checkout_analytics
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'::app_role
  )
);
