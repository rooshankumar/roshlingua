

BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE email = user_email) THEN
    INSERT INTO public.users (id, email, created_at, updated_at)
    VALUES (user_id, user_email, NOW(), NOW());
  END IF;
END;


BEGIN
    INSERT INTO public.users (id, email, full_name, created_at, updated_at)
    VALUES (user_id, user_email, user_name, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
END;


BEGIN
    -- Step 1: Insert into the users table first
    INSERT INTO users (id, email, created_at)
    VALUES (new_user_id, new_email, NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Step 2: Insert into profiles table after users exist
    INSERT INTO profiles (id)
    VALUES (new_user_id)
    ON CONFLICT (id) DO NOTHING;

    -- Step 3: Insert into onboarding_status
    INSERT INTO onboarding_status (user_id, status)
    VALUES (new_user_id, 'pending')
    ON CONFLICT (user_id) DO NOTHING;
END;


DECLARE
  v_exists boolean;
  v_is_new boolean;
BEGIN
  -- Check if user exists in our users table
  SELECT EXISTS(SELECT 1 FROM public.users WHERE id = p_user_id) INTO v_exists;
  v_is_new := NOT v_exists;

  -- Only insert if the user doesn't exist
  IF NOT v_exists THEN
    BEGIN
      -- Insert into users table
      INSERT INTO public.users (
        id, email, full_name, native_language, 
        learning_language, proficiency_level
      ) VALUES (
        p_user_id, p_email, p_full_name, p_native_language,
        p_learning_language, p_proficiency_level
      );

      -- Profile should be created by trigger, but ensure it exists
      INSERT INTO public.profiles (id)
      VALUES (p_user_id)
      ON CONFLICT (id) DO NOTHING;

      -- Ensure onboarding status is created
      INSERT INTO public.onboarding_status (user_id, is_complete)
      VALUES (p_user_id, false)
      ON CONFLICT (user_id) DO NOTHING;

    EXCEPTION WHEN OTHERS THEN
      -- Log error but don't fail
      RAISE NOTICE 'Error in create_user_with_onboarding: %', SQLERRM;
    END;
  END IF;

  RETURN QUERY SELECT v_is_new;
END;


BEGIN
    INSERT INTO profiles (id, email)
    VALUES (NEW.id, NEW.email);

    RETURN NEW;
END;


BEGIN
  DELETE FROM public.profiles WHERE id = OLD.id;
  RETURN OLD;
END;


BEGIN
  -- Fix creator_id in conversations table
  IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'conversations' 
      AND column_name = 'creator_id'
  ) THEN
      ALTER TABLE public.conversations ADD COLUMN creator_id UUID REFERENCES public.profiles(id);
  END IF;

  -- Update existing conversations to set creator_id from participants
  UPDATE public.conversations c
  SET creator_id = (
      SELECT cp.user_id 
      FROM public.conversation_participants cp 
      WHERE cp.conversation_id = c.id 
      LIMIT 1
  )
  WHERE c.creator_id IS NULL;

  -- Disable all RLS policies temporarily for testing
  ALTER TABLE public.conversations DISABLE ROW LEVEL SECURITY;
  ALTER TABLE public.conversation_participants DISABLE ROW LEVEL SECURITY;
  ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;

  -- Grant access to tables
  GRANT ALL ON public.conversations TO authenticated;
  GRANT ALL ON public.conversation_participants TO authenticated;
  GRANT ALL ON public.messages TO authenticated;
END;


BEGIN
  RETURN QUERY
  SELECT
    t.relname::text as table_name,
    p.polname::text as policy_name,
    p.polroles::text[] as roles,
    p.polcmd::text as cmd,
    pg_get_expr(p.polqual, p.polrelid)::text as qual,
    pg_get_expr(p.polwithcheck, p.polrelid)::text as with_check
  FROM pg_policy p
  JOIN pg_class t ON p.polrelid = t.oid
  WHERE t.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
END;

BEGIN
  RETURN QUERY
  SELECT 
    tables.table_name::text,
    (SELECT count(*) FROM information_schema.tables t
      LEFT JOIN information_schema.columns c ON c.table_name = t.table_name
      WHERE t.table_name = tables.table_name)::bigint as row_count,
    EXISTS (
      SELECT 1 FROM pg_tables 
      WHERE tablename = tables.table_name 
      AND rowsecurity = true
    ) as has_rls
  FROM information_schema.tables tables
  WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE';
END;


BEGIN
  INSERT INTO public.users (
    id,
    email,
    full_name,
    avatar_url,
    created_at,
    updated_at,
    last_login
  ) VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.created_at,
    NEW.updated_at,
    NEW.last_sign_in_at
  );
  RETURN NEW;
