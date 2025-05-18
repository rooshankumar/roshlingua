
-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads" 
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (
  bucket_id = 'attachments' AND
  owner = auth.uid()
);

-- Create policy to allow authenticated users to read files
CREATE POLICY "Allow authenticated downloads" 
ON storage.objects 
FOR SELECT 
TO authenticated 
USING (bucket_id = 'attachments');
