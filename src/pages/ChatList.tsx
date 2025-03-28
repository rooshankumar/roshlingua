
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserStatus } from '@/components/UserStatus';

export default function ChatList() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchConversations = async () => {
      const { data, error } = await supabase
        .from('conversation_participants')
        .select(`
          conversation_id,
          conversations:conversation_id (
            id,
            created_at,
            participants:conversation_participants!inner (
              profile:user_id (
                id,
                username,
                avatar_url,
                is_online,
                last_seen
              )
            )
          )
        `)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching conversations:', error);
        return;
      }

      setConversations(data?.map(c => c.conversations) || []);
      setLoading(false);
    };

    // Subscribe to new conversations
    const channel = supabase
      .channel('conversation_updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversation_participants',
        filter: `user_id=eq.${user.id}`
      }, () => {
        fetchConversations();
      })
      .subscribe();

    fetchConversations();

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  if (loading) {
    return (
      <div className="container max-w-2xl mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Your Conversations</h1>
          <Button asChild>
            <Link to="/community">Start New Chat</Link>
          </Button>
        </div>
        <div className="text-center py-8">Loading conversations...</div>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Your Conversations</h1>
        <Button asChild>
          <Link to="/community">Start New Chat</Link>
        </Button>
      </div>

      <div className="space-y-2">
        {conversations.length > 0 ? (
          conversations.map((conversation) => {
            const otherParticipants = conversation.participants
              .filter(p => p.profiles.id !== user?.id)
              .map(p => p.profiles);

            return (
              <Link
                key={conversation.id}
                to={`/chat/${conversation.id}`}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors"
              >
                <Avatar>
                  <AvatarImage src={otherParticipants[0]?.avatar_url} />
                  <AvatarFallback>
                    {otherParticipants[0]?.username?.[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-medium">
                    {otherParticipants[0]?.username || 'Unknown User'}
                  </h3>
                  <UserStatus
                    isOnline={otherParticipants[0]?.is_online}
                    lastSeen={otherParticipants[0]?.last_seen}
                  />
                </div>
              </Link>
            );
          })
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <MessageCircle className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No conversations yet</h3>
            <p className="text-muted-foreground mb-6">Start chatting with other language learners</p>
            <Button asChild>
              <Link to="/community">
                <Users className="h-4 w-4 mr-2" />
                Find Users
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
