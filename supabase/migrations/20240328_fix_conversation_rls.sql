
-- Drop existing policies
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
DROP POLICY IF EXISTS "Users can manage their conversations" ON conversations;
DROP POLICY IF EXISTS "Users can insert themselves as participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can update their conversations" ON conversations;
DROP POLICY IF EXISTS "Users can delete their conversations" ON conversations;
DROP POLICY IF EXISTS "Users can add participants after creating conversation" ON conversation_participants;
DROP POLICY IF EXISTS "Users can view conversation participants" ON conversation_participants;

-- Add creator_id column to conversations
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES profiles(id);

-- New policies for conversations
CREATE POLICY "Enable conversation creation" ON conversations
FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable conversation access" ON conversations
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = id
    AND user_id = auth.uid()
  )
);

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
