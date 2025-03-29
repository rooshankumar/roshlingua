import { supabase } from '@/lib/supabase';
import type { ChatMessage, ChatConversation, Message, Conversation } from '@/types/chat';

// Placeholder useAuth hook -  Needs a proper implementation
const useAuth = () => {
  const user = supabase.auth.user();
  return { user };
};

export const chatService = {
  async createConversation(otherUserId: string) {
    try {
      // Get current user ID
      const { user } = useAuth();
      if (!user) throw new Error('User not authenticated');
      const currentUserId = user.id;

      // Create the conversation - using a simple insert without specifying creator_id
      // since we've updated the policy to be more permissive
      const { data: conversation, error: conversationError } = await supabase
        .from('conversations')
        .insert({
          last_message_at: new Date().toISOString()
        })
        .select()
        .single();

      if (conversationError) {
        console.error('Error creating conversation:', conversationError);
        throw conversationError;
      }

      // Add both users as participants in a single transaction
      const participants = [
        { conversation_id: conversation.id, user_id: currentUserId },
        { conversation_id: conversation.id, user_id: otherUserId }
      ];

      const { error: participantsError } = await supabase
        .from('conversation_participants')
        .insert(participants);

      if (participantsError) {
        console.error('Error adding participants:', participantsError);
        // Attempt to clean up the conversation if participant creation fails
        await supabase
          .from('conversations')
          .delete()
          .eq('id', conversation.id);
        throw participantsError;
      }

      return conversation;
    } catch (error) {
      console.error('Error in createConversation:', error);
      throw error;
    }
  },

  async getConversations(userId: string) {
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        participants:conversation_participants(user_id),
        last_message:messages(*)
      `)
      .order('last_message_at', { ascending: false });

    if (error) throw error;
    return data as ChatConversation[];
  },

  async getMessages(conversationId: string) {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles(id, avatar_url, full_name)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data as ChatMessage[];
  },

  async sendMessage(message: Partial<ChatMessage>) {
    const { data, error } = await supabase
      .from('messages')
      .insert(message)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async markAsRead(messageId: string) {
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('id', messageId);

    if (error) throw error;
  },

  subscribeToConversation(conversationId: string, callback: (message: ChatMessage) => void) {
    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => callback(payload.new as ChatMessage)
      )
      .subscribe((status) => {
        console.log(`Message subscription status for ${conversationId}:`, status);
        if (status === 'SUBSCRIPTION_ERROR') {
          console.error('Message subscription error, attempting to reconnect...');
          setTimeout(() => {
            channel.subscribe();
          }, 1000);
        }
      });

    return channel;
  },

  async fetchConversations: async (userId: string): Promise<Conversation[]> => {
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        participants:conversation_participants(user:profiles(*)),
        last_message:messages(*)
      `)
      .contains('participant_ids', [userId])
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async fetchMessages: async (conversationId: string): Promise<Message[]> => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async sendMessage: async (
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
        content: content
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async markMessagesAsRead: async (conversationId: string, userId: string) => {
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .eq('recipient_id', userId)
      .eq('is_read', false);

    if (error) throw error;
  },

  subscribeToMessages: (conversationId: string, callback: (message: Message) => void) => {
    return supabase
      .channel(`messages:${conversationId}`)
      .on('INSERT', (payload) => callback(payload.new as Message))
      .subscribe();
  },

  subscribeToConversations: (userId: string, callback: () => void) => {
    return supabase
      .channel(`conversations:${userId}`)
      .on('*', callback)
      .subscribe();
  }
};