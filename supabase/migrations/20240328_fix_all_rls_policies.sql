
-- First drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Enable conversation creation" ON conversations;
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view their own conversations" ON conversations;
DROP POLICY IF EXISTS "Participants can update conversation time" ON conversations;
DROP POLICY IF EXISTS "Participants can update conversations" ON conversations;
DROP POLICY IF EXISTS "Allow conversation creation" ON conversations;
DROP POLICY IF EXISTS "Allow conversation viewing" ON conversations;
DROP POLICY IF EXISTS "Allow conversation creation and management" ON conversations;

-- Drop participant policies
DROP POLICY IF EXISTS "Users can view conversation participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can join conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can insert themselves as participants" ON conversation_participants;
DROP POLICY IF EXISTS "Enable participant creation" ON conversation_participants;
DROP POLICY IF EXISTS "Allow participant management" ON conversation_participants;
DROP POLICY IF EXISTS "Allow participants viewing" ON conversation_participants;

-- Make sure the creator_id column exists
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES profiles(id);

-- Ensure RLS is enabled
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Simple, permissive policies for conversations
-- This allows any authenticated user to create conversations
CREATE POLICY "Anyone can create conversations" 
ON conversations FOR INSERT TO authenticated 
WITH CHECK (true);

-- Users can see conversations they participate in
CREATE POLICY "Users can view their conversations" 
ON conversations FOR SELECT TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_participants.conversation_id = conversations.id
    AND conversation_participants.user_id = auth.uid()
  )
);

-- Users can update conversations they participate in
CREATE POLICY "Users can update their conversations" 
ON conversations FOR UPDATE TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_participants.conversation_id = conversations.id
    AND conversation_participants.user_id = auth.uid()
  )
);

-- Policies for conversation_participants
-- Users can view participants in conversations they're part of
CREATE POLICY "Users can view participants" 
ON conversation_participants FOR SELECT TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conversation_participants.conversation_id
    AND user_id = auth.uid()
  )
);

-- Users can add participants to conversations they're part of
CREATE POLICY "Users can add participants" 
ON conversation_participants FOR INSERT TO authenticated 
WITH CHECK (
  -- Either adding themselves
  user_id = auth.uid() OR 
  -- Or adding someone to a conversation they're already part of
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conversation_participants.conversation_id
    AND user_id = auth.uid()
  )
);

-- Policies for messages
CREATE POLICY "Users can send messages" 
ON messages FOR INSERT TO authenticated 
WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = messages.conversation_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can view messages" 
ON messages FOR SELECT TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = messages.conversation_id
    AND user_id = auth.uid()
  )
);
