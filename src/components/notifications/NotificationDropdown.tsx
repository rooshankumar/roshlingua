
import { useState, useRef } from "react";
import { Bell } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";
import { useNotifications } from "@/hooks/useNotifications";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const renderNotificationContent = (notification: any) => {
    switch (notification.type) {
      case 'message':
        return (
          <Link 
            to={`/chat/${notification.conversation_id}`} 
            className="block"
            onClick={() => {
              markAsRead(notification.id);
              setOpen(false);
            }}
          >
            <div className="flex items-start gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={notification.sender?.avatar_url} alt={notification.sender?.full_name || 'User'} />
                <AvatarFallback>{notification.sender?.full_name?.[0] || 'U'}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">
                  {notification.sender?.full_name ? `${notification.sender.full_name} sent you a message` : 'New message'}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-1">{notification.content}</p>
                <span className="text-xs text-muted-foreground mt-1 block">
                  {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>
          </Link>
        );
      default:
        return (
          <div onClick={() => markAsRead(notification.id)}>
            <p className="text-sm">{notification.content}</p>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
            </span>
          </div>
        );
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 p-0 text-[10px]"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-80" 
        ref={dropdownRef}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs h-auto p-1"
              onClick={markAllAsRead}
            >
              Mark all as read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[400px] p-2">
          {notifications.length === 0 ? (
            <div className="text-center p-6 text-muted-foreground">
              No notifications
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 rounded-lg ${
                    !notification.read 
                      ? 'bg-primary/5 border-primary/20' 
                      : 'hover:bg-secondary transition-colors'
                  }`}
                >
                  {renderNotificationContent(notification)}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
