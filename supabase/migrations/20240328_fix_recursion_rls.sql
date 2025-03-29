
-- Drop the problematic policy causing infinite recursion
DROP POLICY IF EXISTS "Enable participant access" ON conversation_participants;

-- Create a fixed policy that avoids the recursive check
CREATE POLICY "Enable participant access" ON conversation_participants
FOR ALL TO authenticated
USING (
  -- User can access conversation_participants rows if they are a participant
  user_id = auth.uid() OR 
  -- OR if they created the conversation (without using a recursive check)
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = conversation_participants.conversation_id
    AND c.creator_id = auth.uid()
  )
);

-- Fix read access to conversation_participants
DROP POLICY IF EXISTS "Users can read participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can read participants where they participate" ON conversation_participants;

-- Now create the policy after making sure all existing variations are dropped
CREATE POLICY "Users can read participants" ON conversation_participants
FOR SELECT TO authenticated
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = conversation_participants.conversation_id
    AND c.creator_id = auth.uid()
  )
);

-- Fix conversation policy if needed
DROP POLICY IF EXISTS "Enable conversation access" ON conversations;
CREATE POLICY "Enable conversation access" ON conversations
FOR ALL TO authenticated
USING (
  -- User can access conversations they created
  creator_id = auth.uid() OR
  -- OR if they are a participant
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conversations.id
    AND user_id = auth.uid()
  )
);
