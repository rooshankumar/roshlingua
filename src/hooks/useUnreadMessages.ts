
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export function useUnreadMessages(userId: string | undefined) {
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isSyncing = useRef(false);

  // Fetch initial unread counts and make sure they're accurate
  const fetchUnreadCounts = useCallback(async () => {
    if (!userId) return;
    
    try {
      console.log('Fetching unread counts for user:', userId);
      
      // Get the source of truth from the database
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

        console.log('Database unread counts:', counts);
        setUnreadCounts(counts);
      }
    } catch (error) {
      console.error('Error fetching unread counts:', error);
    }
  }, [userId, activeConversationId]);

  // Function to mark a conversation as read - completely synchronous 
  // to avoid race conditions
  const markConversationAsRead = useCallback(async (conversationId: string) => {
    if (!userId || !conversationId || isSyncing.current) return;
    
    try {
      isSyncing.current = true;
      console.log(`Marking conversation ${conversationId} as read`);
      
      // 1. Update local state immediately
      setActiveConversationId(conversationId);
      setUnreadCounts(prev => ({
        ...prev,
        [conversationId]: 0
      }));

      // 2. Update database
      const promises = [
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
      ];

      await Promise.all(promises);
      
      // 3. Verify changes were applied correctly
      const { data, error } = await supabase
        .from('conversation_participants')
        .select('conversation_id, unread_count')
        .eq('user_id', userId)
        .eq('conversation_id', conversationId)
        .single();
        
      if (error) {
        console.error('Error verifying read status:', error);
      } else if (data && data.unread_count > 0) {
        console.warn('Database unread count not properly reset, forcing update');
        // Force another update
        await supabase
          .from('conversation_participants')
          .update({ unread_count: 0 })
          .eq('user_id', userId)
          .eq('conversation_id', conversationId);
      }
      
      console.log('Successfully marked conversation as read');
    } catch (error) {
      console.error('Error marking conversation as read:', error);
    } finally {
      isSyncing.current = false;
    }
  }, [userId]);

  // Force a manual reset of unread count for the active conversation
  // This is a more aggressive approach when normal methods fail
  const forceResetUnreadCount = useCallback(async (conversationId: string) => {
    if (!userId || !conversationId) return;
    
    console.log(`Force resetting unread count for ${conversationId}`);
    
    try {
      // Local state update
      setUnreadCounts(prev => ({
        ...prev,
        [conversationId]: 0
      }));
      
      // Direct database update with retry
      const updateDb = async (retries = 3) => {
        try {
          const { error } = await supabase
            .from('conversation_participants')
            .update({ unread_count: 0 })
            .eq('user_id', userId)
            .eq('conversation_id', conversationId);
            
          if (error) throw error;
          console.log('Force reset successful');
        } catch (err) {
          console.error('Error in force reset:', err);
          if (retries > 0) {
            console.log(`Retrying... (${retries} attempts left)`);
            setTimeout(() => updateDb(retries - 1), 500);
          }
        }
      };
      
      await updateDb();
    } catch (error) {
      console.error('Error in force reset:', error);
    }
  }, [userId]);

  // Set up realtime subscription
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
        
        // Only update if this is not the active conversation
        if (participant.conversation_id && participant.conversation_id !== activeConversationId) {
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
    if (activeConversationId && userId) {
      console.log(`Active conversation changed to ${activeConversationId}, clearing unread count`);
      
      // Immediately update local state
      setUnreadCounts(prev => ({
        ...prev,
        [activeConversationId]: 0
      }));
      
      // Also force a database update to ensure consistency
      forceResetUnreadCount(activeConversationId);
    }
  }, [activeConversationId, userId, forceResetUnreadCount]);

  return {
    unreadCounts,
    markConversationAsRead,
    setActiveConversationId,
    refreshUnreadCounts: fetchUnreadCounts,
    forceResetUnreadCount,
    // Expose for component that requires direct setUnreadCounts access
    setUnreadCounts,
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
