import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export function useUnreadMessages(userId: string | undefined) {
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isSubscribedRef = useRef(false);
  
  // Function to fetch initial unread counts
  const fetchInitialUnreadCounts = useCallback(async () => {
    if (!userId) return;
    
    try {
      console.log('Fetching initial unread counts for user:', userId);
      
      const { data, error } = await supabase
        .from('conversation_participants')
        .select('conversation_id, unread_count')
        .eq('user_id', userId);
        
      if (error) {
        console.error('Error fetching unread counts:', error);
        return;
      }
      
      if (data) {
        const counts = data.reduce((acc, item) => {
          // If we're currently viewing this conversation, force count to 0
          if (activeConversationId === item.conversation_id) {
            acc[item.conversation_id] = 0;
          } else {
            acc[item.conversation_id] = item.unread_count || 0;
          }
          return acc;
        }, {} as Record<string, number>);
        
        console.log('Setting unread counts:', counts);
        setUnreadCounts(counts);
      }
    } catch (error) {
      console.error('Error fetching unread counts:', error);
    }
  }, [userId, activeConversationId]);

  // Function to mark messages as read for a conversation
  const markConversationAsRead = useCallback(async (conversationId: string) => {
    if (!userId || !conversationId) return;
    
    try {
      console.log(`Marking conversation ${conversationId} as read for user ${userId}`);
      
      // Set active conversation immediately (this will update the UI right away)
      setActiveConversationId(conversationId);
      
      // Update local state immediately before the database calls
      setUnreadCounts(prev => ({
        ...prev,
        [conversationId]: 0
      }));
      
      // Update messages as read
      const { error: messagesError } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .eq('is_read', false)
        .not('sender_id', 'eq', userId);
      
      if (messagesError) {
        console.error('Error updating messages as read:', messagesError);
      }
      
      // Update conversation participant record
      const { error: participantError } = await supabase
        .from('conversation_participants')
        .update({ 
          unread_count: 0,
          last_read_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('conversation_id', conversationId);
        
      if (participantError) {
        console.error('Error updating conversation participant:', participantError);
      }
      
      console.log(`Marked conversation ${conversationId} as read, new unread counts:`, {
        ...unreadCounts,
        [conversationId]: 0
      });
    } catch (error) {
      console.error('Error marking conversation as read:', error);
    }
  }, [userId]);

  // Force clear all unread counts - useful for when we're sure all messages are read
  const clearAllUnreadCounts = useCallback(async () => {
    if (!userId) return;
    
    try {
      console.log('Clearing all unread counts for user:', userId);
      
      // Update all conversation participants for this user
      const { error } = await supabase
        .from('conversation_participants')
        .update({ 
          unread_count: 0,
          last_read_at: new Date().toISOString()
        })
        .eq('user_id', userId);
        
      if (error) {
        console.error('Error clearing all unread counts:', error);
        return;
      }
      
      // Clear local state
      setUnreadCounts({});
      console.log('All unread counts cleared');
    } catch (error) {
      console.error('Error clearing all unread counts:', error);
    }
  }, [userId]);

  // Setup unread messages subscription - stable subscription that doesn't constantly reconnect
  useEffect(() => {
    if (!userId) return;
    
    // Fetch initial unread counts
    fetchInitialUnreadCounts();

    // Create a stable channel ID that includes the user ID to avoid conflicts
    const channelId = `unread-messages-${userId}`;

    // Only create a new subscription if we don't already have one
    if (!isSubscribedRef.current && !channelRef.current) {
      console.log('Setting up unread messages subscription');
      
      try {
        // Create a new channel
        channelRef.current = supabase
          .channel(channelId)
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
          }, (payload) => {
            const message = payload.new as any;
            
            // Only count messages not sent by the current user
            if (message.sender_id !== userId) {
              // Don't increment if we're actively viewing this conversation
              if (message.conversation_id !== activeConversationId) {
                setUnreadCounts(prev => ({
                  ...prev,
                  [message.conversation_id]: (prev[message.conversation_id] || 0) + 1
                }));
                console.log(`New message in conversation ${message.conversation_id}, updated count:`, 
                  (unreadCounts[message.conversation_id] || 0) + 1);
              }
            }
          })
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'conversation_participants',
            filter: `user_id=eq.${userId}`,
          }, (payload) => {
            const participant = payload.new as any;
            // Only update if unread count is explicitly set to 0
            if (participant.unread_count === 0) {
              setUnreadCounts(prev => ({
                ...prev,
                [participant.conversation_id]: 0
              }));
              console.log(`Conversation ${participant.conversation_id} marked as read`);
            }
          })
          .subscribe((status) => {
            console.log(`Unread messages subscription status (${channelId}):`, status);
            if (status === 'SUBSCRIBED') {
              isSubscribedRef.current = true;
            } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
              // Only set to false when actually closed, not during initial connection
              isSubscribedRef.current = false;
            }
          });
      } catch (error) {
        console.error('Error setting up unread messages subscription:', error);
        isSubscribedRef.current = false;
        channelRef.current = null;
      }
    }

    // Cleanup function that only runs when component is unmounted, not on every render
    return () => {
      // Only clean up on unmount, not when dependencies change
      if (channelRef.current) {
        console.log(`Removing unread messages subscription (${channelId}) - component unmounting`);
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        isSubscribedRef.current = false;
      }
    };
  }, [userId]); // Removed fetchInitialUnreadCounts to avoid recreation of subscription
  
  // Separate effect for fetching counts when dependencies change
  useEffect(() => {
    if (userId) {
      fetchInitialUnreadCounts();
    }
  }, [userId, fetchInitialUnreadCounts]);

  // Update unread counts when active conversation changes
  useEffect(() => {
    if (activeConversationId) {
      // Update local state immediately 
      console.log(`Setting unread count to 0 for active conversation: ${activeConversationId}`);
      setUnreadCounts(prev => ({
        ...prev,
        [activeConversationId]: 0
      }));
    }
  }, [activeConversationId]);

  return { 
    unreadCounts, 
    markConversationAsRead,
    setActiveConversationId,
    clearAllUnreadCounts,
    refreshUnreadCounts: fetchInitialUnreadCounts
  };
}