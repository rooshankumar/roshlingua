-- 17_profiles_learning_goal_compat.sql
-- Purpose: Add learning_goal field expected by Settings/Profile UI
-- Safe to run multiple times.

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS learning_goal text;

COMMIT;
