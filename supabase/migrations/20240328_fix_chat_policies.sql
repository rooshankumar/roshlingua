
-- Drop existing policies
DROP POLICY IF EXISTS "Enable conversation creation" ON conversations;
DROP POLICY IF EXISTS "Enable conversation access" ON conversations;
DROP POLICY IF EXISTS "Enable participant creation" ON conversation_participants;
DROP POLICY IF EXISTS "Enable participant viewing" ON conversation_participants;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can view messages" ON messages;
DROP POLICY IF EXISTS "Allow conversation creation and management" ON conversations;
DROP POLICY IF EXISTS "Allow conversation viewing" ON conversations;
DROP POLICY IF EXISTS "Allow participant management" ON conversation_participants;
DROP POLICY IF EXISTS "Allow message management" ON messages;

-- Conversations policies
CREATE POLICY "Enable conversation creation" ON conversations
FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable conversation access" ON conversations
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = id
    AND user_id = auth.uid()
  )
);

-- Conversation participants policies
CREATE POLICY "Enable participant listing" ON conversation_participants
FOR SELECT TO authenticated
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = conversation_participants.conversation_id
    AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Enable participant creation" ON conversation_participants
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM conversations
    WHERE id = conversation_id
    AND creator_id = auth.uid()
  )
);

-- Messages policies
CREATE POLICY "Enable message sending" ON messages
FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = messages.conversation_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Enable message viewing" ON messages
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = messages.conversation_id
    AND user_id = auth.uid()
  )
);

-- Fix user details fetching
CREATE OR REPLACE VIEW conversation_details AS
SELECT 
  c.id as conversation_id,
  c.created_at,
  c.updated_at,
  p.user_id,
  u.full_name,
  u.avatar_url,
  u.last_seen,
  u.is_online
FROM conversations c
JOIN conversation_participants p ON c.id = p.conversation_id
JOIN profiles u ON p.user_id = u.id;

-- Grant access to the view
GRANT SELECT ON conversation_details TO authenticated;

-- Create policy for the view
CREATE POLICY "Enable conversation details viewing" ON conversation_details
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conversation_details.conversation_id
    AND user_id = auth.uid()
  )
);
