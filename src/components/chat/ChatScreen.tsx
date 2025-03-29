
import { useEffect, useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { Message, Conversation } from '@/types/chat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetchMessages, sendMessage, subscribeToMessages } from '@/services/chatService';
import { Loader2 } from 'lucide-react';

interface ChatScreenProps {
  conversation: Conversation;
}

export const ChatScreen = ({ conversation }: ChatScreenProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const partner = conversation?.participants?.find(p => p.id !== user?.id);

  useEffect(() => {
    if (!conversation?.id) return;

    const loadMessages = async () => {
      try {
        const msgs = await fetchMessages(conversation.id);
        setMessages(msgs);
      } catch (error) {
        console.error('Error loading messages:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();

    const unsubscribe = subscribeToMessages(conversation.id, (message) => {
      setMessages(prev => [message, ...prev]);
    });

    return () => {
      unsubscribe();
    };
  }, [conversation.id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newMessage.trim()) return;

    try {
      await sendMessage(conversation.id, user.id, newMessage.trim());
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  if (!partner) return null;

  return (
    <div className="flex flex-col h-screen">
      <div className="border-b p-4">
        <h2 className="font-semibold">{partner.name}</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col-reverse">
        {isLoading ? (
          <div className="flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`mb-4 ${message.sender_id === user?.id ? 'ml-auto' : 'mr-auto'}`}
            >
              <div
                className={`p-3 rounded-lg max-w-md ${
                  message.sender_id === user?.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                {message.content}
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSendMessage} className="border-t p-4">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
          />
          <Button type="submit" disabled={!newMessage.trim()}>
            Send
          </Button>
        </div>
      </form>
    </div>
  );
};
