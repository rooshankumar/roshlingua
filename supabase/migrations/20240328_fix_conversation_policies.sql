
-- Add creator_id column if it doesn't exist
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES profiles(id);

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;

-- Create new policies
CREATE POLICY "Enable insert for authenticated users"
ON conversations FOR INSERT TO authenticated
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Enable select for conversation participants"
ON conversations FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = id
    AND user_id = auth.uid()
  )
);

-- Update existing conversations to set creator_id
UPDATE conversations
SET creator_id = (
  SELECT user_id 
  FROM conversation_participants 
  WHERE conversation_id = conversations.id 
  LIMIT 1
)
WHERE creator_id IS NULL;
