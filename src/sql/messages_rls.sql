CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT,
    is_delivered BOOLEAN DEFAULT false,
    is_read BOOLEAN DEFAULT false,
    attachment_url TEXT,
    attachment_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Add last seen column to users table if not exists
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE;

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