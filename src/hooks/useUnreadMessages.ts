import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export function useUnreadMessages(userId: string | undefined) {
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Fetch initial unread counts on mount and when userId changes
  const fetchUnreadCounts = useCallback(async () => {
    if (!userId) return;

    try {
      console.log('Fetching unread counts for user:', userId);

      const { data, error } = await supabase
        .from('conversation_participants')
        .select('conversation_id, unread_count')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching unread counts:', error);
        return;
      }

      if (data) {
        // Convert array to object
        const counts: Record<string, number> = {};
        for (const item of data) {
          // If this is the active conversation, force count to 0
          if (activeConversationId === item.conversation_id) {
            counts[item.conversation_id] = 0;
          } else {
            counts[item.conversation_id] = item.unread_count || 0;
          }
        }

        console.log('Initial unread counts:', counts);
        setUnreadCounts(counts);
      }
    } catch (error) {
      console.error('Error fetching unread counts:', error);
    }
  }, [userId, activeConversationId]);

  // Mark messages as read - synchronous local update with async DB update
  const markConversationAsRead = useCallback(async (conversationId: string) => {
    if (!userId || !conversationId) return;

    try {
      // 1. Update local state immediately
      console.log(`Marking conversation ${conversationId} as read`);
      setActiveConversationId(conversationId);

      // 2. Force local unread count to 0 right away
      setUnreadCounts(prev => ({
        ...prev,
        [conversationId]: 0
      }));

      // 3. Update database (need to await to ensure complete update)
      await Promise.all([
        // Update messages
        supabase
          .from('messages')
          .update({ is_read: true })
          .eq('conversation_id', conversationId)
          .eq('is_read', false)
          .not('sender_id', 'eq', userId),

        // Update conversation participant
        supabase
          .from('conversation_participants')
          .update({ 
            unread_count: 0,
            last_read_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .eq('conversation_id', conversationId)
      ]);

      // 4. Force a refresh of unread counts 
      await fetchUnreadCounts();

    } catch (error) {
      console.error('Error marking conversation as read:', error);
    }
  }, [userId, fetchUnreadCounts]);

  // Setup subscription to messages and participant updates
  useEffect(() => {
    if (!userId) return;

    // Initial fetch
    fetchUnreadCounts();

    // Set up realtime channel
    const channel = supabase.channel(`unread-counts-${userId}`)
      // Listen for new messages
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, (payload) => {
        const message = payload.new as any;

        // Only increment for messages from other users
        if (message.sender_id !== userId) {
          // Don't increment if we're actively viewing this conversation
          if (message.conversation_id !== activeConversationId) {
            setUnreadCounts(prev => ({
              ...prev,
              [message.conversation_id]: (prev[message.conversation_id] || 0) + 1
            }));
            console.log(`New message in conversation ${message.conversation_id}, incrementing count`);
          }
        }
      })
      // Listen for participant updates
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversation_participants',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        const participant = payload.new as any;
        if (participant.conversation_id) {
          setUnreadCounts(prev => ({
            ...prev,
            [participant.conversation_id]: participant.unread_count || 0
          }));
          console.log(`Updated unread count for conversation ${participant.conversation_id}: ${participant.unread_count}`);
        }
      })
      .subscribe();

    channelRef.current = channel;

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchUnreadCounts, activeConversationId]);

  // When active conversation changes, immediately clear its unread count
  useEffect(() => {
    if (activeConversationId) {
      setUnreadCounts(prev => ({
        ...prev,
        [activeConversationId]: 0
      }));
      console.log(`Active conversation changed to ${activeConversationId}, clearing unread count`);
    }
  }, [activeConversationId]);

  return {
    unreadCounts,
    markConversationAsRead,
    setActiveConversationId,
    refreshUnreadCounts: fetchUnreadCounts,
    // Utility to clear all unread counts
    clearAllUnreadCounts: useCallback(async () => {
      if (!userId) return;

      // Update local state immediately
      setUnreadCounts({});

      // Update database
      try {
        await supabase
          .from('conversation_participants')
          .update({ 
            unread_count: 0,
            last_read_at: new Date().toISOString()
          })
          .eq('user_id', userId);

        console.log('All unread counts cleared');
      } catch (error) {
        console.error('Error clearing all unread counts:', error);
      }
    }, [userId])
  };
}