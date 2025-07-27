
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
import { MessageReactions } from './MessageReactions';
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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const isInitialLoadRef = useRef(true);

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

  // Optimized message fetching with pagination
  const fetchMessages = useCallback(async (loadMore = false) => {
    if (!user || !receiverId) return;

    try {
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

      if (error) throw error;

      const formattedMessages = (messageData || []).reverse();

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
      console.error('Error fetching messages:', err);
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [user, receiverId, messages.length, isScrolledToBottom, scrollToBottom]);

  // Real-time subscription setup
  const setupRealtimeSubscription = useCallback(() => {
    if (!user || !receiverId) return;

    // Clean up existing subscription
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }

    const channelName = `chat_${user.id}_${receiverId}`;

    channelRef.current = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `or(and(sender_id.eq.${user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${user.id}))`
        },
        async (payload) => {
          const newMessageData = payload.new as any;

          // Fetch the complete message with relations
          const { data: newMessage, error } = await supabase
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
              )
            `)
            .eq('id', newMessageData.id)
            .single();

          if (!error && newMessage) {
            setMessages(prev => {
              const exists = prev.some(msg => msg.id === newMessage.id);
              if (exists) return prev;

              const updated = [...prev, newMessage];

              // Auto-scroll for own messages or if at bottom
              if (newMessage.sender_id === user.id || shouldAutoScroll) {
                setTimeout(() => scrollToBottom(true), 50);
              } else {
                setNewMessageCount(count => count + 1);
              }

              return updated;
            });

            // Mark as read if receiving
            if (newMessage.receiver_id === user.id) {
              await supabase
                .from('messages')
                .update({ is_read: true })
                .eq('id', newMessage.id);
            }
          }
        }
      )
      .subscribe();

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
      throw err; // Re-throw to let MessageInput handle the error state
    }
  }, [user, receiverId, stopTyping, conversationId]);

  // Create conversation if missing
  const createConversationIfNeeded = useCallback(async () => {
    if (!conversationId && user && receiverId) {
      try {
        // Check if conversation already exists
        const { data: existingConv, error: convError } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .in('user_id', [user.id, receiverId])
          .limit(2);

        if (convError) throw convError;

        // Group by conversation_id and find one with both users
        const conversationCounts: { [key: string]: number } = {};
        existingConv?.forEach(conv => {
          conversationCounts[conv.conversation_id] = (conversationCounts[conv.conversation_id] || 0) + 1;
        });

        const existingConversationId = Object.keys(conversationCounts).find(
          convId => conversationCounts[convId] === 2
        );

        if (existingConversationId) {
          // Use existing conversation
          window.history.replaceState(null, '', `/chat/${existingConversationId}`);
          return existingConversationId;
        } else {
          // Create new conversation
          const { data: newConv, error: createError } = await supabase
            .from('conversations')
            .insert([{ created_by: user.id }])
            .select()
            .single();

          if (createError) throw createError;

          // Add participants
          const { error: participantError } = await supabase
            .from('conversation_participants')
            .insert([
              { conversation_id: newConv.id, user_id: user.id },
              { conversation_id: newConv.id, user_id: receiverId }
            ]);

          if (participantError) throw participantError;

          window.history.replaceState(null, '', `/chat/${newConv.id}`);
          return newConv.id;
        }
      } catch (err) {
        console.error('Error creating conversation:', err);
        return null;
      }
    }
    return conversationId;
  }, [conversationId, user, receiverId]);

  // Initialize chat
  useEffect(() => {
    if (user && receiverId) {
      setLoading(true);
      setError(null);
      setMessages([]);

      const initializeChat = async () => {
        try {
          await createConversationIfNeeded();
          await fetchReceiverProfile();
          await fetchMessages();
          setupRealtimeSubscription();
        } catch (err) {
          console.error('❌ Chat initialization error:', err);
          setError('Failed to initialize chat');
        }
      };

      initializeChat();
    }

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
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

  // Auto-scroll behavior - scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      // Auto-scroll for new messages
      setTimeout(() => scrollToBottom(true), 100);
    }
  }, [messages.length, scrollToBottom]);

  const sendMessage = async (content: string, attachmentUrl?: string, attachmentName?: string, replyToId?: string) => {
    if (!user || !receiverId || (!content.trim() && !attachmentUrl)) return;

    // Determine message type based on file extension or MIME type
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

    const tempId = `temp-${Date.now()}`;
    const newMessage = {
      id: tempId,
      content: content.trim(),
      sender_id: user.id,
      receiver_id: receiverId,
      recipient_id: receiverId,
      sender: {
        id: user.id,
        full_name: user.user_metadata?.full_name || user.email || 'You',
        avatar_url: user.user_metadata?.avatar_url || ''
      },
      created_at: new Date().toISOString(),
      message_type: messageType,
      file_url: attachmentUrl,
      file_name: attachmentName,
      attachment_url: attachmentUrl,
      attachment_name: attachmentName,
      is_read: false,
      is_sending: true
    };

    // Add message optimistically
    setMessages(prev => {
      const updated = [...prev, newMessage];
      // Force scroll immediately for sent messages
      setTimeout(() => scrollToBottom(false), 10);
      return updated;
    });

    try {
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
          )
        `)
        .single();

      if (error) throw error;

      // Replace temporary message with real one
      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempId ? { ...data, is_sending: false } : msg
        )
      );

      console.log('✅ Message sent successfully');

    } catch (error) {
      console.error('❌ Error sending message:', error);
      // Mark message as failed
      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempId ? { ...msg, is_sending: false, send_failed: true } : msg
        )
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-red-500 mb-2">{error}</p>
          <button 
            onClick={() => fetchMessages()}
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
                    // Handle reactions here if needed
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
          onSend={handleSendMessage}
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
