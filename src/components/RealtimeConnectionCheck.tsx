import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useLocation } from 'react-router-dom';
import subscriptionManager from '@/utils/subscriptionManager';
import { useAuth } from '@/providers/AuthProvider';

/**
 * A hidden component that monitors and maintains real-time connections
 * This helps keep subscriptions alive and reconnects them when needed
 */
const RealtimeConnectionCheck = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [lastCheck, setLastCheck] = useState(Date.now());
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected'>('connected');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  // Monitor the real-time connection status and refresh when needed
  useEffect(() => {
    console.log('Setting up real-time connection monitor');

    let isActive = true;
    const subscriptionKey = 'global-connection-monitor';

    // Create a health check channel
    const healthChannel = subscriptionManager.subscribe(subscriptionKey, () => 
      supabase.channel('connection-health-check')
        .on('presence', { event: 'sync' }, () => {
          if (!isActive) return;
          console.log('Real-time connection is healthy');
          setConnectionStatus('connected');
        })
        .on('presence', { event: 'join' }, () => {
          if (!isActive) return;
          setConnectionStatus('connected');
        })
        .on('presence', { event: 'leave' }, () => {
          if (!isActive) return;
          console.log('Real-time presence state changed');
        })
        .subscribe((status) => {
          if (!isActive) return;
          console.log('Health channel status:', status);
          if (status === 'SUBSCRIBED') {
            setConnectionStatus('connected');
            setReconnectAttempts(0);
          } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
            console.warn('Real-time connection issue detected');
            setConnectionStatus('disconnected');
          }
        })
    );

    // Track presence if user is logged in
    if (user?.id) {
      healthChannel.track({
        user_id: user.id,
        online_at: new Date().toISOString(),
        location: location.pathname
      });
    } else {
      healthChannel.track({
        anonymous: true,
        online_at: new Date().toISOString(),
        location: location.pathname
      });
    }

    // Set up periodic health checks with less frequent interval
    const healthCheckInterval = setInterval(() => {
      if (!isActive) return;

      setLastCheck(Date.now());

      if (connectionStatus === 'disconnected') {
        console.log('Attempting to refresh real-time connections');
        setReconnectAttempts(prev => prev + 1);
        // Only refresh all if we haven't tried too many times
        if (reconnectAttempts < 3) {
          subscriptionManager.refreshAll();
        } else {
          console.log('Too many reconnect attempts, waiting for user interaction');
        }
      }
    }, 60000); // Check every 60 seconds instead of 30 to reduce load

    // Refresh connections when page visibility changes (tab becomes active)
    const handleVisibilityChange = () => {
      if (!isActive) return;

      if (document.visibilityState === 'visible') {
        console.log('Page became visible, checking real-time connections');
        setLastCheck(Date.now());

        // Force refresh connections if it's been more than a minute since last activity
        // or if the connection status is disconnected
        if (Date.now() - lastCheck > 60000 || connectionStatus === 'disconnected') {
          subscriptionManager.refreshAll();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Track route changes for debugging
    console.log('Route changed:', location.pathname);

    return () => {
      isActive = false;
      subscriptionManager.unsubscribe(subscriptionKey);
      clearInterval(healthCheckInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [location.pathname, connectionStatus, lastCheck, user?.id]);

  // When connection status changes to disconnected, attempt reconnection
  useEffect(() => {
    if (connectionStatus === 'disconnected' && reconnectAttempts < 5) {
      const reconnectDelay = Math.min(2000 * (reconnectAttempts + 1), 10000);
      console.log(`Will attempt reconnection in ${reconnectDelay}ms (attempt ${reconnectAttempts + 1})`);

      const timer = setTimeout(() => {
        console.log(`Attempting to reconnect real-time connections (attempt ${reconnectAttempts + 1})`);
        subscriptionManager.refreshAll();
      }, reconnectDelay);

      return () => clearTimeout(timer);
    }
  }, [connectionStatus, reconnectAttempts]);

  // On route change, update presence data
  useEffect(() => {
    const updatePresence = async () => {
      try {
        const channel = supabase.channel('connection-health-check');

        if (user?.id) {
          channel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
            location: location.pathname
          });
        } else {
          channel.track({
            anonymous: true,
            online_at: new Date().toISOString(),
            location: location.pathname
          });
        }
      } catch (err) {
        console.error('Error updating presence data:', err);
      }
    };

    updatePresence();
  }, [location.pathname, user?.id]);

  // Nothing visible to render
  return null;
};

export default RealtimeConnectionCheck;