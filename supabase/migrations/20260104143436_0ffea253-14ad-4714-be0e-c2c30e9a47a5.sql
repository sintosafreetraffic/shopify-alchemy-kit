-- Add RLS policy for admins to insert into app_settings
CREATE POLICY "Admins can insert app_settings" 
ON public.app_settings 
FOR INSERT 
TO authenticated 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add RLS policy for admins to update app_settings
CREATE POLICY "Admins can update app_settings" 
ON public.app_settings 
FOR UPDATE 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));