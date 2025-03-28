import { supabase } from '@/lib/supabase';
import type { ChatMessage, ChatConversation } from '@/types/chat';

export const chatService = {
  async createConversation(userId: string) {
    // Get the current authenticated user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("User not authenticated");

    // Create the conversation with proper fields and explicitly set creator_id
    const { data: conversation, error } = await supabase
      .from('conversations')
      .insert({
        creator_id: user.id, // Explicitly set this to match the RLS policy
        last_message_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating conversation:", error);
      throw error;
    }

    // Add both users as participants
    const { error: participantError } = await supabase
      .from('conversation_participants')
      .insert([
        { conversation_id: conversation.id, user_id: user.id },
        { conversation_id: conversation.id, user_id: userId }
      ]);

    if (participantError) {
      console.error("Error adding participants:", participantError);
      throw participantError;
    }

    return conversation;
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

  async createConversation(otherUserId: string) {
    // Step 1: Create the conversation with current user as creator
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) throw new Error('User not authenticated');
    
    // First create the conversation
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .insert({
        creator_id: user.user.id,
        last_message_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (conversationError) {
      console.error('Error creating conversation:', conversationError);
      throw conversationError;
    }
    
    // Step 2: Add both users as participants
    const participants = [
      { conversation_id: conversation.id, user_id: user.user.id },
      { conversation_id: conversation.id, user_id: otherUserId }
    ];
    
    const { error: participantsError } = await supabase
      .from('conversation_participants')
      .insert(participants);
    
    if (participantsError) {
      console.error('Error adding participants:', participantsError);
      throw participantsError;
    }
    
    return conversation;
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
        (payload) => callback(payload.new as ChatMessage)
      )
      .subscribe();
  }
};