
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

export type Notification = {
  id: string;
  type: 'message' | 'mention' | 'system';
  content: string;
  created_at: string;
  read: boolean;
  user_id: string;
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
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select(`
            *,
            sender:profiles(full_name, avatar_url)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) throw error;

        if (data) {
          setNotifications(data);
          setUnreadCount(data.filter(n => !n.read).length);
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();

    // Set up real-time subscription
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, async (payload) => {
        // Fetch the complete notification with sender info
        const { data } = await supabase
          .from('notifications')
          .select(`
            *,
            sender:profiles(full_name, avatar_url)
          `)
          .eq('id', payload.new.id)
          .single();
          
        if (data) {
          setNotifications(prev => [data, ...prev]);
          setUnreadCount(count => count + 1);
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const updatedNotification = payload.new as Notification;
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === updatedNotification.id ? { ...notif, ...updatedNotification } : notif
          )
        );
        
        // Update unread count if a notification was marked as read
        if (updatedNotification.read) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const markAsRead = async (notificationId: string) => {
    if (!user) return;
    
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);
      
    setNotifications(notifications.map(n => 
      n.id === notificationId ? { ...n, read: true } : n
    ));
    
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    if (!user || notifications.length === 0) return;
    
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);
      
    setNotifications(notifications.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  return {
    notifications,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead
  };
}
