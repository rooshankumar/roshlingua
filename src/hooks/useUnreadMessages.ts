import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useUnreadMessages(userId: string | undefined) {
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  
  // Function to fetch initial unread counts
  const fetchInitialUnreadCounts = async () => {
    if (!userId) return;
    
    try {
      const { data, error } = await supabase
        .from('conversation_participants')
        .select('conversation_id, unread_count')
        .eq('user_id', userId);
        
      if (error) throw error;
      
      if (data) {
        const counts = data.reduce((acc, item) => {
          acc[item.conversation_id] = item.unread_count || 0;
          return acc;
        }, {} as Record<string, number>);
        
        setUnreadCounts(counts);
      }
    } catch (error) {
      console.error('Error fetching unread counts:', error);
    }
  };

  // Function to mark messages as read for a conversation
  const markConversationAsRead = async (conversationId: string) => {
    if (!userId || !conversationId) return;
    
    try {
      // Update messages as read
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('recipient_id', userId)
        .eq('conversation_id', conversationId)
        .eq('is_read', false);
      
      // Update conversation participant record
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
      console.error('Error marking conversation as read:', error);
    }
  };

  useEffect(() => {
    if (!userId) return;
    
    // Fetch initial unread counts
    fetchInitialUnreadCounts();

    // Subscribe to new messages
    const channel = supabase
      .channel('unread-messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `recipient_id=eq.${userId}`,
      }, (payload) => {
        const message = payload.new as any;
        if (!message.is_read) {
          setUnreadCounts(prev => ({
            ...prev,
            [message.conversation_id]: (prev[message.conversation_id] || 0) + 1
          }));
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `recipient_id=eq.${userId}`,
      }, (payload) => {
        const message = payload.new as any;
        if (message.is_read) {
          // Individual message read - check if this was the last unread one
          fetchInitialUnreadCounts(); // Refresh counts from server
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversation_participants',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        const participant = payload.new as any;
        if (participant.unread_count === 0) {
          // Reset count when conversation participant record is updated
          setUnreadCounts(prev => ({
            ...prev,
            [participant.conversation_id]: 0
          }));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { unreadCounts, markConversationAsRead };
}