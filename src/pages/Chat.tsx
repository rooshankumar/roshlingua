import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { ChatScreen } from '@/components/chat/ChatScreen';
import { useResponsive } from '@/hooks/useResponsive'; // Assumed hook

const ChatPage = () => {
  const { conversationId } = useParams();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [conversation, setConversation] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0); // Added state for unread count
  const { deviceSize } = useResponsive();
  const isMobile = deviceSize === 'xs' || deviceSize === 'sm';

  useEffect(() => {
    if (!user || !conversationId) return;

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

          // Count unread messages before marking as read.
          const unreadMessages = messages.filter(msg => !msg.is_read && msg.recipient_id === user.id);
          setUnreadCount(unreadMessages.length);

          // Mark messages as read
          const { error: readError } = await supabase
            .from('messages')
            .update({ is_read: true })
            .eq('conversation_id', conversationId)
            .eq('recipient_id', user.id)
            .eq('is_read', false);

          if (readError) {
            console.error('Error marking messages as read:', readError);
          }

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
  }, [user, conversationId]);

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
    <div className={isMobile ? "fixed inset-0 z-50 bg-background" : "min-h-screen md:bg-muted/30 max-w-full overflow-hidden"}>
      <ChatScreen conversation={conversation} unreadCount={unreadCount} /> {/* Pass unreadCount to ChatScreen */}
    </div>
  );
};

export default ChatPage;