
-- First drop existing policies
DROP POLICY IF EXISTS "Users can insert messages into their conversations" ON messages;
DROP POLICY IF EXISTS "Users can view messages from their conversations" ON messages;
DROP POLICY IF EXISTS "User can send messages in conversations" ON messages;
DROP POLICY IF EXISTS "User can send messages" ON messages;

-- Create clean policies
CREATE POLICY "Users can send messages"
ON messages
FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid() 
  AND EXISTS (
    SELECT 1 
    FROM conversation_participants 
    WHERE conversation_participants.conversation_id = messages.conversation_id
    AND conversation_participants.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view conversation messages"
ON messages
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM conversation_participants 
    WHERE conversation_participants.conversation_id = messages.conversation_id
    AND conversation_participants.user_id = auth.uid()
  )
);
