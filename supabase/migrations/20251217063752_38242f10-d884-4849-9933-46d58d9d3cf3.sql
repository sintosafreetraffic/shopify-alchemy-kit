-- Add track column to affiliates table
ALTER TABLE public.affiliates 
ADD COLUMN IF NOT EXISTS track text DEFAULT 'affiliate' CHECK (track IN ('partner', 'ambassador', 'affiliate'));

-- Add affiliate_id to collective_applications for linking
ALTER TABLE public.collective_applications 
ADD COLUMN IF NOT EXISTS affiliate_id uuid REFERENCES public.affiliates(id);

-- Create partner_ugc_submissions table
CREATE TABLE IF NOT EXISTS public.partner_ugc_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  content_url text NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('instagram_post', 'instagram_reel', 'tiktok', 'youtube', 'blog', 'review', 'other')),
  description text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_at timestamp with time zone,
  reviewed_by uuid,
  admin_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.partner_ugc_submissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for partner_ugc_submissions
CREATE POLICY "Affiliates can view own UGC submissions"
ON public.partner_ugc_submissions
FOR SELECT
USING (affiliate_id IN (
  SELECT id FROM public.affiliates WHERE user_id = auth.uid()
));

CREATE POLICY "Affiliates can insert own UGC submissions"
ON public.partner_ugc_submissions
FOR INSERT
WITH CHECK (affiliate_id IN (
  SELECT id FROM public.affiliates WHERE user_id = auth.uid()
));

CREATE POLICY "Admins can view all UGC submissions"
ON public.partner_ugc_submissions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update UGC submissions"
ON public.partner_ugc_submissions
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_partner_ugc_affiliate_id ON public.partner_ugc_submissions(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_partner_ugc_status ON public.partner_ugc_submissions(status);
CREATE INDEX IF NOT EXISTS idx_affiliates_track ON public.affiliates(track);