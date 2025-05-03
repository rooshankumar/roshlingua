import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Loader2, RefreshCw } from 'lucide-react';

import subscriptionManager from '@/utils/subscriptionManager';

const RealtimeStatus = () => {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  const setupChannel = useCallback(() => {
    const subscriptionKey = 'realtime_status_indicator';
    
    return subscriptionManager.subscribe(subscriptionKey, () => 
      supabase.channel('realtime-status', {
        config: {
          broadcast: {
            self: true
          }
        }
      })
      .on('broadcast', { event: 'test' }, (payload) => {
        setLastMessage(JSON.stringify(payload));
      })
      .on('presence', { event: 'sync' }, () => {
        setStatus('connected');
      })
      .subscribe((channelStatus) => {
        console.log('Realtime subscription status:', channelStatus);
        if (channelStatus === 'SUBSCRIBED') {
          setStatus('connected');
        } else if (channelStatus === 'CLOSED' || channelStatus === 'CHANNEL_ERROR') {
          setStatus('disconnected');
          // Auto-reconnect after a delay
          setTimeout(() => {
            setReconnectAttempt(prev => prev + 1);
            // Force a new subscription
            subscriptionManager.unsubscribe(subscriptionKey);
            setupChannel();
          }, 3000);
        } else {
          setStatus('connecting');
        }
      })
    );
  }, []);

  useEffect(() => {
    let isActive = true;
    let reconnectTimer: NodeJS.Timeout | null = null;
    
    // Clean up any existing subscription
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }

    // Create new subscription
    if (isActive) {
      subscriptionRef.current = setupChannel();
    }

    // Periodic health check with more frequent checks
    const intervalId = setInterval(() => {
      if (!isActive) return;
      
      console.log('Checking realtime connection health');
      if (status === 'disconnected' && reconnectAttempt < 5) {
        if (subscriptionRef.current) {
          subscriptionRef.current.unsubscribe();
          subscriptionRef.current = null;
        }
        
        // Use a delay before reconnecting to prevent rapid cycling
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(() => {
          if (isActive) {
            setReconnectAttempt(prev => prev + 1);
            subscriptionRef.current = setupChannel();
            console.log('Attempting to reconnect real-time subscription, attempt:', reconnectAttempt + 1);
          }
        }, 3000); // Reduced wait time to 3 seconds
      }
    }, 60 * 1000); // Check every minute instead of 10 minutes

    return () => {
      isActive = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      clearInterval(intervalId);
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [setupChannel, reconnectAttempt, status]);

  const testConnection = () => {
    const channel = supabase.channel('realtime-status');
    channel.send({
      type: 'broadcast',
      event: 'test',
      payload: { message: 'Testing realtime connection', timestamp: new Date().toISOString() }
    });
  };

  const forceReconnect = () => {
    setStatus('connecting');
    setReconnectAttempt(prev => prev + 1);
  };

  return (
    <div className="flex flex-col gap-2 p-4 border rounded-md">
      <div className="flex items-center gap-2">
        <span>Realtime Status:</span>
        {status === 'connecting' && (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
            <Loader2 className="h-3 w-3 animate-spin mr-1" /> Connecting...
          </Badge>
        )}
        {status === 'connected' && (
          <Badge variant="outline" className="bg-green-100 text-green-800">Connected</Badge>
        )}
        {status === 'disconnected' && (
          <Badge variant="outline" className="bg-red-100 text-red-800">
            Disconnected
          </Badge>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={testConnection}
          disabled={status !== 'connected'}
        >
          Test Connection
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={forceReconnect}
        >
          <RefreshCw className="h-3 w-3 mr-1" /> Reconnect
        </Button>
      </div>

      {lastMessage && (
        <div className="mt-2">
          <p className="text-xs text-gray-500">Last Message:</p>
          <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto dark:bg-gray-800">
            {lastMessage}
          </pre>
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        Reconnect attempts: {reconnectAttempt}
      </div>
    </div>
  );
};

export default RealtimeStatus;