import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

export type Notification = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  read: boolean;
  type: string;
  reference_id?: string;
  sender?: {
    id: string;
    full_name: string;
    avatar_url: string;
  };
};

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Fetch initial notifications
    const fetchNotifications = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('notifications')
          .select(`
            *,
            sender:users!notifications_sender_id_fkey (
              id, full_name, avatar_url
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;

        setNotifications(data || []);
        const unread = data?.filter(n => !n.read).length || 0;
        setUnreadCount(unread);
      } catch (error) {
        // Silent error handling
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();

    // Set up realtime subscription for notifications
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        // Silently handle new notification
        setNotifications(prev => [payload.new as Notification, ...prev]);
        setUnreadCount(count => count + 1);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        // Silently handle updated notification
        setNotifications(prev => 
          prev.map(n => n.id === (payload.new as Notification).id ? payload.new as Notification : n)
        );

        // Update unread count if notification was marked as read
        if ((payload.new as Notification).read && !(payload.old as Notification).read) {
          setUnreadCount(count => Math.max(0, count - 1));
        }
      })
      .subscribe((status) => {
        // Only log critical state changes
        if (status === 'SUBSCRIBED' || status.includes('ERROR')) {
          setStatus(status);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Local state update
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(count => Math.max(0, count - 1));
    } catch (error) {
      // Silent error handling
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;

      // Local state update
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      // Silent error handling
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    status,
    markAsRead,
    markAllAsRead
  };
};