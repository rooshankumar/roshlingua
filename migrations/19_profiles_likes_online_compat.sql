-- 19_profiles_likes_online_compat.sql
-- Purpose: Add likes_count and is_online fields expected by UI components (Community/Settings)
-- Safe to run multiple times.

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS likes_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_online boolean NOT NULL DEFAULT false;

COMMIT;
