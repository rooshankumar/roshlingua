
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MessageCircle, Loader2, Search, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import classNames from 'classnames';

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
  unreadCount?: number;
}

const ChatList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<ChatPreview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    const fetchConversations = async () => {
      try {
        // Fetch all unread messages for the current user
        const { data: unreadMessages, error: unreadError } = await supabase
          .from('conversation_participants')
          .select('conversation_id, unread_count')
          .eq('user_id', user?.id);

        if (unreadError) throw unreadError;

        const unreadCountsClientSide: { [key: string]: number } = unreadMessages?.reduce((acc, message) => {
          acc[message.conversation_id] = (acc[message.conversation_id] || 0) + 1;
          return acc;
        }, {}) || {};

        // Get all conversations where the current user is a participant
        const { data: conversationsData, error: participantsError } = await supabase
          .from('conversation_participants')
          .select(`
            conversation_id,
            conversations!inner(
              id,
              created_at
            ),
            other_users:users!conversation_participants_user_id_fkey(
              id,
              email,
              full_name,
              avatar_url,
              last_seen,
              is_online,
              native_language,
              learning_language,
              proficiency_level,
              bio,
              streak_count
            )
          `)
          .eq('user_id', user.id);

        if (participantsError) throw participantsError;

        // Get other participants for each conversation
        const otherParticipants = await Promise.all(
          conversationsData.map(async (conv) => {
            const { data: otherParticipant } = await supabase
              .from('conversation_participants')
              .select(`
                users!conversation_participants_user_id_fkey (
                  id,
                  email,
                  full_name,
                  avatar_url,
                  last_seen
                )
              `)
              .eq('conversation_id', conv.conversation_id)
              .neq('user_id', user.id)
              .single();

            const { data: lastMessage } = await supabase
              .from('messages')
              .select('content, created_at')
              .eq('conversation_id', conv.conversation_id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            return {
              id: conv.conversation_id,
              participant: {
                id: otherParticipant?.users?.id || '',
                email: otherParticipant?.users?.email || '',
                full_name: otherParticipant?.users?.full_name || 'Unknown User',
                avatar_url: otherParticipant?.users?.avatar_url || '/placeholder.svg',
                last_seen: otherParticipant?.users?.last_seen
              },
              lastMessage,
              unreadCount: unreadCountsClientSide[conv.conversation_id] || 0
            };
          })
        );

        const validConversations = otherParticipants.filter(conv => conv.participant.id !== '') as ChatPreview[];

        const sortedConversations = validConversations.sort((a, b) => {
          const aTime = a?.lastMessage?.created_at
            ? new Date(a.lastMessage.created_at).getTime()
            : 0;
          const bTime = b?.lastMessage?.created_at
            ? new Date(b.lastMessage.created_at).getTime()
            : 0;
          return bTime - aTime;
        });

        setConversations(sortedConversations);

        // Subscribe to real-time updates for all participants
        const participantIds = sortedConversations.map(conv => conv.participant.id);
        const channel = supabase
          .channel(`public:users:${participantIds.join(',')}`)
          .on('postgres_changes', 
            {
              event: '*',
              schema: 'public',
              table: 'users',
              filter: `id=in.(${participantIds.join(',')})`
            }, 
            (payload) => {
              setConversations(prevConvs => 
                prevConvs.map(conv => 
                  conv.participant.id === payload.new.id 
                    ? {
                        ...conv,
                        participant: {
                          ...conv.participant,
                          ...payload.new
                        }
                      }
                    : conv
                )
              );
            }
          )
          .subscribe();

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
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const filteredConversations = conversations.filter(conv =>
    conv.participant.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container max-w-4xl mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-foreground bg-clip-text text-transparent">Messages</h1>
          <p className="text-muted-foreground mt-1">Stay connected with your language partners</p>
        </div>
        <Button asChild>
          <Link to="/community" className="gap-2">
            <Plus className="w-4 h-4" />
            New Chat
          </Link>
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search conversations..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {filteredConversations.length === 0 && !searchQuery && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <MessageCircle className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-medium">No conversations yet</h3>
            <p className="text-muted-foreground mt-2 max-w-sm">
              Start chatting with people from the community to practice your language skills
            </p>
            <Button asChild className="mt-6" variant="outline">
              <Link to="/community">Browse Community</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {filteredConversations.length > 0 && (
        <div className="grid gap-3">
          {filteredConversations.map((conversation) => (
            <Link
              key={conversation.id}
              to={`/chat/${conversation.id}`}
              className="block"
            >
              <Card className="hover:bg-muted/50 transition-all duration-200 hover:scale-[1.01] hover:shadow-lg">
                <CardContent className="flex items-center p-4">
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={conversation.participant?.avatar_url || '/placeholder.svg'} />
                      <AvatarFallback>
                        {conversation.participant?.full_name?.substring(0, 2).toUpperCase() || 'AB'}
                      </AvatarFallback>
                    </Avatar>
                    {conversation.unreadCount > 0 && (
                      <div className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full min-w-[20px] h-5 flex items-center justify-center text-xs font-medium px-1">
                        {conversation.unreadCount}
                      </div>
                    )}
                    <span className={classNames(
                      "absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-background",
                      conversation.participant?.is_online ? "bg-green-500" : "bg-gray-400"
                    )} />
                  </div>
                  <div className="ml-4 flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{conversation.participant?.full_name || 'Unknown User'}</h3>
                      {conversation.lastMessage && (
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(conversation.lastMessage.created_at), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                    {conversation.lastMessage && (
                      <p className="text-sm text-muted-foreground truncate mt-1">
                        {conversation.lastMessage.content}
                      </p>
                    )}
                    {conversation.participant?.last_seen && !conversation.participant?.is_online && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Last seen {formatDistanceToNow(new Date(conversation.participant.last_seen))} ago
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
