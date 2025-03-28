import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { Message, Conversation, ConversationParticipant } from '@/types/chat';
import { ChatScreen } from '@/components/chat/ChatScreen';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { UserStatus } from '@/components/UserStatus';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';


export default function Chat() {
  const { id: conversationId } = useParams();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [participants, setParticipants] = useState<ConversationParticipant[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || !conversationId) {
      return;
    }

    // Fetch conversation details
    const fetchConversation = async () => {
      const { data: conversationData, error: conversationError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (conversationError) {
        console.error('Error fetching conversation:', conversationError);
        return;
      }

      setConversation(conversationData);
    };

    // Fetch participants
    const fetchParticipants = async () => {
      const { data: participantsData, error: participantsError } = await supabase
        .from('conversation_participants')
        .select(`
          *,
          user:users(*)
        `)
        .eq('conversation_id', conversationId);

      if (participantsError) {
        console.error('Error fetching participants:', participantsError);
        return;
      }

      setParticipants(participantsData);
    };

    // Fetch messages
    const fetchMessages = async () => {
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (messagesError) {
        console.error('Error fetching messages:', messagesError);
        return;
      }

      setMessages(messagesData);
    };

    fetchConversation();
    fetchParticipants();
    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          setMessages(current => [...current, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [conversationId, user]);

  const handleSendMessage = async (content: string) => {
    if (!user || !conversationId || !content.trim()) {
      return;
    }

    const newMessage = {
      conversation_id: conversationId,
      sender_id: user.id,
      content: content.trim(),
      is_read: false
    };

    const { error } = await supabase
      .from('messages')
      .insert(newMessage);

    if (error) {
      console.error('Error sending message:', error);
    }
  };

  if (!user || !conversationId || !conversation) {
    return <div>Loading...</div>;
  }

  const otherParticipant = participants.find(
    (p) => p.user_id !== user.id
  );

  if (!otherParticipant) {
    return <div>Participant not found</div>;
  }

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
              <AvatarImage src={otherParticipant.user.avatar_url} />
              <AvatarFallback>{otherParticipant.user.username?.[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="font-semibold">{otherParticipant.user.username}</div>
              <UserStatus user={otherParticipant.user} />
            </div>
          </div>
        </div>
      </div>
      <ChatScreen
        conversationId={conversationId}
        recipient={otherParticipant.user}
        currentUserId={user.id}
        messages={messages}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
}