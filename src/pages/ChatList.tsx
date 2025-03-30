import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserStatus } from '@/components/UserStatus';
import { MessageCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';

interface ChatPreview {
  id: string;
  participant: {
    id: string;
    email: string;
    full_name: string;
    avatar_url: string;
    is_online?: boolean;
    last_seen?: string;
  };
  lastMessage?: {
    content: string;
    created_at: string;
  };
}

const ChatList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<ChatPreview[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    const fetchConversations = async () => {
      try {
        const { data: participantsData, error: participantsError } = await supabase
          .from('conversation_participants')
          .select(`
            conversation_id,
            conversations:conversation_id (
              id,
              title,
              created_at
            ),
            users:user_id (
              id,
              email,
              full_name,
              avatar_url
            )
          `)
          .neq('user_id', user.id);

        if (participantsError) throw participantsError;

        const conversationPreviews = await Promise.all(
          participantsData.map(async (participant) => {
            const { data: otherParticipant, error: otherParticipantError } = await supabase
              .from('conversation_participants')
              .select(`
                users:user_id (
                  id,
                  email,
                  full_name,
                  avatar_url
                )
              `)
              .eq('conversation_id', participant.conversation_id)
              .neq('user_id', user.id)
              .single();

            if (otherParticipantError) {
              console.error('Error fetching other participant:', otherParticipantError);
              return null;
            }

            const { data: messages } = await supabase
              .from('messages')
              .select('content, created_at')
              .eq('conversation_id', participant.conversation_id)
              .order('created_at', { ascending: false })
              .limit(1);

            const participantUser = otherParticipant?.users;
            return participantUser ? {
              id: participant.conversation_id,
              participant: {
                id: participantUser.id,
                email: participantUser.email,
                full_name: participantUser.full_name || participantUser.email?.split('@')[0],
                avatar_url: participantUser.avatar_url || '/placeholder.svg'
              },
              lastMessage: messages?.[0]
            } : null;
          })
        );

        setConversations(conversationPreviews);
      } catch (error) {
        console.error('Error fetching conversations:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConversations();

    return () => {
      setConversations([]);
      setIsLoading(true);
    };
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container max-w-3xl mx-auto py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Messages</h1>
        <Button asChild variant="outline">
          <Link to="/community">Find People</Link>
        </Button>
      </div>

      {conversations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <MessageCircle className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No conversations yet</h3>
            <p className="text-muted-foreground mt-2">
              Start chatting with people from the community
            </p>
            <Button asChild className="mt-4" variant="outline">
              <Link to="/community">Browse Community</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {conversations.map((conversation) => (
            <Link
              key={conversation.id}
              to={`/chat/${conversation.id}`}
              className="block"
            >
              <Card className="hover:bg-muted/50 transition-colors">
                <CardContent className="flex items-center p-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={conversation.participant.avatar_url} />
                    <AvatarFallback>
                      {conversation.participant.full_name?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="ml-4 flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{conversation.participant.full_name}</h3>
                      <UserStatus 
                        isOnline={conversation.participant.is_online} 
                        lastSeen={conversation.participant.last_seen} 
                      />
                    </div>
                    {conversation.lastMessage && (
                      <p className="text-sm text-muted-foreground truncate">
                        {conversation.lastMessage.content}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChatList;