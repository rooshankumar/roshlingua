-- 18_auth_trigger_enrich_profile.sql
-- Purpose: Enrich handle_new_user to capture gender and date_of_birth from OAuth metadata when available
-- Safe to run multiple times.

BEGIN;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_gender text;
  v_birth_raw text;
  v_birthdate date;
BEGIN
  -- Try to extract gender and birthdate from raw_user_meta_data
  v_gender := NULLIF(NEW.raw_user_meta_data->>'gender', '');
  v_birth_raw := NULLIF(NEW.raw_user_meta_data->>'birthdate', '');
  IF v_birth_raw IS NULL THEN
    v_birth_raw := NULLIF(NEW.raw_user_meta_data->>'birthday', '');
  END IF;
  IF v_birth_raw IS NOT NULL THEN
    -- Attempt safe cast; if fails, set NULL
    BEGIN
      v_birthdate := v_birth_raw::date;
    EXCEPTION WHEN others THEN
      v_birthdate := NULL;
    END;
  END IF;

  -- Create or update profile with fields expected by frontend
  INSERT INTO public.profiles (
    id,
    email,
    display_name,
    full_name,
    avatar_url,
    username,
    gender,
    date_of_birth,
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
    v_gender,
    v_birthdate,
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
    gender = COALESCE(EXCLUDED.gender, public.profiles.gender),
    date_of_birth = COALESCE(EXCLUDED.date_of_birth, public.profiles.date_of_birth),
    updated_at = NOW();

  -- Ensure onboarding_status row exists
  INSERT INTO public.onboarding_status (user_id, is_complete, created_at, updated_at)
  VALUES (NEW.id, FALSE, NOW(), NOW())
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

COMMIT;
