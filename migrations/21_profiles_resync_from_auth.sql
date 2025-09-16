-- 21_profiles_resync_from_auth.sql
-- Purpose: For existing users, fill in missing profile fields (display_name, full_name, avatar_url)
-- from auth.users.raw_user_meta_data when profiles already exist but lack values.
-- Safe to run multiple times.

BEGIN;

-- Backfill missing display_name/full_name without overwriting existing non-null values
UPDATE public.profiles p
SET 
  display_name = COALESCE(p.display_name, COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name')),
  full_name    = COALESCE(p.full_name,    COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name')),
  avatar_url   = COALESCE(p.avatar_url,   u.raw_user_meta_data->>'picture'),
  updated_at   = NOW()
FROM auth.users u
WHERE u.id = p.id
  AND (
    p.display_name IS NULL OR p.full_name IS NULL OR p.avatar_url IS NULL
  );

COMMIT;
