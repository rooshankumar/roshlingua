import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
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
import { MoreVertical, Ban, Flag, Send, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

export default function Chat() {
  const { id: conversationId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [otherUser, setOtherUser] = useState<any>(null);

  useEffect(() => {
    const fetchConversationDetails = async () => {
      if (!conversationId || !user) return;

      try {
        // Fetch conversation participants including the other user's profile
        const { data: participants, error } = await supabase
          .from('conversation_participants')
          .select(`
            conversation_id,
            user_id,
            users!user_id (
              id,
              username,
              avatar_url,
              is_online,
              last_seen
            )
          `)
          .eq('conversation_id', conversationId);

        if (error) {
          console.error('Error fetching conversation participants:', error);
          return;
        }

        const otherParticipant = participants?.find(
          (p) => p.user_id !== user.id
        );

        if (otherParticipant) {
          setOtherUser(otherParticipant.users);
        } else {
          console.error('No other participants found in this conversation');
        }

        // Fetch messages
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });

        if (messagesError) throw messagesError;
        setMessages(messagesData || []);

        // Mark messages as read
        if (user) {
          await supabase
            .from('messages')
            .update({ is_read: true })
            .eq('conversation_id', conversationId)
            .eq('recipient_id', user.id)
            .eq('is_read', false);
        }
      } catch (error) {
        console.error('Error fetching conversation:', error);
      }
    };

    fetchConversationDetails();

    // Subscribe to new messages
    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
        // Mark message as read if recipient is current user
        const { data: { user } } = supabase.auth.getUser();
        if (user && payload.new.recipient_id === user.id) {
          supabase
            .from('messages')
            .update({ is_read: true })
            .eq('id', payload.new.id);
        }
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [conversationId, user?.id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !otherUser) return;

      // Update conversation last_message_at
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);

      // Send message
      const { error } = await supabase
        .from('messages')
        .insert({ 
          content: message.trim(), 
          conversation_id: conversationId,
          sender_id: user.id,
          recipient_id: otherUser.id,
          is_read: false
        });

      if (error) {
        console.error('Error sending message:', error);
        throw error;
      }
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
    toast({
      title: "User Blocked",
      description: "You have blocked this user",
    });
  };

  const handleReportUser = async () => {
    toast({
      title: "User Reported",
      description: "Thank you for your report",
    });
  };

  return (
    <div className="container max-w-4xl mx-auto p-4 h-[calc(100vh-4rem)] flex flex-col">
      <div className="border-b pb-4">
        <div className="flex items-center">
          <Link to="/chat">
            <Button variant="ghost" size="icon" className="mr-2">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-3 flex-1">
            <Avatar className="h-10 w-10">
              <AvatarImage src={otherUser?.avatar_url} />
              <AvatarFallback>{otherUser?.username?.[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="font-semibold">{otherUser?.username}</div>
              <UserStatus user={otherUser} />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleBlockUser}>
                  <Ban className="h-4 w-4 mr-2" />
                  Block User
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleReportUser}>
                  <Flag className="h-4 w-4 mr-2" />
                  Report User
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] px-4 py-2 rounded-lg ${
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

      <form onSubmit={handleSendMessage} className="border-t pt-4">
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
          />
          <Button type="submit">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
