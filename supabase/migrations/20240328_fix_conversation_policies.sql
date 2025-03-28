
-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Enable conversation creation" ON conversations;
DROP POLICY IF EXISTS "Enable conversation viewing for participants" ON conversations;
DROP POLICY IF EXISTS "Enable participant viewing" ON conversation_participants;
DROP POLICY IF EXISTS "Enable participant creation" ON conversation_participants;
DROP POLICY IF EXISTS "Allow conversation creation" ON conversations;
DROP POLICY IF EXISTS "Users can view conversation participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can join conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can view messages" ON messages;

-- Create policies for conversations
CREATE POLICY "Allow conversation creation and management"
ON conversations FOR ALL TO authenticated
USING (creator_id = auth.uid())
WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Allow conversation viewing"
ON conversations FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM conversation_participants
  WHERE conversation_id = id
  AND user_id = auth.uid()
));

-- Create policies for conversation participants
CREATE POLICY "Allow participant management"
ON conversation_participants FOR ALL TO authenticated
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM conversations
    WHERE id = conversation_id
    AND creator_id = auth.uid()
  )
)
WITH CHECK (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM conversations
    WHERE id = conversation_id
    AND creator_id = auth.uid()
  )
);

-- Create policies for messages
CREATE POLICY "Allow message management"
ON messages FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = messages.conversation_id
    AND user_id = auth.uid()
  )
)
WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = messages.conversation_id
    AND user_id = auth.uid()
  )
);
