import { useState, useEffect } from 'react';
import { Bell, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NotificationCard } from './NotificationCard';
import { Badge } from '@/components/ui/badge';

export function NotificationDropdown({ className = "" }) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { 
    notifications, 
    unreadCount, 
    markAllAsRead, 
    loading,
    isConnected 
  } = useNotifications(user?.id);

  // Force refresh notifications when dropdown is opened
  useEffect(() => {
    // We could add a manual refresh function here if needed
  }, [open]);

  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className={`relative hover:bg-muted/80 transition-colors ${className}`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground animate-pulse">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[90vw] max-w-[320px] sm:w-80" align="end" sideOffset={8}>
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <h4 className="font-medium">Notifications</h4>
            {!isConnected && (
              <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-800">
                Offline
              </Badge>
            )}
          </div>
          {notifications.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead}>
              Mark all as read
            </Button>
          )}
        </div>
        <Separator />
        <ScrollArea className="h-[min(calc(100vh-120px),300px)]">
          {loading ? (
            <div className="flex h-full items-center justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex h-full items-center justify-center p-4 text-center text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            <div className="space-y-2 p-2">
              {notifications.map((notification) => (
                <NotificationCard key={notification.id} notification={notification} />
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}