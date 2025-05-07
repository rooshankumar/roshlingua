import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useLocation } from 'react-router-dom';
import subscriptionManager from '@/utils/subscriptionManager';
import { useAuth } from '@/providers/AuthProvider';

/**
 * A hidden component that monitors and maintains real-time connections
 * This helps keep subscriptions alive and reconnects them when needed
 */
export default function RealtimeConnectionCheck() {
  const { user, refreshSubscriptions } = useAuth();
  const location = useLocation();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const healthCheckTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastRefreshTimeRef = useRef<number>(0);

  // Handle offline/online status changes
  useEffect(() => {
    const handleOnline = () => {
      console.log('🟢 Device came online, refreshing connections');
      setIsOnline(true);
      refreshAllConnections();
    };

    const handleOffline = () => {
      console.log('🔴 Device went offline');
      setIsOnline(false);
    };

    // Monitor online/offline status
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Set up periodic health checks
  useEffect(() => {
    if (!isOnline) return;

    // Check connection health every 2 minutes
    const checkConnectionHealth = () => {
      if (!user) return;

      // Update user's online status
      updateUserOnlineStatus(true);

      // Check if we need to refresh subscriptions
      const now = Date.now();
      if (now - lastRefreshTimeRef.current > 5 * 60 * 1000) { // Every 5 minutes
        console.log('Performing periodic refresh of all subscriptions');
        refreshAllConnections();
        lastRefreshTimeRef.current = now;
      }
    };

    // Start periodic checks
    healthCheckTimerRef.current = setInterval(checkConnectionHealth, 2 * 60 * 1000);

    // Do an initial check
    checkConnectionHealth();

    return () => {
      if (healthCheckTimerRef.current) {
        clearInterval(healthCheckTimerRef.current);
        healthCheckTimerRef.current = null;
      }
    };
  }, [isOnline, user]);

  // Refresh connections when route changes
  useEffect(() => {
    if (!isOnline || !user) return;

    console.log('Navigation detected, checking connection health');
    subscriptionManager.checkConnectionHealth();
  }, [location.pathname, isOnline, user]);

  // Update user status when page visibility changes
  useEffect(() => {
    if (!user) return;

    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible';
      console.log(`Page visibility changed to: ${isVisible ? 'visible' : 'hidden'}`);

      // Update user's online status
      updateUserOnlineStatus(isVisible);

      // Refresh connections if page becomes visible
      if (isVisible) {
        refreshAllConnections();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  // Update user's online status in the database
  const updateUserOnlineStatus = async (isOnline: boolean) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_online: isOnline,
          last_seen: new Date().toISOString() 
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating online status:', error);
      }
    } catch (err) {
      console.error('Failed to update online status:', err);
    }
  };

  // Refresh all connections
  const refreshAllConnections = () => {
    if (!user) return;

    try {
      subscriptionManager.refreshAll();
      refreshSubscriptions();
    } catch (err) {
      console.error('Error refreshing connections:', err);
    }
  };

  // This component doesn't render anything visible
  return null;
}