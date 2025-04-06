
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
    NEW.is_online,
    NEW.streak_count,
    NEW.created_at,
    NEW.updated_at
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
    date_of_birth = NEW.date_of_birth,
    gender = NEW.gender,
    native_language = NEW.native_language,
    learning_language = NEW.learning_language,
    proficiency_level = NEW.proficiency_level,
    learning_goal = NEW.learning_goal,
    is_online = NEW.is_online,
    streak_count = NEW.streak_count,
    updated_at = NEW.updated_at
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
  date_of_birth,
  gender,
  native_language,
  learning_language,
  proficiency_level,
  learning_goal,
  is_online,
  streak_count,
  created_at,
  updated_at
)
SELECT 
  id,
  id,
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
  created_at,
  updated_at
FROM public.users
ON CONFLICT (id) DO UPDATE SET
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
  updated_at = EXCLUDED.updated_at;
