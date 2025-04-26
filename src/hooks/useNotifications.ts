import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useAuth } from './useAuth';

export type Notification = {
  id: string;
  type: 'message' | 'mention' | 'system';
  content: string;
  created_at: string;
  is_read: boolean;
  recipient_id: string;
  sender_id?: string;
  conversation_id?: string;
  sender?: {
    full_name: string;
    avatar_url: string;
  };
};

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [channelStatus, setChannelStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const { user } = useAuth();

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.is_read).length || 0);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user?.id) return;

    let channel: RealtimeChannel | null = null;
    let isSubscribed = true;

    const setupRealtimeSubscription = () => {
      if (!isSubscribed || channel) return; // Prevent multiple subscriptions

      channel = supabase
        .channel(`notifications:${user.id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${user.id}`,
        }, (payload) => {
          console.log('Notification update:', payload);
          fetchNotifications();
        })
        .on('presence', { event: 'sync' }, () => {
          setChannelStatus('connected');
        })
        .subscribe((status) => {
          console.log('Notification subscription status:', status);
          if (status === 'SUBSCRIBED') {
            setChannelStatus('connected');
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            setChannelStatus('disconnected');
            setTimeout(() => {
              if (channel) {
                channel.unsubscribe();
                channel = null; //Reset channel after unsubscribe
              }
              setupRealtimeSubscription();
            }, 3000);
          }
        });
    };

    fetchNotifications();
    
    const subscriptionTimeout = setTimeout(setupRealtimeSubscription, 500); //Small delay


    const intervalId = setInterval(() => {
      if (channelStatus !== 'connected') {
        console.log('Fallback notifications refresh');
        fetchNotifications();
      }
    }, 30000);

    return () => {
      isSubscribed = false;
      clearTimeout(subscriptionTimeout);
      clearInterval(intervalId);
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [user, fetchNotifications, channelStatus]);

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(notifications.map(n =>
        n.id === notificationId ? { ...n, is_read: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('recipient_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  return {
    notifications,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    isConnected: channelStatus === 'connected'
  };
}