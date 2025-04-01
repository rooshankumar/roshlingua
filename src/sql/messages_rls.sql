
-- Enable RLS for messages table
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Policy for inserting messages
CREATE POLICY "Users can insert their own messages"
ON public.messages FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = sender_id);

-- Policy for reading messages
CREATE POLICY "Users can read messages in their conversations"
ON public.messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_participants.conversation_id = messages.conversation_id
    AND conversation_participants.user_id = auth.uid()
  )
);
