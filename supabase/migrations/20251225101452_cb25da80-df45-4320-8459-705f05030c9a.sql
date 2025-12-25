-- Allow admins to read pinterest_context for diagnostics
CREATE POLICY "Admins can view pinterest context"
ON public.pinterest_context
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);