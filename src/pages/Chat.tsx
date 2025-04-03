import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { ChatScreen } from '@/components/chat/ChatScreen';

const ChatPage = () => {
  const { conversationId } = useParams();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [conversation, setConversation] = useState<any>(null);

  useEffect(() => {
    if (!user || !conversationId) return;

    const loadConversation = async () => {
      try {
        const { data: participant, error: participantsError } = await supabase
          .from('conversation_participants')
          .select(`
            user_id,
            auth.users (
              id,
              email,
              raw_user_meta_data->>'full_name' AS full_name,
              raw_user_meta_data->>'avatar_url' AS avatar_url,
              raw_user_meta_data->>'is_online' AS is_online,
              raw_user_meta_data->>'last_seen' AS last_seen
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

        if (participantsError) throw participantsError;

        const otherParticipant = participant?.users;

        if (otherParticipant) {
          // Fetch messages with sender profile info
          const { data: messages, error: messagesError } = await supabase
            .from('messages')
            .select(`
              id,
              content,
              created_at,
              sender_id,
              sender:messages_sender_id_fkey (
                id,
                email,
                full_name,
                avatar_url
              )
            `)
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });

          if (messagesError) {
            console.error('Error fetching messages:', messagesError);
            throw messagesError;
          }

          setConversation({
            id: conversationId,
            messages: messages || [],
            participant: {
              id: otherParticipant.id,
              email: otherParticipant.email,
              full_name: otherParticipant.full_name || 'Unknown User',
              avatar_url: otherParticipant.avatar_url || '/placeholder.svg',
              is_online: otherParticipant.is_online,
              last_seen: otherParticipant.last_seen
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
    <div className="min-h-screen md:bg-muted/30">
      <ChatScreen conversation={conversation} />
    </div>
  );
};

export default ChatPage;