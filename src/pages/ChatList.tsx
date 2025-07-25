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
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { checkAllAchievements } from '@/utils/achievementTrigger';

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
  const { unreadCounts, refreshUnreadCounts } = useUnreadMessages(user?.id);

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    const fetchConversations = async () => {
      try {
        // Using the hook's functionality instead of duplicating the query
        refreshUnreadCounts();

        // Get unread messages with a safe query that doesn't use group by
        const { data: unreadMessagesData, error: messagesError } = await supabase
          .from('messages')
          .select('conversation_id')
          .eq('receiver_id', user.id)
          .eq('is_read', false);

        if (messagesError) throw messagesError;

        const unreadCountsClientSide: { [key: string]: number } = {};

        if (unreadMessagesData) {
          // Count occurrences of each conversation_id
          unreadMessagesData.forEach(item => {
            unreadCountsClientSide[item.conversation_id] = (unreadCountsClientSide[item.conversation_id] || 0) + 1;
          });
        }

        // Make sure to call refreshUnreadCounts to sync the hook state
        refreshUnreadCounts();

        // Get all conversations where the current user is a participant
        const { data: conversationsData, error: participantsError } = await supabase
          .from('conversation_participants')
          .select(`
            conversation_id,
            conversations!inner(
              id,
              created_at,
              messages(
                content,
                created_at,
                sender_id
              )
            ),
            other_users:profiles!conversation_participants_user_id_fkey(
              id,
              full_name,
              avatar_url,
              is_online
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (participantsError) throw participantsError;

        // Get other participants for each conversation
        const otherParticipants = await Promise.all(
          conversationsData.map(async (conv) => {
            const { data: otherParticipant } = await supabase
              .from('conversation_participants')
              .select(`
                user:profiles!conversation_participants_user_id_fkey (
                  id,
                  user_id,
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
                id: otherParticipant?.user?.id || '',
                email: otherParticipant?.user?.email || '',
                full_name: otherParticipant?.user?.full_name || 'Unknown User',
                avatar_url: otherParticipant?.user?.avatar_url || '/placeholder.svg',
                last_seen: otherParticipant?.user?.last_seen
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
      } catch (error) {
        console.error('Error fetching conversations:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConversations();
      // Check for social achievements when chat list loads
      checkAllAchievements(user.id);

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
        <div className="flex flex-col space-y-1 mb-6 hidden md:block">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-foreground bg-clip-text text-transparent">Messages</h1>
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
              <Card className={`hover:bg-muted/50 transition-all duration-200 hover:scale-[1.01] hover:shadow-lg ${(unreadCounts[conversation.id] ?? 0) > 0 ? 'border-destructive/30 new-message-highlight' : ''}`}>
                <CardContent className="flex items-center p-4">
                  <div className="relative">
                    <Avatar className="h-16 w-16">
                      <AvatarImage 
                        src={conversation.participant?.avatar_url || '/placeholder.svg'} 
                        onError={(e) => {
                          console.log('Avatar failed to load for:', conversation.participant?.full_name);
                          // Set a direct path to placeholder and prevent infinite error loop
                          if (e.currentTarget.src !== '/placeholder.svg') {
                            e.currentTarget.src = '/placeholder.svg';
                          }
                        }}
                      />
                      <AvatarFallback>
                        {conversation.participant?.full_name?.substring(0, 2).toUpperCase() || 'AB'}
                      </AvatarFallback>
                    </Avatar>
                    {(unreadCounts[conversation.id] ?? 0) > 0 && (
                      <div className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full min-w-[20px] h-5 flex items-center justify-center text-xs font-medium px-1 animate-pulse shadow-md border border-background">
                        {unreadCounts[conversation.id]}
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
                    {/* Last seen information removed */}
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