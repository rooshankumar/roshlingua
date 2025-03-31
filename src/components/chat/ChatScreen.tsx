import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Message } from '@/types/chat';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { ChatHeader } from './ChatHeader';
import { Textarea } from '../ui/textarea';

interface Props {
  conversation: {
    id: string;
    title?: string;
    participant?: { id: string }
  };
}

export const ChatScreen = ({ conversation }: Props) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!conversation?.id) return;

    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversation.id)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setMessages(data || []);
        scrollToBottom();
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();

    const channel = supabase
      .channel(`room:${conversation.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversation.id}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message]);
        scrollToBottom();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation?.id]);

  const handleSend = async () => {
    if (!newMessage.trim() || !user || !conversation?.id || isSending) return;

    if (!user?.id) {
      console.error("User ID is null right before sending message - preventing send.");
      return;
    }

    setIsSending(true);
    const tempMessage = {
      id: Math.random().toString(),
      content: newMessage.trim(),
      sender_id: user.id,
      conversation_id: conversation.id,
      created_at: new Date().toISOString(),
    };

    console.log("User object in handleSend:", user);
    console.log("User ID in handleSend:", user?.id);

    try {
      setMessages(prev => [...prev, tempMessage]);
      setNewMessage('');
      scrollToBottom();

      const { data: currentSession } = await supabase.auth.getSession();
      const currentUser = currentSession?.session?.user;

      if (!currentUser?.id) {
        console.error("User ID is null right before database insert.");
        return;
      }

      const { error } = await supabase
        .from('messages')
        .insert([{
          content: tempMessage.content,
          conversation_id: conversation.id,
          sender_id: currentUser.id,
          is_read: false
        }]);

      if (error) throw error;
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
      setNewMessage(tempMessage.content);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <ChatHeader conversation={conversation} />

      {user?.id ? (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'
                  }`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-3 break-words ${message.sender_id === user?.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                    }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Loading user data...</p>
        </div>
      )}

      {user?.id ? (
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1"
              rows={1}
            />
            <Button
              onClick={handleSend}
              disabled={!newMessage.trim() || isSending || !user}
              className="self-end"
            >
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      ) : (
        <div className="border-t p-4">
          <p className="text-muted-foreground text-center">Please wait for user data to load...</p>
        </div>
      )}
    </div>
  );
};