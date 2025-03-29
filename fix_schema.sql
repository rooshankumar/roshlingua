
-- Check if creator_id column exists and add it if it doesn't
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'conversations' 
        AND column_name = 'creator_id'
    ) THEN
        ALTER TABLE public.conversations ADD COLUMN creator_id UUID REFERENCES public.profiles(id);
    END IF;
END$$;

-- Update existing conversations to set creator_id from participants
UPDATE public.conversations c
SET creator_id = (
    SELECT cp.user_id 
    FROM public.conversation_participants cp 
    WHERE cp.conversation_id = c.id 
    LIMIT 1
)
WHERE c.creator_id IS NULL;

-- Disable all RLS policies temporarily for testing
ALTER TABLE public.conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;

-- Grant access to tables
GRANT ALL ON public.conversations TO authenticated;
GRANT ALL ON public.conversation_participants TO authenticated;
GRANT ALL ON public.messages TO authenticated;
