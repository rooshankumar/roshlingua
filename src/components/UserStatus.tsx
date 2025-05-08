
import { formatDistanceToNow } from 'date-fns';

interface UserStatusProps {
  isOnline?: boolean;
  lastSeen?: string | null;
}

export function UserStatus({ isOnline, lastSeen }: UserStatusProps) {
  // Consider a user offline if last seen time is more than 5 minutes ago,
  // regardless of their is_online status
  const isActuallyOnline = (): boolean => {
    if (!isOnline) return false;
    if (!lastSeen) return isOnline;
    
    const lastSeenDate = new Date(lastSeen);
    const now = new Date();
    const FIVE_MINUTES = 5 * 60 * 1000; // 5 minutes in milliseconds
    return now.getTime() - lastSeenDate.getTime() < FIVE_MINUTES;
  };
  
  if (isActuallyOnline()) {
    return (
      <div className="flex items-center text-sm">
        <div className="w-3 h-3 rounded-full bg-green-500 ring-2 ring-background mr-2" />
        <span className="text-green-600">Online</span>
      </div>
    );
  }

  if (lastSeen) {
    const lastSeenDate = new Date(lastSeen);
    const timeAgo = formatDistanceToNow(lastSeenDate, { addSuffix: false });
    
    return (
      <div className="flex items-center text-sm text-muted-foreground">
        <div className="w-2 h-2 rounded-full bg-gray-400 mr-2" />
        <span>Last seen {timeAgo} ago</span>
      </div>
    );
  }

  return null;
}
