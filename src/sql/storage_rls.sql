
-- Enable RLS for storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to upload files to attachments bucket
CREATE POLICY "Allow authenticated uploads to attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'attachments' 
  AND auth.role() = 'authenticated'
);

-- Policy to allow authenticated users to read files from attachments bucket
CREATE POLICY "Allow authenticated downloads from attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'attachments');
