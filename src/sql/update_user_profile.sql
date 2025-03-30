
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
  SET full_name = COALESCE(full_name, users.full_name),
      email = COALESCE(email, users.email),
      gender = COALESCE(gender, users.gender),
      native_language = COALESCE(native_language, users.native_language),
      learning_language = COALESCE(learning_language, users.learning_language),
      updated_at = NOW()
  WHERE id = user_id;

  -- Update or insert into profiles table
  INSERT INTO profiles (id, bio, avatar_url, streak_count, updated_at)
  VALUES (user_id, bio, avatar_url, streak_count, NOW())
  ON CONFLICT (id) DO UPDATE
  SET bio = EXCLUDED.bio,
      avatar_url = EXCLUDED.avatar_url,
      streak_count = EXCLUDED.streak_count,
      updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
