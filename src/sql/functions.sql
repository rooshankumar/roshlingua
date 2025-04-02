
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop all triggers first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_message_read ON public.messages;
DROP TRIGGER IF EXISTS on_new_message ON public.messages;

-- Now drop existing functions
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.create_new_user(uuid, text);
DROP FUNCTION IF EXISTS public.create_user_with_onboarding(uuid, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.update_user_profile(uuid, text, text, text, text, text, text, date, text, text, integer);
DROP FUNCTION IF EXISTS public.notify_message_read();
DROP FUNCTION IF EXISTS public.notify_new_message();
DROP FUNCTION IF EXISTS public.update_streak();

-- Basic user creation with onboarding
CREATE OR REPLACE FUNCTION public.create_user_with_onboarding(
  p_user_id uuid,
  p_email text,
  p_full_name text,
  p_native_language text DEFAULT 'English',
  p_learning_language text DEFAULT 'Spanish',
  p_proficiency_level text DEFAULT 'beginner'
) RETURNS TABLE(is_new_user boolean) AS $$
DECLARE
  v_is_new boolean;
BEGIN
  -- Insert into users table
  INSERT INTO public.users (
    id, email, full_name, native_language,
    learning_language, proficiency_level,
    created_at, updated_at
  ) VALUES (
    p_user_id, p_email, p_full_name, p_native_language,
    p_learning_language, p_proficiency_level,
    NOW(), NOW()
  )
  ON CONFLICT (id) DO NOTHING
  RETURNING true INTO v_is_new;

  -- Create onboarding status
  INSERT INTO public.onboarding_status (user_id, is_complete)
  VALUES (p_user_id, false)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN QUERY SELECT COALESCE(v_is_new, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profile update function
CREATE OR REPLACE FUNCTION public.update_user_profile(
  user_id uuid,
  full_name text DEFAULT NULL,
  email text DEFAULT NULL,
  gender text DEFAULT NULL,
  native_language text DEFAULT NULL,
  learning_language text DEFAULT NULL,
  proficiency_level text DEFAULT NULL,
  date_of_birth date DEFAULT NULL,
  bio text DEFAULT NULL,
  avatar_url text DEFAULT NULL
) RETURNS void AS $$
BEGIN
  -- Update the users table
  UPDATE public.users
  SET 
    full_name = COALESCE(update_user_profile.full_name, users.full_name),
    email = COALESCE(update_user_profile.email, users.email),
    gender = COALESCE(update_user_profile.gender, users.gender),
    native_language = COALESCE(update_user_profile.native_language, users.native_language),
    learning_language = COALESCE(update_user_profile.learning_language, users.learning_language),
    proficiency_level = COALESCE(update_user_profile.proficiency_level, users.proficiency_level),
    date_of_birth = COALESCE(update_user_profile.date_of_birth, users.date_of_birth),
    bio = COALESCE(update_user_profile.bio, users.bio),
    avatar_url = COALESCE(update_user_profile.avatar_url, users.avatar_url),
    updated_at = NOW()
  WHERE id = update_user_profile.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Message notification triggers
CREATE OR REPLACE FUNCTION notify_new_message() RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('new_message', row_to_json(NEW)::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION notify_message_read() RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('message_read', row_to_json(NEW)::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS on_new_message ON public.messages;
CREATE TRIGGER on_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION notify_new_message();

DROP TRIGGER IF EXISTS on_message_read ON public.messages;
CREATE TRIGGER on_message_read
  AFTER UPDATE OF is_read ON public.messages
  FOR EACH ROW EXECUTE FUNCTION notify_message_read();
-- Function to delete user and all related data
CREATE OR REPLACE FUNCTION public.delete_user_cascade(user_id uuid)
RETURNS jsonb AS $$
DECLARE
  deleted_counts jsonb;
BEGIN
  -- Start with child tables first
  WITH deletions AS (
    SELECT 
      COUNT(*) FILTER (WHERE table_name = 'messages') as messages_count,
      COUNT(*) FILTER (WHERE table_name = 'conversation_participants') as participants_count,
      COUNT(*) FILTER (WHERE table_name = 'profiles') as profiles_count,
      COUNT(*) FILTER (WHERE table_name = 'users') as users_count,
      COUNT(*) FILTER (WHERE table_name = 'auth.users') as auth_count
    FROM (
      -- Delete messages
      (DELETE FROM public.messages WHERE sender_id = user_id RETURNING 'messages' as table_name)
      UNION ALL
      -- Delete conversation participants
      (DELETE FROM public.conversation_participants WHERE user_id = user_id RETURNING 'conversation_participants')
      UNION ALL
      -- Delete profile
      (DELETE FROM public.profiles WHERE id = user_id RETURNING 'profiles')
      UNION ALL
      -- Delete user record
      (DELETE FROM public.users WHERE id = user_id RETURNING 'users')
      UNION ALL
      -- Try to delete auth user if exists
      (DELETE FROM auth.users WHERE id = user_id RETURNING 'auth.users')
    ) deletions
  )
  SELECT jsonb_build_object(
    'messages', messages_count,
    'participants', participants_count,
    'profiles', profiles_count,
    'users', users_count,
    'auth', auth_count
  ) INTO deleted_counts FROM deletions;

  RETURN deleted_counts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
