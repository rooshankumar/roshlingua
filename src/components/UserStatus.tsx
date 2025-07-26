import React from 'react';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';

interface UserStatusProps {
  isOnline?: boolean;
  lastSeen?: string;
}

export const UserStatus: React.FC<UserStatusProps> = ({ isOnline, lastSeen }) => {
  const getStatusText = () => {
    if (isOnline) return 'Online';
    if (!lastSeen) return 'Offline';

    try {
      const lastSeenDate = new Date(lastSeen);
      const now = new Date();

      // If last seen was within the last 5 minutes, consider as recently online
      const diffInMinutes = Math.floor((now.getTime() - lastSeenDate.getTime()) / (1000 * 60));
      if (diffInMinutes <= 5) return 'Last seen recently';

      if (isToday(lastSeenDate)) {
        return `Last seen today at ${format(lastSeenDate, 'h:mm a')}`;
      } else if (isYesterday(lastSeenDate)) {
        return `Last seen yesterday at ${format(lastSeenDate, 'h:mm a')}`;
      } else if (diffInMinutes < 10080) { // Less than a week
        return `Last seen ${format(lastSeenDate, 'EEEE')} at ${format(lastSeenDate, 'h:mm a')}`;
      } else {
        return `Last seen ${format(lastSeenDate, 'MMM d')} at ${format(lastSeenDate, 'h:mm a')}`;
      }
    } catch {
      return 'Offline';
    }
  };

  return (
    <p className={`text-xs ${isOnline ? 'text-green-500' : 'text-muted-foreground'}`}>
      {getStatusText()}
    </p>
  );
};