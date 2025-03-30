
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
  UPDATE public.users AS u
  SET 
    avatar_url = COALESCE($2, u.avatar_url),
    bio = COALESCE($3, u.bio),
    date_of_birth = COALESCE($4, u.date_of_birth),
    email = COALESCE($5, u.email),
    full_name = COALESCE($6, u.full_name),
    gender = COALESCE($7, u.gender),
    learning_language = COALESCE($8, u.learning_language),
    native_language = COALESCE($9, u.native_language),
    proficiency_level = COALESCE($10, u.proficiency_level),
    streak_count = COALESCE($11, u.streak_count),
    updated_at = NOW()
  WHERE u.id = $1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
