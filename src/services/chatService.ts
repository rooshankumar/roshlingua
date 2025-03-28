import { supabase } from '@/lib/supabase';
import { Conversation, Message } from '@/types/chat';

export const chatService = {
  async createConversation(userId: string) {
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert({})
      .select()
      .single();

    if (convError) throw convError;

    const { error: partError } = await supabase
      .from('conversation_participants')
      .insert([
        { conversation_id: conversation.id, user_id: (await supabase.auth.getUser()).data.user?.id },
        { conversation_id: conversation.id, user_id: userId }
      ]);

    if (partError) throw partError;

    return conversation;
  },

  async getConversations() {
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        participants:conversation_participants(
          user_id,
          created_at
        )
      `)
      .order('last_message_at', { ascending: false });

    if (error) throw error;
    return data as Conversation[];
  },

  async getMessages(conversationId: string) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data as Message[];
  },

  async sendMessage(conversationId: string, recipientId: string, content: string) {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: (await supabase.auth.getUser()).data.user?.id,
        recipient_id: recipientId,
        content
      })
      .select()
      .single();

    if (error) throw error;
    return data as Message;
  },

  async markAsRead(messageId: string) {
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('id', messageId);

    if (error) throw error;
  },

  subscribeToConversation(conversationId: string, callback: (message: Message) => void) {
    return supabase
      .channel(`conversation:${conversationId}`)
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
  }
};