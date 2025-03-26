
import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, User, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { RealtimeChannel } from "@supabase/supabase-js";
import { Message } from "@/types/schema";
import UserAvatar from "@/components/UserAvatar";

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

const ConversationsList = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    const fetchConversations = async () => {
      try {
        setLoading(true);
        
        // Get all conversation IDs the user is part of
        const { data: participantData, error: participantError } = await supabase
          .from("conversation_participants")
          .select("conversation_id")
          .eq("user_id", user.id);

        if (participantError) {
          console.error("Error fetching conversations:", participantError);
          throw participantError;
        }

        if (!participantData || participantData.length === 0) {
          setLoading(false);
          setConversations([]);
          return;
        }

        const conversationIds = participantData.map(p => p.conversation_id);
        
        // Get conversation details
        const { data: conversationsData, error: conversationsError } = await supabase
          .from("conversations")
          .select("id, created_at, updated_at")
          .in("id", conversationIds)
          .order("updated_at", { ascending: false });
          
        if (conversationsError) {
          console.error("Error fetching conversation details:", conversationsError);
          throw conversationsError;
        }
        
        // Get participants and last message for each conversation
        const conversationsWithDetails = await Promise.all(
          conversationsData.map(async (conversation) => {
            // Get other participants
            const { data: otherParticipants, error: participantsError } = await supabase
              .from("conversation_participants")
              .select("user_id")
              .eq("conversation_id", conversation.id)
              .neq("user_id", user.id);
              
            if (participantsError) {
              console.error(`Error fetching participants for conversation ${conversation.id}:`, participantsError);
              return null;
            }
            
            if (!otherParticipants || otherParticipants.length === 0) {
              return null; // Skip conversations with no other participants
            }
            
            // Get profiles for other participants
            const otherUserIds = otherParticipants.map(p => p.user_id);
            
            const { data: profiles, error: profilesError } = await supabase
              .from("profiles")
              .select("id, username, avatar_url, is_online")
              .in("id", otherUserIds);
              
            if (profilesError) {
              console.error("Error fetching participant profiles:", profilesError);
              return null;
            }
            
            // Get the last message
            const { data: lastMessage, error: messageError } = await supabase
              .from("messages")
              .select("id, content, created_at, sender_id")
              .eq("conversation_id", conversation.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();
              
            if (messageError && messageError.code !== 'PGRST116') {
              console.error("Error fetching last message:", messageError);
            }

            return {
              ...conversation,
              participants: profiles || [],
              last_message: lastMessage || null
            };
          })
        );
        
        // Filter out null values (conversations that failed to load)
        const validConversations = conversationsWithDetails.filter(Boolean);
        setConversations(validConversations);
        setLoading(false);
      } catch (error) {
        console.error("Error in fetchConversations:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load your conversations. Please try again later.",
        });
        setLoading(false);
      }
    };

    fetchConversations();
    
    // Set up realtime subscription for new messages
    const channel = supabase
      .channel('public:messages')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages'
      }, (payload) => {
        fetchConversations();
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="text-center py-10">
        <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">No conversations yet</h3>
        <p className="text-muted-foreground mb-6">
          Start a chat with someone from the community page
        </p>
        <Button asChild variant="outline">
          <Link to="/community">Browse Community</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {conversations.map((conversation) => {
        const otherUser = conversation.participants[0];
        
        if (!otherUser) return null;
        
        return (
          <Card 
            key={conversation.id} 
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => navigate(`/chat/${otherUser.id}`)}
          >
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                <UserAvatar 
                  src={otherUser.avatar_url} 
                  fallback={otherUser.username} 
                  status={otherUser.is_online ? "online" : "offline"} 
                />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium truncate">{otherUser.username}</h4>
                    {conversation.last_message && (
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(conversation.last_message.created_at), 'MMM d, h:mm a')}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {conversation.last_message ? conversation.last_message.content : "No messages yet"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

const ChatConversation = ({ otherUserId }: { otherUserId: string }) => {
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
          .maybeSingle();

        if (recipientError) {
          console.error("Error fetching recipient profile:", recipientError);
          // If profile doesn't exist, create it
          if (recipientError.code === 'PGRST116') {
            console.log("Profile doesn't exist, creating one for:", otherUserId);
            const { error: createError } = await supabase
              .from("profiles")
              .insert({ id: otherUserId });
              
            if (createError) {
              console.error("Error creating profile:", createError);
              toast({
                variant: "destructive",
                title: "Error",
                description: "Could not find the user you're trying to chat with.",
              });
              navigate("/community");
              return;
            }
            
            // Try to fetch again
            const { data: newRecipientData, error: newError } = await supabase
              .from("profiles")
              .select("id, username, avatar_url, is_online")
              .eq("id", otherUserId)
              .maybeSingle();
              
            if (newError || !newRecipientData) {
              console.error("Error fetching new recipient profile:", newError);
              toast({
                variant: "destructive",
                title: "Error",
                description: "Could not find the user you're trying to chat with.",
              });
              navigate("/community");
              return;
            }
            
            setRecipient(newRecipientData);
          } else {
            toast({
              variant: "destructive",
              title: "Error",
              description: "Could not find the user you're trying to chat with.",
            });
            navigate("/community");
            return;
          }
        } else if (recipientData) {
          setRecipient(recipientData);
        } else {
          // No error but no data either
          toast({
            variant: "destructive",
            title: "Error",
            description: "Could not find the user you're trying to chat with.",
          });
          navigate("/community");
          return;
        }

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

        // Get the current user's profile
        const { data: currentUserProfile, error: profileError } = await supabase
          .from("profiles")
          .select("id, username, avatar_url, is_online")
          .eq("id", user.id)
          .maybeSingle();
          
        if (profileError) {
          console.error("Error fetching current user profile:", profileError);
        }

        setConversation({
          id: newConversation.id,
          created_at: newConversation.created_at,
          participants: [
            currentUserProfile || {
              id: user.id,
              username: 'You',
              avatar_url: null,
              is_online: true
            },
            recipient || {
              id: otherUserId,
              username: 'Chat Partner',
              avatar_url: null,
              is_online: false
            }
          ]
        });

        // Set up realtime subscription for the new conversation
        setupRealtimeSubscription(newConversation.id);
        setLoading(false);

      } catch (error) {
        console.error("Error setting up conversation:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to set up the conversation. Please try again.",
        });
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
          is_read,
          conversation_id
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
      }) as Message[];

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
      setLoading(false);
    } catch (error) {
      console.error("Error in fetchMessages:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load messages. Please try refreshing.",
      });
      setLoading(false);
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
          .maybeSingle();
          
        if (profileError) {
          console.error("Error fetching sender profile:", profileError);
          return;
        }
        
        // Add the new message to the state
        const newMessageData: Message = {
          id: payload.new.id,
          conversation_id: payload.new.conversation_id,
          sender_id: payload.new.sender_id,
          content: payload.new.content,
          created_at: payload.new.created_at,
          is_read: payload.new.is_read,
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
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-muted-foreground">Setting up your conversation...</p>
        </div>
      </div>
    );
  }

  if (!recipient) {
    return (
      <div className="py-12 text-center">
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
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Chat Header */}
      <div className="flex items-center space-x-4 pb-4">
        <Button size="icon" variant="ghost" asChild>
          <Link to="/chat">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        
        <div className="flex items-center flex-1">
          <UserAvatar 
            src={recipient.avatar_url} 
            fallback={recipient.username} 
            size="md"
            status={recipient.is_online ? "online" : "offline"}
            className="mr-3"
          />
          
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

const Chat = () => {
  const { id: otherUserId } = useParams<{ id: string }>();
  
  return (
    <div className="container py-4">
      {otherUserId ? (
        <ChatConversation otherUserId={otherUserId} />
      ) : (
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">Messages</h1>
          <ConversationsList />
        </div>
      )}
    </div>
  );
};

export default Chat;
