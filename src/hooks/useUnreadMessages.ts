
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

      // Synchronize local and remote state
      const updateUnreadCount = async () => {
        // Update local state immediately and aggressively to fix UI
        setUnreadCounts(prev => ({
          ...prev,
          [activeConversationId]: 0,
        }));

        // Prevent race conditions with a lock
        if (isSyncing.current) return;
        isSyncing.current = true;

        try {
          // First verify if there's actually an unread count in the database
          const { data, error: checkError } = await supabase
            .from('conversation_participants')
            .select('unread_count')
            .eq('user_id', userId)
            .eq('conversation_id', activeConversationId)
            .single();

          if (checkError) {
            console.error('Error checking unread count:', checkError);
          } else if (data && data.unread_count > 0) {
            // Update remote state with error handling and retry logic
            const updateDb = async (retries = 2) => {
              try {
                const { error } = await supabase
                  .from('conversation_participants')
                  .update({ unread_count: 0 })
                  .eq('user_id', userId)
                  .eq('conversation_id', activeConversationId);

                if (error) {
                  console.error('Error updating read status in database:', error);
                  if (retries > 0) {
                    setTimeout(() => updateDb(retries - 1), 300);
                  }
                } else {
                  console.log('Database update verified, unread count reset');

                  // Force another local state update to ensure UI is consistent
                  setUnreadCounts(prev => ({
                    ...prev,
                    [activeConversationId]: 0,
                  }));
                }
              } catch (err) {
                console.error('Database sync error:', err);
                if (retries > 0) {
                  setTimeout(() => updateDb(retries - 1), 300);
                }
              }
            };

            await updateDb();
          }
        } finally {
          isSyncing.current = false;
        }
      };

      // Execute immediately
      updateUnreadCount();

      // And also after a short delay as a backup
      const timeoutId = setTimeout(updateUnreadCount, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [activeConversationId, userId]);

  // Add a debug function to help troubleshoot read status issues
  useEffect(() => {
    if (activeConversationId && userId) {
      console.log(`[DEBUG] Active conversation: ${activeConversationId}, unread count: ${unreadCounts[activeConversationId] || 0}`);
    }
  }, [activeConversationId, unreadCounts, userId]);

  // Create a function to clear all unread counts
  const clearAllUnreadCounts = useCallback(async () => {
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
  }, [userId]);

  // Return the hook's API
  return {
    unreadCounts,
    markConversationAsRead,
    setActiveConversationId,
    refreshUnreadCounts: fetchUnreadCounts,
    forceResetUnreadCount,
    setUnreadCounts,
    clearAllUnreadCounts
  };
}
