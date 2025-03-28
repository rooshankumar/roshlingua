
-- Fix foreign key relationships
ALTER TABLE conversation_participants
ADD CONSTRAINT conversation_participants_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE conversation_participants
ADD CONSTRAINT conversation_participants_conversation_id_fkey
FOREIGN KEY (conversation_id) REFERENCES conversations(id);

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;

-- RLS policies for conversations
CREATE POLICY "Users can create conversations"
ON conversations FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can view their conversations"
ON conversations FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = id
    AND user_id = auth.uid()
  )
);

-- RLS policies for conversation participants
CREATE POLICY "Users can view conversation participants"
ON conversation_participants FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conversation_participants.conversation_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can join conversations"
ON conversation_participants FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- RLS policies for messages
CREATE POLICY "Users can send messages"
ON messages FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = messages.conversation_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can view messages"
ON messages FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = messages.conversation_id
    AND user_id = auth.uid()
  )
);
