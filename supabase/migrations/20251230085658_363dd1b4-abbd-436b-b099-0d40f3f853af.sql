-- Create cache table for Pinterest Ads reporting data
CREATE TABLE public.pinterest_ads_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT UNIQUE NOT NULL,
  payload JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for efficient cache expiry cleanup
CREATE INDEX idx_pinterest_ads_cache_expires ON public.pinterest_ads_cache(expires_at);

-- Enable RLS (admin only access via service role)
ALTER TABLE public.pinterest_ads_cache ENABLE ROW LEVEL SECURITY;

-- No public policies - only service role can access
COMMENT ON TABLE public.pinterest_ads_cache IS 'Cache for Pinterest Ads Analytics API responses';