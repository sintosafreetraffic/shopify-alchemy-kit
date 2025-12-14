-- Create collective_applications table
CREATE TABLE public.collective_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  social_handles text,
  reason text NOT NULL,
  preferred_tier text NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  reviewed_at timestamp with time zone,
  reviewed_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.collective_applications ENABLE ROW LEVEL SECURITY;

-- Admin can view all applications
CREATE POLICY "Admins can view all applications"
ON public.collective_applications
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin can update applications (for status changes)
CREATE POLICY "Admins can update applications"
ON public.collective_applications
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Public can insert applications (no auth required)
CREATE POLICY "Anyone can submit applications"
ON public.collective_applications
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- No deletes allowed
CREATE POLICY "No application deletes"
ON public.collective_applications
FOR DELETE
USING (false);