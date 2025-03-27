
import { Badge } from "@/components/ui/badge";

interface UserStatusProps {
  isOnline: boolean;
  lastSeen?: string;
}

export function UserStatus({ isOnline, lastSeen }: UserStatusProps) {
  return (
    <div className="flex items-center gap-2">
      <Badge variant={isOnline ? "success" : "secondary"} className="h-2 w-2 rounded-full" />
      <span className="text-sm text-muted-foreground">
        {isOnline ? "Online" : lastSeen ? `Last seen ${new Date(lastSeen).toLocaleDateString()}` : "Offline"}
      </span>
    </div>
  );
}
