-- 16_backfill_profiles_and_onboarding.sql
-- Purpose: Backfill profiles and onboarding_status for existing auth users
-- Safe to run multiple times.

BEGIN;

-- Insert missing profiles
INSERT INTO public.profiles (id, email, display_name, full_name, avatar_url, created_at, updated_at, last_seen)
SELECT u.id,
       u.email,
       COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'),
       COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'),
       u.raw_user_meta_data->>'picture',
       NOW(), NOW(), NOW()
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- Ensure onboarding_status exists
INSERT INTO public.onboarding_status (user_id, is_complete, created_at, updated_at)
SELECT u.id, FALSE, NOW(), NOW()
FROM auth.users u
LEFT JOIN public.onboarding_status s ON s.user_id = u.id
WHERE s.user_id IS NULL;

COMMIT;
