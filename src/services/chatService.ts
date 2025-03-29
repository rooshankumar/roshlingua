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


export const fetchConversations = async (userId: string) => {
  // First get conversations where user is a participant
  const { data: participantData, error: participantError } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', userId);

  if (participantError) throw participantError;

  if (!participantData?.length) return [];

  const conversationIds = participantData.map(p => p.conversation_id);

  // Then fetch those conversations with their last messages
  const { data: conversations, error: conversationsError } = await supabase
    .from('conversations')
    .select(`
      *,
      messages(*)
    `)
    .in('id', conversationIds)
    .order('created_at', { ascending: false });

  if (conversationsError) throw conversationsError;

  // Finally get participant details
  const { data: participants, error: participantsError } = await supabase
    .from('conversation_participants')
    .select(`
      conversation_id,
      user_id,
      user:auth.users!inner(
        id,
        email,
        user_metadata->full_name,
        user_metadata->avatar_url
      )
    `)
    .in('conversation_id', conversationIds);

  if (participantsError) throw participantsError;

  // Combine the data
  return conversations?.map(conv => ({
    ...conv,
    participants: participants
      ?.filter(p => p.conversation_id === conv.id)
      .map(p => ({
        id: p.user.id,
        email: p.user.email,
        name: p.user.user_metadata?.full_name || p.user.email?.split('@')[0],
        avatar: p.user.user_metadata?.avatar_url
      })) || [],
    lastMessage: conv.messages?.[0]
  }));
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