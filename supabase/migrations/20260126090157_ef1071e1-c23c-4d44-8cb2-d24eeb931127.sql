-- Add TBLS attribution columns to page_visits
ALTER TABLE public.page_visits
ADD COLUMN IF NOT EXISTS tbls_page_id TEXT,
ADD COLUMN IF NOT EXISTS tbls_pin_id TEXT,
ADD COLUMN IF NOT EXISTS tbls_template TEXT;

-- Add TBLS attribution columns to add_to_cart_analytics
ALTER TABLE public.add_to_cart_analytics
ADD COLUMN IF NOT EXISTS tbls_page_id TEXT,
ADD COLUMN IF NOT EXISTS tbls_pin_id TEXT,
ADD COLUMN IF NOT EXISTS tbls_template TEXT;

-- Add TBLS attribution columns to checkout_analytics
ALTER TABLE public.checkout_analytics
ADD COLUMN IF NOT EXISTS tbls_page_id TEXT,
ADD COLUMN IF NOT EXISTS tbls_pin_id TEXT,
ADD COLUMN IF NOT EXISTS tbls_template TEXT;

-- Create indexes for efficient TBLS queries
CREATE INDEX IF NOT EXISTS idx_page_visits_tbls_page ON public.page_visits(tbls_page_id) WHERE tbls_page_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_add_to_cart_tbls_page ON public.add_to_cart_analytics(tbls_page_id) WHERE tbls_page_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_checkout_tbls_page ON public.checkout_analytics(tbls_page_id) WHERE tbls_page_id IS NOT NULL;