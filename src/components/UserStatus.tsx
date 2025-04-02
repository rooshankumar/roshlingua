
import { formatDistanceToNow } from 'date-fns';

interface UserStatusProps {
  isOnline?: boolean;
  lastSeen?: string | null;
}

export function UserStatus({ isOnline, lastSeen }: UserStatusProps) {
  if (isOnline) {
    return (
      <div className="flex items-center text-sm">
        <div className="w-2 h-2 rounded-full bg-green-500 mr-2" />
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
