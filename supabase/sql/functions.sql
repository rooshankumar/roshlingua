-- Handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    full_name,
    created_at
  ) VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NOW()
  );

  -- Create onboarding status
  INSERT INTO public.onboarding_status (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update user presence
CREATE OR REPLACE FUNCTION public.update_user_presence()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users
  SET last_seen = NOW(),
      is_online = true
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Handle user going offline
CREATE OR REPLACE FUNCTION public.handle_user_offline()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users
  SET is_online = false
  WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Handle new message
CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Update conversation timestamp
  UPDATE public.conversations 
  SET updated_at = NOW(),
      last_message_at = NOW()
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create notification
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_content TEXT,
  p_related_entity_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
  v_enabled BOOLEAN;
BEGIN
  -- Check if notification type is enabled for user
  SELECT CASE p_type 
    WHEN 'new_message' THEN new_messages
    WHEN 'profile_view' THEN profile_views
    WHEN 'learning_reminder' THEN learning_reminders
    WHEN 'streak_reminder' THEN streak_reminders
    ELSE true
  END INTO v_enabled
  FROM notification_settings
  WHERE user_id = p_user_id;

  -- Only create notification if enabled or setting not found (defaults to true)
  IF v_enabled IS NULL OR v_enabled THEN
    INSERT INTO public.notifications (
      user_id,
      type,
      content,
      related_entity_id
    ) VALUES (
      p_user_id,
      p_type,
      p_content,
      p_related_entity_id
    )
    RETURNING id INTO v_notification_id;
  END IF;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Handle new message notification
CREATE OR REPLACE FUNCTION public.handle_message_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Create notification for message recipient
  PERFORM create_notification(
    (SELECT user_id 
     FROM conversation_participants 
     WHERE conversation_id = NEW.conversation_id 
     AND user_id != NEW.sender_id),
    'new_message',
    'You have a new message',
    NEW.id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.update_user_profile(
  p_user_id UUID,
  p_full_name TEXT,
  p_avatar_url TEXT,
  p_bio TEXT,
  p_email TEXT,
  p_gender TEXT,
  p_date_of_birth DATE,
  p_native_language TEXT,
  p_learning_language TEXT,
  p_proficiency_level TEXT,
  p_streak_count INTEGER
) RETURNS void AS $$
BEGIN
  -- Update users table
  UPDATE auth.users 
  SET raw_user_meta_data = jsonb_set(
    raw_user_meta_data,
    '{full_name}',
    to_jsonb(p_full_name)
  )
  WHERE id = p_user_id;

  -- Update or insert into profiles table
  INSERT INTO public.profiles (
    user_id,
    full_name,
    avatar_url,
    bio,
    email,
    gender,
    date_of_birth,
    native_language,
    learning_language,
    proficiency_level,
    streak_count,
    updated_at
  ) VALUES (
    p_user_id,
    p_full_name,
    p_avatar_url,
    p_bio,
    p_email,
    p_gender,
    p_date_of_birth,
    p_native_language,
    p_learning_language,
    p_proficiency_level,
    p_streak_count,
    NOW()
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url,
    bio = EXCLUDED.bio,
    email = EXCLUDED.email,
    gender = EXCLUDED.gender,
    date_of_birth = EXCLUDED.date_of_birth,
    native_language = EXCLUDED.native_language,
    learning_language = EXCLUDED.learning_language,
    proficiency_level = EXCLUDED.proficiency_level,
    streak_count = EXCLUDED.streak_count,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;