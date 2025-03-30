
CREATE OR REPLACE FUNCTION public.update_user_profile(
  p_user_id UUID,
  p_avatar_url TEXT,
  p_bio TEXT,
  p_email TEXT,
  p_full_name TEXT,
  p_gender TEXT,
  p_learning_language TEXT,
  p_native_language TEXT,
  p_streak_count INTEGER
) RETURNS VOID AS $$
BEGIN
  -- Update the users table
  UPDATE users
  SET full_name = p_full_name,
      email = p_email,
      gender = p_gender,
      native_language = p_native_language,
      learning_language = p_learning_language,
      updated_at = NOW()
  WHERE id = p_user_id;

  -- Update or insert into profiles table
  INSERT INTO profiles (id, bio, avatar_url, streak_count, updated_at)
  VALUES (p_user_id, p_bio, p_avatar_url, p_streak_count, NOW())
  ON CONFLICT (id) DO UPDATE
  SET bio = EXCLUDED.bio,
      avatar_url = EXCLUDED.avatar_url,
      streak_count = EXCLUDED.streak_count,
      updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
