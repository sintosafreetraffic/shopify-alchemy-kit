-- Create affiliate_resources table for database-driven resources
CREATE TABLE public.affiliate_resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  link_label TEXT,
  link_url TEXT,
  badge TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.affiliate_resources ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read active resources
CREATE POLICY "Authenticated users can read active resources"
  ON public.affiliate_resources
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Only admins can insert resources
CREATE POLICY "Admins can insert resources"
  ON public.affiliate_resources
  FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update resources
CREATE POLICY "Admins can update resources"
  ON public.affiliate_resources
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete resources
CREATE POLICY "Admins can delete resources"
  ON public.affiliate_resources
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_affiliate_resources_updated_at
  BEFORE UPDATE ON public.affiliate_resources
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial resources
INSERT INTO public.affiliate_resources (category, title, description, link_label, link_url, badge, sort_order) VALUES
  ('Getting Started', 'How the Affiliate Program Works', 'Share your unique referral link with your audience. When someone makes a purchase through your link, you earn a commission based on your tier level (10-25%).', NULL, NULL, 'Recommended', 1),
  ('Getting Started', 'Main Product Page', 'Link directly to our bestselling Ergonomic Sleep Pillow product page for the highest conversion rates.', 'Visit Product Page', 'https://www.risebynight.com/product/ergonomic-pillow', NULL, 2),
  ('Content Ideas', 'Content Best Practices', 'Focus on pain relief benefits, sleep quality improvements, and personal testimonials. Our customers respond best to authentic stories about overcoming neck pain and poor sleep.', NULL, NULL, NULL, 1),
  ('Content Ideas', 'Social Media Hooks', 'Try hooks like "I finally fixed my morning neck pain" or "The pillow that changed my sleep quality" - personal transformation stories convert best.', NULL, NULL, NULL, 2),
  ('Brand Assets', 'Logos, Images & Creatives', 'Download our official brand assets including logos, product images, and social media templates.', 'Access Brand Assets', 'https://example.com/rise-by-night-affiliate-assets', 'New', 1),
  ('FAQ', 'When do I get paid?', 'Commissions are processed monthly once your pending balance reaches the $50 threshold. Payouts are sent via PayPal or bank transfer.', NULL, NULL, NULL, 1),
  ('FAQ', 'How are referrals tracked?', 'Our system uses cookies to track visitors who click your referral link. They have 30 days to complete a purchase for you to receive credit.', NULL, NULL, NULL, 2);