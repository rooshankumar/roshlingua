
-- Enable RLS on conversations table
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Allow users to create conversations
CREATE POLICY "Users can create conversations"
ON public.conversations FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Allow users to view conversations they're part of
CREATE POLICY "Users can view their conversations"
ON public.conversations FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.conversation_participants
  WHERE conversation_id = id
  AND user_id = auth.uid()
));

-- Enable RLS on conversation_participants table
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

-- Allow users to add participants to conversations they created
CREATE POLICY "Users can add participants"
ON public.conversation_participants FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.conversations
  WHERE id = conversation_id
  AND created_by = auth.uid()
));

-- Allow users to view participants of conversations they're in
CREATE POLICY "Users can view conversation participants"
ON public.conversation_participants FOR SELECT
USING (
  conversation_id IN (
    SELECT conversation_id 
    FROM public.conversation_participants 
    WHERE user_id = auth.uid()
  )
);

-- Enable RLS on messages table
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Allow users to send messages in conversations they're part of
CREATE POLICY "Users can send messages"
ON public.messages FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.conversation_participants
  WHERE conversation_id = messages.conversation_id
  AND user_id = auth.uid()
));

-- Allow users to view messages in their conversations
CREATE POLICY "Users can view messages"
ON public.messages FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.conversation_participants
  WHERE conversation_id = messages.conversation_id
  AND user_id = auth.uid()
));
