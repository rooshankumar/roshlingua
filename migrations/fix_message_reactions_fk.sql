
-- First drop the existing foreign key constraint
ALTER TABLE message_reactions DROP CONSTRAINT IF EXISTS message_reactions_user_id_fkey;

-- Then add a new foreign key constraint referencing the profiles table instead of users
ALTER TABLE message_reactions 
  ADD CONSTRAINT message_reactions_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES profiles(id) 
  ON DELETE CASCADE;
