-- Seed initial affiliate_resources data
-- Uses ON CONFLICT to be idempotent based on (category, title) pair

-- First, create a unique constraint if it doesn't exist
-- This allows us to use ON CONFLICT for idempotent inserts
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'affiliate_resources_category_title_unique'
    ) THEN
        ALTER TABLE public.affiliate_resources 
        ADD CONSTRAINT affiliate_resources_category_title_unique 
        UNIQUE (category, title);
    END IF;
END $$;

-- Insert seed data with ON CONFLICT DO NOTHING for idempotency
INSERT INTO public.affiliate_resources (category, title, description, link_label, link_url, badge, is_active, sort_order)
VALUES 
  -- Getting Started
  (
    'Getting Started',
    'Affiliate Program Overview',
    'How the Rise By Night affiliate program works, how you earn, and how payouts are handled.',
    'Open overview',
    'https://risebynight.com/pages/affiliate-overview',
    'Start here',
    true,
    0
  ),
  (
    'Getting Started',
    'Your Affiliate Dashboard',
    'Learn how to use the dashboard, track sales, and understand your metrics.',
    'View guide',
    'https://risebynight.com/pages/affiliate-dashboard-guide',
    null,
    true,
    1
  ),
  
  -- Content Ideas
  (
    'Content Ideas',
    'Best Performing Hooks & Angles',
    'Proven content angles for talking about neck pain, deep sleep, and performance.',
    'See hooks',
    'https://risebynight.com/pages/affiliate-content-hooks',
    'High converting',
    true,
    0
  ),
  (
    'Content Ideas',
    'Short-Form Video Ideas',
    'Ideas and structures for TikTok, Reels, and Shorts focused on our pillow.',
    'View ideas',
    'https://risebynight.com/pages/affiliate-video-ideas',
    null,
    true,
    1
  ),
  
  -- Brand Assets
  (
    'Brand Assets',
    'Logos & Brand Kit',
    'Official Rise By Night logos, colors, and basic brand rules.',
    'Download brand kit',
    'https://risebynight.com/pages/brand-assets',
    null,
    true,
    0
  ),
  (
    'Brand Assets',
    'Product Images & Lifestyle Shots',
    'Approved images for the ergonomic pillow and related lifestyle scenes.',
    'Open asset library',
    'https://risebynight.com/pages/affiliate-asset-library',
    'Updated',
    true,
    1
  ),
  
  -- FAQ
  (
    'FAQ',
    'Affiliate Payouts FAQ',
    'When you get paid, minimum thresholds, currencies, and methods.',
    'Read FAQ',
    'https://risebynight.com/pages/affiliate-payout-faq',
    null,
    true,
    0
  ),
  (
    'FAQ',
    'Tracking & Attribution FAQ',
    'How tracking works, attribution windows, and what counts as a valid sale.',
    'Read FAQ',
    'https://risebynight.com/pages/affiliate-tracking-faq',
    null,
    true,
    1
  )
ON CONFLICT ON CONSTRAINT affiliate_resources_category_title_unique DO NOTHING;