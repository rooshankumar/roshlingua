import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { ChatScreen } from '@/components/chat/ChatScreen';
import { useUnreadMessages } from "@/hooks/useUnreadMessages";

const ChatPage = () => {
  const { conversationId } = useParams();
  const { user } = useAuth();
  const { markConversationAsRead, setActiveConversationId, forceResetUnreadCount, refreshUnreadCounts } = useUnreadMessages(user?.id);
  const [isLoading, setIsLoading] = useState(true);
  const [conversation, setConversation] = useState<any>(null);

  // Update active conversation and mark as read when conversation ID changes
  useEffect(() => {
    if (conversationId && user?.id) {
      console.log('Setting active conversation:', conversationId);

      // Set the active conversation ID first
      setActiveConversationId(conversationId);

      // Force a complete reset of the unread count
      forceResetUnreadCount(conversationId);

      // Also mark as read to ensure database consistency
      markConversationAsRead(conversationId);

      // Perform multiple refreshes with increasing delays to ensure UI consistency
      refreshUnreadCounts();

      const timers = [100, 500, 1500].map(delay => 
        setTimeout(() => {
          refreshUnreadCounts();
          // Double-check that the unread count is properly reset
          forceResetUnreadCount(conversationId);
        }, delay)
      );

      return () => timers.forEach(timer => clearTimeout(timer));
    }
  }, [conversationId, user?.id, markConversationAsRead, setActiveConversationId, refreshUnreadCounts, forceResetUnreadCount]);

  useEffect(() => {
    if (!user || !conversationId) return;

    // Set this as the active conversation
    setActiveConversationId(conversationId);

    const loadConversation = async () => {
      try {
        const { data: participant, error: participantsError } = await supabase
          .from('conversation_participants')
          .select(`
            user_id,
            profiles!conversation_participants_user_id_fkey (
              id,
              full_name,
              avatar_url,
              is_online
            )
          `)
          .eq('conversation_id', conversationId)
          .neq('user_id', user.id)
          .maybeSingle();

        if (participantsError) {
          console.error('Error loading participants:', participantsError);
          throw participantsError;
        }

        if (!participant) {
          console.error('No participant found for conversation:', conversationId);
          return;
        }

        const otherParticipant = participant.profiles;

        if (otherParticipant) {
          // Fetch messages with sender profile info
          const { data: messages, error: messagesError } = await supabase
            .from('messages')
            .select(`
              *,
              sender:profiles!messages_sender_id_fkey (
                id,
                full_name,
                avatar_url,
                is_online
              )
            `)
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });

          if (messagesError) {
            console.error('Error fetching messages:', messagesError);
            throw messagesError;
          }

          // Use the hook function to mark messages as read (this will update both DB and local state)
          await markConversationAsRead(conversationId);

          setConversation({
            id: conversationId,
            messages: messages || [],
            participant: {
              id: otherParticipant.id,
              full_name: otherParticipant.full_name || 'Unknown User',
              avatar_url: otherParticipant.avatar_url || '/placeholder.svg',
              is_online: otherParticipant.is_online,
            }
          });
        }
      } catch (error) {
        console.error('Error loading conversation:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadConversation();

    // Cleanup function - clear active conversation when unmounting
    return () => {
      setActiveConversationId(null);
    };
  }, [user, conversationId, markConversationAsRead, setActiveConversationId]);

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Please log in to access chat</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!conversation) {
    const createNewConversation = async () => {
      try {
        const { data: participant, error: participantError } = await supabase
          .from('conversations')
          .insert([{
            created_by: user.id,
            last_message_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (participantError) throw participantError;

        // Add participants
        const { error: participantsError } = await supabase
          .from('conversation_participants')
          .insert([
            { conversation_id: participant.id, user_id: user.id }
          ]);

        if (participantsError) throw participantsError;

        // Navigate to the new conversation
        window.location.href = `/chat/${participant.id}`;
      } catch (error) {
        console.error('Error creating conversation:', error);
      }
    };

    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">No conversation found</p>
        <Button onClick={createNewConversation}>Start New Conversation</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen md:bg-muted/30 max-w-full overflow-hidden">
      <ChatScreen conversation={conversation} />
    </div>
  );
};

export default ChatPage;