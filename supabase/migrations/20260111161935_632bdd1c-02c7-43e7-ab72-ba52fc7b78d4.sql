-- Create product_reviews table with moderation workflow
CREATE TABLE public.product_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_handle TEXT NOT NULL,
  variant_title TEXT,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  body TEXT NOT NULL,
  is_verified_purchase BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_reply TEXT,
  admin_notes TEXT,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id)
);

-- Create review_media table for photos/videos
CREATE TABLE public.review_media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID NOT NULL REFERENCES public.product_reviews(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type IN ('photo', 'video')),
  storage_path TEXT NOT NULL,
  file_size_bytes INTEGER,
  duration_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create review_helpful_votes table for "was this helpful" feature
CREATE TABLE public.review_helpful_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID NOT NULL REFERENCES public.product_reviews(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(review_id, session_id)
);

-- Create indexes for performance
CREATE INDEX idx_product_reviews_product_handle ON public.product_reviews(product_handle);
CREATE INDEX idx_product_reviews_status ON public.product_reviews(status);
CREATE INDEX idx_product_reviews_created_at ON public.product_reviews(created_at DESC);
CREATE INDEX idx_review_media_review_id ON public.review_media(review_id);
CREATE INDEX idx_review_helpful_votes_review_id ON public.review_helpful_votes(review_id);

-- Enable Row Level Security
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_helpful_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_reviews
-- Anyone can view approved reviews
CREATE POLICY "Anyone can view approved reviews" 
ON public.product_reviews 
FOR SELECT 
USING (status = 'approved');

-- Anyone can submit a review (insert)
CREATE POLICY "Anyone can submit reviews" 
ON public.product_reviews 
FOR INSERT 
WITH CHECK (true);

-- Only admins can update reviews (for moderation)
CREATE POLICY "Admins can update reviews" 
ON public.product_reviews 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Only admins can delete reviews
CREATE POLICY "Admins can delete reviews" 
ON public.product_reviews 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Admins can view all reviews (including pending/rejected)
CREATE POLICY "Admins can view all reviews" 
ON public.product_reviews 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- RLS Policies for review_media
-- Anyone can view media for approved reviews
CREATE POLICY "Anyone can view approved review media" 
ON public.review_media 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.product_reviews 
    WHERE id = review_id AND status = 'approved'
  )
);

-- Anyone can insert media (with their review)
CREATE POLICY "Anyone can upload review media" 
ON public.review_media 
FOR INSERT 
WITH CHECK (true);

-- Admins can view all media
CREATE POLICY "Admins can view all review media" 
ON public.review_media 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- RLS Policies for review_helpful_votes
-- Anyone can view helpful votes
CREATE POLICY "Anyone can view helpful votes" 
ON public.review_helpful_votes 
FOR SELECT 
USING (true);

-- Anyone can vote once per session
CREATE POLICY "Anyone can vote helpful" 
ON public.review_helpful_votes 
FOR INSERT 
WITH CHECK (true);

-- Create storage bucket for review media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'review-media', 
  'review-media', 
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime']
);

-- Storage policies for review-media bucket
CREATE POLICY "Anyone can view review media files"
ON storage.objects FOR SELECT
USING (bucket_id = 'review-media');

CREATE POLICY "Anyone can upload review media files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'review-media');

-- Enable realtime for reviews (admin dashboard updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.product_reviews;