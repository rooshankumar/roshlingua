import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, User } from "lucide-react"; // Added imports from original file
import { Link } from "react-router-dom"; // Added imports from original file

export default function Chat() {
  const { conversationId } = useParams();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!conversationId || !user) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id (
            id,
            username,
            avatar_url
          )
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      setMessages(data || []);
      setLoading(false);
      scrollToBottom();
    };

    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        fetchMessages();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [conversationId, user]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversationId) return;

    const { error } = await supabase
      .from('messages')
      .insert({
        content: newMessage.trim(),
        conversation_id: conversationId,
        sender_id: user?.id
      });

    if (error) {
      console.error('Error sending message:', error);
      return;
    }

    setNewMessage('');
  };

  if (loading) {
    return <div className="flex justify-center p-4">Loading messages...</div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex items-center justify-between p-4 border-b border-border"> {/* Added header from original */}
        <Button asChild variant="ghost" size="icon"> {/* Added back button from original */}
          <Link to="/chat/inbox">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div> {/* Placeholder for user info -  Original's complex structure omitted for simplicity */} </div>
      </div> {/* End of added header */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex items-start gap-2 ${
              message.sender.id === user?.id ? 'flex-row-reverse' : ''
            }`}
          >
            <Avatar>
              <AvatarImage src={message.sender.avatar_url} />
              <AvatarFallback>
                {message.sender.username?.[0]?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <div
              className={`rounded-lg p-3 max-w-[70%] ${
                message.sender.id === user?.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
          />
          <Button type="submit">Send</Button>
        </div>
      </form>
    </div>
  );
}