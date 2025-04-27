import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export function RealtimeStatus() {
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');

  useEffect(() => {
    const realtimeClient = supabase.realtime;

    // Function to update connection status
    const updateStatus = () => {
      if (realtimeClient.isConnected()) {
        setStatus('connected');
      } else {
        setStatus('disconnected');
      }
    };

    // Set up realtime listeners
    const handleConnect = () => {
      setStatus('connected');
    };

    const handleDisconnect = () => {
      setStatus('disconnected');
    };

    // Initial status check
    updateStatus();

    // Register event listeners
    realtimeClient.on('CONNECT', handleConnect);
    realtimeClient.on('DISCONNECT', handleDisconnect);

    // Clean up event listeners
    return () => {
      realtimeClient.off('CONNECT', handleConnect);
      realtimeClient.off('DISCONNECT', handleDisconnect);
    };
  }, []);

  // Determine UI elements based on status
  const getStatusDetails = () => {
    switch (status) {
      case 'connected':
        return {
          icon: <CheckCircle2 className="h-3 w-3 mr-1" />,
          text: 'Connected',
          variant: 'success' as const,
        };
      case 'disconnected':
        return {
          icon: <WifiOff className="h-3 w-3 mr-1" />,
          text: 'Disconnected',
          variant: 'destructive' as const,
        };
      case 'connecting':
        return {
          icon: <AlertCircle className="h-3 w-3 mr-1" />,
          text: 'Connecting',
          variant: 'outline' as const,
        };
    }
  };

  const details = getStatusDetails();

  return (
    <Badge 
      variant={details.variant === 'success' ? 'default' : details.variant}
      className={cn(
        'text-xs flex items-center',
        status === 'connected' ? 'bg-green-600' : undefined
      )}
    >
      {details.icon}
      {details.text}
    </Badge>
  );
}