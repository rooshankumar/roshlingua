import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
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
import { MoreVertical, Ban, Flag, Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

export default function Chat() {
  const { id: conversationId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
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

  return (
    <div className="container max-w-4xl mx-auto p-4 h-[calc(100vh-4rem)] flex flex-col">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={otherUser?.avatar_url} />
            <AvatarFallback>
              {otherUser?.username?.[0]?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-semibold">{otherUser?.username}</h2>
            <UserStatus
              isOnline={otherUser?.is_online}
              lastSeen={otherUser?.last_seen}
            />
          </div>
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