
-- Create function to get table information
CREATE OR REPLACE FUNCTION get_table_info()
RETURNS TABLE(table_name text, row_count bigint, has_rls boolean)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tables.table_name::text,
    (SELECT count(*) FROM information_schema.tables t
      LEFT JOIN information_schema.columns c ON c.table_name = t.table_name
      WHERE t.table_name = tables.table_name)::bigint as row_count,
    EXISTS (
      SELECT 1 FROM pg_tables 
      WHERE tablename = tables.table_name 
      AND rowsecurity = true
    ) as has_rls
  FROM information_schema.tables tables
  WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE';
END;
$$;

-- Create function to get policy information
CREATE OR REPLACE FUNCTION get_policies_info()
RETURNS TABLE(table_name text, policy_name text, roles text[], cmd text, qual text, with_check text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.relname::text as table_name,
    p.polname::text as policy_name,
    p.polroles::text[] as roles,
    p.polcmd::text as cmd,
    pg_get_expr(p.polqual, p.polrelid)::text as qual,
    pg_get_expr(p.polwithcheck, p.polrelid)::text as with_check
  FROM pg_policy p
  JOIN pg_class t ON p.polrelid = t.oid
  WHERE t.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
END;
$$;

-- Create function to execute the fix script
CREATE OR REPLACE FUNCTION execute_fix_script()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Fix creator_id in conversations table
  IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'conversations' 
      AND column_name = 'creator_id'
  ) THEN
      ALTER TABLE public.conversations ADD COLUMN creator_id UUID REFERENCES public.profiles(id);
  END IF;

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
END;
$$;
