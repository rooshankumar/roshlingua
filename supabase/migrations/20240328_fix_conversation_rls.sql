-- First, drop the existing policies on conversations table to clean up
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Enable conversation creation" ON conversations;
DROP POLICY IF EXISTS "Users can view their own conversations" ON conversations;
DROP POLICY IF EXISTS "Participants can update conversation time" ON conversations;

-- Create clean and proper policies for conversations table
CREATE POLICY "Enable conversation creation" 
ON conversations 
FOR INSERT TO authenticated
WITH CHECK (creator_id = auth.uid());

-- Allow users to see conversations they participate in
CREATE POLICY "Users can view their conversations"
ON conversations
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_participants.conversation_id = conversations.id
    AND conversation_participants.user_id = auth.uid()
  )
);

-- Allow participants to update conversation metadata
CREATE POLICY "Participants can update conversations"
ON conversations
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_participants.conversation_id = conversations.id
    AND conversation_participants.user_id = auth.uid()
  )
);

-- Add creator_id column to conversations
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES profiles(id);

-- New policies for conversation participants
CREATE POLICY "Enable participant creation" ON conversation_participants
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM conversations
    WHERE id = conversation_id
    AND creator_id = auth.uid()
  )
);

CREATE POLICY "Enable participant viewing" ON conversation_participants
FOR SELECT TO authenticated
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = conversation_participants.conversation_id
    AND cp.user_id = auth.uid()
  )
);