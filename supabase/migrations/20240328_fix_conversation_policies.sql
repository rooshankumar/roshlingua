
-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Enable conversation creation" ON conversations;
DROP POLICY IF EXISTS "Enable conversation viewing for participants" ON conversations;
DROP POLICY IF EXISTS "Enable participant viewing" ON conversation_participants;
DROP POLICY IF EXISTS "Enable participant creation" ON conversation_participants;

-- Create new policies for conversations
CREATE POLICY "Enable conversation creation"
ON conversations FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable conversation viewing for participants"
ON conversations FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conversations.id
    AND user_id = auth.uid()
  )
);

-- Create new policies for conversation participants
CREATE POLICY "Enable participant viewing"
ON conversation_participants FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Enable participant creation"
ON conversation_participants FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());