END;


BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;


BEGIN
  PERFORM pg_notify('message_read', row_to_json(NEW)::text);
  RETURN NEW;
END;


BEGIN
  PERFORM pg_notify('new_message', row_to_json(NEW)::text);
  RETURN NEW;
END;

BEGIN
  UPDATE users
  SET 
      instance_id = NEW.instance_id,
      aud = NEW.aud,
      role = NEW.role,
      email = NEW.email,
      encrypted_password = NEW.encrypted_password,
      email_confirmed_at = NEW.email_confirmed_at,
      invited_at = NEW.invited_at,
      confirmation_token = NEW.confirmation_token,
      confirmation_sent_at = NEW.confirmation_sent_at,
      recovery_token = NEW.recovery_token,
      recovery_sent_at = NEW.recovery_sent_at,
      email_change_token_new = NEW.email_change_token_new,
      email_change = NEW.email_change,
      email_change_sent_at = NEW.email_change_sent_at,
      last_sign_in_at = NEW.last_sign_in_at,
      raw_app_meta_data = NEW.raw_app_meta_data,
      raw_user_meta_data = NEW.raw_user_meta_data,
      is_super_admin = NEW.is_super_admin,
      created_at = NEW.created_at,
      updated_at = NOW(),
      phone = NEW.phone,
      phone_confirmed_at = NEW.phone_confirmed_at,
      phone_change = NEW.phone_change,
      phone_change_token = NEW.phone_change_token,
      phone_change_sent_at = NEW.phone_change_sent_at,
      confirmed_at = NEW.confirmed_at,
      email_change_token_current = NEW.email_change_token_current,
      email_change_confirm_status = NEW.email_change_confirm_status,
      banned_until = NEW.banned_until,
      reauthentication_token = NEW.reauthentication_token,
      reauthentication_sent_at = NEW.reauthentication_sent_at,
      is_sso_user = NEW.is_sso_user,
      deleted_at = NEW.deleted_at,
      is_anonymous = NEW.is_anonymous,
      full_name = NEW.full_name,
      gender = NEW.gender,
      date_of_birth = NEW.date_of_birth,
      native_language = NEW.native_language,
      learning_language = NEW.learning_language,
      proficiency_level = NEW.proficiency_level,
      learning_goal = NEW.learning_goal,
      avatar_url = NEW.avatar_url,
      last_login = NEW.last_login,
      streak_count = NEW.streak_count,
      streak_last_date = NEW.streak_last_date,
      is_online = NEW.is_online,
      likes_count = NEW.likes_count,
      username = NEW.username,
      bio = NEW.bio,
      last_seen = NEW.last_seen,
      age = NEW.age,
      last_active_at = NEW.last_active_at
  WHERE id = NEW.id;

  RETURN NEW;
END;


BEGIN
    IF pg_trigger_depth() > 1 THEN
        RETURN NEW;
    END IF;

    PERFORM update_streaks();
    RETURN NEW;
END;


BEGIN
  NEW.age := DATE_PART('year', AGE(NEW.date_of_birth));
  RETURN NEW;
END;



