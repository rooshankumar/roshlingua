import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { Message } from '@/types/chat';

interface Participant {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
}

interface ConversationProps {
  id: string;
  participant: Participant;
}

interface ChatScreenProps {
  conversation: ConversationProps;
}

export const ChatScreen = ({ conversation }: ChatScreenProps) => {
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

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
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
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setIsLoading(false);
        scrollToBottom();
      }
    };

    fetchMessages();

    const channel = supabase
      .channel(`conversation_${conversation.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversation.id}`
      }, (payload) => {
        // Only add message if it's not from current user
        if (payload.new.sender_id !== user?.id) {
          setMessages(prev => [...prev, payload.new]);
          scrollToBottom();
        }
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [conversation.id, user?.id]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user?.id || !conversation?.id || isSending) return;

    try {
      setIsSending(true);
      const messageContent = newMessage.trim();
      setNewMessage('');

      // Optimistically add message to UI
      const optimisticMessage = {
        id: Date.now().toString(),
        content: messageContent,
        created_at: new Date().toISOString(),
        sender_id: user.id,
        conversation_id: conversation.id
      };
      setMessages(prev => [...prev, optimisticMessage]);
      scrollToBottom();

      const { error, data } = await supabase
        .from('messages')
        .insert({
          content: messageContent,
          conversation_id: conversation.id,
          sender_id: user.id
        })
        .select()
        .single();

      if (error) throw error;

      // Update the optimistic message with the real one
      setMessages(prev => prev.map(msg => 
        msg.id === optimisticMessage.id ? data : msg
      ));
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-screen">
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
          <AvatarImage src={conversation.participant.avatar_url} />
          <AvatarFallback>{getInitials(conversation.participant.full_name || conversation.participant.email)}</AvatarFallback>
        </Avatar>
        <div className="ml-3">
          <p className="font-medium">{conversation.participant.full_name || conversation.participant.email}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.user_id === user?.id ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-lg p-3 ${
                message.user_id === user?.id
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

      <form onSubmit={sendMessage} className="p-4 border-t flex gap-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1"
        />
        <Button type="submit" size="icon" disabled={isSending}>
          {isSending ? <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-gray-500"></div> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
};