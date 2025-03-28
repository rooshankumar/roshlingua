
import { supabase } from '@/lib/supabase'; // Update with your Supabase client import
import { User, Message, Conversation } from '@/types/chat';
import { RealtimeChannel } from '@supabase/supabase-js';

// Fetch user profile data
export const fetchUserProfile = async (userId: string): Promise<User | null> => {
  const { data, error } = await supabase
    .from('profiles') // Adjust to your actual user profile table
    .select('id, name, avatar_url, last_seen')
    .eq('id', userId)
    .single();

  if (error || !data) {
    console.error('Error fetching user profile:', error);
    return null;
  }

  return {
    id: data.id,
    name: data.name || 'Unknown User',
    avatar: data.avatar_url || '',
    lastSeen: data.last_seen,
    isOnline: false, // Will be updated via presence
  };
};

// Fetch all conversations for the current user
export const fetchConversations = async (currentUserId: string): Promise<Conversation[]> => {
  // Get all conversations the user participates in
  const { data: participations, error: participationsError } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', currentUserId);

  if (participationsError) {
    console.error('Error fetching conversation participants:', participationsError);
    return [];
  }

  if (!participations.length) return [];

  const conversationIds = participations.map(p => p.conversation_id);

  // Get the conversation data
  const { data: conversations, error: conversationsError } = await supabase
    .from('conversations')
    .select('*')
    .in('id', conversationIds)
    .order('last_message_at', { ascending: false });

  if (conversationsError || !conversations) {
    console.error('Error fetching conversations:', conversationsError);
    return [];
  }

  // For each conversation, get the participants
  const enrichedConversations: Conversation[] = await Promise.all(
    conversations.map(async (conv) => {
      // Get conversation participants
      const { data: participants, error: participantsError } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', conv.id);

      if (participantsError) {
        console.error('Error fetching participants for conversation:', conv.id, participantsError);
        return null;
      }

      // Get user profiles for each participant
      const userProfiles: User[] = [];
      for (const participant of participants) {
        const profile = await fetchUserProfile(participant.user_id);
        if (profile) userProfiles.push(profile);
      }

      // Get the last message in this conversation
      const { data: lastMessage, error: lastMessageError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (lastMessageError && lastMessageError.code !== 'PGRST116') {
        console.error('Error fetching last message:', lastMessageError);
      }

      // Get unread count for this conversation
      const { data: unreadMessages, error: unreadError } = await supabase
        .from('messages')
        .select('id', { count: 'exact' })
        .eq('conversation_id', conv.id)
        .eq('recipient_id', currentUserId)
        .eq('is_read', false);

      if (unreadError) {
        console.error('Error fetching unread count:', unreadError);
      }

      return {
        id: conv.id,
        participants: userProfiles,
        lastMessage: lastMessage || undefined,
        createdAt: conv.created_at,
        lastMessageAt: conv.last_message_at,
        unreadCount: unreadMessages?.length || 0,
      };
    })
  );

  // Filter out null values and return
  return enrichedConversations.filter(Boolean) as Conversation[];
};

// Fetch messages for a specific conversation
export const fetchMessages = async (conversationId: string): Promise<Message[]> => {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching messages:', error);
    return [];
  }

  return data || [];
};

// Send a new message
export const sendMessage = async (
  conversationId: string,
  senderId: string,
  recipientId: string,
  content: string
): Promise<Message | null> => {
  // Insert the new message
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      recipient_id: recipientId,
      content,
      is_read: false,
    })
    .select()
    .single();

  if (error) {
    console.error('Error sending message:', error);
    return null;
  }

  // Update the conversation's last_message_at
  await supabase
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId);

  return data;
};

// Mark messages as read
export const markMessagesAsRead = async (
  conversationId: string,
  recipientId: string
): Promise<void> => {
  const { error } = await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('conversation_id', conversationId)
    .eq('recipient_id', recipientId)
    .eq('is_read', false);

  if (error) {
    console.error('Error marking messages as read:', error);
  }
};

// Create a new conversation
export const createConversation = async (
  currentUserId: string,
  otherUserId: string
): Promise<string | null> => {
  // Check if a conversation already exists between these users
  const { data: existingConversations, error: checkError } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', currentUserId);

  if (checkError) {
    console.error('Error checking existing conversations:', checkError);
    return null;
  }

  if (existingConversations.length > 0) {
    // For each conversation the current user is in, check if the other user is also a participant
    for (const conv of existingConversations) {
      const { data: otherParticipant, error: otherParticipantError } = await supabase
        .from('conversation_participants')
        .select('*')
        .eq('conversation_id', conv.conversation_id)
        .eq('user_id', otherUserId)
        .single();

      if (!otherParticipantError && otherParticipant) {
        // Found existing conversation between these two users
        return conv.conversation_id;
      }
    }
  }

  // Create a new conversation
  const { data: newConversation, error: convError } = await supabase
    .from('conversations')
    .insert({})
    .select()
    .single();

  if (convError || !newConversation) {
    console.error('Error creating conversation:', convError);
    return null;
  }

  // Add both users as participants
  const { error: participantError1 } = await supabase
    .from('conversation_participants')
    .insert({
      conversation_id: newConversation.id,
      user_id: currentUserId,
    });

  const { error: participantError2 } = await supabase
    .from('conversation_participants')
    .insert({
      conversation_id: newConversation.id,
      user_id: otherUserId,
    });

  if (participantError1 || participantError2) {
    console.error('Error adding participants:', participantError1 || participantError2);
    return null;
  }

  return newConversation.id;
};

// Set up real-time subscriptions
let messagesSubscription: RealtimeChannel | null = null;
let conversationsSubscription: RealtimeChannel | null = null;

export const subscribeToMessages = (
  conversationId: string,
  onNewMessage: (message: Message) => void
) => {
  // Unsubscribe from any existing subscription
  if (messagesSubscription) {
    messagesSubscription.unsubscribe();
  }

  // Create a new subscription
  messagesSubscription = supabase
    .channel(`messages:${conversationId}`)
    .on('postgres_changes', 
      { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, 
      (payload) => {
        onNewMessage(payload.new as Message);
      }
    )
    .subscribe();

  return () => {
    if (messagesSubscription) {
      messagesSubscription.unsubscribe();
      messagesSubscription = null;
    }
  };
};

export const subscribeToConversations = (
  userId: string,
  onUpdate: () => void
) => {
  // Unsubscribe from any existing subscription
  if (conversationsSubscription) {
    conversationsSubscription.unsubscribe();
  }

  // Create a new subscription for messages (which affect conversations)
  conversationsSubscription = supabase
    .channel(`user_conversations:${userId}`)
    .on('postgres_changes', 
      { 
        event: '*', 
        schema: 'public', 
        table: 'messages',
        filter: `recipient_id=eq.${userId}`
      }, 
      () => {
        onUpdate();
      }
    )
    .on('postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'conversations'
      },
      () => {
        onUpdate();
      }
    )
    .subscribe();

  return () => {
    if (conversationsSubscription) {
      conversationsSubscription.unsubscribe();
      conversationsSubscription = null;
    }
  };
};
