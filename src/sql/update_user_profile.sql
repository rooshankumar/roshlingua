
-- Drop existing functions first to avoid conflicts
DROP FUNCTION IF EXISTS public.update_user_profile(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, BOOLEAN
);
DROP FUNCTION IF EXISTS public.update_user_profile(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, INTEGER
);

-- Create the single update_user_profile function
CREATE OR REPLACE FUNCTION public.update_user_profile(
  user_id UUID,
  full_name TEXT DEFAULT NULL,
  email TEXT DEFAULT NULL,
  gender TEXT DEFAULT NULL,
  native_language TEXT DEFAULT NULL,
  learning_language TEXT DEFAULT NULL,
  proficiency_level TEXT DEFAULT NULL,
  date_of_birth DATE DEFAULT NULL,
  bio TEXT DEFAULT NULL,
  avatar_url TEXT DEFAULT NULL,
  streak_count INTEGER DEFAULT 0
) RETURNS VOID AS $$
BEGIN
  -- Validate UUID
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'user_id cannot be null';
  END IF;

  -- Update the users table
  UPDATE auth.users
  SET 
    raw_user_meta_data = jsonb_set(
      raw_user_meta_data,
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
  WHERE id = update_user_profile.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
