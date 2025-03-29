
import { useEffect, useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { Message, Conversation } from '@/types/chat';
import { ChatHeader } from './ChatHeader';
import { MessageBubble } from './MessageBubble';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetchMessages, sendMessage, subscribeToMessages } from '@/services/chatService';

interface ChatScreenProps {
  conversation: Conversation;
}

export const ChatScreen = ({ conversation }: ChatScreenProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const partner = conversation.participants.find(p => p.id !== user?.id);

  useEffect(() => {
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

    // Subscribe to new messages
    const unsubscribe = subscribeToMessages(conversation.id, (message) => {
      setMessages(prev => [...prev, message]);
    });

    return () => {
      unsubscribe();
    };
  }, [conversation.id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !partner || !newMessage.trim()) return;

    try {
      const sent = await sendMessage(
        conversation.id,
        user.id,
        partner.id,
        newMessage.trim()
      );
      if (sent) {
        setNewMessage('');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  if (!partner) return null;

  return (
    <div className="flex flex-col h-full">
      <ChatHeader partner={partner} />
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isOwnMessage={message.sender_id === user?.id}
          />
        ))}
      </div>
      <form onSubmit={handleSendMessage} className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
          />
          <Button type="submit">Send</Button>
        </div>
      </form>
    </div>
  );
};
