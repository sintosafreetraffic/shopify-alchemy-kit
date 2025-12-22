-- ============================================================
-- pinterest_context table for first-party context tracking
-- Stores context_id -> attribution + match signals for Pinterest CAPI
-- ============================================================

-- Create the pinterest_context table
CREATE TABLE public.pinterest_context (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  context_id text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  consent_status text NOT NULL CHECK (consent_status IN ('granted', 'denied')),
  
  -- Attribution (FIRST-TOUCH immutable - never overwrite once set)
  landing_page text NULL,
  utm_source text NULL,
  utm_medium text NULL,
  utm_campaign text NULL,
  utm_content text NULL,
  utm_term text NULL,
  referrer text NULL,
  
  -- Pinterest click id (LAST-TOUCH - overwrites allowed)
  epik text NULL,
  
  -- Match signals (refreshable; consent-gated)
  client_user_agent text NULL,
  client_ip_address text NULL
);

-- Create indexes for efficient lookups and cleanup
CREATE INDEX idx_pinterest_context_expires_at ON public.pinterest_context(expires_at);
CREATE INDEX idx_pinterest_context_created_at ON public.pinterest_context(created_at);

-- Enable Row Level Security
ALTER TABLE public.pinterest_context ENABLE ROW LEVEL SECURITY;

-- No public access policies - only edge functions with service role can write
-- This is intentional: the table is accessed exclusively via edge functions

-- Create trigger for automatic updated_at timestamp
CREATE TRIGGER update_pinterest_context_updated_at
  BEFORE UPDATE ON public.pinterest_context
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();