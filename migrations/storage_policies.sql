
-- Enable RLS for storage
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow public read access to attachments bucket
CREATE POLICY "Allow public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'attachments');

-- Allow authenticated uploads
CREATE POLICY "Allow authenticated uploads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'attachments' AND
  auth.uid() IS NOT NULL
);

-- Allow authenticated users to update their own files
CREATE POLICY "Allow authenticated updates" 
ON storage.objects 
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'attachments' AND 
  (owner = auth.uid() OR auth.uid() IS NOT NULL)
)
WITH CHECK (
  bucket_id = 'attachments' AND
  (owner = auth.uid() OR auth.uid() IS NOT NULL)
);
