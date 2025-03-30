
CREATE OR REPLACE FUNCTION public.update_user_profile(
  user_id UUID,
  avatar_url TEXT DEFAULT NULL,
  bio TEXT DEFAULT NULL,
  date_of_birth DATE DEFAULT NULL,
  email TEXT DEFAULT NULL,
  full_name TEXT DEFAULT NULL,
  gender TEXT DEFAULT NULL,
  learning_language TEXT DEFAULT NULL,
  native_language TEXT DEFAULT NULL,
  proficiency_level TEXT DEFAULT NULL,
  streak_count INTEGER DEFAULT 0
) RETURNS VOID AS $$
BEGIN
  -- Update users table with WHERE clause
  UPDATE public.users 
  SET 
    avatar_url = COALESCE(update_user_profile.avatar_url, users.avatar_url),
    bio = COALESCE(update_user_profile.bio, users.bio),
    date_of_birth = COALESCE(update_user_profile.date_of_birth, users.date_of_birth),
    email = COALESCE(update_user_profile.email, users.email),
    full_name = COALESCE(update_user_profile.full_name, users.full_name),
    gender = COALESCE(update_user_profile.gender, users.gender),
    learning_language = COALESCE(update_user_profile.learning_language, users.learning_language),
    native_language = COALESCE(update_user_profile.native_language, users.native_language),
    proficiency_level = COALESCE(update_user_profile.proficiency_level, users.proficiency_level),
    streak_count = COALESCE(update_user_profile.streak_count, users.streak_count),
    updated_at = NOW()
  WHERE id = update_user_profile.user_id;

  -- Handle profiles table with upsert
  INSERT INTO public.profiles (id, bio, avatar_url, streak_count, updated_at)
  VALUES (
    update_user_profile.user_id,
    update_user_profile.bio,
    update_user_profile.avatar_url,
    update_user_profile.streak_count,
    NOW()
  )
  ON CONFLICT (id) 
  DO UPDATE SET
    bio = EXCLUDED.bio,
    avatar_url = EXCLUDED.avatar_url,
    streak_count = EXCLUDED.streak_count,
    updated_at = EXCLUDED.updated_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
