
-- Drop existing foreign key if exists
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;

-- Update messages table schema
ALTER TABLE messages
  ALTER COLUMN sender_id SET NOT NULL,
  ADD CONSTRAINT messages_sender_id_fkey 
  FOREIGN KEY (sender_id) 
  REFERENCES auth.users(id)
  ON DELETE CASCADE;
