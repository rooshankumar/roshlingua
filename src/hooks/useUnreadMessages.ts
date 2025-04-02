
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useUnreadMessages(userId: string | undefined) {
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!userId) return;

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
        setUnreadCounts(prev => ({
          ...prev,
          [message.conversation_id]: (prev[message.conversation_id] || 0) + 1
        }));
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `recipient_id=eq.${userId} AND is_read=eq.true`,
      }, (payload) => {
        const message = payload.new as any;
        setUnreadCounts(prev => ({
          ...prev,
          [message.conversation_id]: Math.max(0, (prev[message.conversation_id] || 0) - 1)
        }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return unreadCounts;
}
