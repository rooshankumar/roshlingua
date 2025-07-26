
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
    if (!user?.id) {
      setUnreadCounts({});
      setTotalUnread(0);
      setLoading(false);
      return;
    }

    try {
      // Get unread message counts - using the correct column names based on your schema
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

      // Group by sender (for received messages)
      const counts: UnreadMessageCounts = {};
      let total = 0;

      messages?.forEach(message => {
        // Use sender_id as the conversation identifier for received messages
        const senderId = message.sender_id;
        counts[senderId] = (counts[senderId] || 0) + 1;
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
    if (!user?.id || !conversationId) return;

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

  // Set up real-time subscription for unread messages (only when not in a chat)
  useEffect(() => {
    if (!user?.id) return;

    // Only set up global unread subscription if we're not in a specific chat
    const isInChat = window.location.pathname.includes('/chat/');
    if (isInChat) return;

    const newChannel = supabase
      .channel(`unread_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id.eq.${user.id}`
        },
        (payload) => {
          if (payload.new.sender_id !== user.id) {
            const senderId = payload.new.sender_id;
            setUnreadCounts(prev => ({
              ...prev,
              [senderId]: (prev[senderId] || 0) + 1
            }));
            setTotalUnread(prev => prev + 1);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id.eq.${user.id}`
        },
        (payload) => {
          if (payload.new.is_read && !payload.old.is_read) {
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
      .subscribe();

    setChannel(newChannel);

    return () => {
      newChannel.unsubscribe();
    };
  }, [user?.id]);

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
    refresh: fetchUnreadCounts,
    refreshUnreadCounts: fetchUnreadCounts
  };
};
