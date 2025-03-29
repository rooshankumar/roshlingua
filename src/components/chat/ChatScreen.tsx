import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { Message, Conversation } from '@/types/chat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { fetchMessages, sendMessage, subscribeToMessages } from '@/services/chatService';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

interface ChatScreenProps {
  conversation: Conversation;
}

export const ChatScreen = ({ conversation }: ChatScreenProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const partner = conversation?.participants?.find(p => p.id !== user?.id);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getInitials = (name?: string) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  useEffect(() => {
    if (!conversation?.id) return;

    const loadMessages = async () => {
      try {
        const msgs = await fetchMessages(conversation.id);
        setMessages(prev => {
          const uniqueMessages = msgs.filter(msg => 
            !prev.some(p => p.id === msg.id)
          );
          return [...uniqueMessages, ...prev].sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        });
      } catch (error) {
        console.error('Error loading messages:', error);
      } finally {
        setIsLoading(false);
        scrollToBottom();
      }
    };

    loadMessages();

    const unsubscribe = subscribeToMessages(conversation.id, (message) => {
      setMessages(prev => {
        if (prev.some(m => m.id === message.id)) return prev;
        return [...prev, message].sort((a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      });
      scrollToBottom();
    });

    return () => {
      unsubscribe();
    };
  }, [conversation?.id]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user?.id || !conversation?.id) return;

    try {
      await sendMessage(conversation.id, user.id, newMessage.trim());
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Chat Header */}
      <div className="flex items-center p-4 border-b">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate('/chat')}
          className="mr-2"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Avatar className="h-10 w-10">
          <AvatarImage src={partner?.avatar} />
          <AvatarFallback>{getInitials(partner?.name || partner?.email)}</AvatarFallback>
        </Avatar>
        <div className="ml-3">
          <p className="font-medium">{partner?.name || partner?.email}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex mb-4 ${
                message.sender_id === user?.id ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`rounded-lg px-4 py-2 max-w-[70%] ${
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
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={handleSend} className="p-4 border-t">
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