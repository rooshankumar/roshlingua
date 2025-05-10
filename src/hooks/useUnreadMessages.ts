import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export const useUnreadMessages = (userId: string | undefined) => {
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const channelRef = useRef<any>(null);
  const isInitialLoadRef = useRef(true);

  // Function to fetch initial unread counts
  const fetchInitialUnreadCounts = async () => {
    if (!userId) return;

    try {
      // First get accurate counts from the messages table directly
      // Get all unread messages and calculate counts client-side
      const { data: unreadMessagesData, error: messagesError } = await supabase
        .from('messages')
        .select('conversation_id, id')
        .eq('recipient_id', userId)
        .eq('is_read', false);
      
      // Manual count by conversation_id
      const conversationCounts: Record<string, number> = {};
      if (unreadMessagesData) {
        unreadMessagesData.forEach(msg => {
          conversationCounts[msg.conversation_id] = (conversationCounts[msg.conversation_id] || 0) + 1;
        });
      }

      if (messagesError) throw messagesError;

      // Then get the conversation participant records to ensure we have all conversations
      const { data: participantData, error: participantError } = await supabase
        .from('conversation_participants')
        .select('conversation_id, unread_count')
        .eq('user_id', userId);

      if (participantError) throw participantError;

      // Create initial counts from participant data
      const initialCounts = participantData.reduce((acc, item) => {
        // Initialize all conversations with either their count or 0
        acc[item.conversation_id] = item.unread_count || 0;
        return acc;
      }, {} as Record<string, number>);

      // Override with accurate counts we've calculated client-side
      Object.keys(conversationCounts).forEach(convId => {
        initialCounts[convId] = conversationCounts[convId];
        
        // Also update the DB unread_count for consistency
        if (conversationCounts[convId] > 0) {
          supabase
            .from('conversation_participants')
            .update({ unread_count: conversationCounts[convId] })
            .eq('user_id', userId)
            .eq('conversation_id', convId)
            .then(({ error }) => {
              if (error) console.error('Error updating conversation unread count:', error);
            });
        }
      });

      console.log('Setting initial unread counts:', initialCounts);
      isInitialLoadRef.current = false;
      
      setUnreadCounts(initialCounts);
    } catch (error) {
      console.error('Error fetching unread counts:', error);
    }
  };

  // Function to mark messages as read for a conversation
  const markConversationAsRead = async (conversationId: string) => {
    if (!userId || !conversationId) return;

    try {
      console.log(`Marking conversation ${conversationId} as read for user ${userId}`);

      // Update messages as read
      const { error: updateError } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('recipient_id', userId)
        .eq('conversation_id', conversationId)
        .eq('is_read', false);

      if (updateError) throw updateError;

      // Update conversation participant record
      const { error: participantError } = await supabase
        .from('conversation_participants')
        .update({ unread_count: 0 })
        .eq('user_id', userId)
        .eq('conversation_id', conversationId);

      if (participantError) throw participantError;

      // Immediately update local state
      setUnreadCounts(prev => ({
        ...prev,
        [conversationId]: 0
      }));

      console.log(`Conversation ${conversationId} marked as read`);
    } catch (error) {
      console.error('Error marking conversation as read:', error);
    }
  };

  useEffect(() => {
    if (!userId) return;

    // Fetch initial unread counts
    fetchInitialUnreadCounts();

    // Clean up any existing subscriptions
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Subscribe to new messages and updates
    const channel = supabase
      .channel(`unread-messages-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `recipient_id=eq.${userId}`,
      }, (payload) => {
        const message = payload.new as any;
        if (!message.is_read && message.sender_id !== userId) {
          console.log(`New unread message in conversation ${message.conversation_id}`);
          // Force update the unread counts immediately
          setUnreadCounts(prev => {
            const newCounts = {
              ...prev,
              [message.conversation_id]: (prev[message.conversation_id] || 0) + 1
            };
            console.log('Updated unread counts:', newCounts);
            return newCounts;
          });
          
          // Add visual notification if needed (e.g. playing sound or showing toast)
          // This helps with notification feedback when the app is already open
          try {
            // For better audio notification reliability
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // Higher frequency for alert
            
            const gainNode = audioContext.createGain();
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.2);
            
            // Also try the notification sound as backup
            const audio = new Audio('/notification.mp3');
            audio.volume = 0.6;
            audio.play().catch(e => console.log('Using oscillator instead due to error:', e));
            
            // Display visual toast notification
            if (typeof window !== 'undefined' && window.toast) {
              window.toast({
                title: 'New Message',
                description: 'You have a new message',
                variant: 'destructive',
              });
            }
          } catch (e) {
            console.log('Notification effect error:', e);
          }
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
          // Refresh counts only for this specific conversation
          fetchInitialUnreadCounts();
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      console.log('Cleaning up unread messages subscription');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [userId]);

  return { unreadCounts, markConversationAsRead, refreshUnreadCounts: fetchInitialUnreadCounts };
}