BEGIN
  -- If this is the user's first login, set streak to 1
  IF OLD.streak_count IS NULL THEN
    NEW.streak_count = 1;
  -- If the user logged in yesterday, increase streak
  ELSIF OLD.last_login::date = CURRENT_DATE - INTERVAL '1 day' THEN
    NEW.streak_count = OLD.streak_count + 1;
  ELSE
    -- Reset streak if they missed a day
    NEW.streak_count = 1;
  END IF;

  -- Update last streak date
  NEW.streak_last_date = CURRENT_DATE;
  RETURN NEW;
END;



BEGIN
  -- If user has no last_active_at, set it to NOW() and streak to 1
  IF NEW.last_active_at IS NULL THEN
    NEW.streak_count := 1;
    NEW.last_active_at := NOW();
  ELSE
    -- Calculate days since last activity
    IF DATE(NEW.last_active_at) = DATE(NOW()) THEN
      -- If user already active today, do nothing
      RETURN NEW;
    ELSIF DATE(NEW.last_active_at) = DATE(NOW() - INTERVAL '1 day') THEN
      -- If last activity was exactly one day ago, increase streak
      NEW.streak_count := NEW.streak_count + 1;
      NEW.last_active_at := NOW();
    ELSE
      -- If last activity was more than a day ago, reset streak
      NEW.streak_count := 1;
      NEW.last_active_at := NOW();
    END IF;
  END IF;

  RETURN NEW;
END;


BEGIN
    UPDATE users
    SET streak_count = 
        CASE 
            -- If user was active yesterday, increase streak
            WHEN last_active_at::DATE = CURRENT_DATE - INTERVAL '1 day' THEN streak_count + 1

            -- If user was inactive for more than a day, reset streak
            WHEN last_active_at::DATE < CURRENT_DATE - INTERVAL '1 day' THEN 0

            -- Otherwise, keep the current streak
            ELSE streak_count
        END;
END;


BEGIN
    NEW.last_seen = NOW();
    RETURN NEW;
END;


BEGIN
  -- Validate UUID
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'user_id cannot be null';
  END IF;

  -- Update the users table
  UPDATE auth.users
  SET 
    raw_user_meta_data = jsonb_set(
      raw_user_meta_data,
      '{full_name}',
      to_jsonb(COALESCE(update_user_profile.full_name, raw_user_meta_data->>'full_name'))
    )
  WHERE id = update_user_profile.user_id;

  -- Update the profiles table
  UPDATE public.profiles
  SET 
    full_name = COALESCE(update_user_profile.full_name, profiles.full_name),
    bio = COALESCE(update_user_profile.bio, profiles.bio),
    date_of_birth = COALESCE(update_user_profile.date_of_birth, profiles.date_of_birth),
    gender = COALESCE(update_user_profile.gender, profiles.gender),
    learning_language = COALESCE(update_user_profile.learning_language, profiles.learning_language),
    native_language = COALESCE(update_user_profile.native_language, profiles.native_language),
    proficiency_level = COALESCE(update_user_profile.proficiency_level, profiles.proficiency_level),
    avatar_url = COALESCE(update_user_profile.avatar_url, profiles.avatar_url),
    streak_count = COALESCE(update_user_profile.streak_count, profiles.streak_count),
    updated_at = NOW()
  WHERE id = update_user_profile.user_id;
END;


BEGIN
    IF NEW.last_login::DATE = OLD.streak_last_date + INTERVAL '1 day' THEN
        -- If the user logs in the next day, increase the streak count
        NEW.streak_count = OLD.streak_count + 1;
    ELSIF NEW.last_login::DATE > OLD.streak_last_date + INTERVAL '1 day' THEN
        -- If the login is not consecutive, reset the streak count
        NEW.streak_count = 1;
    END IF;

    -- Update the last streak date to the new login date
    NEW.streak_last_date = NEW.last_login::DATE;

    RETURN NEW;
END;
