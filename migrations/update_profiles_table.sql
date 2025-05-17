
-- Drop existing triggers and constraints first to avoid conflicts
DROP TRIGGER IF EXISTS update_user_streak_trigger ON profiles;
DROP TRIGGER IF EXISTS sync_profiles_trigger ON profiles;

-- Recreate the profiles table with the correct structure
CREATE TABLE IF NOT EXISTS public.profiles_new (
  id uuid NOT NULL,
  username text,
  bio text,
  likes_count integer DEFAULT 0,
  is_online boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  date_of_birth date,
  full_name text,
  gender text,
  learning_goal text,
  learning_language text NOT NULL,
  native_language text NOT NULL,
  onboarding_completed boolean DEFAULT false,
  proficiency_level text NOT NULL DEFAULT 'beginner',
  user_id uuid NOT NULL,
  avatar_url text,
  streak_count integer DEFAULT 0,
  age integer,
  email text,
  last_seen timestamp without time zone,
  xp_points integer DEFAULT 0,
  progress_percentage integer DEFAULT 0,
  xp integer DEFAULT 0,
  country text,
  CONSTRAINT profiles_new_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_new_user_id_key UNIQUE (user_id),
  CONSTRAINT profiles_new_username_key UNIQUE (username),
  CONSTRAINT profiles_new_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Copy data from existing profiles table if it exists
INSERT INTO profiles_new (
  id, username, bio, likes_count, is_online, created_at, updated_at,
  date_of_birth, full_name, gender, learning_goal, learning_language,
  native_language, onboarding_completed, proficiency_level, user_id,
  avatar_url, streak_count, age, email, last_seen, xp_points,
  progress_percentage, xp, country
)
SELECT
  id, username, bio, likes_count, is_online, created_at, updated_at,
  date_of_birth, full_name, gender, learning_goal, 
  COALESCE(learning_language, 'en') as learning_language,
  COALESCE(native_language, 'en') as native_language,
  onboarding_completed, 
  COALESCE(proficiency_level, 'beginner') as proficiency_level,
  id as user_id, -- Use the id as user_id since they should match
  avatar_url, streak_count, age, email, last_seen, xp_points,
  progress_percentage, xp, country
FROM profiles
ON CONFLICT (id) DO NOTHING;

-- Drop old table and rename new one
DROP TABLE IF EXISTS profiles;
ALTER TABLE profiles_new RENAME TO profiles;

-- Recreate the trigger
CREATE TRIGGER update_user_streak_trigger
BEFORE UPDATE OF last_seen ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_user_streak();

-- Recreate the sync trigger if needed
CREATE TRIGGER sync_profiles_trigger 
AFTER UPDATE ON profiles 
FOR EACH ROW 
EXECUTE FUNCTION sync_profiles_to_users();
