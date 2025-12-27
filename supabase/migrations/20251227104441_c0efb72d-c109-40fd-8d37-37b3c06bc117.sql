-- Create storage bucket for Garmin activity files (FIT files)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'garmin-activity-files',
  'garmin-activity-files',
  false,
  52428800, -- 50MB max file size
  ARRAY['application/octet-stream', 'application/fit']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policy: Users can only access their own FIT files
CREATE POLICY "Users can view their own activity files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'garmin-activity-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS policy: Only service role can insert (edge function uses service role)
CREATE POLICY "Service role can insert activity files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'garmin-activity-files'
);

-- RLS policy: Users can delete their own files
CREATE POLICY "Users can delete their own activity files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'garmin-activity-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);