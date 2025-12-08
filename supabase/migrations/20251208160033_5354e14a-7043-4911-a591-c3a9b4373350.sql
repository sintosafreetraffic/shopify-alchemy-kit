-- Add semi-static environment fields to sleep_profiles
-- These are user-editable sleep setup fields that provide context for recommendations

ALTER TABLE public.sleep_profiles 
ADD COLUMN IF NOT EXISTS mattress_thickness text DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS mattress_firmness text DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS bed_height text DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS co_sleeping text DEFAULT 'alone',
ADD COLUMN IF NOT EXISTS bedding_material text DEFAULT 'cotton',
ADD COLUMN IF NOT EXISTS pillow_type text DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS environment_updated_at timestamp with time zone;

-- Add last_environment_change tracking for sync triggers
COMMENT ON COLUMN public.sleep_profiles.mattress_thickness IS 'thin/medium/thick - Semi-static environment field';
COMMENT ON COLUMN public.sleep_profiles.mattress_firmness IS 'soft/medium/firm - Semi-static environment field';
COMMENT ON COLUMN public.sleep_profiles.bed_height IS 'low/standard/high - Semi-static environment field';
COMMENT ON COLUMN public.sleep_profiles.co_sleeping IS 'alone/partner/pet/both - Semi-static environment field';
COMMENT ON COLUMN public.sleep_profiles.bedding_material IS 'cotton/bamboo/silk/synthetic - Semi-static environment field';
COMMENT ON COLUMN public.sleep_profiles.pillow_type IS 'standard/memory_foam/contour/down - Semi-static environment field';
COMMENT ON COLUMN public.sleep_profiles.environment_updated_at IS 'Last time environment fields were updated';