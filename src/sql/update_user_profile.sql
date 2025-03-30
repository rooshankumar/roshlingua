
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
  -- Update the users table
  UPDATE users
  SET avatar_url = COALESCE($2, users.avatar_url),
      bio = COALESCE($3, users.bio),
      date_of_birth = COALESCE($4::date, users.date_of_birth),
      email = COALESCE($5, users.email),
      full_name = COALESCE($6, users.full_name),
      gender = COALESCE($7, users.gender),
      learning_language = COALESCE($8, users.learning_language),
      native_language = COALESCE($9, users.native_language),
      proficiency_level = COALESCE($10, users.proficiency_level),
      streak_count = COALESCE($11, users.streak_count),
      updated_at = NOW()
  WHERE id = user_id;

  -- Update or insert into profiles table
  INSERT INTO profiles (id, bio, avatar_url, streak_count, updated_at)
  VALUES (user_id, bio, avatar_url, streak_count, NOW())
  ON CONFLICT (id) DO UPDATE
  SET bio = EXCLUDED.bio,
      avatar_url = EXCLUDED.avatar_url,
      streak_count = EXCLUDED.streak_count,
      updated_at = NOW()
  WHERE profiles.id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
