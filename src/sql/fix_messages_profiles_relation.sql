
-- Drop existing foreign key if exists
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;

-- Update foreign key to reference auth.users
ALTER TABLE messages 
  ADD CONSTRAINT messages_sender_id_fkey 
  FOREIGN KEY (sender_id) 
  REFERENCES auth.users(id)
  ON DELETE CASCADE;
