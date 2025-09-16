-- 11_messages_compat.sql
-- Purpose: Provide a compatibility view `public.messages` for legacy code paths
-- that still query `messages`. Backed by `public.chat_messages`.
-- Safe to run multiple times.

BEGIN;

-- Create a simple read-only view that maps to chat_messages
CREATE OR REPLACE VIEW public.messages AS
SELECT * FROM public.chat_messages;

-- Optional: explicit column list if needed in future
-- CREATE OR REPLACE VIEW public.messages AS
-- SELECT id, conversation_id, sender_id, content, created_at, updated_at
-- FROM public.chat_messages;

-- Ensure basic privileges (adjust as needed for your project)
GRANT SELECT ON public.messages TO anon, authenticated;

COMMIT;
