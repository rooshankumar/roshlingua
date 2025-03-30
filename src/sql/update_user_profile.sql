
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
  streak_count INTEGER DEFAULT 0,
  onboarding_completed BOOLEAN DEFAULT FALSE
) RETURNS VOID AS $$
BEGIN
  -- Validate UUID
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'user_id cannot be null';
  END IF;

  -- Perform the update with proper WHERE clause
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
    onboarding_completed = COALESCE(update_user_profile.onboarding_completed, users.onboarding_completed),
    updated_at = NOW()
  WHERE id = user_id;

  -- Check if update was successful
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User with ID % not found', user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
