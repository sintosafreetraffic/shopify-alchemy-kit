-- Create add_to_cart_analytics table for tracking cart events
CREATE TABLE public.add_to_cart_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  product_title TEXT NOT NULL,
  variant_id TEXT NOT NULL,
  variant_title TEXT,
  price NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  quantity INTEGER NOT NULL DEFAULT 1,
  device_type TEXT,
  referrer TEXT,
  page_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.add_to_cart_analytics ENABLE ROW LEVEL SECURITY;

-- Allow public inserts (anonymous tracking)
CREATE POLICY "Allow public insert for add_to_cart_analytics"
  ON public.add_to_cart_analytics
  FOR INSERT
  WITH CHECK (true);

-- Allow admins to read all data
CREATE POLICY "Admins can read add_to_cart_analytics"
  ON public.add_to_cart_analytics
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Create index for efficient querying
CREATE INDEX idx_add_to_cart_session ON public.add_to_cart_analytics(session_id);
CREATE INDEX idx_add_to_cart_created_at ON public.add_to_cart_analytics(created_at DESC);
CREATE INDEX idx_add_to_cart_product ON public.add_to_cart_analytics(product_id);