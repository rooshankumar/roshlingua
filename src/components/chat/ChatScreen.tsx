import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Loader2, FileText, Check, Image, X, Download } from 'lucide-react';
import { updateUserPresence } from '@/utils/testAuth';
import { ChatAttachment } from './ChatAttachment';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Message } from '@/types/chat';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { ChatHeader } from './ChatHeader';
import { Textarea } from '../ui/textarea';
import { ScrollArea } from '../ui/scroll-area';
import { Card } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { handleImageLoadError } from '@/utils/imageUtils';
import { VoiceRecorder } from './VoiceRecorder';
import { MessageReactions, ReactionPicker } from './MessageReactions';
import { Dialog, DialogContent } from '../ui/dialog';
import './ChatScreen.css';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { RealtimeChannel } from '@supabase/supabase-js';

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
  const [activeReactionMenu, setActiveReactionMenu] = useState<string | null>(null);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [imagePreview, setImagePreview] = useState<{ url: string; name?: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { markConversationAsRead } = useUnreadMessages(user?.id);
  const [chatConnection, setChatConnection] = useState<RealtimeChannel | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [showReplyPreview, setShowReplyPreview] = useState(false);
  const MESSAGES_PER_PAGE = 50;
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const scrollToLatestMessage = (smooth = true) => {
    const chatContainer = document.querySelector('[data-scrollbar]');
    if (chatContainer) {
      void chatContainer.getBoundingClientRect();
      chatContainer.scrollTop = chatContainer.scrollHeight + 20000;
      chatContainer.scrollTo({
        top: chatContainer.scrollHeight + 20000,
        behavior: 'auto'
      });

      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'auto', block: 'end' });
      }

      if (smooth) {
        setTimeout(() => {
          chatContainer.scrollTo({
            top: chatContainer.scrollHeight + 20000,
            behavior: 'smooth'
          });

          if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
          }
        }, 50);
      }
    }
  };

  useEffect(() => {
    const scrollAttempts = [100, 300, 600, 1000, 1500, 2000];
    scrollAttempts.forEach(delay => {
      setTimeout(() => scrollToLatestMessage(false), delay);
    });

    const handleResize = () => scrollToLatestMessage(false);
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          scrollToLatestMessage(false);
        }
      });
    }, { threshold: 0.1 });

    const chatContainer = document.querySelector('[data-scrollbar]');
    if (chatContainer) {
      observer.observe(chatContainer);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      if (chatContainer) {
        observer.unobserve(chatContainer);
      }
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!conversation?.id) return;

    let isActive = true;
    let channelRef = null;
    const subscriptionKey = `messages:${conversation.id}`;

    // Show loading state only for initial load
    const isInitialLoad = messages.length === 0;
    if (isInitialLoad) {
      setIsLoading(true);
    }

    const fetchMessages = async () => {
      if (!isActive) return;

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
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error fetching messages:', error);
          return;
        }

        if (isActive) {
          setMessages(data || []);
          setIsLoading(false);

          const unreadMessages = data
            ?.filter(msg => !msg.is_read && msg.sender_id !== user?.id)
            .map(msg => msg.id) || [];

          if (unreadMessages.length > 0) {
            setMessages(prev => 
              prev.map(msg => 
                unreadMessages.includes(msg.id) 
                  ? { ...msg, is_read: true } 
                  : msg
              )
            );

            await supabase
              .from('messages')
              .update({ is_read: true })
              .in('id', unreadMessages);
          }
        }
      } catch (err) {
        console.error('Error fetching messages:', err);
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    const setupRealtimeSubscription = () => {
      if (channelRef) {
        try {
          if (channelRef.unsubscribe) {
            channelRef.unsubscribe();
          }
          channelRef = null;
          console.log('Successfully unsubscribed from previous channel');
        } catch (error) {
          console.error('Error unsubscribing from channel:', error);
        }
      }

      const uniqueSubscriptionKey = `messages:${conversation.id}:${Date.now()}`;

      channelRef = supabase
        .channel(uniqueSubscriptionKey)
        .on('postgres_changes', 
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversation.id}`
          }, 
          async (payload) => {
            if (!isActive) return;

            const { data: newMessage } = await supabase
              .from('messages')
              .select(`
                *,
                attachment_url,
                attachment_name,
                attachment_thumbnail,
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

            if (newMessage && isActive) {
              setMessages(prev => {
                const exists = prev.some(msg => msg.id === newMessage.id);
                if (exists) return prev;

                const messageWithAttachment = {
                  ...newMessage,
                  attachment_url: newMessage.attachment_url || null,
                  attachment_name: newMessage.attachment_name || null,
                  attachment_thumbnail: newMessage.attachment_thumbnail || null
                };

                const updatedMessages = [...prev, messageWithAttachment];
                [50, 150, 300, 500].forEach(delay => {
                  setTimeout(() => scrollToLatestMessage(delay > 100), delay);
                });
                return updatedMessages;
              });
            }
          }
        )
        .subscribe();

      return channelRef;
    };

    fetchMessages();
    channelRef = setupRealtimeSubscription();

    return () => {
      isActive = false;
      if (channelRef) {
        try {
          if (channelRef.unsubscribe) {
            channelRef.unsubscribe();
          }
          channelRef = null;
          console.log('Successfully unsubscribed from chat channel');
        } catch (err) {
          console.error('Error during channel cleanup:', err);
        }
      }
    };
  }, [conversation?.id, user?.id]);

  const handleSend = async (content?: string, attachment?: { url: string; filename: string; thumbnail?: string }) => {
    if ((!content?.trim() && !attachment) || !user || !conversation?.id || isSending) return;

    setIsSending(true);
    const timestamp = new Date().toISOString();

    try {
      const { error } = await supabase
        .from('messages')
        .insert([{
          content: content || '',
          conversation_id: conversation.id,
          sender_id: user.id,
          is_read: false,
          attachment_url: attachment?.url,
          attachment_name: attachment?.filename,
          attachment_thumbnail: attachment?.thumbnail,
          created_at: timestamp
        }])
        .select('*, sender:profiles!messages_sender_id_fkey(*)');

      if (error) throw error;

      setNewMessage('');
      setTimeout(() => scrollToLatestMessage(true), 100);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
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
  const handleImageLoadError = (e: React.SyntheticEvent<HTMLImageElement>, originalUrl?: string) => {
    const imgSrc = originalUrl || e.currentTarget.src;
    console.error('Image failed to load:', imgSrc);

    // Try loading without the cache buster parameter if it exists
    if (imgSrc.includes('?t=')) {
      const cleanUrl = imgSrc.split('?t=')[0];
      e.currentTarget.src = cleanUrl;
      console.log("Retrying with clean URL:", cleanUrl);
      return;
    }

    // Check if the URL is from Supabase storage and try a different format
    if (imgSrc.includes('supabase.co/storage')) {
      // Show a fallback UI immediately so user sees something
      e.currentTarget.style.display = 'none';
      const fallbackElement = document.createElement('div');
      fallbackElement.className = 'bg-gray-100 dark:bg-gray-800 p-2 rounded-md text-sm text-center';
      fallbackElement.innerText = 'Image not available';
      e.currentTarget.parentNode?.appendChild(fallbackElement);

      // Try to diagnose the bucket issue
      const bucketMatch = imgSrc.match(/\/public\/([^\/]+)\//);
      if (bucketMatch && bucketMatch[1]) {
        const bucketName = bucketMatch[1];
        console.log(`Storage bucket issue detected with '${bucketName}'. Please check if bucket exists.`);

        // Show more informative message
        fallbackElement.innerText = `Storage bucket issue detected. Please check if '${bucketName}' bucket exists.`;
      }
    } else {
      // Default fallback for non-Supabase images
      e.currentTarget.style.display = 'none';
      const fallbackElement = document.createElement('div');
      fallbackElement.className = 'bg-gray-100 dark:bg-gray-800 p-2 rounded-md text-sm text-center';
      fallbackElement.innerText = 'Image not available';
      e.currentTarget.parentNode?.appendChild(fallbackElement);
    }
  };

  const handleReact = async (messageId: string, emoji: string) => {
    if (!user?.id) return;

    try {
      const userId = user.id;

      // Direct API call to handle reactions
      const { data: existingReaction, error: checkError } = await supabase
        .from('message_reactions')
        .select('*')
        .eq('message_id', messageId)
        .eq('user_id', userId)
        .eq('reaction', emoji)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking for existing reaction:', checkError);
        return;
      }

      if (existingReaction) {
        // Delete the reaction if it exists
        console.log('Removing existing reaction:', emoji, messageId);
        const { error: deleteError } = await supabase
          .from('message_reactions')
          .delete()
          .eq('message_id', messageId)
          .eq('user_id', userId)
          .eq('reaction', emoji);

        if (deleteError) {
          console.error('Error removing reaction:', deleteError);
          return;
        }
        console.log('Reaction removed:', emoji);
      } else {
        // Insert a new reaction
        console.log('Adding new reaction:', emoji, messageId);
        const { error: insertError } = await supabase
          .from('message_reactions')
          .insert({
            message_id: messageId,
            user_id: userId,
            reaction: emoji,
            created_at: new Date().toISOString()
          });

        if (insertError) {
          console.error('Error adding reaction:', insertError);
          return;
        }
        console.log('Reaction added:', emoji);

        // Provide haptic feedback
        if ('vibrate' in navigator) {
          navigator.vibrate(25);
        }
      }
    } catch (error) {
      console.error('Error managing reaction:', error);
    }
  };

  useEffect(() => {
    // Subscribe to new messages in this chat
    if (conversation?.id) {
      let channel: RealtimeChannel | null = null;

      try {
        channel = supabase
          .channel(`messages:${conversation?.id}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
              filter: `conversation_id=eq.${conversation?.id}`
            },
            async (payload) => {
              console.log('Received message:', payload);
              // Handle different types of changes
              if (payload.eventType === 'INSERT') {
                const newMessage = payload.new as Message;
                setMessages((prev) => {
                  // Check if the message is already in the array to prevent duplicates
                  if (prev.some(msg => msg.id === newMessage.id)) {
                    return prev;
                  }
                  return [...prev, newMessage];
                });
              } else if (payload.eventType === 'UPDATE') {
                const updatedMessage = payload.new as Message;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === updatedMessage.id ? updatedMessage : msg
                  )
                );
              } else if (payload.eventType === 'DELETE') {
                const deletedMessageId = payload.old.id;
                setMessages((prev) =>
                  prev.filter((msg) => msg.id !== deletedMessageId)
                );
              }
            }
          )
          .subscribe((status) => {
            console.log('Chat subscription status:', status);
            if (status === 'SUBSCRIBED') {
              console.log('Successfully subscribed to chat messages');
            } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
              console.error('Chat subscription issue:', status);

              // Attempt to re-subscribe if closed unexpectedly
              if (status === 'CLOSED') {
                setTimeout(() => {
                  if (channel) {
                    console.log('Attempting to resubscribe to chat...');
                    channel.subscribe();
                  }
                }, 2000);
              }
            }
          });

        // Register with subscription manager
      } catch (error) {
        console.error('Error setting up chat subscription:', error);
      }

      return () => {
        console.log('Cleaning up chat subscription for', `messages:${conversation?.id}`);
        if (channel) {
          // Unsubscribe through subscription manager
          channel.unsubscribe();
        }
      };
    }
  }, [conversation?.id]);

  return (
    <div className="flex h-screen bg-background">
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <ChatHeader conversation={conversation} />

        <ScrollArea className="flex-1 p-4" data-scrollbar>
          <div className="space-y-4 max-w-3xl mx-auto">
            {messages.map((message, index) => (
              <div
                key={message.id}
                className={`flex items-start gap-2 mb-4 ${
                  message.sender_id === user?.id ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                <Avatar className="h-8 w-8 flex-shrink-0 mt-1">
                  <AvatarImage src={message.sender?.avatar_url || '/placeholder.svg'} />
                  <AvatarFallback>{message.sender?.full_name?.[0]}</AvatarFallback>
                </Avatar>

                <div className={`flex flex-col max-w-[70%] ${
                  message.sender_id === user?.id ? 'items-end' : 'items-start'
                }`}>
                  <div className="text-xs text-muted-foreground mb-1">
                    {message.sender?.full_name || 'Unknown'} • {new Date(message.created_at).toLocaleTimeString([], { 
                      hour: 'numeric', 
                      minute: '2-digit' 
                    })}
                  </div>
                  <div className={`rounded-3xl px-4 py-2.5 ${
                    message.sender_id === user?.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}>
                    {message.content && (
                      <p className="text-sm">{message.content}</p>
                    )}

                    {message.attachment_url && (
                      <div className="mt-2 relative attachment-container">
                        {message.attachment_url.match(/\.(jpg|jpeg|png|gif|webp|avif)$/i) ? (
                          <div className="relative">
                            <img
                              src={message.attachment_url}
                              alt={message.attachment_name || "Attachment"}
                              className="rounded-lg w-full h-auto max-w-[300px] max-h-[300px] object-contain cursor-pointer"
                              loading="eager"
                              onClick={() => {
                                setImagePreview({
                                  url: message.attachment_url!,
                                  name: message.attachment_name
                                });
                                setShowImagePreview(true);
                              }}
                              onError={(e) => handleImageLoadError(e, message.attachment_url)}
                            />
                            <a 
                              href={message.attachment_url}
                              download={message.attachment_name || "download"}
                              className="absolute top-2 right-2 bg-black/60 text-white p-1 rounded-full hover:bg-black/80 transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          </div>
                        ) : message.attachment_url.match(/\.(mp4|webm|ogg)$/i) ? (
                          <div className="p-2">
                            <video 
                              src={message.attachment_url}
                              controls
                              autoPlay={false}
                              preload="metadata"
                              className="max-w-[260px] md:max-w-[300px] rounded-lg"
                              controlsList="nodownload"
                            />
                          </div>
                        ) : message.attachment_url.match(/\.(mp3|wav|ogg)$/i) ? (
                          <div className="p-3">
                            <p className="text-sm font-medium mb-1">
                              {message.attachment_name || "Audio file"}
                            </p>
                            <audio 
                              src={message.attachment_url}
                              controls
                              preload="metadata"
                              className="w-full max-w-[260px]"
                            />
                          </div>
                        ) : message.attachment_url.match(/\.pdf$/i) ? (
                          <div className="p-3">
                            <p className="text-sm font-medium mb-2">
                              {message.attachment_name || "PDF document"}
                            </p>
                            <iframe
                              src={message.attachment_url}
                              className="w-[260px] h-[200px] md:w-[300px] md:h-[250px] rounded-lg border border-border"
                            />
                            <a 
                              href={message.attachment_url}
                              download
                              className="text-xs mt-1 underline hover:text-primary transition-colors block text-center"
                            >
                              Download PDF
                            </a>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 bg-background/10 rounded p-2">
                            <FileText className="h-4 w-4" />
                            <span className="text-sm truncate">
                              {message.attachment_name}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="ml-auto h-6 w-6"
                              onClick={() => window.open(message.attachment_url, '_blank')}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {new Date(message.created_at).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                    {message.sender_id === user?.id && message.is_read && (
                      <Check className="h-3 w-3 text-primary" />
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="border-t p-4">
          <div className="max-w-3xl mx-auto flex items-end gap-2">
            <div className="flex gap-2">
              <ChatAttachment onAttach={(url, filename) => handleSend(newMessage, { url, filename })} />
              <VoiceRecorder onRecord={(url, filename) => handleSend(null, { url, filename })} />
            </div>

            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(newMessage);
                }
              }}
              placeholder="Send a message..."
              className="flex-1 min-h-[45px] max-h-[120px] resize-none rounded-full px-4 py-2 bg-muted"
              rows={1}
            />

            <Button
              onClick={() => handleSend(newMessage)}
              disabled={!newMessage.trim() || isSending}
              size="icon"
              className="h-[45px] w-[45px]"
            >
              {isSending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        <Dialog open={showImagePreview} onOpenChange={setShowImagePreview}>
          <DialogContent className="max-w-4xl p-0">
            {imagePreview && (
              <img
                src={imagePreview.url}
                alt={imagePreview.name || "Preview"}
                className="w-full h-auto"
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ChatScreen;