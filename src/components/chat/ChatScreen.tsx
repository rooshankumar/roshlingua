import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Loader2 } from 'lucide-react';
import { ChatAttachment } from './ChatAttachment';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
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
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const MESSAGES_PER_PAGE = 50;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!conversation?.id) return;

    const fetchMessages = async (loadMore = false) => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select(`
            *,
            sender:profiles!sender_id(
              id,
              user_id,
              full_name,
              avatar_url
            )
          `)
          .eq('conversation_id', conversation.id)
          .order('created_at', { ascending: false })
          .range((page - 1) * MESSAGES_PER_PAGE, page * MESSAGES_PER_PAGE - 1);

        if (error) throw error;

        setHasMore(data.length === MESSAGES_PER_PAGE);
        setMessages(prev => {
          const newMessages = loadMore ? [...prev, ...data.reverse()] : data.reverse();
          return newMessages;
        });

        if (!loadMore) scrollToBottom();
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
        // Check if message already exists before adding
        setMessages(prev => {
          const exists = prev.some(msg => msg.id === payload.new.id);
          return exists ? prev : [...prev, payload.new as Message];
        });
        scrollToBottom();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation?.id, page]);

  const handleSend = async (content: string, attachment?: { url: string; filename: string }) => {
    if ((!content.trim() && !attachment) || !user || !conversation?.id || isSending) return;

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


    try {
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
          is_read: false,
          created_at: new Date().toISOString()
        }]);

      if (error) throw error;
      setNewMessage('');
      scrollToBottom();
    } catch (error) {
      console.error('Error sending message:', error);
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
          {hasMore && (
            <div className="text-center mb-4">
              <Button
                variant="outline"
                onClick={() => {
                  setPage(prev => prev + 1);
                  fetchMessages(true);
                }}
              >
                Load More
              </Button>
            </div>
          )}
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-end gap-2 ${message.sender_id === user?.id ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={message.sender?.avatar_url || '/placeholder.svg'} />
                  <AvatarFallback>
                    {message.sender?.full_name?.substring(0, 2).toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
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
          <div className="flex items-end gap-2">
            <ChatAttachment onAttach={(url, filename) => {
              // Handle attachment here
              console.log('File attached:', url, filename);
            }} />
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

export default ChatScreen;