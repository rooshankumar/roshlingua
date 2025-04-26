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
    let reconnectTimer: NodeJS.Timeout | null = null;
    let reconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 5;
    const RECONNECT_DELAY = 5000; // 5 seconds between reconnection attempts

    const setupRealtimeSubscription = () => {
      if (!isSubscribed || channel) return; // Prevent multiple subscriptions

      // Clear any existing reconnect timer
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }

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
          reconnectAttempts = 0; // Reset reconnect attempts on successful connection
        })
        .subscribe((status) => {
          console.log('Notification subscription status:', status);
          if (status === 'SUBSCRIBED') {
            setChannelStatus('connected');
            reconnectAttempts = 0; // Reset reconnect attempts on successful connection
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            setChannelStatus('disconnected');
            
            // Only attempt to reconnect if we haven't exceeded maximum attempts
            if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS && isSubscribed) {
              reconnectAttempts++;
              console.log(`Realtime reconnect attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
              
              // Clean up existing channel
              if (channel) {
                channel.unsubscribe();
                channel = null;
              }
              
              // Schedule reconnection with exponential backoff
              const delay = RECONNECT_DELAY * Math.pow(1.5, reconnectAttempts - 1);
              reconnectTimer = setTimeout(() => {
                setupRealtimeSubscription();
              }, delay);
            }
          }
        });
    };

    fetchNotifications();
    
    const subscriptionTimeout = setTimeout(setupRealtimeSubscription, 500); //Small delay

    // Periodic refresh as fallback (reduced frequency)
    const intervalId = setInterval(() => {
      if (channelStatus !== 'connected') {
        console.log('Fallback notifications refresh');
        fetchNotifications();
      }
    }, 60000); // Reduced from 30s to 60s to reduce load

    return () => {
      isSubscribed = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      clearTimeout(subscriptionTimeout);
      clearInterval(intervalId);
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [user, fetchNotifications]);

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