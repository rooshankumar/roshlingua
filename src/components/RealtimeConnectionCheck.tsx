import { useEffect, useState, useRef, useCallback } from 'react';
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
  const [lastSuccessfulConnection, setLastSuccessfulConnection] = useState(0);
  const [lastRefreshTimestamp, setLastRefreshTimestamp] = useState(0);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const [connectionHealthy, setConnectionHealthy] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('Connected');
  const [connectionError, setConnectionError] = useState<string | null>(null); // Added state for connection errors


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
    if (!user || !user.id) {
      console.log('Cannot update online status: No authenticated user');
      return;
    }

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
        throw error;
      }
    } catch (error) {
      console.error('Failed to update online status:', error);
      throw error;
    }
  };

  // Set up handlers for page unload/close to mark user as offline
  useEffect(() => {
    if (!user) return;

    const handleBeforeUnload = () => {
      // Use a synchronous approach for beforeunload since async might not complete
      const formData = new FormData();
      formData.append('is_online', 'false');

      navigator.sendBeacon(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}`, 
        formData
      );
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user]);

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

  const checkConnectionHealth = useCallback(() => {
    if (!user?.id) return;

    setIsCheckingConnection(true);
    console.log('Checking Supabase connection health...');

    // Try to ping Supabase by making a simple query
    supabase
      .from('profiles')
      .select('id')
      .limit(1)
      .then(({ data, error }) => {
        const nowTime = new Date().getTime();
        setLastSuccessfulConnection(nowTime);

        if (error) {
          console.error('Connection check failed:', error);
          setConnectionHealthy(false);
          refreshAllConnections();
        } else {
          setConnectionHealthy(true);
          setConnectionStatus('Connected');
          // Only refresh connections if it's been more than 5 minutes since last success
          if (nowTime - lastRefreshTimestamp > 5 * 60 * 1000) {
            refreshAllConnections();
            setLastRefreshTimestamp(nowTime);
          }
        }
      })
      .catch((error) => {
        console.error('Connection check failed with exception:', error);
        setConnectionHealthy(false);
        setConnectionStatus('Disconnected');
        refreshAllConnections();
      })
      .finally(() => {
        setIsCheckingConnection(false);
      });
  }, [user?.id, refreshAllConnections]);

  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let connectionTimeout: number;

    const checkConnection = () => {
      try {
        // Create a test channel to check connection status
        const channel = supabase.channel('connection-check')
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              console.log('Realtime connection is healthy');
              setIsConnected(true);
              setConnectionStatus('CONNECTED');
            } else {
              console.log('Realtime connection issue:', status);
              setIsConnected(false);
              setConnectionStatus(status || 'DISCONNECTED');

              // Try to reconnect after a delay
              connectionTimeout = window.setTimeout(() => {
                if (channel) {
                  try {
                    channel.unsubscribe();
                  } catch (e) {
                    console.log('Error unsubscribing from channel', e);
                  }
                  checkConnection(); // Try again
                }
              }, 5000);
            }
          });
      } catch (error) {
        console.error('Error checking connection:', error);
        setIsConnected(false);
        setConnectionStatus('ERROR');

        // Try again after a delay
        connectionTimeout = window.setTimeout(checkConnection, 5000);
      }
    };

    checkConnection();

    // Set up an interval to periodically check the connection
    const interval = setInterval(() => {
      checkConnection();
    }, 30000); // Check every 30 seconds

    return () => {
      clearInterval(interval);
      window.clearTimeout(connectionTimeout);
    };
  }, []);


  // This component doesn't render anything visible
  return null;
}