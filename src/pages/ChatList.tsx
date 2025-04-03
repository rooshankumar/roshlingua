import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MessageCircle, Loader2, Search, Plus, Trash2 } from 'lucide-react';
import { deleteConversation } from '@/services/chatService';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import classNames from 'classnames'; // Added import

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

  // Track online presence
  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel('online-users')
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const presenceData = Object.values(state).flat() as any[];
        setConversations(prev => prev.map(conv => ({
          ...conv,
          participant: {
            ...conv.participant,
            is_online: presenceData.some(p => p.user_id === conv.participant.id),
            last_seen: presenceData.find(p => p.user_id === conv.participant.id)?.last_seen
          }
        })));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            last_seen: new Date().toISOString()
          });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    const fetchConversations = async () => {
      try {
        // Fetch all unread messages for the current user
        const { data: unreadMessages, error: unreadError } = await supabase
          .from('messages')
          .select('conversation_id')
          .eq('recipient_id', user?.id)
          .is('is_read', false);

        if (unreadError) throw unreadError;

        // Implement client-side grouping to count unread messages per conversation
        const unreadCountsClientSide: { [key: string]: number } = unreadMessages?.reduce((acc, message) => {
          acc[message.conversation_id] = (acc[message.conversation_id] || 0) + 1;
          return acc;
        }, {}) || {};

        // Get all conversations where the current user is a participant
        const { data: conversationsData, error: participantsError } = await supabase
          .from('conversation_participants')
          .select(`
            conversation_id,
            conversation:conversations(
              id,
              created_at
            ),
            other_participant:users(
              id,
              email,
              full_name,
              avatar_url
            )
          `)
          .eq('user_id', user.id)
          .order('conversation_id', { ascending: false });

        if (participantsError) throw participantsError;

        const conversationPreviews = await Promise.all(
          conversationsData.map(async (conv) => {
            const conversationDetails = conv.conversation;
            const otherParticipant = conv.other_participant;

            if (!conversationDetails || !otherParticipant) return null;

            const { data: messages, error: messagesError } = await supabase
              .from('messages')
              .select('content, created_at')
              .eq('conversation_id', conversationDetails.id)
              .order('created_at', { ascending: false })
              .limit(1);

            if (messagesError) console.error("Error fetching last message:", messagesError);

            return {
              id: conversationDetails.id,
              participant: {
                id: otherParticipant.id,
                email: otherParticipant.email,
                full_name: otherParticipant.full_name,
                avatar_url: otherParticipant.avatar_url || '/placeholder.svg'
              },
              lastMessage: messages?.[0],
              unreadCount: unreadCountsClientSide[conversationDetails.id] || 0,
            };
          })
        );

        const validConversations = conversationPreviews.filter(conv => conv !== null) as ChatPreview[];

        const sortedConversations = validConversations.sort((a, b) => {
          const aTime = a?.lastMessage?.created_at
            ? new Date(a.lastMessage.created_at).getTime()
            : new Date(a.id || 0).getTime();
          const bTime = b?.lastMessage?.created_at
            ? new Date(b.lastMessage.created_at).getTime()
            : new Date(b.id || 0).getTime();
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