
-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;

-- Messages policies
CREATE POLICY "Users can insert messages into their conversations"
ON messages FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = messages.conversation_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can view messages from their conversations"
ON messages FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = messages.conversation_id
    AND user_id = auth.uid()
  )
);

-- Conversation participants policies
CREATE POLICY "Users can view their conversation participants"
ON conversation_participants FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can join conversations"
ON conversation_participants FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());
