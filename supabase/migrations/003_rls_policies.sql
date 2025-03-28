
-- Profiles policies
CREATE POLICY IF NOT EXISTS "Public profiles are viewable by everyone" 
ON public.profiles FOR SELECT 
USING (true);

CREATE POLICY IF NOT EXISTS "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "Users can insert own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Conversations policies
CREATE POLICY IF NOT EXISTS "Users can view their conversations" 
ON public.conversations FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.conversation_participants
  WHERE conversation_id = id AND user_id = auth.uid()
));

CREATE POLICY IF NOT EXISTS "Users can create conversations" 
ON public.conversations FOR INSERT 
WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Users can insert themselves as participants" 
ON public.conversation_participants FOR INSERT 
WITH CHECK (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id
    AND NOT EXISTS (
      SELECT 1 FROM public.conversation_participants p
      WHERE p.conversation_id = c.id
    )
  )
);

-- Messages policies
CREATE POLICY IF NOT EXISTS "Users can view messages in their conversations" 
ON public.messages FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.conversation_participants
  WHERE conversation_id = messages.conversation_id
  AND user_id = auth.uid()
));

CREATE POLICY IF NOT EXISTS "Users can send messages" 
ON public.messages FOR INSERT 
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = messages.conversation_id
    AND user_id = auth.uid()
  )
);

-- Message reactions policies
CREATE POLICY IF NOT EXISTS "Users can manage their reactions" 
ON public.message_reactions FOR ALL 
USING (auth.uid() = user_id);

-- User likes policies
CREATE POLICY IF NOT EXISTS "Users can manage their likes" 
ON public.user_likes FOR ALL 
USING (auth.uid() = liker_id);
