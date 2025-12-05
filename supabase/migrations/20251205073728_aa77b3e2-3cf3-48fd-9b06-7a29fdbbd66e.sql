-- Add products_owned array column to track individual product ownership
ALTER TABLE public.sleep_profiles 
ADD COLUMN products_owned text[] DEFAULT '{}';

-- Add comment explaining the column
COMMENT ON COLUMN public.sleep_profiles.products_owned IS 'Array of product identifiers the user owns: ergonomic_pillow, knee_pillow, sleep_mask';