import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ChatScreen } from '@/components/chat/ChatScreen';

interface Conversation {
  id: string;
  participant: {
    id: string;
    email: string;
    full_name: string;
    avatar_url: string;
  };
}

const ChatPage = () => {
  const { conversationId } = useParams();
  const { user } = useAuth();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || !conversationId) return;

    const loadConversation = async () => {
      try {
        const { data: participants, error } = await supabase
          .from('conversation_participants')
          .select(`
            users:user_id (
              id,
              email,
              full_name,
              avatar_url
            )
          `)
          .eq('conversation_id', conversationId)
          .neq('user_id', user.id);

        if (error) throw error;

        const otherParticipant = participants?.[0]?.users;

        if (otherParticipant) {
          setConversation({
            id: conversationId,
            participant: {
              id: otherParticipant.id,
              email: otherParticipant.email,
              full_name: otherParticipant.full_name || otherParticipant.email?.split('@')[0],
              avatar_url: otherParticipant.avatar_url || '/placeholder.svg',
              avatar: otherParticipant.avatar_url || '/placeholder.svg'
            }
          });
        } else {
          console.error('No other participant found in conversation');
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
        <p>Please log in to access chat</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p>Conversation not found</p>
      </div>
    );
  }

  return <ChatScreen conversation={conversation} />;
};

export default ChatPage;