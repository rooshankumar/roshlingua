
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useLocation } from 'react-router-dom';
import subscriptionManager from '@/utils/subscriptionManager';

/**
 * A hidden component that monitors and maintains real-time connections
 * This helps keep subscriptions alive and reconnects them when needed
 */
const RealtimeConnectionCheck = () => {
  const location = useLocation();
  const [lastCheck, setLastCheck] = useState(Date.now());
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected'>('connected');

  // Monitor the real-time connection status and refresh when needed
  useEffect(() => {
    console.log('Setting up real-time connection monitor');
    
    // Create a health check channel
    const healthChannel = supabase.channel('connection-health-check')
      .on('presence', { event: 'sync' }, () => {
        console.log('Real-time connection is healthy');
        setConnectionStatus('connected');
      })
      .on('presence', { event: 'join' }, () => {
        setConnectionStatus('connected');
      })
      .on('presence', { event: 'leave' }, () => {
        console.log('Real-time presence state changed');
      })
      .subscribe((status) => {
        console.log('Health channel status:', status);
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
        } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          console.warn('Real-time connection issue detected');
          setConnectionStatus('disconnected');
        }
      });

    // Track presence
    healthChannel.track({
      online_at: new Date().toISOString(),
      location: location.pathname
    });

    // Set up periodic health checks
    const healthCheckInterval = setInterval(() => {
      setLastCheck(Date.now());
      
      if (connectionStatus === 'disconnected') {
        console.log('Attempting to refresh real-time connections');
        subscriptionManager.refreshAll();
      }
    }, 30000); // Check every 30 seconds

    // Refresh connections when page visibility changes (tab becomes active)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Page became visible, checking real-time connections');
        setLastCheck(Date.now());
        
        // Force refresh connections if it's been more than a minute since last activity
        if (Date.now() - lastCheck > 60000) {
          subscriptionManager.refreshAll();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      healthChannel.unsubscribe();
      clearInterval(healthCheckInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [location.pathname, connectionStatus, lastCheck]);

  // Nothing visible to render
  return null;
};

export default RealtimeConnectionCheck;
