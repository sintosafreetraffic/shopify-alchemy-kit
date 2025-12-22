-- Create page_visits table for tracking page views
CREATE TABLE public.page_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  path TEXT NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  device_type TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.page_visits ENABLE ROW LEVEL SECURITY;

-- Create policy for public inserts (no auth required for logging)
CREATE POLICY "Allow public inserts" 
ON public.page_visits 
FOR INSERT 
WITH CHECK (true);

-- Create policy for admin reads only
CREATE POLICY "Admins can read page visits" 
ON public.page_visits 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create indexes for efficient querying
CREATE INDEX idx_page_visits_created_at ON public.page_visits (created_at DESC);
CREATE INDEX idx_page_visits_session_id ON public.page_visits (session_id);
CREATE INDEX idx_page_visits_path ON public.page_visits (path);

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.page_visits;