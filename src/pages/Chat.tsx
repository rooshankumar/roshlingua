
import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, User } from "lucide-react";

export default function Chat() {
  const { conversationId } = useParams();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [otherUser, setOtherUser] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!conversationId || !user) return;

    const fetchMessages = async () => {
      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id (
            id,
            username,
            avatar_url,
            native_language,
            learning_language,
            streak_count
          )
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      // Get other participant's info
      const { data: participants } = await supabase
        .from('conversation_participants')
        .select(`
          profiles:user_id (
            id,
            username,
            avatar_url,
            native_language,
            learning_language,
            streak_count
          )
        `)
        .eq('conversation_id', conversationId);

      const otherParticipant = participants?.find(p => p.profiles.id !== user.id);
      setOtherUser(otherParticipant?.profiles);
      setMessages(messages || []);
      setLoading(false);
      scrollToBottom();
    };

    fetchMessages();

    // Subscribe to new messages
    const subscription = supabase
      .channel(`chat:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, payload => {
        setMessages(current => [...current, payload.new]);
        scrollToBottom();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [conversationId, user]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const message = {
      conversation_id: conversationId,
      sender_id: user.id,
      content: newMessage.trim()
    };

    const { error } = await supabase
      .from('messages')
      .insert(message);

    if (error) {
      console.error('Error sending message:', error);
      return;
    }

    setNewMessage('');
  };

  return (
    <div className="flex flex-col h-screen max-h-screen overflow-hidden">
      {/* Chat Header */}
      <div className="flex items-center gap-4 p-4 border-b">
        <Link to="/chat" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        {otherUser && (
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={otherUser.avatar_url} />
              <AvatarFallback><User /></AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-medium">{otherUser.username}</h3>
              <p className="text-sm text-muted-foreground">
                Native: {otherUser.native_language} • Learning: {otherUser.learning_language}
                {otherUser.streak_count > 0 && ` • ${otherUser.streak_count} day streak`}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] break-words rounded-lg p-3 ${
                message.sender_id === user.id
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

      {/* Message Input */}
      <form onSubmit={sendMessage} className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
          />
          <Button type="submit" disabled={!newMessage.trim()}>
            Send
          </Button>
        </div>
      </form>
    </div>
  );
}
