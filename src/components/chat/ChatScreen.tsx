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
import subscriptionManager from '@/utils/subscriptionManager';
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
  const isInitialLoadRef = useRef(true);
  const lastMessageIdRef = useRef<string | null>(null);

  // Typing status
  const typingStatus = useTypingStatus(conversationId || `${user?.id}-${receiverId}`);
  const { 
    typingUsers = [], 
    startTyping = () => {}, 
    stopTyping = () => {} 
  } = typingStatus || {};

  // Scroll to bottom
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

  // Handle scroll - throttled to prevent too frequent updates
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;

    // Only update state if there's a change to prevent unnecessary re-renders
    setIsScrolledToBottom(prev => {
      if (prev !== isAtBottom) {
        if (isAtBottom) {
          setNewMessageCount(0);
          setShouldAutoScroll(true);
        } else {
          setShouldAutoScroll(false);
        }
        return isAtBottom;
      }
      return prev;
    });
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

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!user || !receiverId) return;

    try {
      console.log('🔄 Fetching messages for conversation:', { userId: user.id, receiverId });

      const { data: messageData, error } = await supabase
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
          )
        `)
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;

      const formattedMessages = messageData || [];
      console.log('✅ Messages loaded:', formattedMessages.length);

      setMessages(formattedMessages);

      // Auto-scroll on initial load
      if (isInitialLoadRef.current || shouldAutoScroll) {
        setTimeout(() => scrollToBottom(false), 100);
      }

      // Mark unread messages as read
      const unreadMessages = formattedMessages.filter(
        msg => msg.receiver_id === user.id && !msg.is_read
      );

      if (unreadMessages.length > 0) {
        await supabase
          .from('messages')
          .update({ is_read: true })
          .in('id', unreadMessages.map(msg => msg.id));
      }

    } catch (err) {
      console.error('❌ Error fetching messages:', err);
      setError('Failed to load messages');
    }
  }, [user, receiverId, shouldAutoScroll, scrollToBottom]);

  // Setup realtime subscription with stable reference
  const setupRealtimeSubscription = useCallback(() => {
    if (!user || !receiverId) return;

    const subscriptionKey = `chat_${user.id}_${receiverId}`;

    console.log('🚀 Setting up realtime subscription:', subscriptionKey);
    setConnectionStatus('connecting');

    const channel = supabase
      .channel(subscriptionKey, {
        config: {
          presence: {
            key: user.id,
          },
        },
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `or(and(sender_id.eq.${user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${user.id}))`
        },
        async (payload) => {
          console.log('📨 New message received:', payload.new);

          const newMessageData = payload.new as any;

          // Create message object
          const newMessage: Message = {
            ...newMessageData,
            sender: null,
            reactions: [],
            reply_to: null
          };

          // Fetch sender info
          if (newMessage.sender_id !== user.id) {
            try {
              const { data: senderProfile } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url')
                .eq('id', newMessage.sender_id)
                .single();

              newMessage.sender = senderProfile || {
                id: newMessage.sender_id,
                full_name: 'Unknown User',
                avatar_url: ''
              };
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

          // Add to messages - remove duplicate check that was too strict
          setMessages(prev => {
            // Check if message already exists by ID
            const exists = prev.find(msg => msg.id === newMessage.id);
            if (exists) {
              console.log('Message already exists, skipping');
              return prev;
            }

            console.log('Adding new message to state');
            const updated = [...prev, newMessage];

            // Auto-scroll for own messages or if at bottom
            if (newMessage.sender_id === user.id || isScrolledToBottom) {
              setTimeout(() => scrollToBottom(true), 50);
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
        }
      )
      .subscribe((status) => {
        console.log('📡 Subscription status:', status);

        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
          console.log('✅ Successfully subscribed to messages');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setConnectionStatus('disconnected');
          console.error('❌ Subscription failed:', status);
          
          // Auto-retry connection after delay
          setTimeout(() => {
            if (user && receiverId) {
              console.log('🔄 Retrying subscription...');
              setupRealtimeSubscription();
            }
          }, 5000);
        } else if (status === 'CLOSED') {
          setConnectionStatus('disconnected');
          console.warn('⚠️ Subscription closed');
        }
      });

    // Register with subscription manager
    subscriptionManager.subscribe(subscriptionKey, channel);

  }, [user?.id, receiverId]); // Simplified dependencies

  // Send message with optimistic UI update
  const sendMessage = useCallback(async (content: string, attachmentUrl?: string, attachmentName?: string, replyToId?: string) => {
    if (!user || !receiverId || (!content.trim() && !attachmentUrl)) return;

    // Determine message type
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

    // Create optimistic message for immediate UI update
    const tempId = `temp_${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      content: content.trim(),
      sender_id: user.id,
      receiver_id: receiverId,
      recipient_id: receiverId,
      conversation_id: conversationId || '',
      created_at: new Date().toISOString(),
      message_type: messageType,
      file_url: attachmentUrl,
      file_name: attachmentName,
      attachment_url: attachmentUrl,
      attachment_name: attachmentName,
      is_read: false,
      sender: {
        id: user.id,
        full_name: user.user_metadata?.full_name || user.email || 'You',
        avatar_url: user.user_metadata?.avatar_url || ''
      },
      reactions: [],
      reply_to: undefined
    };

    // Add optimistic message immediately
    setMessages(prev => [...prev, optimisticMessage]);
    scrollToBottom(true);

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
          reply_to_id: replyToId,
          is_read: false
        })
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Message sent successfully:', data);

      // Replace optimistic message with real one
      setMessages(prev => prev.map(msg => 
        msg.id === tempId ? { ...optimisticMessage, id: data.id } : msg
      ));

      stopTyping();

    } catch (error) {
      console.error('❌ Error sending message:', error);
      
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      
      toast({
        variant: "destructive",
        title: "Failed to send message",
        description: "Please try again."
      });
    }
  }, [user, receiverId, conversationId, scrollToBottom, stopTyping]);

  // Initialize chat - only when user or receiverId changes
  useEffect(() => {
    if (!user || !receiverId) {
      setError('Invalid conversation');
      setLoading(false);
      return;
    }

    console.log('🚀 Initializing chat:', { userId: user.id, receiverId });

    setLoading(true);
    setError(null);
    setMessages([]);
    isInitialLoadRef.current = true;

    const initializeChat = async () => {
      try {
        await fetchReceiverProfile();
        await fetchMessages();

        // Small delay before setting up subscription
        setTimeout(() => {
          setupRealtimeSubscription();
          setLoading(false);
          isInitialLoadRef.current = false;
        }, 500);

      } catch (err) {
        console.error('❌ Chat initialization error:', err);
        setError('Failed to load chat');
        setLoading(false);
      }
    };

    initializeChat();

    // Cleanup
    return () => {
      console.log('🧹 Cleaning up chat subscriptions');
      const subscriptionKey = `chat_${user.id}_${receiverId}`;
      subscriptionManager.unsubscribe(subscriptionKey);

      if (typingStatus?.stopTyping) {
        typingStatus.stopTyping();
      }
    };
  }, [user?.id, receiverId]); // Remove function dependencies to prevent re-initialization

  // Group messages by date
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
      {/* Chat Header */}
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

        {/* Connection Status */}
        {connectionStatus !== 'connected' && (
          <div className="px-4 py-1 bg-yellow-100 border-b border-yellow-200 text-xs text-yellow-800 text-center">
            {connectionStatus === 'connecting' ? '🔄 Connecting...' : '⚠️ Disconnected - Messages may not appear in real-time'}
          </div>
        )}
      </div>

      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        className="chat-content-area"
        onScroll={handleScroll}
        style={{ scrollBehavior: 'smooth' }}
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

              {/* Messages */}
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
                     new Date(dateMessages[index - 1]?.created_at).getTime()) < 300000
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

      {/* Message Input */}
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