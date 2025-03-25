
import { useState, useEffect, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, User, Info, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";

interface Message {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  sender?: {
    username: string;
    avatar_url: string;
  };
}

interface ChatProfile {
  id: string;
  username: string;
  avatar_url: string;
  is_online: boolean;
}

const Chat = () => {
  const { id: partnerId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [partner, setPartner] = useState<ChatProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [messageText, setMessageText] = useState("");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch partner profile information
  useEffect(() => {
    const fetchPartnerProfile = async () => {
      if (!partnerId) {
        setLoadingProfile(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, is_online')
          .eq('id', partnerId)
          .single();

        if (error) throw error;

        setPartner(data as ChatProfile);
      } catch (error) {
        console.error('Error fetching partner profile:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load profile information"
        });
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchPartnerProfile();
  }, [partnerId, toast]);

  // Initialize conversation and fetch messages
  useEffect(() => {
    if (!user || !partnerId) return;

    const initializeChat = async () => {
      try {
        // 1. Check if conversation exists between these users
        const { data: participantsData, error: participantsError } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', user.id)
          .order('conversation_id', { ascending: false });

        if (participantsError) throw participantsError;

        let foundConversationId: string | null = null;

        if (participantsData.length > 0) {
          // Get all conversations where current user is a participant
          const userConversationIds = participantsData.map(p => p.conversation_id);
          
          // Find conversations where partner is also a participant
          const { data: partnerParticipations, error: partnerError } = await supabase
            .from('conversation_participants')
            .select('conversation_id')
            .eq('user_id', partnerId)
            .in('conversation_id', userConversationIds);

          if (partnerError) throw partnerError;

          if (partnerParticipations.length > 0) {
            // Conversation exists
            foundConversationId = partnerParticipations[0].conversation_id;
          }
        }

        // If no conversation exists, create one
        if (!foundConversationId) {
          // Create new conversation
          const { data: newConversation, error: createError } = await supabase
            .from('conversations')
            .insert({})
            .select()
            .single();

          if (createError) throw createError;

          foundConversationId = newConversation.id;

          // Add participants
          const participants = [
            { conversation_id: foundConversationId, user_id: user.id },
            { conversation_id: foundConversationId, user_id: partnerId }
          ];

          const { error: participantsInsertError } = await supabase
            .from('conversation_participants')
            .insert(participants);

          if (participantsInsertError) throw participantsInsertError;
        }

        setConversationId(foundConversationId);

        // 2. Now fetch messages for this conversation
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select(`
            id,
            content,
            created_at,
            sender_id,
            sender:profiles!sender_id(username, avatar_url)
          `)
          .eq('conversation_id', foundConversationId)
          .order('created_at', { ascending: true });

        if (messagesError) throw messagesError;
        
        setMessages(messagesData || []);
      } catch (error) {
        console.error('Error initializing chat:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load chat messages"
        });
      } finally {
        setLoading(false);
      }
    };

    initializeChat();

    // Set up real-time subscription for new messages
    const messageSubscription = () => {
      return supabase
        .channel('public:messages')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: conversationId ? `conversation_id=eq.${conversationId}` : undefined,
        }, async (payload) => {
          // Fetch sender profile for the new message
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', payload.new.sender_id)
            .single();

          const newMessage = {
            ...payload.new as Message,
            sender: senderProfile
          };

          setMessages(current => [...current, newMessage]);
        })
        .subscribe();
    };

    if (conversationId) {
      const subscription = messageSubscription();
      
      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [user, partnerId, conversationId, toast]);

  // Mark messages as read when viewed
  useEffect(() => {
    if (!user || !conversationId || messages.length === 0) return;

    const markMessagesAsRead = async () => {
      try {
        // Only mark messages from the partner as read
        const unreadMessages = messages
          .filter(msg => msg.sender_id === partnerId && !msg.is_read)
          .map(msg => msg.id);

        if (unreadMessages.length > 0) {
          await supabase
            .from('messages')
            .update({ is_read: true })
            .in('id', unreadMessages);
        }

        // Update the last_read_at timestamp
        await supabase
          .from('conversation_participants')
          .update({ last_read_at: new Date().toISOString() })
          .eq('conversation_id', conversationId)
          .eq('user_id', user.id);
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    };

    markMessagesAsRead();
  }, [user, conversationId, messages, partnerId]);

  const sendMessage = async () => {
    if (!messageText.trim() || !user || !conversationId) return;

    try {
      const newMessage = {
        conversation_id: conversationId,
        sender_id: user.id,
        content: messageText.trim()
      };

      // Optimistically add message to UI
      const optimisticMessage = {
        id: `temp-${Date.now()}`,
        ...newMessage,
        created_at: new Date().toISOString(),
        sender: {
          username: "You",
          avatar_url: "" // We don't have this readily available
        }
      };

      setMessages(current => [...current, optimisticMessage]);
      setMessageText("");

      // Actually send the message
      const { error, data } = await supabase
        .from('messages')
        .insert(newMessage)
        .select()
        .single();

      if (error) throw error;

      // Remove optimistic message and add real one
      setMessages(current => 
        current
          .filter(msg => msg.id !== optimisticMessage.id)
          .concat({
            ...data,
            sender: {
              username: "You",
              avatar_url: "" // We'll get this from the subscription
            }
          })
      );
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send message"
      });
    }
  };

  const deleteConversation = async () => {
    if (!conversationId || !user) return;

    try {
      // First delete all messages
      const { error: messagesError } = await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', conversationId);

      if (messagesError) throw messagesError;

      // Then delete participants
      const { error: participantsError } = await supabase
        .from('conversation_participants')
        .delete()
        .eq('conversation_id', conversationId);

      if (participantsError) throw participantsError;

      // Finally delete conversation
      const { error: conversationError } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);

      if (conversationError) throw conversationError;

      toast({
        title: "Conversation deleted",
        description: "The conversation has been deleted"
      });

      navigate('/community');
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete conversation"
      });
    }
  };

  if (loading || loadingProfile) {
    return (
      <div className="container flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-muted-foreground">Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container h-full max-h-[calc(100vh-8rem)] flex flex-col">
      {/* Chat header */}
      <div className="flex justify-between items-center p-4 border-b">
        <div className="flex items-center">
          <Button asChild variant="ghost" size="sm" className="mr-2">
            <Link to="/community">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>

          {partner && (
            <div className="flex items-center">
              <Avatar className="h-8 w-8 mr-2">
                <AvatarImage src={partner.avatar_url || "/placeholder.svg"} />
                <AvatarFallback>
                  {partner.username?.[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">{partner.username}</div>
                <div className="text-xs text-muted-foreground flex items-center">
                  <div className={`h-2 w-2 rounded-full mr-1 ${partner.is_online ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                  {partner.is_online ? 'Online' : 'Offline'}
                </div>
              </div>
            </div>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to={`/profile/${partnerId}`} className="cursor-pointer">
                <User className="h-4 w-4 mr-2" />
                View Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={deleteConversation}>
              Delete Conversation
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Message area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <Info className="h-12 w-12 mb-2 opacity-50" />
            <h3 className="text-lg font-medium">No messages yet</h3>
            <p className="max-w-md">
              Send a message to start the conversation!
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`flex items-start space-x-2 max-w-[70%] ${
                  message.sender_id === user?.id ? 'flex-row-reverse space-x-reverse' : 'flex-row'
                }`}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage 
                    src={
                      message.sender_id === user?.id
                        ? "" // We don't have the current user's avatar readily available
                        : message.sender?.avatar_url || "/placeholder.svg"
                    } 
                  />
                  <AvatarFallback>
                    {message.sender_id === user?.id 
                      ? user.email?.[0]?.toUpperCase() || '?' 
                      : message.sender?.username?.[0]?.toUpperCase() || '?'
                    }
                  </AvatarFallback>
                </Avatar>
                <div 
                  className={`rounded-lg p-3 ${
                    message.sender_id === user?.id 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                  <span className="text-xs opacity-70 block mt-1">
                    {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <div className="p-4 border-t">
        <form 
          className="flex space-x-2"
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
        >
          <Input
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Type your message..."
            className="flex-1"
            autoComplete="off"
          />
          <Button 
            type="submit" 
            size="icon"
            disabled={!messageText.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Chat;
