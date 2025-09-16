-- 12_auth_triggers_compat.sql
-- Purpose: Ensure auth user insert trigger creates a compatible profile row
-- and an onboarding_status row. Safe to run multiple times.

BEGIN;

-- Function: public.handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Create or update profile with minimal fields expected by frontend
  INSERT INTO public.profiles (
    id,
    email,
    display_name,
    full_name,
    avatar_url,
    username,
    created_at,
    updated_at,
    last_seen,
    streak_count,
    xp_points,
    progress_percentage
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'picture',
    NULL,
    NOW(),
    NOW(),
    NOW(),
    0,
    0,
    0
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = COALESCE(EXCLUDED.display_name, public.profiles.display_name),
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    updated_at = NOW();

  -- Ensure onboarding_status row exists
  INSERT INTO public.onboarding_status (user_id, is_complete, created_at, updated_at)
  VALUES (NEW.id, FALSE, NOW(), NOW())
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

COMMIT;
