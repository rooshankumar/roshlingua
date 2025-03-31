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
        const { data: otherParticipant, error } = await supabase
          .from('conversation_participants')
          .select(`
            users:user_id (
              id,
              email,
              profiles:profiles (
                full_name,
                avatar_url
              )
            )
          `)
          .eq('conversation_id', conversationId)
          .neq('user_id', user.id)
          .single();

        if (error) throw error;

        if (otherParticipant?.users) {
            const profile = otherParticipant.users.profiles;
            setConversation({
              id: conversationId,
              participant: {
                id: otherParticipant.users.id,
                email: otherParticipant.users.email,
                full_name: profile?.full_name || otherParticipant.users.email?.split('@')[0],
                avatar_url: profile?.avatar_url || '/placeholder.svg'
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