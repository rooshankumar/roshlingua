import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Loader2, FileText, Check, Image, X, Download, FileAudio } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
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
import { toast } from '@/components/ui/use-toast';
import { handleImageLoadError, isLikelyBlockedUrl } from '@/utils/imageUtils';
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
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [activeReactionMenu, setActiveReactionMenu] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isScrolledToBottomRef = useRef(true);
  const { markConversationAsRead } = useUnreadMessages(user?.id);

  // Smooth scroll to bottom - optimized version
  const scrollToBottom = useCallback((smooth = true) => {
    if (!messagesEndRef.current || !isScrolledToBottomRef.current) return;

    messagesEndRef.current.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
      block: 'end'
    });
  }, []);

  // Check if user is at bottom of chat
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const threshold = 100;
    const isAtBottom = target.scrollHeight - target.scrollTop - target.clientHeight < threshold;
    isScrolledToBottomRef.current = isAtBottom;
  }, []);

  // Optimized message fetching
  const fetchMessages = useCallback(async () => {
    if (!conversation?.id || !user?.id) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(
            id, user_id, full_name, avatar_url, last_seen
          )
        `)
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) throw error;

      setMessages(data || []);
      setIsLoading(false);

      // Mark as read and scroll to bottom
      setTimeout(() => {
        scrollToBottom(false);
        markConversationAsRead(conversation.id);
      }, 100);

    } catch (error) {
      console.error('Error fetching messages:', error);
      setIsLoading(false);
    }
  }, [conversation?.id, user?.id, markConversationAsRead, scrollToBottom]);

  // Optimized real-time subscription
  useEffect(() => {
    if (!conversation?.id || !user?.id) return;

    // Clean up existing channel
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }

    // Create new channel
    const channel = supabase
      .channel(`chat:${conversation.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversation.id}`
      }, async (payload) => {
        const newMessage = payload.new as Message;

        // Fetch complete message with sender info
        const { data: messageWithSender } = await supabase
          .from('messages')
          .select(`
            *,
            sender:profiles!messages_sender_id_fkey(
              id, user_id, full_name, avatar_url, last_seen
            )
          `)
          .eq('id', newMessage.id)
          .single();

        if (messageWithSender) {
          setMessages(prev => {
            const exists = prev.some(msg => msg.id === messageWithSender.id);
            if (exists) return prev;

            const updated = [...prev, messageWithSender];

            // Auto-scroll if at bottom or message from current user
            if (isScrolledToBottomRef.current || messageWithSender.sender_id === user.id) {
              setTimeout(() => scrollToBottom(true), 50);
            }

            // Show notification for messages from others
            if (messageWithSender.sender_id !== user.id) {
              showNewMessageNotification(messageWithSender);
            }

            return updated;
          });
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Chat connected');
        } else if (status === 'CLOSED') {
          console.log('❌ Chat disconnected');
        }
      });

    channelRef.current = channel;

    // Initial fetch
    fetchMessages();

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [conversation?.id, user?.id, fetchMessages, scrollToBottom]);

  // New message notification
  const showNewMessageNotification = useCallback((message: Message) => {
    // Audio notification
    try {
      const audio = new Audio('/notification.mp3');
      audio.volume = 0.3;
      audio.play().catch(() => {});
    } catch (e) {}

    // Visual notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`New message from ${message.sender?.full_name || 'Someone'}`, {
        body: message.content?.substring(0, 100) || 'New message',
        icon: message.sender?.avatar_url || '/favicon.png',
        tag: 'chat-message'
      });
    }

    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100]);
    }

    // Toast notification
    toast({
      title: `${message.sender?.full_name || 'Someone'} sent a message`,
      description: message.content?.substring(0, 60) || 'New message',
      duration: 3000,
    });
  }, []);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Optimized send message
  const handleSend = useCallback(async (content?: string, attachment?: { url: string; filename: string; thumbnail?: string }) => {
    const messageContent = content || newMessage;
    if ((!messageContent.trim() && !attachment) || !user || isSending) return;

    setIsSending(true);
    setNewMessage('');

    // Optimistic update
    const tempMessage = {
      id: crypto.randomUUID(),
      content: messageContent,
      conversation_id: conversation.id,
      sender_id: user.id,
      attachment_url: attachment?.url,
      attachment_name: attachment?.filename,
      attachment_thumbnail: attachment?.thumbnail, // Include thumbnail
      created_at: new Date().toISOString(),
      sender: {
        id: user.id,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'You',
        avatar_url: user.user_metadata?.avatar_url,
      },
      is_read: false
    };

    setMessages(prev => [...prev, tempMessage]);
    scrollToBottom(true);

    try {
      const { error } = await supabase
        .from('messages')
        .insert([{
          content: messageContent,
          conversation_id: conversation.id,
          sender_id: user.id,
          attachment_url: attachment?.url,
          attachment_name: attachment?.filename,
          attachment_thumbnail: attachment?.thumbnail, // Include thumbnail
        }]);

      if (error) throw error;
    } catch (error) {
      console.error('Send failed:', error);
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
      toast({
        variant: "destructive",
        title: "Failed to send message",
        description: "Please try again",
      });
    } finally {
      setIsSending(false);
    }
  }, [newMessage, user, conversation.id, isSending, scrollToBottom]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleReact = useCallback(async (messageId: string, emoji: string) => {
    if (!user?.id) return;

    try {
      const { data: existing } = await supabase
        .from('message_reactions')
        .select('*')
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .eq('reaction', emoji)
        .single();

      if (existing) {
        await supabase
          .from('message_reactions')
          .delete()
          .eq('id', existing.id);
      } else {
        await supabase
          .from('message_reactions')
          .insert({
            message_id: messageId,
            user_id: user.id,
            reaction: emoji
          });
      }
    } catch (error) {
      console.error('Reaction error:', error);
    }
  }, [user?.id]);

  if (isLoading) {
    return (
      <Card className="fixed inset-0 flex flex-col w-full h-full md:static md:h-[calc(100vh-1rem)]">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Loading chat...</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="fixed inset-0 flex flex-col w-full h-full md:static md:h-[calc(100vh-1rem)] border-0 shadow-none">
      <ChatHeader conversation={conversation} />

      <ScrollArea 
        className="flex-1 px-4"
        onScroll={handleScroll}
        ref={messagesContainerRef}
      >
        <div className="space-y-4 py-4">
          {messages.map((message, index) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.sender_id === user?.id ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src={message.sender?.avatar_url} />
                <AvatarFallback>
                  {message.sender?.full_name?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>

              <div className={`max-w-[80%] ${message.sender_id === user?.id ? 'items-end' : 'items-start'} flex flex-col`}>
                <div
                  className={`rounded-2xl px-4 py-2 break-words ${
                    message.sender_id === user?.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  {message.content && (
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  )}

                  {message.attachment_url && (
                    <div className="mt-2">
                      {message.attachment_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                        <img
                          src={message.attachment_url}
                          alt="Attachment"
                          className="max-w-[200px] rounded-lg cursor-pointer hover:opacity-90"
                          onClick={() => window.open(message.attachment_url, '_blank')}
                        />
                      ) : (
                        <div className="flex items-center gap-2 p-2 bg-background/50 rounded">
                          <FileText className="h-4 w-4" />
                          <span className="text-xs truncate">{message.attachment_name}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <MessageReactions 
                  messageId={message.id} 
                  existingReactions={message.reactions || {}} 
                />
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <div className="p-4 border-t">
        {replyTo && (
          <div className="mb-2 p-2 bg-muted rounded-lg flex justify-between items-center">
            <div>
              <p className="text-xs text-muted-foreground">Replying to {replyTo.sender?.full_name}</p>
              <p className="text-sm truncate">{replyTo.content}</p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setReplyTo(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="flex gap-2 items-end">
          <ChatAttachment onAttach={(url, filename, thumbnail) => handleSend(undefined, { url, filename, thumbnail })} />
          <VoiceRecorder onRecord={(url, filename) => handleSend(undefined, { url, filename })} />

          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 min-h-[44px] max-h-[120px] resize-none rounded-xl"
            rows={1}
          />

          <Button
            onClick={() => handleSend()}
            disabled={!newMessage.trim() || isSending}
            size="icon"
            className="h-[44px] w-[44px] rounded-xl"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default ChatScreen;