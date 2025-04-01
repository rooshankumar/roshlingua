
-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS public.create_new_user(uuid, text);
DROP FUNCTION IF EXISTS public.create_new_user(uuid, text, text);
DROP FUNCTION IF EXISTS public.create_user_with_onboarding(uuid, text);
DROP FUNCTION IF EXISTS public.update_user_profile(uuid, text, text, text, text, text, text, date, text, text, integer);

-- Basic user creation function
CREATE OR REPLACE FUNCTION public.create_new_user(user_id uuid, user_email text)
RETURNS void AS $$
BEGIN
  INSERT INTO public.users (id, email, created_at, updated_at)
  VALUES (user_id, user_email, NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced user creation with onboarding
CREATE OR REPLACE FUNCTION public.create_user_with_onboarding(
  p_user_id uuid,
  p_email text,
  p_full_name text,
  p_native_language text DEFAULT 'English',
  p_learning_language text DEFAULT 'Spanish',
  p_proficiency_level text DEFAULT 'beginner'
)
RETURNS TABLE(is_new_user boolean) AS $$
DECLARE
  v_is_new boolean;
BEGIN
  -- Try to create the user first
  INSERT INTO public.users (id, email, full_name, created_at, updated_at)
  VALUES (p_user_id, p_email, p_full_name, NOW(), NOW())
  ON CONFLICT (id) DO NOTHING
  RETURNING true INTO v_is_new;

  -- Create or update profile
  INSERT INTO public.profiles (
    user_id,
    full_name,
    native_language,
    learning_language,
    proficiency_level,
    created_at,
    updated_at
  )
  VALUES (
    p_user_id,
    p_full_name,
    p_native_language,
    p_learning_language,
    p_proficiency_level,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    full_name = EXCLUDED.full_name,
    native_language = EXCLUDED.native_language,
    learning_language = EXCLUDED.learning_language,
    proficiency_level = EXCLUDED.proficiency_level,
    updated_at = NOW();

  RETURN QUERY SELECT COALESCE(v_is_new, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profile update function
CREATE OR REPLACE FUNCTION public.update_user_profile(
  user_id uuid,
  full_name text DEFAULT NULL,
  email text DEFAULT NULL,
  gender text DEFAULT NULL,
  native_language text DEFAULT NULL,
  learning_language text DEFAULT NULL,
  proficiency_level text DEFAULT NULL,
  date_of_birth date DEFAULT NULL,
  bio text DEFAULT NULL,
  avatar_url text DEFAULT NULL,
  streak_count integer DEFAULT 0
) RETURNS VOID AS $$
BEGIN
  -- Update the users table
  UPDATE auth.users
  SET 
    raw_user_meta_data = jsonb_set(
      COALESCE(raw_user_meta_data, '{}'::jsonb),
      '{full_name}',
      to_jsonb(COALESCE(update_user_profile.full_name, raw_user_meta_data->>'full_name'))
    )
  WHERE id = update_user_profile.user_id;

  -- Update the profiles table
  UPDATE public.profiles
  SET 
    full_name = COALESCE(update_user_profile.full_name, profiles.full_name),
    bio = COALESCE(update_user_profile.bio, profiles.bio),
    date_of_birth = COALESCE(update_user_profile.date_of_birth, profiles.date_of_birth),
    gender = COALESCE(update_user_profile.gender, profiles.gender),
    learning_language = COALESCE(update_user_profile.learning_language, profiles.learning_language),
    native_language = COALESCE(update_user_profile.native_language, profiles.native_language),
    proficiency_level = COALESCE(update_user_profile.proficiency_level, profiles.proficiency_level),
    avatar_url = COALESCE(update_user_profile.avatar_url, profiles.avatar_url),
    streak_count = COALESCE(update_user_profile.streak_count, profiles.streak_count),
    updated_at = NOW()
  WHERE user_id = update_user_profile.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function for handling new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to handle new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();











