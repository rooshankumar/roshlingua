
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
    <Card className="fixed inset-0 flex flex-col md:static md:h-screen md:max-w-4xl md:mx-auto md:rounded-2xl border-none shadow-2xl overflow-hidden bg-gradient-to-b from-background/95 to-background/90 backdrop-blur-lg">
      <div className="sticky top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl">
        <ChatHeader conversation={conversation} />
      </div>

      {user?.id ? (
        <ScrollArea className="flex-1 px-4 md:px-6 py-4 overflow-y-auto pr-6" data-scrollbar>
          <div className="space-y-6">
            {messages.map((message, index) => (
              <div
                key={message.id}
                className={`flex items-start gap-3 animate-slide-up ${
                  message.sender_id === user?.id ? 'flex-row-reverse' : 'flex-row'
                }`}
                style={{
                  animationDelay: `${index * 0.1}s`
                }}
              >
                <div className={`flex flex-col gap-2 max-w-[85%] sm:max-w-[70%] group transition-all duration-300`}>
                  {message.sender_id !== user?.id && (
                    <span className="text-xs text-muted-foreground ml-1">
                      {message.sender?.full_name}
                    </span>
                  )}
                  <div className="flex items-end gap-2">
                    <div
                      className={`rounded-[22px] p-4 break-words shadow-sm transition-all duration-300 ${
                        message.sender_id === user?.id
                          ? 'bg-primary text-primary-foreground rounded-br-md'
                          : 'bg-muted/90 backdrop-blur-sm rounded-bl-md'
                      }`}
                    >
                      <p className="leading-relaxed">{message.content}</p>
                      {message.attachment_url && (
                        <div className="mt-3 rounded-lg overflow-hidden">
                          {message.attachment_url.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                            <img 
                              src={message.attachment_url} 
                              alt={message.attachment_name || 'Attachment'} 
                              className="max-w-[200px] max-h-[200px] object-cover rounded-lg hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="flex items-center gap-3 p-3 bg-background/10 rounded-lg hover:bg-background/20 transition-colors duration-200">
                              <FileText className="h-5 w-5" />
                              <a 
                                href={message.attachment_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-sm font-medium hover:underline"
                              >
                                {message.attachment_name || 'Download attachment'}
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {message.sender_id === user?.id && (
                      <div 
                        className="flex items-center h-3 gap-1 opacity-0 cursor-pointer transition-opacity duration-200"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.currentTarget.classList.toggle('opacity-100');
                        }}
                      >
                        {message.is_read ? (
                          <Avatar className="h-3 w-3">
                            <AvatarImage 
                              src={message.sender?.avatar_url || '/placeholder.svg'} 
                              alt={message.sender?.full_name || 'User'} 
                              className="object-cover"
                            />
                            <AvatarFallback className="text-[8px]">
                              {message.sender?.full_name?.charAt(0).toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <Check className={`h-3 w-3 ${message.is_delivered ? '' : 'opacity-50'}`} />
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
          <div className="text-center space-y-2 animate-fade-up">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Loading chat...</p>
          </div>
        </div>
      )}

      {user?.id && (
        <div className="sticky bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t border-border/50">
          <CardContent className="p-4 max-w-4xl mx-auto">
            <div className="flex items-end gap-3">
              <ChatAttachment onAttach={(url, filename) => handleSend(newMessage, { url, filename })} />
              <Textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Type a message..."
                className="flex-1 min-h-[60px] max-h-[120px] rounded-2xl bg-muted/50 backdrop-blur-sm focus:bg-background transition-colors duration-200"
                rows={1}
              />
              <Button
                onClick={() => handleSend(newMessage)}
                disabled={!newMessage.trim() || isSending || !user}
                size="icon"
                className="h-[60px] w-[60px] rounded-2xl bg-primary hover:bg-primary/90 transition-all duration-200 hover:scale-105 active:scale-95"
              >
                {isSending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
          </CardContent>
        </div>
      )}
    </Card>
  );
};

export default ChatScreen;
