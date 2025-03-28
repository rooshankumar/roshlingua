
-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view conversation participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can join conversations" ON conversation_participants;

-- Create new policies for conversations
CREATE POLICY "Enable conversation creation"
ON conversations FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable conversation viewing for participants"
ON conversations FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = id
    AND cp.user_id = auth.uid()
  )
);

-- Create new policies for conversation participants
CREATE POLICY "Enable participant viewing"
ON conversation_participants FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = conversation_participants.conversation_id
    AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Enable participant creation"
ON conversation_participants FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());
