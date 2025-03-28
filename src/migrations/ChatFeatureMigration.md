
# Chat Feature Migration Guide

This document outlines how to integrate the chat feature into your existing project.

## Database Schema

Based on your existing tables, you already have the necessary database structure for the chat feature:
- `conversations` - Stores chat conversations
- `conversation_participants` - Maps users to conversations
- `messages` - Stores individual chat messages
- `users` - Your existing users table

## Required Schema Changes

Here's the recommended schema for each table (adjust if your schema differs):

### conversations
```sql
create table public.conversations (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamp with time zone default now(),
  last_message_at timestamp with time zone default now()
);

-- RLS policy
alter table public.conversations enable row level security;

-- Allow users to see conversations they're part of
create policy "Users can view their own conversations" on conversations
  for select using (
    exists (
      select 1 from conversation_participants
      where conversation_participants.conversation_id = conversations.id
      and conversation_participants.user_id = auth.uid()
    )
  );

-- Allow any authenticated user to create conversations
create policy "Users can create conversations" on conversations
  for insert with check (auth.role() = 'authenticated');

-- Allow participants to update last_message_at
create policy "Participants can update conversation time" on conversations
  for update using (
    exists (
      select 1 from conversation_participants
      where conversation_participants.conversation_id = conversations.id
      and conversation_participants.user_id = auth.uid()
    )
  ) with check (
    -- Only allow updating the last_message_at field
    (old.id = new.id AND old.created_at = new.created_at)
  );
```

### conversation_participants
```sql
create table public.conversation_participants (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid references public.conversations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique(conversation_id, user_id)
);

-- RLS policy
alter table public.conversation_participants enable row level security;

-- Users can see participants in their conversations
create policy "Users can view participants in their conversations" on conversation_participants
  for select using (
    auth.uid() in (
      select user_id from conversation_participants
      where conversation_id = conversation_participants.conversation_id
    )
  );

-- Users can add themselves to conversations
create policy "Users can add themselves to conversations" on conversation_participants
  for insert with check (
    user_id = auth.uid() OR
    exists (
      select 1 from conversation_participants
      where conversation_id = conversation_participants.conversation_id
      and user_id = auth.uid()
    )
  );
```

### messages
```sql
create table public.messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid references public.conversations(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete set null,
  recipient_id uuid references auth.users(id) on delete set null,
  content text not null,
  created_at timestamp with time zone default now(),
  is_read boolean default false
);

-- RLS policy
alter table public.messages enable row level security;

-- Users can view messages in conversations they participate in
create policy "Users can view their conversation messages" on messages
  for select using (
    exists (
      select 1 from conversation_participants
      where conversation_id = messages.conversation_id
      and user_id = auth.uid()
    )
  );

-- Users can send messages to conversations they participate in
create policy "Users can send messages to their conversations" on messages
  for insert with check (
    sender_id = auth.uid() and
    exists (
      select 1 from conversation_participants
      where conversation_id = messages.conversation_id
      and user_id = auth.uid()
    )
  );

-- Users can update read status of messages addressed to them
create policy "Users can update read status of their messages" on messages
  for update using (
    recipient_id = auth.uid()
  ) with check (
    recipient_id = auth.uid() and
    old.id = new.id and
    old.conversation_id = new.conversation_id and
    old.sender_id = new.sender_id and
    old.recipient_id = new.recipient_id and
    old.content = new.content and
    old.created_at = new.created_at
    -- Only allow updating is_read field
  );
```

## Component Files to Add

Add these files to your project structure:

<lov-write file_path="src/migrations/file-list.md">
## Required Component Files

1. **Types**
   - `src/types/chat.ts` - Chat type definitions

2. **Components**
   - `src/components/chat/TypingIndicator.tsx` - Shows when someone is typing
   - `src/components/chat/MessageBubble.tsx` - Individual message display
   - `src/components/chat/MessageInput.tsx` - Message input field
   - `src/components/chat/ChatScreen.tsx` - Main chat interface
   - `src/components/chat/ConversationList.tsx` - List of conversations
   - `src/components/chat/ConversationItem.tsx` - Individual conversation item

3. **Utilities**
   - `src/utils/chatUtils.ts` - Helper functions for chat

4. **Services**
   - `src/services/chatService.ts` - Service to interact with Supabase
