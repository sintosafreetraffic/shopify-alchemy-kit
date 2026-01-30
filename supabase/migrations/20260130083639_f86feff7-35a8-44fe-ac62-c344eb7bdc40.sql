-- Add Meta (Facebook) cookie columns to pinterest_context for server-side CAPI enrichment
-- These are captured client-side and synced via track-context for reliable webhook lookup

ALTER TABLE public.pinterest_context 
ADD COLUMN IF NOT EXISTS meta_fbc TEXT,
ADD COLUMN IF NOT EXISTS meta_fbp TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.pinterest_context.meta_fbc IS 'Meta click ID (_fbc cookie) for Conversions API matching';
COMMENT ON COLUMN public.pinterest_context.meta_fbp IS 'Meta browser ID (_fbp cookie) for Conversions API matching';