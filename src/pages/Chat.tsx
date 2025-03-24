import { useState, useEffect, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";

const Chat = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const { data, error } = await supabase
          .from('chats')
          .select(`
            id,
            sender_id,
            receiver_id,
            message,
            created_at,
            profiles!sender_id(username, avatar_url)
          `)
          .or(`sender_id.eq.${user?.id},receiver_id.eq.${user?.id}`)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setChats(data || []);
      } catch (error) {
        console.error('Error fetching chats:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load chat messages"
        });
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchChats();
      // Subscribe to new chat messages
      const channel = supabase
        .channel('chats')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'chats',
          filter: `sender_id=eq.${user.id},receiver_id=eq.${user.id}`,
        }, payload => {
          setChats(current => [...current, payload.new]);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, id]);

  const sendMessage = async () => {
    if (!message.trim() || !user) return;

    try {
      const { error } = await supabase
        .from('chats')
        .insert({
          sender_id: user.id,
          receiver_id: id,
          message: message.trim()
        });

      if (error) throw error;
      setMessage("");
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send message"
      });
    }
  };

  if (loading) {
    return (
      <div className="container flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spinner"></div>
          <p className="mt-4 text-muted-foreground">Loading chats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container h-full max-h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex justify-between items-center p-4 border-b">
        <Button asChild variant="ghost" size="sm">
          <Link to="/community">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chats.map((chat) => (
          <div
            key={chat.id}
            className={`flex ${chat.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex items-start space-x-2 max-w-[70%] ${
              chat.sender_id === user?.id ? 'flex-row-reverse' : 'flex-row'
            }`}>
              <Avatar className="h-8 w-8">
                <AvatarImage src={chat.profiles?.avatar_url || "/placeholder.svg"} />
                <AvatarFallback>
                  {chat.profiles?.username?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className={`rounded-lg p-3 ${
                chat.sender_id === user?.id 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted'
              }`}>
                <p className="text-sm">{chat.message}</p>
                <span className="text-xs opacity-70">
                  {new Date(chat.created_at).toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t">
        <form 
          className="flex space-x-2"
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
        >
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1"
          />
          <Button type="submit" size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Chat;