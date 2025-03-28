-- Drop all existing policies
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can view messages" ON messages;
DROP POLICY IF EXISTS "Enable message sending" ON messages;
DROP POLICY IF EXISTS "Enable message viewing" ON messages;
DROP POLICY IF EXISTS "Users can view conversation participants" ON conversation_participants;
DROP POLICY IF EXISTS "Enable participant viewing" ON conversation_participants;
DROP POLICY IF EXISTS "Enable participant creation" ON conversation_participants;
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
DROP POLICY IF EXISTS "Enable conversation access" ON conversations;
DROP POLICY IF EXISTS "Enable conversation creation" ON conversations;
DROP POLICY IF EXISTS "Enable read conversations" ON conversations;
DROP POLICY IF EXISTS "Enable create conversations" ON conversations;

-- Conversations policies
CREATE POLICY "Enable create conversations"
ON conversations FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable read conversations"
ON conversations FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM conversation_participants 
  WHERE conversation_id = id 
  AND user_id = auth.uid()
));

-- Conversation participants policies
CREATE POLICY "Enable read participants"
ON conversation_participants FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Enable create participants"
ON conversation_participants FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid() OR
  (SELECT true FROM conversations WHERE id = conversation_id LIMIT 1)
);

-- Messages policies
CREATE POLICY "Enable read messages"
ON messages FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM conversation_participants
  WHERE conversation_id = messages.conversation_id
  AND user_id = auth.uid()
));

CREATE POLICY "Enable create messages"
ON messages FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = messages.conversation_id 
    AND user_id = auth.uid()
  )
);