
-- Drop and recreate RLS policies to ensure they're configured correctly

-- First disable RLS to allow direct fixes
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_status DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;

-- Fix user table policy
DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users
  FOR ALL TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Fix onboarding status policy
DROP POLICY IF EXISTS "Users can manage own onboarding status" ON onboarding_status;
CREATE POLICY "Users can manage own onboarding status" ON onboarding_status
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Fix conversation_participants policies
DROP POLICY IF EXISTS "Users can read participants" ON conversation_participants;
DROP POLICY IF EXISTS "Enable participant access" ON conversation_participants;

CREATE POLICY "Enable participant access" ON conversation_participants
  FOR ALL TO authenticated
  USING (
    user_id = auth.uid() OR 
    conversation_id IN (
      SELECT id FROM conversations WHERE creator_id = auth.uid()
    )
  );

-- Fix conversation policies
DROP POLICY IF EXISTS "Enable conversation access" ON conversations;
CREATE POLICY "Enable conversation access" ON conversations
  FOR ALL TO authenticated
  USING (
    creator_id = auth.uid() OR 
    id IN (
      SELECT conversation_id FROM conversation_participants 
      WHERE user_id = auth.uid()
    )
  );

-- Fix message policies
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
CREATE POLICY "Users can view messages in their conversations" ON messages
  FOR SELECT TO authenticated
  USING (
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants
      WHERE user_id = auth.uid()
    ) OR
    conversation_id IN (
      SELECT id FROM conversations WHERE creator_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert messages in their conversations" ON messages;
CREATE POLICY "Users can insert messages in their conversations" ON messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants
      WHERE user_id = auth.uid()
    )
  );

-- Re-enable RLS with fixed policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
