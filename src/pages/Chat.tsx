import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { RealtimeChannel } from "@supabase/supabase-js";
import { Message } from "@/types/schema";

interface Conversation {
  id: string;
  created_at: string;
  participants: {
    id: string;
    username: string;
    avatar_url: string | null;
    is_online: boolean;
  }[];
}

const Chat = () => {
  const { id: otherUserId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [recipient, setRecipient] = useState<{
    id: string;
    username: string;
    avatar_url: string | null;
    is_online: boolean;
  } | null>(null);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!user || !otherUserId) return;

    const fetchOrCreateConversation = async () => {
      try {
        setLoading(true);

        // First, get the recipient's profile
        const { data: recipientData, error: recipientError } = await supabase
          .from("profiles")
          .select("id, username, avatar_url, is_online")
          .eq("id", otherUserId)
          .single();

        if (recipientError) {
          console.error("Error fetching recipient profile:", recipientError);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Could not find the user you're trying to chat with.",
          });
          navigate("/community");
          return;
        }

        setRecipient(recipientData);

        // Check if conversation exists between these two users
        const { data: participantData, error: participantError } = await supabase
          .from("conversation_participants")
          .select("conversation_id")
          .eq("user_id", user.id);

        if (participantError) {
          console.error("Error checking for existing conversation:", participantError);
          throw participantError;
        }

        const conversationIds = participantData.map(p => p.conversation_id);

        if (conversationIds.length > 0) {
          const { data: otherParticipantsData, error: otherError } = await supabase
            .from("conversation_participants")
            .select("conversation_id")
            .eq("user_id", otherUserId)
            .in("conversation_id", conversationIds);

          if (otherError) {
            console.error("Error checking other participant:", otherError);
            throw otherError;
          }

          // If there's a match, we found an existing conversation
          if (otherParticipantsData.length > 0) {
            const existingConversationId = otherParticipantsData[0].conversation_id;
            
            // Fetch the conversation details
            const { data: convData, error: convError } = await supabase
              .from("conversations")
              .select("id, created_at")
              .eq("id", existingConversationId)
              .single();

            if (convError) {
              console.error("Error fetching conversation:", convError);
              throw convError;
            }

            // Get all participants
            const { data: allParticipants, error: partError } = await supabase
              .from("conversation_participants")
              .select("user_id")
              .eq("conversation_id", existingConversationId);

            if (partError) {
              console.error("Error fetching participants:", partError);
              throw partError;
            }

            // Get profiles for all participants
            const { data: profiles, error: profilesError } = await supabase
              .from("profiles")
              .select("id, username, avatar_url, is_online")
              .in("id", allParticipants.map(p => p.user_id));

            if (profilesError) {
              console.error("Error fetching participant profiles:", profilesError);
              throw profilesError;
            }

            setConversation({
              id: convData.id,
              created_at: convData.created_at,
              participants: profiles
            });

            // Fetch messages for this conversation
            fetchMessages(convData.id);
            setupRealtimeSubscription(convData.id);
            return;
          }
        }

        // No existing conversation found, create a new one
        const { data: newConversation, error: createError } = await supabase
          .from("conversations")
          .insert({})
          .select("id, created_at")
          .single();

        if (createError) {
          console.error("Error creating conversation:", createError);
          throw createError;
        }

        // Add both users as participants
        const { error: addParticipantsError } = await supabase
          .from("conversation_participants")
          .insert([
            { conversation_id: newConversation.id, user_id: user.id },
            { conversation_id: newConversation.id, user_id: otherUserId }
          ]);

        if (addParticipantsError) {
          console.error("Error adding participants:", addParticipantsError);
          throw addParticipantsError;
        }

        setConversation({
          id: newConversation.id,
          created_at: newConversation.created_at,
          participants: [
            {
              id: user.id,
              username: 'You', // Placeholder until we fetch current user's profile
              avatar_url: null,
              is_online: true
            },
            recipientData
          ]
        });

        // Set up realtime subscription for the new conversation
        setupRealtimeSubscription(newConversation.id);

      } catch (error) {
        console.error("Error setting up conversation:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to set up the conversation. Please try again.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchOrCreateConversation();

    return () => {
      // Clean up realtime subscription
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user, otherUserId, navigate, toast]);

  const fetchMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select(`
          id,
          content,
          created_at,
          sender_id,
          is_read
        `)
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching messages:", error);
        throw error;
      }

      // Get sender details for messages
      const senderIds = [...new Set(data.map(message => message.sender_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", senderIds);

      if (profilesError) {
        console.error("Error fetching sender profiles:", profilesError);
        throw profilesError;
      }

      // Map profiles to messages
      const messagesWithSenders = data.map(message => {
        const senderProfile = profiles.find(profile => profile.id === message.sender_id);
        return {
          ...message,
          sender: senderProfile ? {
            username: senderProfile.username || 'Unknown User',
            avatar_url: senderProfile.avatar_url
          } : {
            username: 'Unknown User',
            avatar_url: null
          }
        };
      });

      setMessages(messagesWithSenders);
      
      // Mark messages as read if they're from the other user
      const unreadMessages = data
        .filter(msg => msg.sender_id === otherUserId && !msg.is_read)
        .map(msg => msg.id);
        
      if (unreadMessages.length > 0) {
        await supabase
          .from("messages")
          .update({ is_read: true })
          .in("id", unreadMessages);
      }

      // Scroll to bottom
      scrollToBottom();
    } catch (error) {
      console.error("Error in fetchMessages:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load messages. Please try refreshing.",
      });
    }
  };

  const setupRealtimeSubscription = (conversationId: string) => {
    const newChannel = supabase
      .channel(`messages:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, async (payload) => {
        console.log('New message received:', payload);
        
        // Fetch the sender's profile
        const { data: senderProfile, error: profileError } = await supabase
          .from("profiles")
          .select("username, avatar_url")
          .eq("id", payload.new.sender_id)
          .single();
          
        if (profileError) {
          console.error("Error fetching sender profile:", profileError);
          return;
        }
        
        // Add the new message to the state
        const newMessageData: Message = {
          ...payload.new,
          sender: {
            username: senderProfile?.username || 'Unknown User',
            avatar_url: senderProfile?.avatar_url
          }
        };
        
        setMessages(prev => [...prev, newMessageData]);
        
        // If the message is from the other user, mark it as read
        if (payload.new.sender_id === otherUserId) {
          await supabase
            .from("messages")
            .update({ is_read: true })
            .eq("id", payload.new.id);
        }
        
        // Scroll to the bottom when a new message arrives
        scrollToBottom();
      })
      .subscribe();
      
    setChannel(newChannel);
  };

  const sendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || !conversation || !user) return;

    try {
      const { error } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversation.id,
          sender_id: user.id,
          content: newMessage.trim(),
          is_read: false
        });

      if (error) {
        console.error("Error sending message:", error);
        throw error;
      }

      // Clear the input field
      setNewMessage("");
    } catch (error) {
      console.error("Error in sendMessage:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send your message. Please try again.",
      });
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (loading) {
    return (
      <div className="container flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-muted-foreground">Setting up your conversation...</p>
        </div>
      </div>
    );
  }

  if (!recipient) {
    return (
      <div className="container py-12 text-center">
        <h2 className="text-2xl font-bold mb-2">User not found</h2>
        <p className="text-muted-foreground mb-6">
          We couldn't find the user you're trying to chat with.
        </p>
        <Button asChild>
          <Link to="/community">Back to Community</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-4 h-[calc(100vh-4rem)] flex flex-col">
      {/* Chat Header */}
      <div className="flex items-center space-x-4 pb-4">
        <Button size="icon" variant="ghost" asChild>
          <Link to="/community">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        
        <div className="flex items-center flex-1">
          <Avatar className="h-10 w-10 mr-3">
            <AvatarImage src={recipient.avatar_url || "/placeholder.svg"} alt={recipient.username} />
            <AvatarFallback><User className="h-5 w-5" /></AvatarFallback>
          </Avatar>
          
          <div>
            <h2 className="font-semibold">{recipient.username}</h2>
            <p className="text-xs text-muted-foreground flex items-center">
              <span className={`inline-block w-2 h-2 rounded-full mr-1 ${recipient.is_online ? 'bg-green-500' : 'bg-gray-400'}`}></span>
              {recipient.is_online ? 'Online' : 'Offline'}
            </p>
          </div>
        </div>
      </div>
      
      <Separator />
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto pb-4 pt-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No messages yet. Send a message to start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isCurrentUser = message.sender_id === user?.id;
            
            return (
              <div
                key={message.id}
                className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
              >
                <div className="flex items-end max-w-[70%]">
                  {!isCurrentUser && (
                    <Avatar className="h-8 w-8 mr-2 mb-1 flex-shrink-0">
                      <AvatarImage 
                        src={message.sender?.avatar_url || "/placeholder.svg"} 
                        alt={message.sender?.username || "User"} 
                      />
                      <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`px-4 py-2 rounded-lg ${
                      isCurrentUser
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p>{message.content}</p>
                    <p className={`text-xs mt-1 ${isCurrentUser ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                      {format(new Date(message.created_at), 'h:mm a')}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={endOfMessagesRef} />
      </div>
      
      {/* Message Input */}
      <Separator className="my-4" />
      <form onSubmit={sendMessage} className="flex items-center space-x-2">
        <Input
          placeholder="Type your message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="flex-1"
        />
        <Button 
          type="submit" 
          size="icon"
          disabled={!newMessage.trim()}
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
};

export default Chat;
