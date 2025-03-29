import { supabase } from '@/lib/supabase';
import { Message, Conversation, Chat } from '@/types/chat';

const subscriptions = new Map(); // To prevent duplicate subscriptions

// ✅ Subscribe to Messages (Prevents Duplicates, Ensures Cleanup)
export const subscribeToMessages = (conversationId: string, onMessage: (message: Message) => void) => {
  if (subscriptions.has(conversationId)) return subscriptions.get(conversationId);

  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
      (payload) => {
        onMessage(payload.new as Message);
      }
    )
    .subscribe();

  subscriptions.set(conversationId, channel);

  return () => {
    supabase.removeChannel(channel);
    subscriptions.delete(conversationId);
  };
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
export const fetchConversations = async (userId: string) => {
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
        raw_user_meta_data->>'full_name' as full_name,
        raw_user_meta_data->>'avatar_url' as avatar_url
      )
    `)
    .in('conversation_id', conversationIds);

  if (participantsError) throw participantsError;

  return conversations?.map((conv) => ({
    ...conv,
    participants:
      participants
        ?.filter((p) => p.conversation_id === conv.id)
        .map((p) => ({
          id: p.user.id,
          email: p.user.email,
          name: p.user.full_name || p.user.email?.split('@')[0],
          avatar: p.user.avatar_url || '/placeholder.svg',
        })) || [],
    lastMessage: conv.messages?.[0],
  }));
};

// ✅ Fetch Messages (Now Supports Pagination)
export const fetchMessages = async (conversationId: string, limit = 50, offset = 0): Promise<Message[]> => {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data || [];
};

// ✅ Send Message (Ensures Correct Timestamp)
export const sendMessage = async (
  conversationId: string,
  senderId: string,
  recipientId: string,
  content: string
): Promise<Message | null> => {
  const message = {
    conversation_id: conversationId,
    sender_id: senderId,
    recipient_id: recipientId,
    content,
    is_read: false,
    created_at: new Date().toISOString(), // Added timestamp
  };

  const { data, error } = await supabase.from('messages').insert([message]).select().single();

  if (error) {
    console.error('Error sending message:', error);
    return null;
  }

  return data;
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
export const subscribeToChats = (onChat: (chat: Chat) => void) => {
  if (subscriptions.has('chats')) return subscriptions.get('chats');

  const channel = supabase
    .channel('chats')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chats' }, (payload) => {
      onChat(payload.new as Chat);
    })
    .subscribe();

  subscriptions.set('chats', channel);

  return () => {
    supabase.removeChannel(channel);
    subscriptions.delete('chats');
  };
};

// ✅ Send Chat (Ensures Timestamp)
export const sendChat = async (content: string, senderId: string): Promise<Chat | null> => {
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
export const fetchChats = async (limit = 50): Promise<Chat[]> => {
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
