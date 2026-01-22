-- Create product_cost_prices table for tracking cost prices over time
CREATE TABLE public.product_cost_prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_handle TEXT NOT NULL,
  product_title TEXT NOT NULL,
  cost_single NUMERIC(10, 2) NOT NULL,
  cost_bulk NUMERIC(10, 2) NOT NULL,
  effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  effective_to TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for efficient lookups by product and date range
CREATE INDEX idx_product_cost_prices_handle_dates 
ON public.product_cost_prices (product_handle, effective_from, effective_to);

-- Enable RLS
ALTER TABLE public.product_cost_prices ENABLE ROW LEVEL SECURITY;

-- Admin-only access policies
CREATE POLICY "Admins can view all cost prices"
ON public.product_cost_prices
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert cost prices"
ON public.product_cost_prices
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update cost prices"
ON public.product_cost_prices
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Add comment for documentation
COMMENT ON TABLE public.product_cost_prices IS 'Tracks product cost prices over time with versioning for profit calculations';