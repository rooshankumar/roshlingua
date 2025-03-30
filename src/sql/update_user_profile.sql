
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
  UPDATE public.users u
  SET 
    avatar_url = COALESCE(update_user_profile.avatar_url, u.avatar_url),
    bio = COALESCE(update_user_profile.bio, u.bio),
    date_of_birth = COALESCE(update_user_profile.date_of_birth, u.date_of_birth),
    email = COALESCE(update_user_profile.email, u.email),
    full_name = COALESCE(update_user_profile.full_name, u.full_name),
    gender = COALESCE(update_user_profile.gender, u.gender),
    learning_language = COALESCE(update_user_profile.learning_language, u.learning_language),
    native_language = COALESCE(update_user_profile.native_language, u.native_language),
    proficiency_level = COALESCE(update_user_profile.proficiency_level, u.proficiency_level),
    streak_count = COALESCE(update_user_profile.streak_count, u.streak_count),
    updated_at = NOW()
  WHERE u.id = update_user_profile.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
