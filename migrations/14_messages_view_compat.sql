-- 14_messages_view_compat.sql
-- Purpose: Provide a compatibility view `public.messages` with receiver_id and is_read semantics
-- based on DM threads using `chat_threads` + `chat_participants` + `chat_messages`.
-- Also provide an INSTEAD OF UPDATE trigger to map `SET is_read = true` to updating
-- `chat_participants.last_read_at` for the receiver.

BEGIN;

-- Ensure supporting column exists
ALTER TABLE public.chat_participants
  ADD COLUMN IF NOT EXISTS last_read_at timestamptz;

-- Create/replace messages view. Only includes DM threads.
-- Each physical chat_messages row expands into one row per receiver (the other participant).
CREATE OR REPLACE VIEW public.messages AS
SELECT
  m.id,
  m.thread_id,
  m.sender_id,
  other.user_id AS receiver_id,
  (cp.last_read_at IS NOT NULL AND cp.last_read_at >= m.created_at) AS is_read,
  m.content,
  m.created_at
FROM public.chat_messages m
JOIN public.chat_threads t ON t.id = m.thread_id AND t.type = 'dm'
JOIN public.chat_participants cp ON cp.thread_id = m.thread_id AND cp.user_id <> COALESCE(m.sender_id, '00000000-0000-0000-0000-000000000000')
JOIN LATERAL (
  SELECT user_id FROM public.chat_participants p
  WHERE p.thread_id = m.thread_id AND p.user_id <> COALESCE(m.sender_id, '00000000-0000-0000-0000-000000000000')
  LIMIT 1
) other ON TRUE;

GRANT SELECT ON public.messages TO anon, authenticated;

-- Make the view updatable for `UPDATE ... SET is_read = true` by using an INSTEAD OF trigger
CREATE OR REPLACE FUNCTION public.messages_mark_read()
RETURNS trigger AS $$
DECLARE
  v_thread uuid;
BEGIN
  -- Only handle transitions to true
  IF NEW.is_read = TRUE AND (OLD.is_read IS DISTINCT FROM NEW.is_read) THEN
    -- Update last_read_at for the receiver in this thread
    UPDATE public.chat_participants
    SET last_read_at = GREATEST(COALESCE(last_read_at, to_timestamp(0)), NOW())
    WHERE thread_id = OLD.thread_id AND user_id = OLD.receiver_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_messages_mark_read ON public.messages;
CREATE TRIGGER trg_messages_mark_read
INSTEAD OF UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.messages_mark_read();

COMMIT;
