
-- Add last_message_at to conversations
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Add recipient_id to messages
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS recipient_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Update RLS policies
DROP POLICY IF EXISTS "Users can update read status of their messages" ON messages;

CREATE POLICY "Users can update read status of their messages" ON messages
FOR UPDATE USING (
  recipient_id = auth.uid()
) WITH CHECK (
  recipient_id = auth.uid()
);
