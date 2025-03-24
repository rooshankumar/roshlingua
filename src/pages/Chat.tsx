import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";

interface Message {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  conversation_id: string;
  sender?: {
    username: string;
    avatar_url: string;
  };
}

const Chat = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [chats, setChats] = useState<Message[]>([]);

  useEffect(() => {
    const fetchChats = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("messages")
          .select(`
            id,
            content,
            created_at,
            sender_id,
            conversation_id,
            sender:profiles(username, avatar_url)
          `)
          .eq("conversation_id", id)
          .order("created_at", { ascending: true });

        if (error) throw error;
        setChats(data || []);
      } catch (error) {
        console.error("Error fetching chats:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load chat messages"
        });
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchChats();

    // Set up realtime subscription
    const channel = supabase
      .channel(`chat:${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${id}`
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setChats((current) => [...current, payload.new as Message]);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [id, toast]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !user) return;

    try {
      setSending(true);
      const { error } = await supabase.from("messages").insert({
        content: message,
        conversation_id: id,
        sender_id: user.id
      });

      if (error) throw error;
      setMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send message"
      });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-4">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4 h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {chats.map((chat) => (
          <div
            key={chat.id}
            className={`flex ${
              chat.sender_id === user?.id ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[70%] rounded-lg p-3 ${
                chat.sender_id === user?.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              <p className="text-sm font-medium mb-1">
                {chat.sender?.username || "User"}
              </p>
              <p>{chat.content}</p>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSend} className="flex gap-2">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          disabled={sending}
        />
        <Button type="submit" disabled={sending || !message.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
};

export default Chat;