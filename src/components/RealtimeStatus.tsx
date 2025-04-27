import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Loader2, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { toast } from '@/hooks/use-toast';


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
    toast({
      title: "Reconnecting...",
      description: "Attempting to reconnect to real-time service",
    });
    // Force disconnect and reconnect (added for robustness)
    supabase.realtime.disconnect();
    setTimeout(() => {
      supabase.realtime.connect();
    }, 500);
  };

  return (
    <div className="flex flex-col gap-2 p-4 border rounded-md">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={status === 'disconnected' ? "destructive" : "ghost"}
              size="sm"
              className="h-8 px-2 gap-1.5"
              onClick={status === 'disconnected' ? forceReconnect : undefined}
            >
              {status === 'connected' && (
                <Wifi className="h-3.5 w-3.5 text-green-500" />
              )}
              {status === 'connecting' && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-yellow-500" />
              )}
              {status === 'disconnected' && (
                <WifiOff className="h-3.5 w-3.5 text-destructive" />
              )}
              <span className="text-xs">
                {status === 'connected' && "Real-time"}
                {status === 'connecting' && "Connecting..."}
                {status === 'disconnected' && "Reconnect"}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>
              {status === 'connected' && "Connected to real-time updates"}
              {status === 'connecting' && "Establishing connection..."}
              {status === 'disconnected' && "Connection lost - click to reconnect"}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>


      {/* Remaining UI elements */}
      <div className="flex gap-2 mt-2">
        <Button
          size="sm"
          variant="outline"
          onClick={testConnection}
          disabled={status !== 'connected'}
        >
          Test Connection
        </Button>
        {/* Removed redundant Reconnect button */}
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