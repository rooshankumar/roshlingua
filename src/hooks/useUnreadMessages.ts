import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export const useUnreadMessages = (userId: string | undefined) => {
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const channelRef = useRef<any>(null);

  const fetchUnreadCounts = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('conversation_participants')
        .select('conversation_id, unread_count')
        .eq('user_id', userId);

      if (error) throw error;

      const counts = data.reduce((acc, item) => {
        acc[item.conversation_id] = item.unread_count || 0;
        return acc;
      }, {} as Record<string, number>);

      setUnreadCounts(counts);
    } catch (error) {
      console.error('Error fetching unread counts:', error);
    }
  }, [userId]);

  const markConversationAsRead = useCallback(async (conversationId: string) => {
    if (!userId || !conversationId) return;

    try {
      // Update messages as read
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .eq('is_read', false)
        .neq('sender_id', userId);

      // Update participant count
      await supabase
        .from('conversation_participants')
        .update({ unread_count: 0 })
        .eq('user_id', userId)
        .eq('conversation_id', conversationId);

      // Update local state
      setUnreadCounts(prev => ({
        ...prev,
        [conversationId]: 0
      }));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    fetchUnreadCounts();

    // Subscribe to changes
    const channel = supabase
      .channel(`unread:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages'
      }, (payload) => {
        const message = payload.new as any;
        if (message.sender_id !== userId) {
          setUnreadCounts(prev => ({
            ...prev,
            [message.conversation_id]: (prev[message.conversation_id] || 0) + 1
          }));
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [userId, fetchUnreadCounts]);

  return { 
    unreadCounts, 
    markConversationAsRead, 
    refreshUnreadCounts: fetchUnreadCounts 
  };
};