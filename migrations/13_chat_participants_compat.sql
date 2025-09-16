-- 13_chat_participants_compat.sql
-- Purpose: Ensure chat_participants has last_read_at for read-state compatibility
-- Safe to run multiple times.

BEGIN;

ALTER TABLE public.chat_participants
  ADD COLUMN IF NOT EXISTS last_read_at timestamptz;

-- Default last_read_at to now() for existing rows if null
UPDATE public.chat_participants
SET last_read_at = NOW()
WHERE last_read_at IS NULL;

COMMIT;
