
-- Enable RLS for storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to view avatars
CREATE POLICY "Authenticated users can view avatars" 
ON storage.objects FOR SELECT 
TO authenticated
USING (bucket_id = 'avatars');

-- Policy to allow users to upload their own avatar
CREATE POLICY "Users can upload their own avatar" 
ON storage.objects FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy to allow users to update their own avatar
CREATE POLICY "Users can update their own avatar" 
ON storage.objects FOR UPDATE 
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy to allow users to delete their own avatar
CREATE POLICY "Users can delete their own avatar" 
ON storage.objects FOR DELETE 
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
