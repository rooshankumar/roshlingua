import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Loader2, RefreshCw } from 'lucide-react';

const RealtimeStatus = () => {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const subscriptionRef = useRef<RealtimeChannel | null>(null);

  const setupChannel = useCallback(() => {
    const channel = supabase.channel('realtime-status', {
      config: {
        broadcast: {
          self: true
        }
      }
    });

    channel
      .on('broadcast', { event: 'test' }, (payload) => {
        setLastMessage(JSON.stringify(payload));
      })
      .on('presence', { event: 'sync' }, () => {
        setStatus('connected');
      })
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          setStatus('connected');
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setStatus('disconnected');
          // Auto-reconnect after a delay
          setTimeout(() => {
            setReconnectAttempt(prev => prev + 1);
          }, 5000);
        } else {
          setStatus('connecting');
        }
      });

    return channel;
  }, []);

  useEffect(() => {
    // Clean up any existing subscription
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }

    // Create new subscription
    subscriptionRef.current = setupChannel();

    // Reconnect every 5 minutes to ensure connection stays fresh
    const intervalId = setInterval(() => {
      console.log('Refreshing realtime connection');
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = setupChannel();
      }
    }, 5 * 60 * 1000);

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
      clearInterval(intervalId);
    };
  }, [setupChannel, reconnectAttempt]);

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