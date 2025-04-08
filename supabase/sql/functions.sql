
-- Handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert basic user record
  INSERT INTO public.users (
    id,
    email,
    full_name,
    created_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NOW()
  );

  -- Create onboarding status
  INSERT INTO public.onboarding_status (
    user_id,
    is_complete,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    false,
    NOW(),
    NOW()
  );

  -- Create notification settings

  -- Create notification settings with defaults
  INSERT INTO public.notification_settings (
    user_id,
    new_messages,
    profile_views,
    learning_reminders,
    streak_reminders,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    true,
    true,
    true,
    true,
    NOW(),
    NOW()
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log any errors for debugging
  RAISE LOG 'Error in handle_new_user: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Keep existing functions below
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
    p_email TEXT,
    p_avatar_url TEXT,
    p_bio TEXT,
    p_date_of_birth DATE,
    p_gender TEXT,
    p_native_language TEXT,
    p_learning_language TEXT,
    p_proficiency_level TEXT,
    p_streak_count INTEGER
) RETURNS void AS $$
BEGIN
    UPDATE public.profiles
    SET 
        full_name = p_full_name,
        email = p_email,
        avatar_url = p_avatar_url,
        bio = p_bio,
        date_of_birth = p_date_of_birth,
        gender = p_gender,
        native_language = p_native_language,
        learning_language = p_learning_language,
        proficiency_level = p_proficiency_level,
        streak_count = p_streak_count,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Ensure profile exists
    INSERT INTO public.profiles (id, user_id, email)
    VALUES (p_user_id, p_user_id, p_email)
    ON CONFLICT (id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
