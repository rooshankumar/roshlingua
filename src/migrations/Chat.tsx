
import { useState, useEffect } from "react";
import { ConversationList } from "@/components/chat/ConversationList";
import { ChatScreen } from "@/components/chat/ChatScreen";
import { Message, Conversation, User } from "@/types/chat";
import { getOtherParticipant } from "@/utils/chatUtils";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  fetchConversations, 
  fetchMessages, 
  sendMessage, 
  markMessagesAsRead,
  subscribeToMessages,
  subscribeToConversations
} from "@/services/chatService";
import { useAuth } from "@/hooks/useAuth"; // Update with your auth hook import
import { Skeleton } from "@/components/ui/skeleton";

const Chat = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [showChatScreen, setShowChatScreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { user } = useAuth(); // Get current user from your auth system

  // Fetch conversations on load
  useEffect(() => {
    if (!user?.id) return;

    const loadConversations = async () => {
      setIsLoading(true);
      const conversationsData = await fetchConversations(user.id);
      setConversations(conversationsData);
      setIsLoading(false);
    };

    loadConversations();

    // Subscribe to conversation updates
    const unsubscribe = subscribeToConversations(user.id, () => {
      loadConversations();
    });

    return () => {
      unsubscribe();
    };
  }, [user?.id]);

  // Auto-select the first conversation on desktop
  useEffect(() => {
    if (!isMobile && conversations.length > 0 && !activeConversationId) {
      setActiveConversationId(conversations[0].id);
    }
  }, [isMobile, conversations, activeConversationId]);

  // Show chat screen on mobile when a conversation is selected
  useEffect(() => {
    if (isMobile && activeConversationId) {
      setShowChatScreen(true);
    } else if (!isMobile) {
      setShowChatScreen(true);
    }
  }, [isMobile, activeConversationId]);

  // Load messages when selecting a conversation
  useEffect(() => {
    if (!activeConversationId) return;

    const loadMessages = async () => {
      const messagesData = await fetchMessages(activeConversationId);
      setMessages(messagesData);

      // Mark messages as read
      if (user?.id) {
        await markMessagesAsRead(activeConversationId, user.id);
        
        // Update the unread count in conversations
        setConversations(
          conversations.map(conversation => {
            if (conversation.id === activeConversationId) {
              return { ...conversation, unreadCount: 0 };
            }
            return conversation;
          })
        );
      }
    };

    loadMessages();

    // Subscribe to new messages
    const unsubscribe = subscribeToMessages(activeConversationId, (newMessage) => {
      setMessages(prev => [...prev, newMessage]);
      
      // If the message is to the current user, mark it as read
      if (newMessage.recipient_id === user?.id) {
        markMessagesAsRead(activeConversationId, user.id);
      }
      
      // Update conversations
      setConversations(prevConversations =>
        prevConversations.map(c => {
          if (c.id === activeConversationId) {
            return {
              ...c,
              lastMessage: newMessage,
              lastMessageAt: newMessage.created_at,
              // Only increment unread if we're not in this conversation and the message is for us
              unreadCount: c.id !== activeConversationId && newMessage.recipient_id === user?.id
                ? (c.unreadCount || 0) + 1
                : c.unreadCount || 0
            };
          }
          return c;
        })
      );
      
      // Show toast for new messages if this isn't the active conversation or app is in background
      if (newMessage.recipient_id === user?.id && 
          (document.hidden || newMessage.conversation_id !== activeConversationId)) {
        // Get sender name from conversations
        const conversation = conversations.find(c => c.id === newMessage.conversation_id);
        const sender = conversation?.participants.find(p => p.id === newMessage.sender_id);
        
        toast({
          title: sender?.name || "New message",
          description: newMessage.content,
          duration: 4000,
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [activeConversationId, user?.id, conversations]);

  const handleSelectConversation = async (conversationId: string) => {
    setActiveConversationId(conversationId);
    
    // Mark messages as read
    if (user?.id) {
      await markMessagesAsRead(conversationId, user.id);
      
      // Update the unread count in conversations
      setConversations(
        conversations.map(conversation => {
          if (conversation.id === conversationId) {
            return { ...conversation, unreadCount: 0 };
          }
          return conversation;
        })
      );
    }
  };
  
  const handleSendMessage = async (content: string) => {
    if (!activeConversationId || !user?.id) return;
    
    const conversation = conversations.find(c => c.id === activeConversationId);
    if (!conversation) return;
    
    const recipient = getOtherParticipant(conversation, user.id);
    
    const newMessage = await sendMessage(
      activeConversationId,
      user.id,
      recipient.id,
      content
    );
    
    if (newMessage) {
      // Optimistically update UI (will be updated by subscription too)
      setMessages(prev => [...prev, newMessage]);
      
      // Update conversation's last message
      setConversations(
        conversations.map(c => {
          if (c.id === activeConversationId) {
            return {
              ...c,
              lastMessage: newMessage,
              lastMessageAt: newMessage.created_at,
            };
          }
          return c;
        })
      );
    }
  };

  const handleBack = () => {
    setShowChatScreen(false);
  };

  const activeConversation = conversations.find(
    (c) => c.id === activeConversationId
  );
  
  const recipient = activeConversation
    ? getOtherParticipant(activeConversation, user?.id || '')
    : {} as User;

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p>Please log in to access your messages</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-screen flex bg-background">
        <div className="w-full md:w-1/3 lg:w-1/4 border-r">
          <div className="p-4 border-b">
            <Skeleton className="h-8 w-32 mb-4" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="p-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 mb-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 hidden md:block">
          <div className="h-full flex items-center justify-center">
            <p className="text-muted-foreground">Select a conversation</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-background">
      {/* Conversation List - Hide on mobile when showing chat */}
      <div 
        className={cn(
          "w-full md:w-1/3 lg:w-1/4 border-r",
          isMobile && showChatScreen && "hidden"
        )}
      >
        <ConversationList
          conversations={conversations}
          currentUserId={user.id}
          activeConversationId={activeConversationId}
          onSelectConversation={(id) => handleSelectConversation(id)}
        />
      </div>
      
      {/* Chat Screen - Show on desktop or when a conversation is selected on mobile */}
      {activeConversationId && (showChatScreen || !isMobile) ? (
        <div className="flex-1">
          <ChatScreen
            conversationId={activeConversationId}
            recipient={recipient}
            currentUserId={user.id}
            messages={messages}
            onSendMessage={handleSendMessage}
            onBack={isMobile ? handleBack : undefined}
          />
        </div>
      ) : (
        // Empty state for desktop when no conversation is selected
        !isMobile && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h3 className="text-xl font-medium mb-2">Select a conversation</h3>
              <p className="text-muted-foreground">
                Choose a conversation from the list to start chatting
              </p>
            </div>
          </div>
        )
      )}
    </div>
  );
};

import { cn } from "@/lib/utils";
export default Chat;
