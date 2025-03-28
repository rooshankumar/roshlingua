
import { supabase } from '@/lib/supabase';
import { Conversation, Message } from '@/types/chat';

export const fetchConversations = async (userId: string) => {
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      *,
      participants:conversation_participants(user:users(*)),
      messages(*)
    `)
    .order('created_at', { foreignTable: 'messages', ascending: false });

  if (error) throw error;
  return data as Conversation[];
};

export const fetchMessages = async (conversationId: string) => {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data as Message[];
};

export const sendMessage = async (message: Partial<Message>) => {
  const { data, error } = await supabase
    .from('messages')
    .insert(message)
    .select()
    .single();

  if (error) throw error;
  return data as Message;
};

export const markMessagesAsRead = async (conversationId: string, userId: string) => {
  const { error } = await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('conversation_id', conversationId)
    .neq('sender_id', userId);

  if (error) throw error;
};

export const subscribeToMessages = (conversationId: string, callback: () => void) => {
  const subscription = supabase
    .channel(`messages:${conversationId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'messages',
      filter: `conversation_id=eq.${conversationId}`,
    }, callback)
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
};

export const subscribeToConversations = (userId: string, callback: () => void) => {
  const subscription = supabase
    .channel(`conversations:${userId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'conversations',
    }, callback)
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
};
import { supabase } from '@/lib/supabase';
import { Message, Conversation } from '@/types/chat';

export const chatService = {
  async getConversations(userId: string) {
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        participants:conversation_participants(
          user:users(*)
        )
      `)
      .order('last_message_at', { ascending: false });

    if (error) throw error;
    return data as Conversation[];
  },

  async createConversation(participantIds: string[]) {
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .insert({})
      .select()
      .single();

    if (conversationError) throw conversationError;

    const participants = participantIds.map(userId => ({
      conversation_id: conversation.id,
      user_id: userId
    }));

    const { error: participantsError } = await supabase
      .from('conversation_participants')
      .insert(participants);

    if (participantsError) throw participantsError;

    return conversation;
  },

  async markMessagesAsRead(conversationId: string, userId: string) {
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .eq('is_read', false);

    if (error) throw error;
  }
};
