
import { useState, useEffect } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { Loader2 } from "lucide-react";
import { fetchConversations, subscribeToConversations } from "@/services/chatService";
import { Conversation } from "@/types/chat";
import { ChatScreen } from "@/components/chat/ChatScreen";

const ChatPage = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const loadConversations = async () => {
      try {
        const convs = await fetchConversations(user.id);
        setConversations(convs);
        if (convs.length > 0) {
          setActiveConversation(convs[0]);
        }
      } catch (error) {
        console.error('Error loading conversations:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadConversations();

    // Subscribe to conversation updates
    const unsubscribe = subscribeToConversations(user.id, loadConversations);

    return () => {
      unsubscribe();
    };
  }, [user]);

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p>Please log in to access chat</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex">
      {/* Conversations List */}
      <div className="w-80 border-r bg-muted/30">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Conversations</h2>
        </div>
        <div className="overflow-y-auto">
          {conversations.map((conv) => {
            const partner = conv.participants.find(p => p.id !== user.id);
            if (!partner) return null;
            return (
              <button
                key={conv.id}
                onClick={() => setActiveConversation(conv)}
                className={`w-full p-4 text-left hover:bg-muted/50 ${
                  activeConversation?.id === conv.id ? 'bg-muted' : ''
                }`}
              >
                <div className="font-medium">{partner.name}</div>
                <div className="text-sm text-muted-foreground truncate">
                  {conv.lastMessage?.content || 'No messages yet'}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Chat */}
      <div className="flex-1">
        {activeConversation ? (
          <ChatScreen conversation={activeConversation} />
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            Select a conversation to start chatting
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
