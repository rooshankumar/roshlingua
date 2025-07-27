import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

/**
 * A simplified component that monitors Supabase connection health
 * without interfering with chat subscriptions
 */
export default function RealtimeConnectionCheck() {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const healthCheckTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Handle offline/online status changes
  useEffect(() => {
    const handleOnline = () => {
      console.log('🟢 Device came online');
      setIsOnline(true);
    };

    const handleOffline = () => {
      console.log('🔴 Device went offline');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Periodic health check without interfering with other subscriptions
  useEffect(() => {
    if (!isOnline || !user) return;

    const checkConnectionHealth = async () => {
      try {
        const { error } = await supabase
          .from('profiles')
          .select('id')
          .limit(1);

        if (error) {
          console.warn('⚠️ Database connection issue:', error.message);
        } else {
          console.log('✅ Database connection healthy');
        }
      } catch (error) {
        console.error('❌ Connection check failed:', error);
      }
    };

    // Check connection health every 5 minutes
    healthCheckTimerRef.current = setInterval(checkConnectionHealth, 5 * 60 * 1000);

    // Do an initial check
    checkConnectionHealth();

    return () => {
      if (healthCheckTimerRef.current) {
        clearInterval(healthCheckTimerRef.current);
        healthCheckTimerRef.current = null;
      }
    };
  }, [isOnline, user]);

  // Update user's online status when page visibility changes
  useEffect(() => {
    if (!user) return;

    const updateUserOnlineStatus = async (online: boolean) => {
      try {
        await supabase
          .from('profiles')
          .update({ 
            is_online: online,
            last_seen: new Date().toISOString() 
          })
          .eq('id', user.id);
      } catch (error) {
        console.error('Error updating online status:', error);
      }
    };

    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible';
      updateUserOnlineStatus(isVisible);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Set user as online when component mounts
    updateUserOnlineStatus(true);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Set user as offline when component unmounts
      updateUserOnlineStatus(false);
    };
  }, [user]);

  // This component doesn't render anything visible
  return null;
}