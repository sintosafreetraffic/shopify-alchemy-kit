-- Cleanup migration: Deactivate all non-canonical affiliate resources
-- Canonical resources are the 8 official ones; all others should be is_active = false
-- This is idempotent: running again has no side effects

UPDATE public.affiliate_resources
SET is_active = false, updated_at = now()
WHERE title NOT IN (
  'Affiliate Program Overview',
  'Your Affiliate Dashboard',
  'Best Performing Hooks & Angles',
  'Short-Form Video Ideas',
  'Logos & Brand Kit',
  'Product Images & Lifestyle Shots',
  'Affiliate Payouts FAQ',
  'Tracking & Attribution FAQ'
)
AND is_active = true;