
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UnreadMessageCounts {
  [conversationId: string]: number;
}

export const useUnreadMessages = () => {
  const { user } = useAuth();
  const [unreadCounts, setUnreadCounts] = useState<UnreadMessageCounts>({});
  const [totalUnread, setTotalUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  // Fetch initial unread counts
  const fetchUnreadCounts = useCallback(async () => {
    if (!user) {
      setUnreadCounts({});
      setTotalUnread(0);
      setLoading(false);
      return;
    }

    try {
      // Get unread message counts grouped by conversation
      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          id,
          sender_id,
          receiver_id,
          is_read,
          created_at
        `)
        .eq('receiver_id', user.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by conversation (sender for received messages)
      const counts: UnreadMessageCounts = {};
      let total = 0;

      messages?.forEach(message => {
        const conversationId = message.sender_id;
        counts[conversationId] = (counts[conversationId] || 0) + 1;
        total++;
      });

      setUnreadCounts(counts);
      setTotalUnread(total);
      
      console.log('📊 Unread message counts updated:', { counts, total });
    } catch (error) {
      console.error('❌ Error fetching unread counts:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Mark messages as read for a specific conversation
  const markAsRead = useCallback(async (conversationId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('receiver_id', user.id)
        .eq('sender_id', conversationId)
        .eq('is_read', false);

      if (error) throw error;

      // Update local state
      setUnreadCounts(prev => {
        const newCounts = { ...prev };
        const countToReduce = newCounts[conversationId] || 0;
        delete newCounts[conversationId];
        
        setTotalUnread(prevTotal => Math.max(0, prevTotal - countToReduce));
        
        return newCounts;
      });

      console.log('✅ Messages marked as read for conversation:', conversationId);
    } catch (error) {
      console.error('❌ Error marking messages as read:', error);
    }
  }, [user]);

  // Set up real-time subscription for unread messages
  useEffect(() => {
    if (!user) {
      setChannel(null);
      return;
    }

    console.log('🔔 Setting up unread messages subscription for user:', user.id);

    const newChannel = supabase
      .channel('unread_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`
        },
        (payload) => {
          console.log('📨 New message received (unread tracker):', payload.new);
          
          const senderId = payload.new.sender_id;
          
          setUnreadCounts(prev => ({
            ...prev,
            [senderId]: (prev[senderId] || 0) + 1
          }));
          
          setTotalUnread(prev => prev + 1);

          // Show browser notification if permission granted
          if ('Notification' in window && Notification.permission === 'granted') {
            // Fetch sender info for notification
            supabase
              .from('profiles')
              .select('full_name, avatar_url')
              .eq('id', senderId)
              .single()
              .then(({ data: sender }) => {
                if (sender) {
                  new Notification(`New message from ${sender.full_name}`, {
                    body: payload.new.content?.substring(0, 50) + '...',
                    icon: sender.avatar_url || '/icons/chat-icon.png',
                    tag: `message-${senderId}`,
                    requireInteraction: false
                  });
                }
              });
          }

          // Play notification sound
          try {
            const audio = new Audio('/notification.mp3');
            audio.volume = 0.2;
            audio.play().catch(() => {}); // Silent fail if audio can't play
          } catch (e) {
            // Silent fail
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`
        },
        (payload) => {
          // Handle message read status updates
          if (payload.new.is_read && !payload.old.is_read) {
            console.log('📖 Message marked as read:', payload.new.id);
            
            const senderId = payload.new.sender_id;
            
            setUnreadCounts(prev => {
              const newCounts = { ...prev };
              if (newCounts[senderId] > 0) {
                newCounts[senderId]--;
                if (newCounts[senderId] === 0) {
                  delete newCounts[senderId];
                }
              }
              return newCounts;
            });
            
            setTotalUnread(prev => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe((status) => {
        console.log('🔔 Unread messages subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Unread messages real-time connected');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Unread messages subscription error');
          // Retry after delay
          setTimeout(() => {
            fetchUnreadCounts();
          }, 3000);
        }
      });

    setChannel(newChannel);

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up unread messages subscription');
      newChannel.unsubscribe();
    };
  }, [user, fetchUnreadCounts]);

  // Initial fetch
  useEffect(() => {
    fetchUnreadCounts();
  }, [fetchUnreadCounts]);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('🔔 Notification permission:', permission);
      });
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [channel]);

  return {
    unreadCounts,
    totalUnread,
    loading,
    markAsRead,
    refresh: fetchUnreadCounts
  };
};
