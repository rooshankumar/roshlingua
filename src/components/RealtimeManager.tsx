
import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';

export function RealtimeManager() {
  const { toast } = useToast();
  const reconnectAttemptRef = useRef(0);
  const maxReconnectAttempts = 10;
  const reconnectTimeoutRef = useRef<number | null>(null);
  
  useEffect(() => {
    const realtimeClient = supabase.realtime;
    
    const handleDisconnect = () => {
      console.log(`Realtime disconnected. Attempt ${reconnectAttemptRef.current + 1}/${maxReconnectAttempts}`);
      
      if (reconnectAttemptRef.current < maxReconnectAttempts) {
        reconnectAttemptRef.current += 1;
        
        // Exponential backoff with jitter
        const baseDelay = 1000; // Start with 1 second
        const maxDelay = 10000; // Cap at 10 seconds
        const exponential = Math.min(maxDelay, baseDelay * Math.pow(1.5, reconnectAttemptRef.current));
        const jitter = Math.random() * 1000; // Add up to 1 second of random jitter
        const delay = exponential + jitter;
        
        // Clear any existing timeout
        if (reconnectTimeoutRef.current) {
          window.clearTimeout(reconnectTimeoutRef.current);
        }
        
        // Set new timeout for reconnection
        reconnectTimeoutRef.current = window.setTimeout(() => {
          console.log(`Attempting to reconnect realtime (${reconnectAttemptRef.current}/${maxReconnectAttempts})`);
          realtimeClient.connect();
        }, delay);
      } else {
        toast({
          title: "Connection issue",
          description: "Unable to maintain realtime connection. Please refresh the page.",
          variant: "destructive",
        });
      }
    };
    
    const handleConnect = () => {
      console.log('Realtime connected successfully');
      reconnectAttemptRef.current = 0; // Reset counter on successful connection
    };
    
    // Track connection state changes
    const subscription = realtimeClient.onPresenceStateChange(() => {});
    
    realtimeClient.on('DISCONNECT', handleDisconnect);
    realtimeClient.on('RECONNECT', handleConnect);
    
    // Ensure we're connected
    realtimeClient.connect();
    
    return () => {
      if (reconnectTimeoutRef.current) {
        window.clearTimeout(reconnectTimeoutRef.current);
      }
      realtimeClient.off('DISCONNECT', handleDisconnect);
      realtimeClient.off('RECONNECT', handleConnect);
      subscription.unsubscribe();
    };
  }, [toast]);
  
  return null; // This is a manager component, no UI needed
}
