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

// Simple subscription manager (replace with a more robust solution)
const subscriptionManager = {
  subscriptions: {},
  subscribe: (key, callback) => {
    const channel = supabase.channel(`messages:${key}`);
    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, callback);
    channel.subscribe();
    subscriptionManager.subscriptions[key] = channel;
    return channel;
  },
  unsubscribe: (key) => {
    if (subscriptionManager.subscriptions[key]) {
      subscriptionManager.subscriptions[key].unsubscribe();
      delete subscriptionManager.subscriptions[key];
    }
  },
};


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

  const scrollToLatestMessage = (smooth = true) => {
    const chatContainer = document.querySelector('[data-scrollbar]');
    if (chatContainer) {
      chatContainer.scrollTo({
        top: chatContainer.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      });
    }
  };

  useEffect(() => {
    if (!conversation?.id) return;

    let isActive = true;
    const subscriptionKey = `messages:${conversation.id}`;

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
              avatar_url,
              last_seen
            )
          `)
          .eq('conversation_id', conversation.id)
          .order('created_at', { ascending: true })
          .range((page - 1) * MESSAGES_PER_PAGE, page * MESSAGES_PER_PAGE - 1);

        if (error) throw error;

        setHasMore(data.length === MESSAGES_PER_PAGE);
        setMessages(prev => {
          const newMessages = loadMore ? [...prev, ...data] : data;
          return newMessages;
        });

        if (!loadMore) {
          // Use a small timeout to ensure DOM is updated
          setTimeout(scrollToLatestMessage, 100);
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();

    // Set up real-time subscription for new messages
    const channel = supabase
      .channel(subscriptionKey)
      .on('postgres_changes', 
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversation.id}`
        }, 
        async (payload) => {
          console.log('Real-time: New message received:', payload);

          // Fetch the complete message with sender info
          const { data: newMessage } = await supabase
            .from('messages')
            .select(`
              *,
              sender:profiles!messages_sender_id_fkey(
                id,
                user_id,
                full_name,
                avatar_url,
                last_seen
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (newMessage) {
            console.log('Fetched new message with sender:', newMessage);
            console.log('Message has attachment:', newMessage.attachment_url);
            
            setMessages(prev => {
              const exists = prev.some(msg => msg.id === newMessage.id);
              if (exists) return prev;
              
              // Ensure attachment properties are properly included
              const messageWithAttachment = {
                ...newMessage,
                attachment_url: newMessage.attachment_url || null,
                attachment_name: newMessage.attachment_name || null
              };
              
              const updatedMessages = [...prev, messageWithAttachment];
              // Force a scroll after a small delay to ensure state update
              setTimeout(() => scrollToLatestMessage(), 100);
              return updatedMessages;
            });
          }
        }
      )
      .subscribe((status) => {
        console.log(`Chat subscription status for ${subscriptionKey}:`, status);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to chat messages');
        } else if (status !== 'SUBSCRIBED') {
          console.warn('Chat subscription issue:', status);
          // If connection lost, retry fetching messages after a short delay
          setTimeout(() => fetchMessages(), 3000);
        }
      });

    return () => {
      if (!isActive) return;
      isActive = false;
      console.log(`Cleaning up chat subscription for ${subscriptionKey}`);
      channel.unsubscribe();
    };
  }, [conversation?.id, page]);

  // Add a connection status checker and reconnect mechanism
  useEffect(() => {
    if (!conversation?.id) return;

    let reconnectInterval: NodeJS.Timeout | null = null;

    const checkConnection = () => {
      const channel = supabase.channel(`heartbeat:${conversation.id}`);

      channel
        .subscribe((status) => {
          console.log('Chat connection status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('Chat connection is healthy');
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            console.log('Chat connection lost, will reconnect shortly');
            // Force reload on connection loss
            setTimeout(() => {
              window.location.reload();
            }, 5000);
          }
        });

      // Check connection every minute
      reconnectInterval = setInterval(checkConnection, 60000);
    };

    checkConnection();

    return () => {
      if (reconnectInterval) clearInterval(reconnectInterval);
    };
  }, [conversation?.id]);

  // Auto-scroll when messages change
  useEffect(() => {
    if (messages.length > 0) {
      scrollToLatestMessage();
    }
  }, [messages]);

  const handleSend = async (content?: string, attachment?: { url: string; filename: string }) => {
    const messageContent = content || newMessage;
    if ((!messageContent.trim() && !attachment) || !user || !conversation?.id || isSending) return;

    setIsSending(true);
    const tempId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    // Add optimistic message
    const optimisticMessage = {
      id: tempId,
      content: messageContent,
      conversation_id: conversation.id,
      sender_id: user.id,
      is_read: false,
      attachment_url: attachment?.url,
      attachment_name: attachment?.filename,
      created_at: timestamp,
      sender: {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || '',
        avatar_url: user.user_metadata?.avatar_url,
        last_seen: timestamp
      }
    };

    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage('');
    scrollToBottom();

    try {
      const { error } = await supabase
        .from('messages')
        .insert([{
          content: messageContent,
          conversation_id: conversation.id,
          sender_id: user.id,
          is_read: false,
          attachment_url: attachment?.url,
          attachment_name: attachment?.filename,
          created_at: timestamp
        }]);

      if (error) {
        // Remove the optimistic message on error
        setMessages(prev => prev.filter(msg => msg.id !== tempId));
        throw error;
      }
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
    // Update typing status
    const channel = supabase.channel(`typing:${conversation.id}`);
    channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: { user_id: user?.id }
    });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <Card className="fixed inset-0 flex flex-col md:static md:h-screen md:max-w-4xl md:mx-auto md:rounded-2xl border-none shadow-2xl overflow-hidden bg-gradient-to-b from-background/95 to-background/90 backdrop-blur-lg">
      <div className="sticky top-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl">
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
                      <p className="leading-relaxed mb-2">{message.content}</p>
                      {message.attachment_url && (
                        <div className="mt-1 rounded-lg overflow-hidden">
                          {message.attachment_url?.match(/\.(jpg|jpeg|png|gif|webp|avif)$/i) ? (
                            <img 
                              src={message.attachment_url} 
                              alt="Image" 
                              loading="lazy"
                              onError={(e) => console.error("Image load error:", e)}
                              className="max-w-[300px] max-h-[300px] object-cover rounded-lg hover:scale-105 transition-transform duration-300 cursor-pointer"
                              onClick={() => window.open(message.attachment_url, '_blank')}
                            />
                          ) : message.attachment_url?.match(/\.(mp4|webm|ogg)$/i) ? (
                            <video 
                              src={message.attachment_url}
                              controls
                              className="max-w-[300px] rounded-lg"
                            />
                          ) : message.attachment_url?.match(/\.(mp3|wav|aac)$/i) ? (
                            <audio 
                              src={message.attachment_url}
                              controls
                              className="max-w-[300px]"
                            />
                          ) : message.attachment_url?.match(/\.(pdf)$/i) ? (
                            <iframe
                              src={message.attachment_url}
                              className="w-[300px] h-[400px] rounded-lg border border-border"
                            />
                          ) : message.attachment_url ? (
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
                          ) : null}
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
                            <AvatarImage src={message.sender?.avatar_url || '/placeholder.svg'} alt={message.sender?.full_name || 'User'} />
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
                className="flex-1 min-h-[45px] max-h-[90px] rounded-2xl bg-muted/50 backdrop-blur-sm focus:bg-background transition-colors duration-200"
                rows={1}
              />
              <Button
                onClick={() => handleSend(newMessage)}
                disabled={!newMessage.trim() || isSending || !user}
                size="icon"
                className="h-[45px] w-[45px] rounded-2xl bg-primary hover:bg-primary/90 transition-all duration-200 hover:scale-105 active:scale-95"
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