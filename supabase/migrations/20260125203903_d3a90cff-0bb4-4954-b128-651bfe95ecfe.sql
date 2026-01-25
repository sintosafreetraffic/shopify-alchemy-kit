-- TBLS Purchase Attribution Table
-- Tracks which TBLS landing pages and pins generate revenue

CREATE TABLE public.tbls_purchase_attribution (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT NOT NULL,
  order_number TEXT,
  order_value NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  
  -- TBLS attribution data
  tbls_page_id TEXT,           -- e.g., 'sleep-pain-relief-001'
  tbls_pin_id TEXT,            -- e.g., 'pin_abc123'
  tbls_template TEXT,          -- e.g., 'template-A', 'template-B'
  tbls_subdomain TEXT,         -- e.g., 'acc1.top-commerce.com'
  tbls_category TEXT,          -- e.g., 'sleep', 'neck-pain', 'compare'
  
  -- Session linkage
  session_id TEXT,
  
  -- Additional context
  customer_email_hash TEXT,    -- SHA256 for matching, not PII
  landing_page TEXT,           -- Full URL for debugging
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Prevent duplicates
  CONSTRAINT tbls_purchase_attribution_order_id_unique UNIQUE (order_id)
);

-- Index for TBLS dashboard queries
CREATE INDEX idx_tbls_attr_page_id ON public.tbls_purchase_attribution(tbls_page_id);
CREATE INDEX idx_tbls_attr_pin_id ON public.tbls_purchase_attribution(tbls_pin_id);
CREATE INDEX idx_tbls_attr_template ON public.tbls_purchase_attribution(tbls_template);
CREATE INDEX idx_tbls_attr_created ON public.tbls_purchase_attribution(created_at);

-- Enable RLS (service role only for writes, public read for approved queries)
ALTER TABLE public.tbls_purchase_attribution ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (webhook writes)
CREATE POLICY "Service role full access"
  ON public.tbls_purchase_attribution
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add comment for documentation
COMMENT ON TABLE public.tbls_purchase_attribution IS 'Tracks TBLS landing page attribution to purchases for revenue-per-page analytics';