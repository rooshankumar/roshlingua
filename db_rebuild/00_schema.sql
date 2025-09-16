-- Roshlíngua DB Rebuild — 00_schema.sql
-- Purpose: Create all core enums and tables (public schema).
-- Provider: Supabase Postgres (auth.users exists and is managed by Supabase)

BEGIN;

-- ========== ENUMS ==========
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('user','moderator','admin');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'activity_type') THEN
    CREATE TYPE activity_type AS ENUM ('quiz','listen','speak','flashcard','dialog');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'thread_type') THEN
    CREATE TYPE thread_type AS ENUM ('ai','dm','group');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'content_type') THEN
    CREATE TYPE content_type AS ENUM ('text','image','audio','system');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'friend_status') THEN
    CREATE TYPE friend_status AS ENUM ('pending','accepted','blocked');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reaction_subject') THEN
    CREATE TYPE reaction_subject AS ENUM ('post','comment');
  END IF;
END $$;

-- ========== CORE PROFILES ==========
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE,
  display_name text,
  avatar_url text,
  native_language text,
  learning_languages text[],
  bio text,
  role user_role NOT NULL DEFAULT 'user',
  email text,
  last_seen timestamptz,
  streak_count int NOT NULL DEFAULT 0,
  xp_points int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ========== LEARNING DOMAIN ==========
CREATE TABLE IF NOT EXISTS public.modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  level text,
  language text NOT NULL,
  description text,
  cover_url text,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  title text NOT NULL,
  order_index int NOT NULL DEFAULT 0,
  duration_sec int,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  type activity_type NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.enrollments (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  PRIMARY KEY (user_id, module_id)
);

CREATE TABLE IF NOT EXISTS public.progress (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  score int NOT NULL DEFAULT 0,
  attempts int NOT NULL DEFAULT 0,
  completed_at timestamptz,
  srs_due_at timestamptz,
  PRIMARY KEY (user_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS public.vocabulary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  language text NOT NULL,
  term text NOT NULL,
  translation text,
  ipa text,
  examples jsonb DEFAULT '[]'::jsonb,
  tags text[]
);

CREATE TABLE IF NOT EXISTS public.user_vocab (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vocab_id uuid NOT NULL REFERENCES public.vocabulary(id) ON DELETE CASCADE,
  ease int DEFAULT 0,
  interval int DEFAULT 0,
  due_at timestamptz,
  last_answer text,
  PRIMARY KEY (user_id, vocab_id)
);

-- ========== CHAT & SOCIAL ==========
CREATE TABLE IF NOT EXISTS public.chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type thread_type NOT NULL,
  title text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_participants (
  thread_id uuid NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text DEFAULT 'member',
  last_read_message_id uuid,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (thread_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  content text,
  content_type content_type NOT NULL DEFAULT 'text',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.message_reactions (
  message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id, emoji)
);

CREATE TABLE IF NOT EXISTS public.friendships (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status friend_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, friend_id)
);

CREATE TABLE IF NOT EXISTS public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  media_urls text[],
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type reaction_subject NOT NULL,
  subject_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ========== GAMIFICATION ==========
CREATE TABLE IF NOT EXISTS public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  icon text,
  criteria jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.user_achievements (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id uuid REFERENCES public.achievements(id) ON DELETE CASCADE,
  earned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS public.xp_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount int NOT NULL,
  reason text,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ========== NOTIFICATIONS ==========
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ========== SETTINGS & AUDIT ==========
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme text,
  locale text,
  email_opt_in boolean DEFAULT true,
  push_opt_in boolean DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text,
  target_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ========== ONBOARDING ==========
CREATE TABLE IF NOT EXISTS public.onboarding_status (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_complete boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMIT;
