
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import subscriptionManager from '@/utils/subscriptionManager';

interface UnreadMessageCounts {
  [conversationId: string]: number;
}

export const useUnreadMessages = () => {
  const { user } = useAuth();
  const [unreadCounts, setUnreadCounts] = useState<UnreadMessageCounts>({});
  const [totalUnread, setTotalUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch unread counts
  const fetchUnreadCounts = useCallback(async () => {
    if (!user?.id) {
      setUnreadCounts({});
      setTotalUnread(0);
      setLoading(false);
      return;
    }

    try {
      const { data: messages, error } = await supabase
        .from('messages')
        .select('id, sender_id, receiver_id, is_read')
        .eq('receiver_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      // Group by sender
      const counts: UnreadMessageCounts = {};
      let total = 0;

      messages?.forEach(message => {
        const senderId = message.sender_id;
        counts[senderId] = (counts[senderId] || 0) + 1;
        total++;
      });

      setUnreadCounts(counts);
      setTotalUnread(total);

      console.log('📊 Unread counts updated:', { counts, total });
    } catch (error) {
      console.error('❌ Error fetching unread counts:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Mark messages as read
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

      console.log('✅ Messages marked as read for:', conversationId);
    } catch (error) {
      console.error('❌ Error marking messages as read:', error);
    }
  }, [user]);

  // Set up real-time subscription
  useEffect(() => {
    if (!user?.id) return;

    // Skip if in chat (handled by ChatScreen)
    if (window.location.pathname.includes('/chat/')) return;

    const subscriptionKey = `unread_${user.id}`;

    const channel = supabase
      .channel(subscriptionKey)
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
            console.log('📨 New unread message from:', senderId);
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
            console.log('✅ Message marked as read from:', senderId);
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Unread messages subscription status:', status);
      });

    // Register with subscription manager
    subscriptionManager.subscribe(subscriptionKey, channel);

    return () => {
      subscriptionManager.unsubscribe(subscriptionKey);
    };
  }, [user?.id]);

  // Initial fetch
  useEffect(() => {
    fetchUnreadCounts();
  }, [fetchUnreadCounts]);

  return {
    unreadCounts,
    totalUnread,
    loading,
    markAsRead,
    refresh: fetchUnreadCounts
  };
};
