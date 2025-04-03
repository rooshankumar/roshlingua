import { supabase } from '@/lib/supabase';
import { Message, Conversation } from '@/types/chat';

const subscriptions = new Map(); // To prevent duplicate subscriptions

// Subscribe to new messages in a conversation (Prevents Duplicates)
export const subscribeToMessages = async (conversationId: string, onMessage: (message: Message) => void, onRead: (messageId: string) => void) => {
  if (subscriptions.has(conversationId)) {
    subscriptions.get(conversationId)?.unsubscribe();
  }

  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      },
      payload => {
        console.log("New Message Received:", payload.new);
        onMessage(payload.new as Message);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      },
      payload => {
        console.log("Message Read Status Updated:", payload.new);
        if (payload.new.is_read) {
          onRead(payload.new.id);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      },
      payload => {
        if (payload.new.is_read) {
          onRead(payload.new.id);
        }
      }
    )
    .subscribe();

  // Subscribe to user presence
  channel.track({
    online_at: new Date().toISOString(),
    user_id: (await supabase.auth.getUser()).data.user?.id
  });

  subscriptions.set(conversationId, channel);

  return () => {
    supabase.removeChannel(channel);
    subscriptions.delete(conversationId);
  };
};

// Fetch messages for a conversation
export const fetchMessages = async (conversationId: string, currentUserId: string): Promise<Message[]> => {
  // Fetch messages
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching messages:', error);
    throw error;
  }

  // Mark messages as read when fetching
  const unreadMessages = data?.filter(msg => 
    !msg.is_read && msg.sender_id !== currentUserId
  ) || [];

  if (unreadMessages.length > 0) {
    await supabase
      .from('messages')
      .update({ is_read: true })
      .in('id', unreadMessages.map(msg => msg.id));
  }

  return data || [];
};

export const getUnreadCount = async (conversationId: string, userId: string): Promise<number> => {
  const { count, error } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('conversation_id', conversationId)
    .eq('is_read', false)
    .neq('sender_id', userId);

  if (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }

  return count || 0;
};

