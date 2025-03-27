
-- Fix foreign key relationships
ALTER TABLE messages
ADD FOREIGN KEY (sender_id) REFERENCES auth.users(id),
ADD FOREIGN KEY (conversation_id) REFERENCES conversations(id);

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for conversations
CREATE POLICY "Users can create conversations"
ON conversations FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can view conversations they are part of"
ON conversations FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conversations.id
    AND user_id = auth.uid()
  )
);

-- RLS policies for messages
CREATE POLICY "Users can send messages to conversations they are part of"
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
