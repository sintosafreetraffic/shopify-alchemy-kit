-- Create public bucket for branding assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to branding assets
CREATE POLICY "Public can view branding assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'branding');