
-- Add missing columns to messages table to match codebase expectations
ALTER TABLE messages ADD COLUMN IF NOT EXISTS recipient_id UUID REFERENCES profiles(id);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_delivered BOOLEAN DEFAULT true;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_thumbnail TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES messages(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Update existing data to use recipient_id (copy from receiver_id)
UPDATE messages SET recipient_id = receiver_id WHERE recipient_id IS NULL;
