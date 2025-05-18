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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { handleImageLoadError, isLikelyBlockedUrl } from '@/utils/imageUtils';
import { VoiceRecorder } from './VoiceRecorder'; // Imported VoiceRecorder component
import { MessageReactions, ReactionPicker } from './MessageReactions'; // Import both MessageReactions and ReactionPicker components
import { Dialog, DialogContent } from '../ui/dialog'; // Import Dialog and DialogContent
import './ChatScreen.css'; // Import dedicated CSS
import { useUnreadMessages } from '@/hooks/useUnreadMessages'; // Import useUnreadMessages hook
import { RealtimeChannel } from '@supabase/supabase-js';


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
  const [showImagePreview, setShowImagePreview] = useState(false); // State for image preview dialog
  const [imagePreview, setImagePreview] = useState<{ url: string; name?: string } | null>(null); // State for image preview data
  const MESSAGES_PER_PAGE = 50;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { markConversationAsRead } = useUnreadMessages(user?.id);
  const [activeReactionMenu, setActiveReactionMenu] = useState<string | null>(null);
  const [chatConnection, setChatConnection] = useState<RealtimeChannel | null>(null);


  const scrollToLatestMessage = (smooth = true) => {
    const chatContainer = document.querySelector('[data-scrollbar]');
    if (!chatContainer) return;

    const performScroll = () => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({
          behavior: smooth ? 'smooth' : 'auto',
          block: 'end',
        });
      }
    };

    // Initial scroll
    performScroll();

    // Single delayed scroll for reliability
    setTimeout(performScroll, 100);
  };

  // Optimize scroll handling for mobile
  useEffect(() => {
    const chatContainer = document.querySelector('[data-scrollbar]');
    if (!chatContainer) return;

    let touchStartY = 0;
    let touchEndY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      touchEndY = e.changedTouches[0].clientY;
      const diff = touchStartY - touchEndY;
      
      // If scrolled near bottom, snap to bottom
      const isNearBottom = 
        chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight < 100;
      
      if (diff > 0 && isNearBottom) {
        scrollToLatestMessage(true);
      }
    };

    chatContainer.addEventListener('touchstart', handleTouchStart);
    chatContainer.addEventListener('touchend', handleTouchEnd);

    return () => {
      chatContainer.removeEventListener('touchstart', handleTouchStart);
      chatContainer.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  // Scroll to bottom on mount and message updates
  useEffect(() => {
    if (messages.length > 0) {
      scrollToLatestMessage(false);
      
      const handleResize = () => scrollToLatestMessage(false);
      window.addEventListener('resize', handleResize);
      window.addEventListener('orientationchange', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('orientationchange', handleResize);
      };
    }
  }, [messages.length]);

  useEffect(() => {
    if (!conversation?.id) return;

    let channelRef = null;
    let isActive = true;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let retryCount = 0;
    const MAX_RETRIES = 5;
    const RETRY_DELAY = 2000;
    const subscriptionKey = `messages:${conversation.id}`;
    const PAGE_SIZE = 25;

    const clearReconnectTimeout = () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
    };

    // Show loading state only for initial load
    const isInitialLoad = messages.length === 0;
    if (isInitialLoad) {
      setIsLoading(true);
    }

    const fetchMessages = async (loadMore = false) => {
      // Add offset for pagination
      const offset = loadMore ? messages.length : 0;
      if (!isActive) return;

      try {
        // Use a smaller page size for initial load to improve perceived performance
        const pageSize = isInitialLoad ? 10 : MESSAGES_PER_PAGE;

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
          .range((page - 1) * pageSize, page * pageSize - 1);

        if (error) {
          console.error('Error fetching messages:', error);
          return;
        }

        if (isActive) {
          if (loadMore) {
            setMessages(prev => [...data, ...prev]);
          } else {
            setMessages(data || []);
          }
          setIsLoading(false);

          // Optimize read status updates by batching
          const unreadMessages = data
            ?.filter(msg => !msg.is_read && msg.sender_id !== user?.id)
            .map(msg => msg.id) || [];

          if (unreadMessages.length > 0) {
            // Update the UI optimistically for better user experience
            setMessages(prev => 
              prev.map(msg => 
                unreadMessages.includes(msg.id) 
                  ? { ...msg, is_read: true } 
                  : msg
              )
            );

            // Then update the database in the background
            await supabase
              .from('messages')
              .update({ is_read: true })
              .in('id', unreadMessages);

            // Refresh counts, but only if essential (debounced)
            if (refreshUnreadCounts) {
              refreshUnreadCounts();
            }
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
      // Use imported helper functions from testAuth utility
      // Clean up any existing subscription before creating a new one
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

      // Create a unique channel ID to prevent duplicate subscriptions
      const uniqueSubscriptionKey = `messages:${conversation.id}:${Date.now()}`;

      try {
        // Set up real-time subscription for new messages
        channelRef = supabase
          .channel(uniqueSubscriptionKey, {
            config: {
              presence: {
                key: 'chat_presence',
              },
            },
          })
          .on('postgres_changes', 
            {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
              filter: `conversation_id=eq.${conversation.id}`
            }, 
            async (payload) => {
              if (!isActive) return;
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

              if (newMessage && isActive) {
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
                    attachment_name: newMessage.attachment_name || null,
                    attachment_thumbnail: newMessage.attachment_thumbnail || null // Added thumbnail handling
                  };

                  const updatedMessages = [...prev, messageWithAttachment];
                  // Multiple scroll attempts with increasing delays for reliability
                  [50, 150, 300, 500].forEach(delay => {
                    setTimeout(() => scrollToLatestMessage(delay > 100), delay);
                  });
                  return updatedMessages;
                });
              }
            }
          );

        // Subscribe only if not already subscribed
        channelRef.subscribe((status) => {
          if (!isActive) return;

          console.log(`Chat subscription status for ${uniqueSubscriptionKey}:`, status);
          if (status === 'SUBSCRIBED') {
            console.log('Successfully subscribed to chat messages');

            // Update user presence when subscribed
            if (user?.id) {
              // Track presence in the channel
              channelRef.track({
                user_id: user.id,
                online_at: new Date().toISOString(),
                conversation_id: conversation.id
              });

              // Update database status
              updateUserPresence(user.id, true);

              // Set up visibility change listener for this specific channel
              const handleVisibilityChange = () => {
                if (document.visibilityState === 'visible') {
                  updateUserPresence(user.id, true);
                  if (channelRef) {
                    channelRef.track({
                      user_id: user.id,
                      online_at: new Date().toISOString(),
                      conversation_id: conversation.id
                    });
                  }
                } else {
                  updateUserPresence(user.id, false);
                }
              };

              document.addEventListener('visibilitychange', handleVisibilityChange);
            }
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            console.warn('Chat subscription issue:', status);
            // If connection lost, retry fetching messages after a short delay
            if (isActive) {
               // Clear any existing reconnect timeout
              clearReconnectTimeout();

              // Check if max retries have been exceeded
              if (retryCount >= MAX_RETRIES) {
                console.error('Max retries exceeded. Stopping reconnection attempts.');
                return;
              }
              retryCount++;

              // Schedule a reconnection attempt
              reconnectTimeout = setTimeout(() => {
                console.log(`Attempting to reconnect (attempt ${retryCount}/${MAX_RETRIES})...`);
                setupRealtimeSubscription(); // Re-establish the subscription
              }, RETRY_DELAY);
            }
          }
        });

        return channelRef;
      } catch (error) {
        console.error('Error setting up realtime subscription:', error);
        return null;
      }
    };

    // Initial fetch and subscription setup
    fetchMessages();
    channelRef = setupRealtimeSubscription();

    // Cleanup function
    return () => {
      console.log(`Cleaning up chat subscription for conversation ${conversation?.id}`);
      isActive = false;

      // Clear the reconnect timeout to prevent further attempts
      clearReconnectTimeout();
      retryCount = 0; // Reset retry count

      // Set user as offline when leaving the chat
      if (user?.id) {
        updateUserPresence(user.id, false);
      }

      if (channelRef) {
        try {
          // Untrack presence before unsubscribing
          if (user?.id) {
            channelRef.untrack();
          }

          // Unsubscribe from channel
          channelRef.unsubscribe();
          channelRef = null;
          console.log('Successfully unsubscribed from chat channel');
        } catch (err) {
          console.error('Error during channel cleanup:', err);
        }
      }
    };
  }, [conversation?.id, page, markConversationAsRead]);

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

  // Auto-scroll when messages change or component mounts
  useEffect(() => {
    if (messages.length > 0) {
      // Use a sequence of scroll attempts with increasing delays
      // More aggressive scrolling for new messages
      [0, 10, 50, 150, 300, 500, 700].forEach(delay => {
        setTimeout(() => scrollToLatestMessage(delay > 100), delay);
      });
    }
  }, [messages]);

  // Special effect that runs specifically when new messages are added
  const messagesCountRef = useRef(messages.length);
  useEffect(() => {
    // Only scroll if messages increased (new message added)
    if (messages.length > messagesCountRef.current) {
      // Force immediate and more aggressive scrolling for new messages
      setTimeout(() => scrollToLatestMessage(false), 0);
      setTimeout(() => scrollToLatestMessage(false), 50);
      setTimeout(() => scrollToLatestMessage(false), 100);
      setTimeout(() => scrollToLatestMessage(true), 200);
    }
    // Update the reference count
    messagesCountRef.current = messages.length;
  }, [messages.length]);

  // Always scroll to bottom when chat is first loaded and messages are fetched
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      // More aggressive scroll attempts to handle initial load
      [10, 50, 150, 300, 500, 800, 1200].forEach(delay => {
        setTimeout(() => scrollToLatestMessage(false), delay);
      });
    }
  }, [isLoading, messages.length]);

  // Force scroll on window resize events
  useEffect(() => {
    const handleResize = () => {
      if (messages.length > 0) {
        scrollToLatestMessage(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [messages.length]);

  // Handle click outside expanded images to close them
  useEffect(() => {
    const handleClickOutsideImage = (e: MouseEvent) => {
      const expandedContainer = document.querySelector('.expanded-image');
      if (expandedContainer && !e.target.closest('img')) {
        expandedContainer.classList.remove('expanded-image');
        const expandedImg = expandedContainer.querySelector('img.expanded');
        if (expandedImg) expandedImg.classList.remove('expanded');
        expandedContainer.style.zIndex = '';
      }
    };

    // Handle ESC key to close expanded images
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const expandedContainer = document.querySelector('.expanded-image');
        if (expandedContainer) {
          expandedContainer.classList.remove('expanded-image');
          const expandedImg = expandedContainer.querySelector('img.expanded');
          if (expandedImg) expandedImg.classList.remove('expanded');
          expandedContainer.style.zIndex = '';
        }
      }
    };

    document.addEventListener('click', handleClickOutsideImage);
    document.addEventListener('keydown', handleEscKey);

    return () => {
      document.removeEventListener('click', handleClickOutsideImage);
      document.removeEventListener('keydown', handleEscKey);
    };
  }, []);

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

  const handleSend = async (content?: string, attachment?: { url: string; filename: string; thumbnail?: string }, retryCount = 0) => {
    const messageContent = content || newMessage;
    if ((!messageContent.trim() && !attachment) || !user || !conversation?.id || isSending) return;

    // Security checks
    if (messageContent.length > 2000) {
      toast({
        variant: "destructive",
        title: "Message too long",
        description: "Messages cannot exceed 2000 characters",
        duration: 3000,
      });
      return;
    }

    // Rate limiting
    const now = Date.now();
    const recentMessages = messages.filter(m => 
      m.sender_id === user.id && 
      new Date(m.created_at).getTime() > now - 1000
    );

    if (recentMessages.length >= 5) {
      toast({
        variant: "destructive",
        title: "Slow down",
        description: "You're sending messages too quickly",
        duration: 3000,
      });
      return;
    }

    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000; // 1 second delay between retries

    setIsSending(true);
    const tempId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    // Track if the message was successfully sent
    let sendSuccess = false;

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

    // Add optimistic message and ensure we scroll to the latest
    setMessages(prev => {
      const updatedMessages = [...prev, optimisticMessage];
      // Ensure we scroll to bottom immediately after state update
      requestAnimationFrame(() => {
        scrollToLatestMessage(false);
        // Then do another smooth scroll after a short delay
        setTimeout(() => scrollToLatestMessage(true), 100);
      });
      return updatedMessages;
    });

    setNewMessage('');

    // Multiple scroll attempts to ensure we catch up with DOM updates
    setTimeout(() => scrollToLatestMessage(false), 10);
    setTimeout(() => scrollToLatestMessage(true), 100);
    setTimeout(() => scrollToLatestMessage(true), 300);
    setTimeout(() => scrollToLatestMessage(true), 500);

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
        throw error;
      }

      sendSuccess = true;
    } catch (error) {
      console.error('Error sending message:', error);

      // Remove the optimistic message
      setMessages(prev => prev.filter(msg => msg.id !== tempId));

      // Attempt retry if we haven't exceeded max retries
      if (retryCount < MAX_RETRIES) {
        toast({
          title: `Message sending failed. Retrying... (${retryCount + 1}/${MAX_RETRIES})`,
          description: "Please wait while we retry sending your message",
          duration: 3000,
        });

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));

        // Retry sending the message
        return handleSend(messageContent, attachment, retryCount + 1);
      } else {
        toast({
          variant: "destructive",
          title: "Failed to send message",
          description: "Please check your connection and try again",
          duration: 5000,
        });
      }
    } finally {
      // Only set isSending to false if we're not going to retry
      if (sendSuccess || retryCount >= MAX_RETRIES) {
        setIsSending(false);
      }
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

  // Function to mark messages as read - this is now handled by useUnreadMessages
  // const markMessagesAsRead = async (conversationId: string) => {
  //   try {
  //     // Mark messages as read in database
  //     await supabase
  //       .from('messages')
  //       .update({ is_read: true })
  //       .eq('conversation_id', conversationId)
  //       .eq('is_read', false);


  //   } catch (error) {
  //     console.error('Error marking messages as read:', error);
  //   }
  // };

  // useEffect(() => {
  //   if (conversation?.id) {
  //     markMessagesAsRead(conversation.id);
  //   }
  // }, [conversation?.id]);

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
        if (channel) {
          subscriptionManager.subscribe(`messages:${conversation?.id}`, channel);
          setChatConnection(channel);
        }
      } catch (error) {
        console.error('Error setting up chat subscription:', error);
      }

      return () => {
        console.log('Cleaning up chat subscription for', `messages:${conversation?.id}`);
        if (channel) {
          // Unsubscribe through subscription manager
          subscriptionManager.unsubscribe(`messages:${conversation?.id}`);
        }
      };
    }
  }, [conversation?.id]);


  return (
    <Card className="fixed inset-0 flex flex-col w-full h-full md:static md:h-[calc(100vh-1rem)] md:max-w-[1200px] md:mx-auto md:my-2 md:rounded-lg border-none shadow-xl overflow-hidden bg-gradient-to-b from-background/95 to-background/90 backdrop-blur-lg" style={{ WebkitOverflowScrolling: 'touch' }}>
      <div className="fixed top-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-b md:relative">
        <ChatHeader conversation={conversation} />
      </div>

      {user?.id ? (
        <ScrollArea 
          className="flex-1 overflow-y-auto chat-content-area"
          data-scrollbar
          ref={messagesContainerRef}
          onTouchStart={(e) => {
            e.currentTarget.style.userSelect = 'none';
          }}
          onTouchEnd={(e) => {
            e.currentTarget.style.userSelect = '';
          }}
        >
          <div className="space-y-6">
            {messages.map((message, index) => (
              <div
                id={`message-${message.id}`}
                key={message.id}
                className={`flex items-start gap-3 animate-slide-up ${
                  message.sender_id === user?.id ? 'flex-row-reverse' : 'flex-row'
                } ${index > 0 && messages[index - 1]?.sender_id === message.sender_id ? 'mt-0 consecutive-group' : 'mt-2'}`}
                style={{
                  animationDelay: `${Math.min(index * 0.05, 0.5)}s`, // Faster animation with a max delay
                  marginBottom: index > 0 && messages[index - 1]?.sender_id === message.sender_id ? '2px' : '3px'
                }}
                onClick={(e) => {
                  // Close any other open reaction menu
                  if (activeReactionMenu && activeReactionMenu !== message.id) {
                    const prevMenu = document.getElementById(`message-actions-${activeReactionMenu}`);
                    if (prevMenu) {
                      prevMenu.classList.add('opacity-0', 'pointer-events-none');
                      prevMenu.classList.remove('active');
                    }
                  }
                  // Toggle current reaction menu
                  const messageActions = document.getElementById(`message-actions-${message.id}`);
                  if (messageActions) {
                    messageActions.classList.toggle('opacity-0');
                    messageActions.classList.toggle('pointer-events-none');
                    messageActions.classList.toggle('active');
                    setActiveReactionMenu(messageActions.classList.contains('active') ? message.id : null);
                  }
                }}
                onTouchStart={(e) => {
                  // Set up long press handler and swipe detection
                  const element = e.currentTarget;
                  const messageId = message.id;
                  const touchX = e.touches[0].clientX;
                  const touchY = e.touches[0].clientY;

                  // Store the starting position for gesture detection
                  element.setAttribute('data-touch-start-x', touchX.toString());
                  element.setAttribute('data-touch-start-y', touchY.toString());

                  // Add visual feedback
                  element.classList.add('message-long-press');

                  // Set up a long press timer
                  const longPressTimer = setTimeout(() => {
                    // Show reaction picker on long press
                    const messageActions = document.getElementById(`message-actions-${messageId}`);
                    if (messageActions) {
                      // Add haptic feedback for long press
                      if ('vibrate' in navigator) {
                        navigator.vibrate([40, 60, 40]); // stronger pattern for long press
                      }

                      // Position the reaction menu above the message
                      const rect = element.getBoundingClientRect();
                      messageActions.style.top = `${-40}px`; // Position above message

                      // Show the reaction menu
                      messageActions.classList.remove('opacity-0');
                      messageActions.classList.remove('pointer-events-none');
                      messageActions.classList.add('active');
                    }
                  }, 500); // 500ms for long press

                  // Store the timer ID to clear it on touchend
                  element.setAttribute('data-long-press-timer', longPressTimer.toString());
                }}
                onTouchMove={(e) => {
                  // Handle swipe to reply
                  const element = e.currentTarget;
                  const startX = parseInt(element.getAttribute('data-touch-start-x') || '0');
                  const currentX = e.touches[0].clientX;
                  const deltaX = currentX - startX;

                  // If swiped right far enough (for swipe-to-reply) - 50px threshold
                  if (deltaX > 50 && !element.classList.contains('swiping-to-reply')) {
                    element.classList.add('swiping-to-reply');
                    // Add visual indication of swipe-to-reply
                    element.style.transform = `translateX(${Math.min(deltaX, 100)}px)`;
                    element.style.opacity = '0.8';

                    // Show reply icon
                    const replyIndicator = document.createElement('div');
                    replyIndicator.className = 'reply-indicator';
                    replyIndicator.innerHTML = `
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 17 4 12 9 7"></polyline>
                        <path d="M20 18v-2a4 4 0 0 0-4-4H4"></path>
                      </svg>
                    `;

                    if (!element.querySelector('.reply-indicator')) {
                      element.appendChild(replyIndicator);
                    }

                    // Clear long press timer if swiping
                    const timerId = element.getAttribute('data-long-press-timer');
                    if (timerId) {
                      clearTimeout(parseInt(timerId));
                      element.removeAttribute('data-long-press-timer');
                    }
                  }
                }}
                onTouchEnd={(e) => {
                  // Handle end of touch
                  const element = e.currentTarget;
                  const timerId = element.getAttribute('data-long-press-timer');
                  if (timerId) {
                    clearTimeout(parseInt(timerId));
                    element.removeAttribute('data-long-press-timer');
                  }

                  // Check if this was a swipe-to-reply
                  if (element.classList.contains('swiping-to-reply')) {
                    // Reset visual state
                    element.style.transform = '';
                    element.style.opacity = '';
                    element.classList.remove('swiping-to-reply');

                    // Remove reply indicator
                    const indicator = element.querySelector('.reply-indicator');
                    if (indicator) element.removeChild(indicator);

                    // Set reply to this message
                    setReplyTo(message);
                    document.querySelector('textarea')?.focus();

                    // Haptic feedback for completing the swipe
                    if ('vibrate' in navigator) {
                      navigator.vibrate([40, 30, 40]);
                    }
                  }

                  // Remove visual feedback
                  element.classList.remove('message-long-press');
                }}
              >
                <div className={`flex flex-col ${index > 0 && messages[index - 1]?.sender_id === message.sender_id ? 'gap-0' : 'gap-1'} w-full max-w-[85%] sm:max-w-[70%] group transition-all duration-300 relative`}>
                  {/* Facebook Messenger-style reaction picker */}
                  <div 
                    id={`message-actions-${message.id}`}
                    className="message-actions-menu opacity-0 pointer-events-none transition-opacity duration-200 z-50"
                    data-sender={message.sender_id === user?.id ? 'self' : 'other'}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ReactionPicker 
                      messageId={message.id} 
                      onClose={() => {
                        const messageActions = document.getElementById(`message-actions-${message.id}`);
                        if (messageActions) {
                          messageActions.classList.add('opacity-0', 'pointer-events-none');
                          messageActions.classList.remove('active');
                          setActiveReactionMenu(null);
                        }
                      }}
                      position="top"
                    />
                  </div>
                  {/* Only show sender name if this is the first message from this sender or after a different sender */}
                  
                  <div className="flex items-end gap-2 w-full">
                    <div
                      className={`break-words shadow-sm transition-all duration-300 message-bubble`}
                      data-sender={message.sender_id === user?.id ? 'self' : 'other'}
                      style={{
                        marginLeft: message.sender_id === user?.id ? 'auto' : '0',
                        maxWidth: message.content?.length < 20 ? 'fit-content' : '85%'
                      }}
                    >
                      <p className="leading-relaxed whitespace-pre-wrap text-[15px]">{message.content || ''}</p>

                      {/* Facebook Messenger-style reactions attached to message */}
                      {/* Messenger-style reaction with single emoji display */}
                              <MessageReactions messageId={message.id} existingReactions={message.reactions || {}} />
                      {message.attachment_url && (
                        <div className="mt-1 rounded-lg overflow-hidden w-full max-w-full">
                          {message.attachment_url?.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i) ? (
                            <div className="relative w-full group attachment-container">
                              <img 
                                src={message.attachment_url} 
                                alt={message.attachment_name || "Image"}
                                className="w-full max-h-[270px] object-contain rounded-lg shadow-sm cursor-pointer transition-transform duration-200 hover:scale-[1.02]"
                                onClick={(e) => {
                                  // Expand image inline instead of opening dialog
                                  const img = e.currentTarget;
                                  const container = img.parentElement;

                                  if (container?.classList.contains('expanded-image')) {
                                    // If already expanded, collapse it
                                    container.classList.remove('expanded-image');
                                    img.classList.remove('expanded');
                                    container.style.zIndex = '';
                                  } else {
                                    // Expand the image
                                    container?.classList.add('expanded-image');
                                    img.classList.add('expanded');
                                    container.style.zIndex = '50';

                                    // Add haptic feedback if available
                                    if ('vibrate' in navigator) {
                                      navigator.vibrate(30);
                                    }
                                  }
                                }}
                                onError={(e) => handleImageLoadError(e, message.attachment_url as string)}
                                loading="eager"
                                referrerPolicy="no-referrer"
                                fetchpriority="high"
                              />
                              <div 
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const messageActions = document.getElementById(`message-actions-${message.id}`);
                                  if (messageActions) {
                                    messageActions.classList.toggle('opacity-0');
                                    messageActions.classList.toggle('pointer-events-none');
                                    messageActions.classList.toggle('active');
                                    setActiveReactionMenu(messageActions.classList.contains('active') ? message.id : null);
                                  }
                                }}
                              >
                                <MessageReactions messageId={message.id} existingReactions={message.reactions || {}} />
                              </div>
                            </div>
                          ) : message.attachment_url?.match(/\.(mp4|webm|ogg)$/i) ? (
                            <div className="relative group max-w-[270px]">
                              <video 
                                src={`${message.attachment_url}${message.attachment_url.includes('?') ? '&' : '?'}t=${Date.now()}`}
                                controls
                                className="w-full rounded-lg max-h-[270px]"
                                preload="metadata"
                                playsInline
                                onError={() => {
                                  console.error("Video failed to load:", message.attachment_url);
                                }}
                              />
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <Video className="h-10 w-10 text-white/80" />
                              </div>
                            </div>
                          ) : message.attachment_url?.match(/\.(mp3|wav|aac)$/i) ? (
                            <div className="max-w-[270px] bg-muted/20 p-3 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <FileAudio className="h-5 w-5" />
                                <span className="text-sm font-medium truncate">{message.attachment_name || 'Audio'}</span>
                              </div>
                              <audio 
                                src={message.attachment_url}
                                controls
                                className="w-full"
                                preload="none"
                                onError={() => {
                                  console.error("Audio failed to load:", message.attachment_url);
                                }}
                              />
                            </div>
                          ) : message.attachment_url?.match(/\.(pdf)$/i) ? (
                            <div className="max-w-[270px] bg-muted/20 p-3 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <FileText className="h-5 w-5" />
                                <span className="text-sm font-medium truncate">{message.attachment_name || 'PDF Document'}</span>
                              </div>
                              <div className="relative w-full h-64 rounded-lg overflow-hidden mb-2">
                                <iframe 
                                  src={`${message.attachment_url}#toolbar=0&navpanes=0`} 
                                  className="w-full h-full border-0" 
                                  title={message.attachment_name || "PDF Preview"}
                                />
                                <div className="absolute inset-0 bg-transparent" 
                                  onClick={() => window.open(message.attachment_url, '_blank')}></div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1"
                                  onClick={() => window.open(message.attachment_url, '_blank')}
                                >
                                  <FileText className="h-4 w-4 mr-2" /> 
                                  View
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1"
                                  onClick={() => {
                                    const a = document.createElement('a');
                                    a.href = message.attachment_url || '';
                                    a.download = message.attachment_name || 'document.pdf';
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                  }}
                                >
                                  <Download className="h-4 w-4 mr-2" /> 
                                  Download
                                </Button>
                              </div>
                            </div>
                          ) : message.attachment_url ? (
                            <div className="max-w-[270px] bg-muted/20 p-3 rounded-lg flex flex-col">
                              <div className="flex items-center gap-2 mb-2">
                                <FileText className="h-5 w-5" />
                                <span className="text-sm font-medium truncate">{message.attachment_name || 'File'}</span>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1"
                                  onClick={() => {
                                    const a = document.createElement('a');
                                    a.href = message.attachment_url || '';
                                    a.download = message.attachment_name || 'file';
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                  }}
                                >
                                  <Download className="h-4 w-4 mr-2" /> 
                                  Download
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1"
                                  onClick={() => window.open(message.attachment_url, '_blank')}
                                >
                                  <FileText className="h-4 w-4 mr-2" /> 
                                  View
                                </Button>
                              </div>
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

            {/* Full Image Preview Dialog */}
            <Dialog open={showImagePreview} onOpenChange={setShowImagePreview}>
              <DialogContent className="sm:max-w-[90vw] max-h-[90vh] overflow-auto p-0">
                <div className="relative w-full h-full flex items-center justify-center bg-black">
                  <Button
                    onClick={() => setShowImagePreview(false)}
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 text-white hover:bg-white/20 z-50"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                  {imagePreview && (
                    <img 
                      src={imagePreview.url} 
                      alt={imagePreview.name || "Image preview"} 
                      className="max-w-full max-h-[85vh] object-contain" 
                    />
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </ScrollArea>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-background/50 to-background">
          <div className="text-center space-y-6 animate-fade-up p-8 rounded-xl backdrop-blur-sm">
            <div className="relative">
              <div className="absolute inset-0 rounded-full blur-xl bg-primary/20 animate-pulse"></div>
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto relative" />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg animate-pulse">Loading Your Chat</h3>
              <div className="flex items-center justify-center gap-1">
                <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {user?.id && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t border-border/50 mobile-safe-bottom md:static md:z-10">
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
            <div className="flex items-end gap-2">
              <div className="flex gap-1">
                <VoiceRecorder onRecord={(url, filename) => handleSend(null, {url, filename})} />
                <ChatAttachment onAttach={(url, filename) => handleSend(newMessage, { url, filename })} />
              </div>
              <Textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Type a message..."
                className="flex-1 min-h-[45px] max-h-[90px] rounded-2xl bg-muted/50 backdrop-blur-sm focus:bg-background transition-colors duration-200 text-base px-4"
                rows={1}
                autoComplete="off"
                autoCorrect="on"
                autoFocus
              />
              <Button
                onClick={() => handleSend(newMessage)}
                disabled={(!newMessage.trim() && !replyTo) || isSending || !user}
                size="icon"
                className="h-[45px] w-[45px] rounded-2xl bg-primary hover:bg-primary/90 transition-all duration-200 hover:scale-105 active:scale-95"
                aria-label="Send message"
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