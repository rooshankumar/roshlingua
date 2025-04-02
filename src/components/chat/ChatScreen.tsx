import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Loader2, FileText, Check } from 'lucide-react';
import { ChatAttachment } from './ChatAttachment';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Message } from '@/types/chat';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { ChatHeader } from './ChatHeader';
import { Textarea } from '../ui/textarea';
import { ScrollArea } from '../ui/scroll-area';
import { Card, CardContent } from '../ui/card';

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
            sender:profiles!messages_sender_id_fkey(
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

  const handleSend = async (content?: string, attachment?: { url: string; filename: string }) => {
    const messageContent = content || newMessage;
    if ((!messageContent.trim() && !attachment) || !user || !conversation?.id || isSending) return;

    setIsSending(true);
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
          content: messageContent,
          conversation_id: conversation.id,
          sender_id: currentUser.id,
          is_read: false,
          attachment_url: attachment?.url,
          attachment_name: attachment?.filename,
          created_at: new Date().toISOString()
        }]);

      if (error) throw error;
      setNewMessage('');
      scrollToBottom();
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(newMessage);
    }
  };

  return (
    <Card className="flex flex-col h-screen rounded-none border-none md:max-w-4xl md:mx-auto shadow-2xl">
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b">
        <ChatHeader conversation={conversation} />
      </div>

      {user?.id ? (
        <ScrollArea className="flex-1 px-3 md:px-6 pt-4">
          <div className="space-y-4 pb-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start gap-2 ${message.sender_id === user?.id ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {message.sender_id !== user?.id && (
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={message.sender?.avatar_url || '/placeholder.svg'} alt={message.sender?.full_name || 'User'} />
                    <AvatarFallback>
                      {message.sender?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className={`flex flex-col gap-1 max-w-[70%] md:max-w-[60%] lg:max-w-[50%]`}>
                  {message.sender_id !== user?.id && (
                    <span className="text-xs text-muted-foreground ml-1">
                      {message.sender?.full_name}
                    </span>
                  )}
                  <div className="flex items-end gap-1">
                    <div
                      className={`rounded-lg p-3 break-words ${
                        message.sender_id === user?.id
                          ? 'bg-primary text-primary-foreground rounded-tr-none'
                          : 'bg-muted rounded-tl-none'
                      }`}
                    >
                      {message.content}
                      {message.attachment_url && (
                        <div className="mt-2">
                          {message.attachment_url.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                            <img 
                              src={message.attachment_url} 
                              alt={message.attachment_name || 'Attachment'} 
                              className="max-w-[200px] max-h-[200px] object-contain rounded-md"
                            />
                          ) : (
                            <div className="flex items-center gap-2 p-2 bg-background/10 rounded-md">
                              <FileText className="h-4 w-4" />
                              <a 
                                href={message.attachment_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-sm hover:underline"
                              >
                                {message.attachment_name || 'Download attachment'}
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {message.sender_id === user?.id && (
                      <div className="flex items-center h-3">
                        <Check className={`h-3 w-3 ${message.is_delivered ? '' : 'opacity-50'}`} />
                        {message.is_read && (
                          <Check className="h-3 w-3 -ml-1" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Loading user data...</p>
        </div>
      )}

      {user?.id ? (
        <div className="fixed bottom-0 left-0 right-0 md:static bg-background/95 backdrop-blur-sm border-t">
          <CardContent className="p-4 md:pb-4">
            <div className="flex items-end gap-2">
              <ChatAttachment onAttach={(url, filename) => handleSend(newMessage, { url, filename })} />
              <Textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Type a message..."
                className="flex-1 min-h-[60px] max-h-[120px]"
                rows={1}
              />
              <Button
                onClick={() => handleSend(newMessage)}
                disabled={!newMessage.trim() || isSending || !user}
                size="icon"
                className="h-[60px] w-[60px]"
              >
                {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </Button>
            </div>
          </CardContent>
        </div>
      ) : (
        <CardContent className="border-t p-4">
          <p className="text-muted-foreground text-center">Please wait for user data to load...</p>
        </CardContent>
      )}
    </Card>
  );
};

export default ChatScreen;