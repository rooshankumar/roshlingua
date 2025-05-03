import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Loader2, FileText, Check, Image, X } from 'lucide-react';
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
import { toast } from '@/components/ui/use-toast';
import { handleImageLoadError, isLikelyBlockedUrl } from '@/utils/imageUtils';
import { VoiceRecorder } from './VoiceRecorder'; // Imported VoiceRecorder component
import { MessageReactions } from './MessageReactions'; // Added import for MessageReactions


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
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [showReplyPreview, setShowReplyPreview] = useState(false);
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

              // Ensure attachment properties are properly included and log them
              console.log('Processing message with attachment:', 
                newMessage.id, 
                'URL:', newMessage.attachment_url,
                'Name:', newMessage.attachment_name);

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

  const handleReact = async (messageId: string, emoji: string) => {
    if (!user?.id) return;
    
    try {
      // Find existing message reactions component and tell it to add this reaction
      const messageReactions = document.querySelector(`[data-message-reactions="${messageId}"]`) as any;
      if (messageReactions && messageReactions.__reactProps$) {
        // Call onReact function if available through React props
        if (messageReactions.__reactProps$.onReact) {
          messageReactions.__reactProps$.onReact(emoji);
        } else {
          // Fallback: Create new MessageReactions component and manually trigger reaction
          const reactionComponent = new MessageReactions({ 
            messageId, 
            existingReactions: {} 
          });
          await reactionComponent.handleReact(emoji);
        }
      } else {
        // Direct API call if component not found
        const userId = user.id;
        
        // Check if reaction exists
        const { data: existingReaction } = await supabase
          .from('message_reactions')
          .select('*')
          .eq('message_id', messageId)
          .eq('user_id', userId)
          .eq('emoji', emoji)
          .maybeSingle();
          
        if (existingReaction) {
          // Delete the reaction if it exists
          await supabase
            .from('message_reactions')
            .delete()
            .eq('message_id', messageId)
            .eq('user_id', userId)
            .eq('emoji', emoji);
        } else {
          // Insert a new reaction
          await supabase
            .from('message_reactions')
            .insert({
              message_id: messageId,
              user_id: userId,
              emoji: emoji,
              created_at: new Date().toISOString()
            });
        }
      }
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  const handleSend = async (content?: string, attachment?: { url: string; filename: string; thumbnail?: string }) => {
    const messageContent = content || newMessage;
    if ((!messageContent.trim() && !attachment) || !user || !conversation?.id || isSending) return;

    setIsSending(true);
    const tempId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    // Log attachment information for debugging
    if (attachment) {
      console.log('Sending message with attachment:', {
        url: attachment.url,
        filename: attachment.filename,
        hasThumbnail: !!attachment.thumbnail
      });
    }

    // Add optimistic message
    const optimisticMessage = {
      id: tempId,
      content: messageContent,
      conversation_id: conversation.id,
      sender_id: user.id,
      is_read: false,
      attachment_url: attachment?.url,
      attachment_name: attachment?.filename,
      attachment_thumbnail: attachment?.thumbnail,
      created_at: timestamp,
      sender: {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || '',
        avatar_url: user.user_metadata?.avatar_url,
        last_seen: timestamp
      },
      reactions: [] // Initialize reactions array
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
                id={`message-${message.id}`} // Added ID for scroll navigation
                key={message.id}
                className={`flex items-start gap-3 animate-slide-up ${
                  message.sender_id === user?.id ? 'flex-row-reverse' : 'flex-row'
                }`}
                style={{
                  animationDelay: `${index * 0.1}s`
                }}
                onClick={() => {
                  // Show message actions on click
                  const messageActions = document.getElementById(`message-actions-${message.id}`);
                  if (messageActions) {
                    messageActions.classList.toggle('opacity-0');
                    messageActions.classList.toggle('pointer-events-none');
                  }
                }}
                onTouchStart={(e) => {
                  // Set up long press handler
                  const element = e.currentTarget;
                  const messageId = message.id;
                  
                  // Add visual feedback
                  element.classList.add('message-long-press');
                  
                  const longPressTimer = setTimeout(() => {
                    // Show message actions on long press
                    const messageActions = document.getElementById(`message-actions-${messageId}`);
                    if (messageActions) {
                      // Add haptic feedback if supported
                      if ('vibrate' in navigator) {
                        navigator.vibrate(50);
                      }
                      messageActions.classList.remove('opacity-0');
                      messageActions.classList.remove('pointer-events-none');
                      messageActions.classList.add('active');
                    }
                  }, 400); // 400ms for long press - slightly faster for better responsiveness
                  
                  // Store the timer ID to clear it on touchend
                  element.setAttribute('data-long-press-timer', longPressTimer.toString());
                }}
                onTouchEnd={(e) => {
                  // Clear the long press timer on touch end
                  const element = e.currentTarget;
                  const timerId = element.getAttribute('data-long-press-timer');
                  if (timerId) {
                    clearTimeout(parseInt(timerId));
                    element.removeAttribute('data-long-press-timer');
                  }
                  
                  // Remove visual feedback
                  element.classList.remove('message-long-press');
                }}
                onTouchMove={(e) => {
                  // Clear the long press timer on touch move (user is scrolling)
                  const element = e.currentTarget;
                  const timerId = element.getAttribute('data-long-press-timer');
                  if (timerId) {
                    clearTimeout(parseInt(timerId));
                    element.removeAttribute('data-long-press-timer');
                  }
                }}
              >
                <div className={`flex flex-col gap-2 max-w-[85%] sm:max-w-[70%] group transition-all duration-300 relative`}>
                  {/* Message actions */}
                  <div 
                    id={`message-actions-${message.id}`}
                    className="message-actions-menu absolute -top-14 left-0 right-0 opacity-0 pointer-events-none transition-opacity duration-200 flex justify-center gap-2 z-10 touch:z-50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="bg-muted/90 backdrop-blur-sm rounded-full p-1.5 shadow-md flex items-center gap-2 border border-border/30">
                      <button 
                        className="p-2 hover:bg-background/30 rounded-full mobile-touch-target" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setReplyTo(message);
                          document.querySelector('textarea')?.focus();
                          const messageActions = document.getElementById(`message-actions-${message.id}`);
                          if (messageActions) {
                            messageActions.classList.add('opacity-0', 'pointer-events-none');
                          }
                          // Provide haptic feedback
                          if ('vibrate' in navigator) {
                            navigator.vibrate(25);
                          }
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="9 17 4 12 9 7"></polyline>
                          <path d="M20 18v-2a4 4 0 0 0-4-4H4"></path>
                        </svg>
                      </button>
                      <button 
                        className="p-2 hover:bg-background/30 rounded-full mobile-touch-target"
                        onClick={(e) => {
                          e.stopPropagation();
                          const emojiPicker = document.getElementById(`emoji-picker-${message.id}`);
                          if (emojiPicker) {
                            emojiPicker.classList.toggle('hidden');
                          }
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                          <line x1="9" y1="9" x2="9.01" y2="9"></line>
                          <line x1="15" y1="9" x2="15.01" y2="9"></line>
                        </svg>
                      </button>
                    </div>
                    
                    {/* Emoji picker */}
                    <div 
                      id={`emoji-picker-${message.id}`}
                      className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-muted/90 backdrop-blur-sm rounded-full p-1 shadow-md hidden"
                    >
                      <div className="flex items-center gap-1">
                        {['👍', '❤️', '😂', '😮', '😢', '👏'].map(emoji => (
                          <button 
                            key={emoji}
                            className="p-1 hover:bg-background/30 rounded-full text-lg"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReact(message.id, emoji);
                              document.getElementById(`emoji-picker-${message.id}`)?.classList.add('hidden');
                              document.getElementById(`message-actions-${message.id}`)?.classList.add('opacity-0', 'pointer-events-none');
                            }}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
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
                      <MessageReactions messageId={message.id} existingReactions={message.reactions} /> {/* Added MessageReactions component */}
                      {message.attachment_url && (
                        <div className="mt-1 rounded-lg overflow-hidden">
                          {message.attachment_url?.match(/\.(jpg|jpeg|png|gif|webp|avif)$/i) ? (
                            <div className="relative">
                              <img 
                                src={message.attachment_url} 
                                alt={message.attachment_name || "Image"}
                                className="max-w-[300px] max-h-[300px] object-cover rounded-lg hover:scale-105 transition-transform duration-200 cursor-pointer"
                                onClick={() => window.open(message.attachment_url, '_blank')}
                                onError={(e) => handleImageLoadError(e, message.attachment_url as string)}
                                loading="lazy"
                                referrerPolicy="no-referrer"
                              />
                              {/* Download button */}
                              <a 
                                href={message.attachment_url}
                                download={message.attachment_name}
                                className="absolute top-2 right-2 bg-black/60 text-white p-1 rounded-full hover:bg-black/80 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                  <polyline points="7 10 12 15 17 10"></polyline>
                                  <line x1="12" y1="15" x2="12" y2="3"></line>
                                </svg>
                              </a>
                            </div>
                          ) : message.attachment_url?.match(/\.(mp4|webm|ogg)$/i) ? (
                            <video 
                              src={message.attachment_url}
                              controls
                              className="max-w-[300px] rounded-lg"
                              onError={() => {
                                console.error("Video failed to load:", message.attachment_url);
                              }}
                            />
                          ) : message.attachment_url?.match(/\.(mp3|wav|aac)$/i) ? (
                            <audio 
                              src={message.attachment_url}
                              controls
                              className="max-w-[300px]"
                              onError={() => {
                                console.error("Audio failed to load:", message.attachment_url);
                              }}
                            />
                          ) : message.attachment_url?.match(/\.(pdf)$/i) ? (
                            <div className="flex flex-col items-center">
                              <iframe
                                src={message.attachment_url}
                                className="w-[300px] h-[400px] rounded-lg border border-border"
                                onError={() => {
                                  console.error("PDF failed to load:", message.attachment_url);
                                }}
                              />
                              <a 
                                href={message.attachment_url}
                                download
                                className="text-sm mt-1 text-muted-foreground hover:text-foreground"
                              >
                                Download PDF
                              </a>
                            </div>
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
            {replyTo && (
              <div className="mb-2 px-3 py-2 bg-muted/30 rounded-lg border-l-4 border-primary flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-primary">
                    Replying to {replyTo.sender?.full_name || 'User'}
                  </span>
                  <span className="text-sm text-muted-foreground truncate max-w-[300px]">
                    {replyTo.content}
                  </span>
                </div>
                <button 
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => setReplyTo(null)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <div className="flex items-end gap-3">
              <VoiceRecorder onRecord={(url, filename) => handleSend(null, {url, filename})} /> {/* Added VoiceRecorder */}
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