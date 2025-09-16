-- Roshlíngua DB Rebuild — 01_indexes.sql
-- Purpose: Keys and performance indexes

BEGIN;

-- General updated_at helpers can rely on application code; indexes below support common queries

-- ===== Learning =====
CREATE INDEX IF NOT EXISTS idx_modules_slug ON public.modules(slug);
CREATE INDEX IF NOT EXISTS idx_modules_language ON public.modules(language);

CREATE INDEX IF NOT EXISTS idx_lessons_module_order ON public.lessons(module_id, order_index);

CREATE INDEX IF NOT EXISTS idx_activities_lesson ON public.activities(lesson_id);
CREATE INDEX IF NOT EXISTS idx_activities_type ON public.activities(type);
CREATE INDEX IF NOT EXISTS idx_activities_payload_gin ON public.activities USING GIN (payload);

CREATE INDEX IF NOT EXISTS idx_enrollments_user ON public.enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_module ON public.enrollments(module_id);

CREATE INDEX IF NOT EXISTS idx_progress_user_lesson ON public.progress(user_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_progress_due ON public.progress(srs_due_at) WHERE srs_due_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vocab_language_term ON public.vocabulary(language, term);
CREATE INDEX IF NOT EXISTS idx_user_vocab_due ON public.user_vocab(due_at) WHERE due_at IS NOT NULL;

-- ===== Chat & Social =====
CREATE INDEX IF NOT EXISTS idx_threads_type ON public.chat_threads(type);
CREATE INDEX IF NOT EXISTS idx_threads_creator ON public.chat_threads(created_by);

CREATE INDEX IF NOT EXISTS idx_participants_user ON public.chat_participants(user_id);

CREATE INDEX IF NOT EXISTS idx_messages_thread_time ON public.chat_messages(thread_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_metadata_gin ON public.chat_messages USING GIN (metadata);

CREATE INDEX IF NOT EXISTS idx_reactions_user ON public.message_reactions(user_id);

CREATE INDEX IF NOT EXISTS idx_friendships_user ON public.friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend ON public.friendships(friend_id);

CREATE INDEX IF NOT EXISTS idx_posts_author ON public.posts(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_post_time ON public.comments(post_id, created_at);

CREATE INDEX IF NOT EXISTS idx_reactions_subject ON public.reactions(subject_type, subject_id);

-- ===== Gamification =====
CREATE UNIQUE INDEX IF NOT EXISTS uq_achievements_key ON public.achievements(key);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON public.user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_events_user_time ON public.xp_events(user_id, created_at);

-- ===== Notifications =====
CREATE INDEX IF NOT EXISTS idx_notifications_user_time ON public.notifications(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON public.notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON public.push_subscriptions(user_id);

-- ===== Settings & Audit =====
CREATE INDEX IF NOT EXISTS idx_audit_actor_time ON public.audit_logs(actor_id, created_at);

COMMIT;
