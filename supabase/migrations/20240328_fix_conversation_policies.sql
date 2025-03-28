
-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Enable conversation creation" ON conversations;
DROP POLICY IF EXISTS "Enable conversation viewing for participants" ON conversations;
DROP POLICY IF EXISTS "Enable participant viewing" ON conversation_participants;
DROP POLICY IF EXISTS "Enable participant creation" ON conversation_participants;
DROP POLICY IF EXISTS "User can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Allow conversation creation" ON conversations;
DROP POLICY IF EXISTS "Users can view conversation participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can join conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can view messages" ON messages;

-- Create policies for conversations
CREATE POLICY "Allow conversation creation"
ON conversations FOR INSERT TO authenticated
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Allow conversation viewing"
ON conversations FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM conversation_participants
  WHERE conversation_id = id
  AND user_id = auth.uid()
));

-- Create policies for conversation participants
CREATE POLICY "Allow participant viewing"
ON conversation_participants FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Allow participant creation"
ON conversation_participants FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE id = conversation_id
    AND creator_id = auth.uid()
  )
  OR
  user_id = auth.uid()
);

-- Create policies for messages
CREATE POLICY "Allow message creation"
ON messages FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = messages.conversation_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Allow message viewing"
ON messages FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = messages.conversation_id
    AND user_id = auth.uid()
  )
);
