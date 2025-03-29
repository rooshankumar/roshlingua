import { supabase } from '@/lib/supabase';
import { Message, Conversation } from '@/types/chat';

export const subscribeToMessages = (
  conversationId: string,
  onMessage: (message: Message) => void
) => {
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
      (payload) => {
        onMessage(payload.new as Message);
      }
    )
    .subscribe();

  return () => {
    channel.unsubscribe();
  };
};

export const subscribeToConversations = (
  userId: string,
  onUpdate: () => void
) => {
  const channel = supabase
    .channel(`conversations:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'conversations',
      },
      () => {
        onUpdate();
      }
    )
    .subscribe();

  return () => {
    channel.unsubscribe();
  };
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

  // Get participant details
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
): Promise<Message | null> => {
  const message = {
    conversation_id: conversationId,
    sender_id: senderId,
    recipient_id: recipientId,
    content: content,
    is_read: false
  };

  const { data, error } = await supabase
    .from('messages')
    .insert([message])
    .select()
    .single();

  if (error) {
    console.error('Error sending message:', error);
    return null;
  }

  return data;
};

export const markMessagesAsRead = async (
  conversationId: string,
  userId: string
) => {
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

import { supabase } from '@/lib/supabase';

export interface Chat {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export const subscribeToChats = (onChat: (chat: Chat) => void) => {
  const channel = supabase
    .channel('chats')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chats'
      },
      (payload) => {
        onChat(payload.new as Chat);
      }
    )
    .subscribe();

  return () => {
    channel.unsubscribe();
  };
};

export const sendChat = async (content: string, senderId: string): Promise<Chat | null> => {
  const { data, error } = await supabase
    .from('chats')
    .insert([{ content, sender_id: senderId }])
    .select()
    .single();

  if (error) {
    console.error('Error sending chat:', error);
    return null;
  }

  return data;
};

export const fetchChats = async (): Promise<Chat[]> => {
  const { data, error } = await supabase
    .from('chats')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching chats:', error);
    return [];
  }

  return data;
};