// Send a new message
export const sendMessage = async (
  conversationId: string,
  senderId: string,
  content: string
): Promise<Message> => {
  const { data, error } = await supabase
    .from('messages')
    .insert([
      {
        conversation_id: conversationId,
        sender_id: senderId,
        content
      }
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Fetch conversations for a user
export const fetchConversations = async (userId: string): Promise<Conversation[]> => {
  const { data: conversations, error: conversationsError } = await supabase
    .from('conversations')
    .select(`
      *,
      conversation_participants!inner (
        user_id,
        users:users!conversation_participants_user_id_fkey (
          id,
          email,
          full_name,
          avatar_url,
          is_online,
          last_seen
        )
      )
    `)
    .eq('conversation_participants.user_id', userId);

  if (conversationsError) throw conversationsError;

  return conversations?.map(conv => ({
    ...conv,
    participants: conv.conversation_participants?.map(p => ({
      id: p.users.id,
      email: p.users.email,
      name: p.users.email?.split('@')[0],
      avatar: '/placeholder.svg',
    })) || []
  })) || [];
};

// Create a new conversation
export const createConversation = async (
  creatorId: string,
  participantIds: string[]
): Promise<string> => {
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .insert([{ created_by: creatorId }])
    .select()
    .single();

  if (convError) throw convError;

  const participants = [...new Set([creatorId, ...participantIds])].map(userId => ({
    conversation_id: conversation.id,
    user_id: userId
  }));

  const { error: partError } = await supabase
    .from('conversation_participants')
    .insert(participants);

  if (partError) throw partError;

  return conversation.id;
};

// ✅ Subscribe to Conversations (Real-time updates)
export const subscribeToConversations = (userId: string, onUpdate: () => void) => {
  if (subscriptions.has(userId)) return subscriptions.get(userId);

  const channel = supabase
    .channel(`conversations:${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
      onUpdate();
    })
    .subscribe();

  subscriptions.set(userId, channel);

  return () => {
    supabase.removeChannel(channel);
    subscriptions.delete(userId);
  };
};

// ✅ Fetch Conversations (Optimized Query)
export const fetchConversationsOld = async (userId: string) => {
  const { data: participantData, error: participantError } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', userId);

  if (participantError) throw participantError;
  if (!participantData?.length) return [];

  const conversationIds = participantData.map((p) => p.conversation_id);

  const { data: conversations, error: conversationsError } = await supabase
    .from('conversations')
    .select('*, messages(*)')
    .in('id', conversationIds)
    .order('created_at', { ascending: false });

  if (conversationsError) throw conversationsError;

  const { data: participants, error: participantsError } = await supabase
    .from('conversation_participants')
    .select(`
      conversation_id,
      user_id,
      user:auth.users!inner(
        id,
        email,
        raw_user_meta_data
      )
    `)
    .in('conversation_id', conversationIds);

  if (participantsError) throw participantsError;

  return conversations?.map(async (conv) => ({
    ...conv,
    participants:
      participants
        ?.filter((p) => p.conversation_id === conv.id)
        .map(async (p) => {
          // Fetch user profile from users table
          const { data: userData } = await supabase
            .from('users')
            .select('*')
            .eq('id', p.user.id)
            .single();

          return {
            id: p.user.id,
            email: p.user.email,
            name: userData?.full_name || p.user.email?.split('@')[0],
            avatar: userData?.avatar_url || '/placeholder.svg',
            nativeLanguage: userData?.native_language,
            learningLanguage: userData?.learning_language,
            proficiencyLevel: userData?.proficiency_level
          };
        }) || [],
    lastMessage: conv.messages?.[0],
  }));
};

// ✅ Mark Messages as Read (Optimized)
export const markMessagesAsRead = async (conversationId: string, userId: string) => {
  const { error } = await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('conversation_id', conversationId)
    .eq('recipient_id', userId)
    .eq('is_read', false);

  if (error) {
    console.error('Error marking messages as read:', error);
  }
};

// ✅ Subscribe to Chats (Prevents Duplicate Subscriptions)
export const subscribeToChats = (onChat: (chat: any) => void) => {
  if (subscriptions.has('chats')) return subscriptions.get('chats');

  const channel = supabase
    .channel('chats')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chats' }, (payload) => {
      onChat(payload.new as any);
    })
    .subscribe();

  subscriptions.set('chats', channel);

  return () => {
    supabase.removeChannel(channel);
    subscriptions.delete('chats');
  };
};

// Delete conversation and its messages
export const deleteConversation = async (conversationId: string, userId: string) => {
  // First delete messages
  const { error: messagesError } = await supabase
    .from('messages')
    .delete()
    .eq('conversation_id', conversationId);

  if (messagesError) throw messagesError;

  // Then delete participants
  const { error: participantsError } = await supabase
    .from('conversation_participants')
    .delete()
    .eq('conversation_id', conversationId);

  if (participantsError) throw participantsError;

  // Finally delete conversation
  const { error: conversationError } = await supabase
    .from('conversations')
    .delete()
    .eq('id', conversationId);

  if (conversationError) throw conversationError;
};

// ✅ Send Chat (Ensures Timestamp)
export const sendChat = async (content: string, senderId: string): Promise<any | null> => {
  const { data, error } = await supabase
    .from('chats')
    .insert([{ content, sender_id: senderId, created_at: new Date().toISOString() }])
    .select()
    .single();

  if (error) {
    console.error('Error sending chat:', error);
    return null;
  }

  return data;
};

// ✅ Fetch Chats (Pagination Support)
export const fetchChats = async (limit = 50): Promise<any[]> => {
  const { data, error } = await supabase
    .from('chats')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching chats:', error);
    return [];
  }

  return data;
};