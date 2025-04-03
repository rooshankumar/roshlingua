import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { Loader2 } from 'lucide-react';
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
        const { data: conversationParticipants, error: participantsError } = await supabase
          .from('conversation_participants')
          .select(`
            user_id,
            users:users!inner(
              id,
              email,
              full_name,
              avatar_url,
              is_online,
              last_seen
            )
          `)
          .eq('conversation_id', conversationId)
          .neq('user_id', user.id);

        if (participantsError) throw participantsError;

        const otherParticipant = conversationParticipants
          ?.map(cp => cp.users)
          ?.find(u => u.id !== user.id);

        if (otherParticipant) {
          setConversation({
            id: conversationId,
            participant: {
              id: otherParticipant.id,
              full_name: otherParticipant.full_name,
              avatar_url: otherParticipant.avatar_url,
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
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Conversation not found</p>
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