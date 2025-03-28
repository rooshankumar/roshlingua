
-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Enable conversation creation" ON conversations;
DROP POLICY IF EXISTS "Enable conversation viewing for participants" ON conversations;
DROP POLICY IF EXISTS "Enable participant viewing" ON conversation_participants;
DROP POLICY IF EXISTS "Enable participant creation" ON conversation_participants;
DROP POLICY IF EXISTS "User can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Allow conversation creation" ON conversations;

-- Create the correct INSERT policy for conversations
CREATE POLICY "Authenticated users can create conversations"
ON conversations FOR INSERT TO authenticated
WITH CHECK (auth.uid() = creator_id);

-- Create policy for viewing conversations
CREATE POLICY "Enable conversation viewing for participants"
ON conversations FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conversations.id
    AND user_id = auth.uid()
  )
);

-- Create policies for conversation participants
CREATE POLICY "Enable participant viewing"
ON conversation_participants FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Enable participant creation"
ON conversation_participants FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());
