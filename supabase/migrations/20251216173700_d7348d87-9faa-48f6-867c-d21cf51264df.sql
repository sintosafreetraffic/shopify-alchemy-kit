-- Create user_product_ownership table
CREATE TABLE public.user_product_ownership (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  product_slug TEXT NOT NULL,
  acquired_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  shopify_order_id TEXT,
  synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(email, product_slug)
);

-- Enable RLS
ALTER TABLE public.user_product_ownership ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can read own product ownership"
ON public.user_product_ownership
FOR SELECT
USING (email = get_auth_email());

CREATE POLICY "Users can insert own product ownership"
ON public.user_product_ownership
FOR INSERT
WITH CHECK (email = get_auth_email());

CREATE POLICY "Users can update own product ownership"
ON public.user_product_ownership
FOR UPDATE
USING (email = get_auth_email());

-- Index for email lookups
CREATE INDEX idx_user_product_ownership_email ON public.user_product_ownership(email);

-- Add last_shopify_sync to sleep_profiles
ALTER TABLE public.sleep_profiles
ADD COLUMN IF NOT EXISTS last_shopify_sync TIMESTAMP WITH TIME ZONE;