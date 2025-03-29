
import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { Message, Conversation } from '@/types/chat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const partner = conversation?.participants?.find(p => p.id !== user?.id);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
        const newMessages = [...prev, message].sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        scrollToBottom();
        return newMessages;
      });
    });

    return () => {
      unsubscribe();
    };
  }, [conversation?.id]);

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

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString();
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="border-b p-4 flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={partner.avatar} alt={partner.name} />
          <AvatarFallback>{getInitials(partner.name)}</AvatarFallback>
        </Avatar>
        <div>
          <h2 className="font-semibold">{partner.name}</h2>
          <p className="text-sm text-muted-foreground">Online</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-muted-foreground">No messages yet</div>
        ) : (
          <>
            {messages.map((message, index) => {
              const isFirstMessageOfDay = index === 0 || 
                formatDate(messages[index - 1].created_at) !== formatDate(message.created_at);
              const isSentByMe = message.sender_id === user?.id;
              const sender = isSentByMe ? user : partner;

              return (
                <div key={message.id}>
                  {isFirstMessageOfDay && (
                    <div className="text-center text-sm text-muted-foreground my-4">
                      {formatDate(message.created_at)}
                    </div>
                  )}
                  <div className={`flex items-end gap-2 ${isSentByMe ? 'flex-row-reverse' : ''}`}>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={sender.avatar} alt={sender.name} />
                      <AvatarFallback>{getInitials(sender.name)}</AvatarFallback>
                    </Avatar>
                    <div className={`max-w-[70%] ${isSentByMe ? 'ml-auto' : 'mr-auto'}`}>
                      <div className={`p-3 rounded-lg ${
                        isSentByMe ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      }`}>
                        {message.content}
                      </div>
                      <div className={`text-xs text-muted-foreground mt-1 ${
                        isSentByMe ? 'text-right' : 'text-left'
                      }`}>
                        {formatTime(message.created_at)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
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
