
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { ChatHeader } from './ChatHeader';
import { TypingIndicator } from './TypingIndicator';
import { useTypingStatus } from '@/hooks/useTypingStatus';
import { RealtimeChannel } from '@supabase/supabase-js';
import { format } from 'date-fns';
import './ChatScreen.css';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  recipient_id?: string;
  conversation_id?: string;
  created_at: string;
  message_type: 'text' | 'image' | 'file' | 'audio' | 'video';
  file_url?: string;
  file_name?: string;
  attachment_url?: string;
  attachment_name?: string;
  is_read: boolean;
  sender?: {
    id: string;
    full_name: string;
    avatar_url: string;
  };
  reactions?: Array<{
    id: string;
    user_id: string;
    emoji: string;
    user: { full_name: string };
  }>;
  reply_to?: {
    id: string;
    content: string;
    sender: { full_name: string };
  };
}

interface ChatScreenProps {
  conversationId?: string;
  receiverId?: string;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({ conversationId, receiverId }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [receiverProfile, setReceiverProfile] = useState<any>(null);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const isInitialLoadRef = useRef(true);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const subscriptionAttempts = useRef(0);

  // Typing status
  const typingStatus = useTypingStatus(conversationId || `${user?.id}-${receiverId}`);
  const { 
    typingUsers = [], 
    startTyping = () => {}, 
    stopTyping = () => {} 
  } = typingStatus || {};

  // Optimized scroll to bottom
  const scrollToBottom = useCallback((smooth = false) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: smooth ? 'smooth' : 'auto',
        block: 'end'
      });
      setIsScrolledToBottom(true);
      setNewMessageCount(0);
    }
  }, []);

  // Check if user is scrolled to bottom
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;

    setIsScrolledToBottom(isAtBottom);

    if (isAtBottom) {
      setNewMessageCount(0);
      setShouldAutoScroll(true);
    } else {
      setShouldAutoScroll(false);
    }
  }, []);

  // Fetch receiver profile
  const fetchReceiverProfile = useCallback(async () => {
    if (!receiverId) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, is_online, last_seen')
        .eq('id', receiverId)
        .single();

      if (error) throw error;
      setReceiverProfile(data);
    } catch (err) {
      console.error('Error fetching receiver profile:', err);
    }
  }, [receiverId]);

  // Fetch messages with better error handling
  const fetchMessages = useCallback(async (loadMore = false) => {
    if (!user || !receiverId) return;

    try {
      console.log('🔄 Fetching messages...', { userId: user.id, receiverId, loadMore });

      const query = supabase
        .from('messages')
        .select(`
          id,
          content,
          sender_id,
          receiver_id,
          recipient_id,
          conversation_id,
          created_at,
          message_type,
          file_url,
          file_name,
          attachment_url,
          attachment_name,
          is_read,
          sender:profiles!messages_sender_id_fkey(
            id,
            full_name,
            avatar_url
          ),
          reactions:message_reactions(
            id,
            user_id,
            emoji,
            user:profiles(full_name)
          ),
          reply_to_id
        `)
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (loadMore && messages.length > 0) {
        const oldestMessage = messages[messages.length - 1];
        query.lt('created_at', oldestMessage.created_at);
      }

      const { data: messageData, error } = await query;

      if (error) {
        console.error('❌ Error fetching messages:', error);
        throw error;
      }

      const formattedMessages = (messageData || []).reverse();
      console.log('✅ Messages fetched:', formattedMessages.length);

      if (loadMore) {
        setMessages(prev => [...formattedMessages, ...prev]);
      } else {
        setMessages(formattedMessages);

        // Always auto-scroll on initial load
        if (isInitialLoadRef.current) {
          setTimeout(() => scrollToBottom(false), 100);
          isInitialLoadRef.current = false;
          setShouldAutoScroll(true);
        } else if (isScrolledToBottom) {
          setTimeout(() => scrollToBottom(false), 50);
        }
      }

      // Mark messages as read
      if (formattedMessages.length > 0) {
        const unreadMessages = formattedMessages.filter(
          msg => (msg.receiver_id === user.id || msg.recipient_id === user.id) && !msg.is_read
        );

        if (unreadMessages.length > 0) {
          await supabase
            .from('messages')
            .update({ is_read: true })
            .in('id', unreadMessages.map(msg => msg.id));
        }
      }

    } catch (err) {
      console.error('❌ Error fetching messages:', err);
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [user, receiverId, messages.length, isScrolledToBottom, scrollToBottom]);

  // Enhanced real-time subscription with better reconnection logic
  const setupRealtimeSubscription = useCallback(() => {
    if (!user || !receiverId) {
      console.log('❌ Cannot set up subscription - missing user or receiverId:', { userId: user?.id, receiverId });
      return;
    }

    // Clear any existing reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Clean up existing subscription
    if (channelRef.current) {
      console.log('🔄 Cleaning up existing subscription');
      try {
        channelRef.current.unsubscribe();
      } catch (error) {
        console.warn('Error cleaning up subscription:', error);
      }
      channelRef.current = null;
    }

    const channelName = `messages_${Math.min(parseInt(user.id), parseInt(receiverId))}_${Math.max(parseInt(user.id), parseInt(receiverId))}`;
    console.log('🚀 Setting up real-time subscription:', channelName, 'Attempt:', subscriptionAttempts.current + 1);

    setConnectionStatus('connecting');

    // Create channel with enhanced configuration
    const channel = supabase
      .channel(channelName, {
        config: {
          broadcast: { self: false },
          presence: { key: user.id },
          postgres_changes: [
            {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
              filter: `or(and(sender_id.eq.${user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${user.id}))`
            }
          ]
        }
      });

    channelRef.current = channel;

    // Handle new messages
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages'
      },
      async (payload) => {
        console.log('📨 New message received via real-time:', payload);

        try {
          const newMessageData = payload.new as any;

          if (!newMessageData || !newMessageData.id) {
            console.warn('⚠️ Invalid message data received:', newMessageData);
            return;
          }

          // Skip if message doesn't belong to this conversation
          const isRelevant = (
            (newMessageData.sender_id === user.id && newMessageData.receiver_id === receiverId) ||
            (newMessageData.sender_id === receiverId && newMessageData.receiver_id === user.id)
          );

          if (!isRelevant) {
            console.log('📍 Message not relevant to current conversation, skipping');
            return;
          }

          // Create message object with sender info
          const newMessage: Message = {
            id: newMessageData.id,
            content: newMessageData.content || '',
            sender_id: newMessageData.sender_id,
            receiver_id: newMessageData.receiver_id,
            recipient_id: newMessageData.recipient_id,
            conversation_id: newMessageData.conversation_id,
            created_at: newMessageData.created_at,
            message_type: newMessageData.message_type || 'text',
            file_url: newMessageData.file_url,
            file_name: newMessageData.file_name,
            attachment_url: newMessageData.attachment_url,
            attachment_name: newMessageData.attachment_name,
            is_read: newMessageData.is_read || false,
            sender: null,
            reactions: [],
            reply_to: null
          };

          // Fetch sender profile if needed
          if (newMessage.sender_id !== user.id) {
            try {
              const { data: senderProfile } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url')
                .eq('id', newMessage.sender_id)
                .single();
              
              if (senderProfile) {
                newMessage.sender = senderProfile;
              }
            } catch (error) {
              console.warn('Could not fetch sender profile:', error);
              newMessage.sender = {
                id: newMessage.sender_id,
                full_name: 'Unknown User',
                avatar_url: ''
              };
            }
          } else {
            newMessage.sender = {
              id: user.id,
              full_name: user.user_metadata?.full_name || user.email || 'You',
              avatar_url: user.user_metadata?.avatar_url || ''
            };
          }

          // Add message to state with duplicate check
          setMessages(prev => {
            const exists = prev.some(msg => msg.id === newMessage.id);
            if (exists) {
              console.log('⚠️ Message already exists, skipping:', newMessage.id);
              return prev;
            }

            console.log('✅ Adding new message to state:', newMessage.id);
            const updated = [...prev, newMessage];

            // Auto-scroll for own messages or if at bottom
            if (newMessage.sender_id === user.id || shouldAutoScroll) {
              setTimeout(() => scrollToBottom(true), 100);
            } else {
              setNewMessageCount(count => count + 1);
            }

            return updated;
          });

          // Mark as read if receiving
          if (newMessage.receiver_id === user.id && !newMessage.is_read) {
            try {
              await supabase
                .from('messages')
                .update({ is_read: true })
                .eq('id', newMessage.id);
            } catch (error) {
              console.warn('Could not mark message as read:', error);
            }
          }

        } catch (error) {
          console.error('❌ Error processing new message:', error);
        }
      }
    );

    // Subscribe with status handling
    channel.subscribe((status) => {
      console.log('📡 Real-time subscription status:', status);
      
      if (status === 'SUBSCRIBED') {
        console.log('✅ Successfully subscribed to real-time messages');
        setConnectionStatus('connected');
        subscriptionAttempts.current = 0; // Reset attempts on success
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.error('❌ Channel subscription failed:', status);
        setConnectionStatus('disconnected');
        
        subscriptionAttempts.current++;
        
        // Exponential backoff for reconnection
        const delay = Math.min(1000 * Math.pow(2, subscriptionAttempts.current), 30000);
        console.log(`🔄 Retrying subscription in ${delay}ms (attempt ${subscriptionAttempts.current})`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          if (user && receiverId && subscriptionAttempts.current < 5) {
            setupRealtimeSubscription();
          } else {
            console.error('❌ Max subscription attempts reached');
            toast({
              variant: "destructive",
              title: "Connection Lost",
              description: "Unable to receive real-time messages. Please refresh the page."
            });
          }
        }, delay);
        
      } else if (status === 'CLOSED') {
        console.warn('⚠️ Channel subscription closed');
        setConnectionStatus('disconnected');
      } else {
        setConnectionStatus('connecting');
      }
    });

  }, [user, receiverId, shouldAutoScroll, scrollToBottom]);

  // Handle sending messages
  const handleSendMessage = useCallback(async (content: string, messageType: 'text' | 'image' | 'file' | 'audio' = 'text', fileUrl?: string, fileName?: string): Promise<void> => {
    if (!user || !receiverId || !content.trim()) return;

    try {
      const messageData = {
        content: content.trim(),
        sender_id: user.id,
        receiver_id: receiverId,
        recipient_id: receiverId,
        conversation_id: conversationId,
        message_type: messageType,
        file_url: fileUrl,
        file_name: fileName,
        is_read: false
      };

      const { data, error } = await supabase
        .from('messages')
        .insert([messageData])
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Message sent successfully:', data);

      // Stop typing indicator
      stopTyping();

    } catch (err) {
      console.error('❌ Error sending message:', err);
      toast({
        variant: "destructive",
        title: "Failed to send message",
        description: "Please try again."
      });
      throw err;
    }
  }, [user, receiverId, stopTyping, conversationId]);

  // Initialize chat
  useEffect(() => {
    if (!user) {
      console.log('❌ No authenticated user, cannot initialize chat');
      setError('Please log in to continue');
      setLoading(false);
      return;
    }

    if (!receiverId) {
      console.log('❌ No receiver ID provided');
      setError('Invalid conversation');
      setLoading(false);
      return;
    }

    console.log('🚀 Initializing chat for:', { userId: user.id, receiverId });
    setLoading(true);
    setError(null);
    setMessages([]);
    isInitialLoadRef.current = true;
    subscriptionAttempts.current = 0;

    const initializeChat = async () => {
      try {
        console.log('🔄 Starting chat initialization...');
        
        // Fetch receiver profile
        await fetchReceiverProfile();
        console.log('✅ Receiver profile loaded');
        
        // Fetch messages
        await fetchMessages();
        console.log('✅ Messages loaded');
        
        // Set up real-time subscription with a delay to ensure everything is ready
        setTimeout(() => {
          console.log('🔄 Setting up real-time subscription...');
          setupRealtimeSubscription();
        }, 1000);
        
        console.log('✅ Chat initialization complete');
      } catch (err) {
        console.error('❌ Chat initialization error:', err);
        setError('Failed to initialize chat. Please try refreshing the page.');
        setLoading(false);
      }
    };

    initializeChat();

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up chat subscriptions and timers');
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      if (channelRef.current) {
        try {
          channelRef.current.unsubscribe();
        } catch (error) {
          console.warn('Error cleaning up channel:', error);
        }
        channelRef.current = null;
      }
      
      if (typingStatus?.stopTyping) {
        typingStatus.stopTyping();
      }
    };
  }, [user?.id, receiverId]);

  // Group messages by date for better UX
  const groupedMessages = useMemo(() => {
    const groups: { [key: string]: Message[] } = {};

    messages.forEach(message => {
      const messageDate = new Date(message.created_at);
      const dateKey = format(messageDate, 'yyyy-MM-dd');
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(message);
    });

    return groups;
  }, [messages]);

  // Send message function for MessageInput
  const sendMessage = async (content: string, attachmentUrl?: string, attachmentName?: string, replyToId?: string) => {
    if (!user || !receiverId || (!content.trim() && !attachmentUrl)) return;

    // Determine message type based on file extension
    let messageType: 'text' | 'image' | 'file' | 'video' | 'audio' = 'text';
    if (attachmentUrl && attachmentName) {
      const fileExt = attachmentName.split('.').pop()?.toLowerCase();
      const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
      const videoExtensions = ['mp4', 'avi', 'mov', 'webm', 'mkv'];
      const audioExtensions = ['mp3', 'wav', 'ogg', 'aac'];

      if (imageExtensions.includes(fileExt || '')) {
        messageType = 'image';
      } else if (videoExtensions.includes(fileExt || '')) {
        messageType = 'video';
      } else if (audioExtensions.includes(fileExt || '')) {
        messageType = 'audio';
      } else {
        messageType = 'file';
      }
    }

    try {
      console.log('📤 Sending message:', { content: content.trim(), messageType });

      const { data, error } = await supabase
        .from('messages')
        .insert({
          content: content.trim(),
          sender_id: user.id,
          receiver_id: receiverId,
          recipient_id: receiverId,
          conversation_id: conversationId,
          message_type: messageType,
          file_url: attachmentUrl,
          file_name: attachmentName,
          attachment_url: attachmentUrl,
          attachment_name: attachmentName,
          reply_to_id: replyToId
        })
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Message sent successfully:', data);

      // Force scroll for sent messages
      setTimeout(() => scrollToBottom(true), 100);

    } catch (error) {
      console.error('❌ Error sending message:', error);
      toast({
        variant: "destructive",
        title: "Failed to send message",
        description: "Please try again."
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading messages...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-red-500 mb-2">{error}</p>
          <button 
            onClick={() => {
              setError(null);
              setLoading(true);
              fetchMessages();
            }}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed-chat-container">
      {/* Chat Header - Fixed */}
      <div className="fixed-chat-header">
        <ChatHeader 
          conversation={{
            id: conversationId || '',
            participant: {
              id: receiverProfile?.id || receiverId || '',
              email: receiverProfile?.email || '',
              full_name: receiverProfile?.full_name || 'Unknown User',
              avatar_url: receiverProfile?.avatar_url || '/placeholder.svg',
              is_online: receiverProfile?.is_online,
              last_seen: receiverProfile?.last_seen
            }
          }}
          messages={messages}
          onRefresh={() => fetchMessages()}
        />
        
        {/* Connection Status Indicator */}
        {connectionStatus !== 'connected' && (
          <div className="px-4 py-1 bg-yellow-100 border-b border-yellow-200 text-xs text-yellow-800 text-center">
            {connectionStatus === 'connecting' ? '🔄 Connecting...' : '⚠️ Disconnected - Messages may not appear in real-time'}
          </div>
        )}
      </div>

      {/* Messages Container - Scrollable */}
      <div 
        ref={messagesContainerRef}
        className="chat-content-area"
        onScroll={handleScroll}
      >
        <div className="p-4 space-y-4">
          {Object.entries(groupedMessages).map(([date, dateMessages]) => (
            <div key={date}>
              {/* Date separator */}
              <div className="flex items-center justify-center my-4">
                <div className="bg-muted px-3 py-1 rounded-full text-xs text-muted-foreground">
                  {formatMessageDate(dateMessages[0]?.created_at)}
                </div>
              </div>

              {/* Messages for this date */}
              {dateMessages.map((message, index) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isCurrentUser={message.sender_id === user?.id}
                  isRead={message.is_read}
                  isLast={index === dateMessages.length - 1}
                  isConsecutive={
                    index > 0 && 
                    dateMessages[index - 1]?.sender_id === message.sender_id &&
                    (new Date(message.created_at).getTime() - 
                     new Date(dateMessages[index - 1]?.created_at).getTime()) < 300000 // 5 minutes
                  }
                  onReaction={(emoji) => {
                    console.log('Reaction:', emoji, 'for message:', message.id);
                  }}
                />
              ))}
            </div>
          ))}

          {/* Typing Indicator */}
          {typingUsers.length > 0 && (
            <TypingIndicator users={typingUsers} />
          )}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* New Messages Badge */}
      {!shouldAutoScroll && newMessageCount > 0 && (
        <div className="absolute bottom-24 right-4 z-10">
          <button
            onClick={() => {
              scrollToBottom(true);
              setShouldAutoScroll(true);
            }}
            className="bg-primary text-white px-3 py-2 rounded-full shadow-lg hover:bg-primary/90 transition-all duration-200 flex items-center gap-2 text-sm"
          >
            <span>{newMessageCount} new</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
        </div>
      )}

      {/* Message Input - Fixed */}
      <div className="fixed-chat-footer">
        <MessageInput
          onSend={sendMessage}
          onStartTyping={startTyping}
          onStopTyping={stopTyping}
          receiverId={receiverId}
        />
      </div>
    </div>
  );
};

function formatMessageDate(dateString: string | undefined): string {
  if (!dateString) return '';

  const date = new Date(dateString);
  const today = new Date();

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  }

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }

  return format(date, 'MMMM d, yyyy');
}

export default ChatScreen;
