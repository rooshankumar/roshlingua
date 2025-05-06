
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { toast } from '@/components/ui/use-toast';
import subscriptionManager from '@/utils/subscriptionManager';

export type NotificationPreferences = {
  messageNotifications: boolean;
  mentionNotifications: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  soundEnabled: boolean;
};

/**
 * A comprehensive hook for managing notifications in the chat application
 */
export function useNotificationSystem() {
  const { user } = useAuth();
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    messageNotifications: true,
    mentionNotifications: true,
    emailNotifications: false,
    pushNotifications: true,
    soundEnabled: true
  });
  const [isInitialized, setIsInitialized] = useState(false);

  // Load notification preferences from database
  const loadPreferences = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();
        
      if (error && error.code !== 'PGSQL_ERROR') {
        console.error('Error loading notification preferences:', error);
        return;
      }
      
      if (data) {
        setPreferences({
          messageNotifications: data.message_notifications ?? true,
          mentionNotifications: data.mention_notifications ?? true,
          emailNotifications: data.email_notifications ?? false,
          pushNotifications: data.push_notifications ?? true,
          soundEnabled: data.sound_enabled ?? true
        });
      } else {
        // Create default preferences if none exist
        await supabase.from('user_preferences').insert({
          user_id: user.id,
          message_notifications: true,
          mention_notifications: true,
          email_notifications: false,
          push_notifications: true,
          sound_enabled: true
        });
      }
      
      setIsInitialized(true);
    } catch (err) {
      console.error('Error in loadPreferences:', err);
    }
  }, [user?.id]);

  // Update notification preferences
  const updatePreferences = useCallback(async (newPreferences: Partial<NotificationPreferences>) => {
    if (!user?.id || !isInitialized) return;
    
    try {
      // Update local state immediately for responsive UI
      setPreferences(prev => ({ ...prev, ...newPreferences }));
      
      // Format for database
      const dbPreferences = {
        message_notifications: newPreferences.messageNotifications,
        mention_notifications: newPreferences.mentionNotifications,
        email_notifications: newPreferences.emailNotifications,
        push_notifications: newPreferences.pushNotifications,
        sound_enabled: newPreferences.soundEnabled
      };
      
      // Filter out undefined values
      const filteredPreferences = Object.fromEntries(
        Object.entries(dbPreferences).filter(([_, v]) => v !== undefined)
      );
      
      // Update in database
      const { error } = await supabase
        .from('user_preferences')
        .update(filteredPreferences)
        .eq('user_id', user.id);
        
      if (error) {
        console.error('Error updating notification preferences:', error);
        toast({
          title: "Failed to update preferences",
          description: "Your notification settings could not be saved.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Preferences updated",
          description: "Your notification settings have been saved.",
        });
      }
    } catch (err) {
      console.error('Error in updatePreferences:', err);
    }
  }, [user?.id, isInitialized]);

  // Count unread notifications
  const fetchUnreadCount = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .eq('is_read', false);
        
      if (error) {
        console.error('Error fetching unread notification count:', error);
        return;
      }
      
      setUnreadNotifications(count || 0);
    } catch (err) {
      console.error('Error in fetchUnreadCount:', err);
    }
  }, [user?.id]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('recipient_id', user.id)
        .eq('is_read', false);
        
      if (error) {
        console.error('Error marking all notifications as read:', error);
        return;
      }
      
      setUnreadNotifications(0);
    } catch (err) {
      console.error('Error in markAllAsRead:', err);
    }
  }, [user?.id]);

  // Play notification sound if enabled
  const playNotificationSound = useCallback(() => {
    if (preferences.soundEnabled) {
      try {
        // Use built-in notification sound or a custom one
        const audio = new Audio('/notification-sound.mp3');
        audio.play().catch(err => {
          // Browser might block autoplay
          console.error('Could not play notification sound:', err);
        });
      } catch (err) {
        console.error('Error playing notification sound:', err);
      }
    }
  }, [preferences.soundEnabled]);

  // Set up realtime subscription for notifications
  useEffect(() => {
    if (!user?.id) return;
    
    // Load user preferences
    loadPreferences();
    
    // Initial fetch of unread count
    fetchUnreadCount();
    
    // Set up realtime subscription
    const subscriptionKey = `notification_system_${user.id}`;
    
    const cleanup = subscriptionManager.subscribe(subscriptionKey, () => {
      const channel = supabase
        .channel(`notification_updates_${user.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${user.id}`
        }, payload => {
          // Update unread count
          setUnreadNotifications(prev => prev + 1);
          
          // Play sound for new notifications if enabled
          playNotificationSound();
          
          // Show toast notification if applicable
          const notification = payload.new as any;
          if (
            (notification.type === 'message' && preferences.messageNotifications) ||
            (notification.type === 'mention' && preferences.mentionNotifications)
          ) {
            toast({
              title: notification.title || "New notification",
              description: notification.content,
            });
          }
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${user.id}`
        }, () => {
          // Refresh unread count when notifications are marked as read
          fetchUnreadCount();
        })
        .subscribe();
      
      return () => {
        supabase.removeChannel(channel);
      };
    });
    
    // Cleanup subscription on unmount
    return cleanup;
  }, [user?.id, fetchUnreadCount, loadPreferences, playNotificationSound, preferences]);

  return {
    unreadCount: unreadNotifications,
    preferences,
    updatePreferences,
    markAllAsRead,
    isInitialized,
    playNotificationSound
  };
}
