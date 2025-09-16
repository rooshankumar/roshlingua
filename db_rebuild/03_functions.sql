-- Roshlíngua DB Rebuild — 03_functions.sql
-- Purpose: Functions, triggers, and minimal RPCs

BEGIN;

-- Ensure common extensions (Supabase usually has pgcrypto)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ===== handle_new_user (trigger on auth.users) =====
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create a profile row with minimal fields, including display name and avatar when available
  INSERT INTO public.profiles (id, email, display_name, avatar_url, created_at, updated_at, last_seen)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      (NEW.raw_user_meta_data->>'full_name'),
      (NEW.raw_user_meta_data->>'name'),
      (NEW.raw_user_meta_data->>'user_name'),
      NULL
    ),
    COALESCE(
      (NEW.raw_user_meta_data->>'picture'),
      (NEW.raw_user_meta_data->>'avatar_url'),
      NULL
    ),
    now(),
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  -- Create onboarding row
  INSERT INTO public.onboarding_status (user_id, is_complete, created_at, updated_at)
  VALUES (NEW.id, false, now(), now())
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ===== handle_user_profile_upsert (RPC-style function) =====
CREATE OR REPLACE FUNCTION public.handle_user_profile_upsert(
  user_id uuid,
  user_email text,
  current_timestamp timestamptz
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, created_at, updated_at, last_seen)
  VALUES (user_id, user_email, current_timestamp, current_timestamp, current_timestamp)
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      updated_at = EXCLUDED.updated_at,
      last_seen = EXCLUDED.last_seen;
END;$$;

GRANT EXECUTE ON FUNCTION public.handle_user_profile_upsert(uuid, text, timestamptz) TO authenticated;


-- ===== update_user_streak (trigger on profiles BEFORE UPDATE OF last_seen) =====
CREATE OR REPLACE FUNCTION public.update_user_streak()
RETURNS TRIGGER AS $$
DECLARE
  last_date DATE;
BEGIN
  SELECT last_seen::date INTO last_date FROM public.profiles WHERE id = NEW.id;

  IF last_date IS NULL THEN
    NEW.streak_count = 1;
  ELSE
    IF CURRENT_DATE = last_date + INTERVAL '1 day' THEN
      NEW.streak_count = NEW.streak_count + 1;
    ELSIF CURRENT_DATE = last_date THEN
      -- keep
      NULL;
    ELSE
      NEW.streak_count = 1;
    END IF;
  END IF;

  NEW.last_seen = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_streak_trigger ON public.profiles;
CREATE TRIGGER update_user_streak_trigger
  BEFORE UPDATE OF last_seen ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_user_streak();


-- ===== XP helper functions (simplified, aligned to profiles.xp_points) =====
CREATE TABLE IF NOT EXISTS public.xp_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  points_earned int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.get_xp_rewards()
RETURNS TABLE (
  action_type text,
  base_points int,
  streak_multiplier numeric
) AS $$
  SELECT * FROM (
    VALUES
      ('first_lesson', 10, 1.0::numeric),
      ('lesson_complete', 30, 1.2::numeric),
      ('conversation_started', 30, 1.1::numeric),
      ('message_sent', 5, 1.0::numeric),
      ('daily_login', 20, 1.3::numeric),
      ('profile_complete', 100, 1.0::numeric),
      ('achievement_unlock', 0, 1.0::numeric)
  ) AS rewards(action_type, base_points, streak_multiplier);
$$ LANGUAGE SQL IMMUTABLE;

CREATE OR REPLACE FUNCTION public.calculate_streak_bonus(
  base_xp int,
  streak_count int,
  multiplier numeric
) RETURNS int AS $$
BEGIN
  RETURN FLOOR(base_xp * POWER(multiplier, LEAST(streak_count, 7)))::int;
END;$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.increment_xp(p_user_id uuid, p_action_type text)
RETURNS TABLE (xp_points int, xp_gained int)
LANGUAGE plpgsql AS $$
DECLARE
  base_points int;
  streak_multiplier numeric;
  streak_count int;
  xp_to_add int;
BEGIN
  SELECT r.base_points, r.streak_multiplier
    INTO base_points, streak_multiplier
  FROM public.get_xp_rewards() r
  WHERE r.action_type = p_action_type;

  SELECT COALESCE(p.streak_count, 0) INTO streak_count
  FROM public.profiles p WHERE p.id = p_user_id;

  xp_to_add := public.calculate_streak_bonus(COALESCE(base_points, 0), COALESCE(streak_count, 0), COALESCE(streak_multiplier, 1));

  UPDATE public.profiles
  SET xp_points = COALESCE(xp_points, 0) + xp_to_add,
      updated_at = now()
  WHERE id = p_user_id;

  INSERT INTO public.xp_history (user_id, action_type, points_earned)
  VALUES (p_user_id, p_action_type, COALESCE(xp_to_add, 0));

  RETURN QUERY SELECT xp_points, COALESCE(xp_to_add, 0)
  FROM public.profiles WHERE id = p_user_id;
END;$$;


-- ===== Notifications helper =====
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id uuid,
  p_type text,
  p_payload jsonb DEFAULT '{}'::jsonb
) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE
  nid uuid;
BEGIN
  INSERT INTO public.notifications (id, user_id, type, payload)
  VALUES (gen_random_uuid(), p_user_id, p_type, COALESCE(p_payload, '{}'::jsonb))
  RETURNING id INTO nid;
  RETURN nid;
END;$$;

COMMIT;
