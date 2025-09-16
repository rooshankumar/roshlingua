-- Roshlíngua DB Rebuild — 02_rls.sql
-- Purpose: Enable Row Level Security and create core access policies

BEGIN;

-- Enable RLS on all public tables created in 00_schema
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vocabulary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_vocab ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_status ENABLE ROW LEVEL SECURITY;

-- ===== profiles =====
-- public read (you may restrict columns in views if needed)
CREATE POLICY profiles_select_public ON public.profiles
  FOR SELECT USING (true);

-- only the owner can update their profile
CREATE POLICY profiles_update_self ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- insert only allowed via trigger from auth.users; optionally allow self-insert
CREATE POLICY profiles_insert_self ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ===== learning visibility =====
-- modules/lessons/activities: read by all if published; creators/admin can see drafts (simplified to public read)
CREATE POLICY modules_read_all ON public.modules FOR SELECT USING (is_published OR true);
CREATE POLICY lessons_read_all ON public.lessons FOR SELECT USING (is_published OR true);
CREATE POLICY activities_read_all ON public.activities FOR SELECT USING (true);

-- enrollments and progress: owner only
CREATE POLICY enrollments_owner ON public.enrollments
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY progress_owner ON public.progress
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- vocabulary: read all, user_vocab owner only
CREATE POLICY vocabulary_read_all ON public.vocabulary FOR SELECT USING (true);
CREATE POLICY user_vocab_owner ON public.user_vocab
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ===== chat =====
-- threads: participant can read
CREATE POLICY chat_threads_read_participant ON public.chat_threads
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.chat_participants cp
    WHERE cp.thread_id = chat_threads.id AND cp.user_id = auth.uid()
  ));

-- participants: a user can read rows of threads they are in
CREATE POLICY chat_participants_read ON public.chat_participants
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.chat_participants cp
    WHERE cp.thread_id = chat_participants.thread_id AND cp.user_id = auth.uid()
  ));

-- messages: only participants can read/insert
CREATE POLICY chat_messages_select ON public.chat_messages
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.chat_participants cp
    WHERE cp.thread_id = chat_messages.thread_id AND cp.user_id = auth.uid()
  ));

CREATE POLICY chat_messages_insert ON public.chat_messages
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.chat_participants cp
    WHERE cp.thread_id = chat_messages.thread_id AND cp.user_id = auth.uid()
  ));

-- reactions: only participants can react
CREATE POLICY message_reactions_rw ON public.message_reactions
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.chat_participants cp
    JOIN public.chat_messages m ON m.id = message_reactions.message_id
    WHERE cp.thread_id = m.thread_id AND cp.user_id = auth.uid()
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM public.chat_participants cp
    JOIN public.chat_messages m ON m.id = message_reactions.message_id
    WHERE cp.thread_id = m.thread_id AND cp.user_id = auth.uid()
  ));

-- ===== social =====
CREATE POLICY friendships_rw ON public.friendships
  FOR ALL USING (auth.uid() = user_id OR auth.uid() = friend_id)
  WITH CHECK (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY posts_rw ON public.posts
  FOR SELECT USING (true)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY comments_rw ON public.comments
  FOR SELECT USING (true)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY reactions_rw ON public.reactions
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ===== gamification =====
CREATE POLICY achievements_read ON public.achievements FOR SELECT USING (true);
CREATE POLICY user_achievements_owner ON public.user_achievements
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY xp_events_owner ON public.xp_events
  FOR SELECT USING (auth.uid() = user_id);

-- ===== notifications =====
CREATE POLICY notifications_owner ON public.notifications
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY push_subscriptions_owner ON public.push_subscriptions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ===== settings & audit =====
CREATE POLICY user_settings_owner ON public.user_settings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- audit logs: readable by admins only (simple: nobody by default)
-- You may add an admin-only policy later via a role check

-- onboarding status: owner only
CREATE POLICY onboarding_owner ON public.onboarding_status
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

COMMIT;
