import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserStatus } from '@/components/UserStatus';
import { MessageCircle } from 'lucide-react';

export default function ChatList() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchConversations = async () => {
      try {
        const { data, error } = await supabase
          .from('conversation_participants')
          .select(`
            conversation_id,
            conversations:conversation_id (
              id,
              created_at,
              participants:conversation_participants!inner (
                profiles:user_id (
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
          setConversations([]);
        } else {
          setConversations(data?.map(c => c.conversations) || []);
        }
      } catch (error) {
        console.error('Error in fetchConversations:', error);
        setConversations([]);
      } finally {
        setLoading(false);
      }
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

  const renderContent = () => {
    if (loading) {
      return <div className="text-center py-8">Loading conversations...</div>;
    }

    if (!conversations || conversations.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <MessageCircle className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">Welcome! Start Your First Chat</h3>
          <p className="text-muted-foreground mb-6">Connect with other language learners</p>
          <Button asChild>
            <Link to="/community">Find Language Partners</Link>
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {conversations.map((conversation) => (
          <Link
            key={conversation.id}
            to={`/chat/${conversation.id}`}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors"
          >
            <Avatar>
              <AvatarImage
                src={conversation.participants[0]?.profiles?.avatar_url}
              />
              <AvatarFallback>
                {conversation.participants[0]?.profiles?.username?.[0]?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-medium">
                {conversation.participants[0]?.profiles?.username || 'Unknown User'}
              </h3>
              <UserStatus
                isOnline={conversation.participants[0]?.profiles?.is_online}
                lastSeen={conversation.participants[0]?.profiles?.last_seen}
              />
            </div>
          </Link>
        ))}
      </div>
    );
  };

  return (
    <div className="container max-w-2xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Your Conversations</h1>
        <Button asChild>
          <Link to="/community">Start New Chat</Link>
        </Button>
      </div>
      {renderContent()}
    </div>
  );
}
