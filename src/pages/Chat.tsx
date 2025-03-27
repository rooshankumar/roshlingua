import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom'; // Added import for useNavigate
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { UserStatus } from '@/components/UserStatus';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Ban, Flag, Send, ArrowLeft } from 'lucide-react'; // Added ArrowLeft import
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

export default function Chat() {
  const { id: conversationId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate(); // Added useNavigate hook
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [otherUser, setOtherUser] = useState(null);

  useEffect(() => {
    const fetchConversationDetails = async () => {
      try {
        const { data: participants } = await supabase
          .from('conversation_participants')
          .select(`
            conversations (id),
            profiles:user_id (
              id,
              username,
              avatar_url,
              is_online,
              last_seen
            )
          `)
          .eq('conversation_id', conversationId);

        const otherParticipant = participants?.find(
          p => p.profiles.id !== user?.id
        );
        setOtherUser(otherParticipant?.profiles);

        // Fetch messages
        const { data: messages } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });

        setMessages(messages || []);
      } catch (error) {
        console.error('Error fetching conversation:', error);
      }
    };

    fetchConversationDetails();

    // Subscribe to new messages
    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, payload => {
        setMessages(prev => [...prev, payload.new]);
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [conversationId, user?.id]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user?.id,
          content: message,
        });

      if (error) throw error;
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send message",
      });
    }
  };

  const handleBlockUser = async () => {
    // Implement block user functionality
    toast({
      title: "User Blocked",
      description: "You have blocked this user",
    });
  };

  const handleReportUser = async () => {
    // Implement report user functionality
    toast({
      title: "User Reported",
      description: "Thank you for your report",
    });
  };

  const { id } = useParams();

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching user:', error);
        return;
      }

      setOtherUser(data);
    };

    if (id) {
      fetchUser();
    }
  }, [id]);


  return (
    <div className="container max-w-4xl mx-auto p-4 h-[calc(100vh-4rem)] flex flex-col">
      <div className="border-b p-4">
        <div className="flex items-center gap-4">
          <Link to="/chat">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-3 flex-1">
            <Avatar className="h-10 w-10">
              <AvatarImage src={otherUser?.avatar_url} />
              <AvatarFallback>{otherUser?.username?.[0]}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-semibold">{otherUser?.username}</div>
              <div className="text-sm text-muted-foreground">
                {otherUser?.is_online ? 'Online' : 'Offline'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-lg p-3 ${
                msg.sender_id === user?.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t flex gap-2">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1"
        />
        <Button type="submit">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}