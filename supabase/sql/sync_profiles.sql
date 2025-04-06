
-- Function to sync from users to profiles
CREATE OR REPLACE FUNCTION sync_users_to_profiles()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    user_id,
    email,
    full_name,
    avatar_url,
    date_of_birth,
    gender,
    native_language,
    learning_language,
    proficiency_level,
    learning_goal,
    is_online,
    streak_count,
    username,
    likes_count,
    onboarding_completed,
    created_at,
    updated_at
  ) 
  VALUES (
    NEW.id,
    NEW.id,
    NEW.email,
    NEW.full_name,
    NEW.avatar_url,
    NEW.date_of_birth,
    NEW.gender,
    NEW.native_language,
    NEW.learning_language,
    NEW.proficiency_level,
    NEW.learning_goal,
    COALESCE(NEW.is_online, false),
    COALESCE(NEW.streak_count, 0),
    NEW.username,
    COALESCE(NEW.likes_count, 0),
    COALESCE(NEW.onboarding_completed, false),
    COALESCE(NEW.created_at, NOW()),
    COALESCE(NEW.updated_at, NOW())
  )
  ON CONFLICT (id) 
  DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url,
    date_of_birth = EXCLUDED.date_of_birth,
    gender = EXCLUDED.gender,
    native_language = EXCLUDED.native_language,
    learning_language = EXCLUDED.learning_language,
    proficiency_level = EXCLUDED.proficiency_level,
    learning_goal = EXCLUDED.learning_goal,
    is_online = EXCLUDED.is_online,
    streak_count = EXCLUDED.streak_count,
    username = EXCLUDED.username,
    likes_count = EXCLUDED.likes_count,
    onboarding_completed = EXCLUDED.onboarding_completed,
    updated_at = EXCLUDED.updated_at;
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to sync from profiles to users
CREATE OR REPLACE FUNCTION sync_profiles_to_users() 
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users
  SET
    email = NEW.email,
    full_name = NEW.full_name,
    avatar_url = NEW.avatar_url,
    bio = NEW.bio,
    date_of_birth = NEW.date_of_birth,
    gender = NEW.gender,
    native_language = NEW.native_language,
    learning_language = NEW.learning_language,
    proficiency_level = NEW.proficiency_level,
    learning_goal = NEW.learning_goal,
    is_online = COALESCE(NEW.is_online, false),
    streak_count = COALESCE(NEW.streak_count, 0),
    username = NEW.username,
    onboarding_completed = COALESCE(NEW.onboarding_completed, false),
    updated_at = COALESCE(NEW.updated_at, NOW())
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for both directions
DROP TRIGGER IF EXISTS sync_users_trigger ON public.users;
CREATE TRIGGER sync_users_trigger
  AFTER INSERT OR UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_users_to_profiles();

DROP TRIGGER IF EXISTS sync_profiles_trigger ON public.profiles;
CREATE TRIGGER sync_profiles_trigger
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_profiles_to_users();

-- Update existing profiles with user data
INSERT INTO public.profiles (
  id,
  user_id,
  email,
  full_name,
  avatar_url,
  bio,
  date_of_birth,
  gender,
  native_language,
  learning_language,
  proficiency_level,
  learning_goal,
  is_online,
  streak_count,
  username,
  likes_count,
  onboarding_completed,
  created_at,
  updated_at
)
SELECT 
  id,
  id,
  email,
  full_name,
  avatar_url,
  bio,
  date_of_birth,
  gender,
  native_language,
  learning_language,
  proficiency_level,
  learning_goal,
  COALESCE(is_online, false),
  COALESCE(streak_count, 0),
  username,
  COALESCE(likes_count, 0),
  COALESCE(onboarding_completed, false),
  COALESCE(created_at, NOW()),
  COALESCE(updated_at, NOW())
FROM public.users
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  avatar_url = EXCLUDED.avatar_url,
  bio = EXCLUDED.bio,
  date_of_birth = EXCLUDED.date_of_birth,
  gender = EXCLUDED.gender,
  native_language = EXCLUDED.native_language,
  learning_language = EXCLUDED.learning_language,
  proficiency_level = EXCLUDED.proficiency_level,
  learning_goal = EXCLUDED.learning_goal,
  is_online = EXCLUDED.is_online,
  streak_count = EXCLUDED.streak_count,
  username = EXCLUDED.username,
  likes_count = EXCLUDED.likes_count,
  onboarding_completed = EXCLUDED.onboarding_completed,
  updated_at = EXCLUDED.updated_at;
