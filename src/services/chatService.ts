import { supabase } from '@/lib/supabase';
import { Message, Conversation } from '@/types/chat';

// Placeholder useAuth hook - Needs a proper implementation
const useAuth = () => {
  const user = { id: 'user-id' };
  return { user };
};

export const createConversation = async (otherUserId: string) => {
  try {
    // Get current user ID
    const { user } = useAuth();
    if (!user) throw new Error('No user found');

    // Check if conversation already exists
    const { data: existingConversation } = await supabase
      .from('conversations')
      .select('*')
      .contains('participant_ids', [user.id, otherUserId])
      .single();

    if (existingConversation) {
      return existingConversation;
    }

    // Create new conversation
    const { data: newConversation, error } = await supabase
      .from('conversations')
      .insert({
        participant_ids: [user.id, otherUserId],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return newConversation;
  } catch (error) {
    console.error('Error in createConversation:', error);
    throw error;
  }
};


export const fetchConversations = async (userId: string): Promise<Conversation[]> => {
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      *,
      conversation_participants!inner (
        user_id,
        profiles!inner (
          id,
          name,
          avatar_url,
          last_seen
        )
      ),
      messages (
        id, 
        content, 
        created_at,
        sender_id,
        recipient_id,
        is_read
      )
    `)
    .eq('conversation_participants.user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;

  return data?.map(conversation => ({
    id: conversation.id,
    participants: conversation.conversation_participants.map(p => ({
      id: p.profiles.id,
      name: p.profiles.name,
      avatar: p.profiles.avatar_url,
      lastSeen: p.profiles.last_seen
    })),
    lastMessage: conversation.messages?.[0],
    createdAt: conversation.created_at,
    lastMessageAt: conversation.messages?.[0]?.created_at || conversation.created_at,
    unreadCount: conversation.messages?.filter(m => !m.is_read && m.recipient_id === userId).length || 0
  })) || [];
};

export const fetchMessages = async (conversationId: string): Promise<Message[]> => {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
};

export const sendMessage = async (
  conversationId: string,
  senderId: string,
  recipientId: string,
  content: string
): Promise<Message> => {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      recipient_id: recipientId,
      content,
      is_read: false
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const markMessagesAsRead = async (conversationId: string, userId: string) => {
  const { error } = await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('conversation_id', conversationId)
    .eq('recipient_id', userId)
    .eq('is_read', false);

  if (error) throw error;
};

export const subscribeToMessages = (conversationId: string, callback: (message: Message) => void) => {
  return supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      },
      (payload) => callback(payload.new as Message)
    )
    .subscribe();
};

export const subscribeToConversations = (userId: string, callback: () => void) => {
  return supabase
    .channel(`user_conversations:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'conversations',
      },
      () => callback()
    )
    .subscribe();
};