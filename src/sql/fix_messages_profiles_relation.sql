
-- Add foreign key constraint to messages table
ALTER TABLE messages
ADD CONSTRAINT messages_sender_id_fkey 
FOREIGN KEY (sender_id) 
REFERENCES profiles(id);
