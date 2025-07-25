
-- Check the current structure of the messages table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'messages' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- If receiver_id doesn't exist, you might need to add it:
-- ALTER TABLE messages ADD COLUMN receiver_id UUID REFERENCES profiles(id);

-- Or if your messages table uses a different schema, 
-- you might need to adjust the queries accordingly
