-- 22_storage_avatars_policies.sql
-- Purpose: Ensure 'avatars' bucket exists and allow authenticated users to upload/update/delete
-- their own files while allowing public read. Safe to run multiple times.

BEGIN;

-- 1) Create bucket if it doesn't exist (public read by default)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2) Policies for storage.objects on the avatars bucket
-- Enable RLS if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Public read
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'avatars_public_read'
  ) THEN
    CREATE POLICY avatars_public_read ON storage.objects
      FOR SELECT USING (bucket_id = 'avatars');
  END IF;
END $$;

-- Authenticated users can insert into avatars; owner will be auth.uid()
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'avatars_auth_insert'
  ) THEN
    CREATE POLICY avatars_auth_insert ON storage.objects
      FOR INSERT WITH CHECK (
        bucket_id = 'avatars' AND owner = auth.uid()
      );
  END IF;
END $$;

-- Authenticated users can update their own files in avatars
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'avatars_auth_update'
  ) THEN
    CREATE POLICY avatars_auth_update ON storage.objects
      FOR UPDATE USING (
        bucket_id = 'avatars' AND owner = auth.uid()
      ) WITH CHECK (
        bucket_id = 'avatars' AND owner = auth.uid()
      );
  END IF;
END $$;

-- Authenticated users can delete their own files in avatars
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'avatars_auth_delete'
  ) THEN
    CREATE POLICY avatars_auth_delete ON storage.objects
      FOR DELETE USING (
        bucket_id = 'avatars' AND owner = auth.uid()
      );
  END IF;
END $$;

COMMIT;
