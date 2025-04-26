import React from 'react';
import { Badge } from '@/components/ui/badge';
import { useRealtimeStatus } from '@/hooks/useRealtimeStatus';

const statusColors = {
  CONNECTED: 'bg-green-500',
  CONNECTING: 'bg-yellow-500',
  DISCONNECTED: 'bg-red-500',
  ERROR: 'bg-red-700',
  CHANNEL_ERROR: 'bg-orange-500',
  TIMED_OUT: 'bg-purple-500',
  CLOSED: 'bg-slate-500'
};

export const RealtimeStatus = () => {
  const { status } = useRealtimeStatus();

  // Only show the component when not connected (reduces noise)
  if (status === 'CONNECTED') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Badge variant="outline" className={`${statusColors[status] || 'bg-slate-500'} text-white`}>
        {status}
      </Badge>
    </div>
  );
};

export default RealtimeStatus;