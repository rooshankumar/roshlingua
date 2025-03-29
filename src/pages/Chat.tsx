import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { Conversation } from '@/types/chat';
import { ChatScreen } from '@/components/chat/ChatScreen';
import { Loader2 } from 'lucide-react';
import { fetchConversations } from '@/services/chatService';

const ChatPage = () => {
  const { conversationId } = useParams();
  const { user } = useAuth();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || !conversationId) return;

    const loadConversation = async () => {
      try {
        const conversations = await fetchConversations(user.id);
        const conv = conversations.find(c => c.id === conversationId);
        if (conv) {
          setConversation(conv);
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