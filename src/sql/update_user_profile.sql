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
  UPDATE public.users
  SET 
    avatar_url = COALESCE($2, avatar_url),
    bio = COALESCE($3, bio),
    date_of_birth = COALESCE($4, date_of_birth),
    email = COALESCE($5, email),
    full_name = COALESCE($6, full_name),
    gender = COALESCE($7, gender),
    learning_language = COALESCE($8, learning_language),
    native_language = COALESCE($9, native_language),
    proficiency_level = COALESCE($10, proficiency_level),
    streak_count = COALESCE($11, streak_count),
    updated_at = NOW()
  WHERE id = $1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;