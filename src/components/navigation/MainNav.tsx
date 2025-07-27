import * as React from "react"
import { NavLink, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useTranslation } from 'react-i18next';
import { useResponsive } from "@/hooks/use-mobile";
import RoshLinguaLogo from "@/components/RoshLinguaLogo";

// Custom SVG Icon component
const CustomIcon = ({ src, size = 24, className = "" }) => {
  return (
    <img 
      src={src} 
      width={size} 
      height={size} 
      className={className} 
      alt="icon"
    />
  );
};

const routes = [
  {
    path: "/dashboard",
    label: "dashboard",
    icon: (props) => <CustomIcon src="/icons/dashboard-icon.png" {...props} />
  },
  {
    path: "/community",
    label: "Community",
    icon: (props) => <CustomIcon src="/icons/community-icon.png" {...props} />
  },
  {
    path: "/chat",
    label: "Chat",
    icon: (props) => <CustomIcon src="/icons/chat-icon.png" {...props} />,
    notificationCount: (notifications) => notifications?.unreadMessages || 0
  },
  {
    path: "/settings",
    label: "Settings",
    icon: (props) => <CustomIcon src="/icons/settings-icon.png" {...props} />
  }
];

// The NotificationDropdown component is now imported from @/components/notifications/NotificationDropdown

export function MainNav() {
  const location = useLocation();
  const [open, setOpen] = React.useState(false);
  const { user } = useAuth();
  const { unreadCounts } = useUnreadMessages(user?.id);
  // Calculate total unread by counting conversations with unread messages
  const totalUnread = unreadCounts ? Object.keys(unreadCounts).filter(convId => unreadCounts[convId] > 0).length : 0;
  const { t } = useTranslation();
  const responsive = useResponsive();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const NavigationItems = ({ mobile = false }) => (
    <>
      {routes.map((route) => (
        <NavLink
          key={route.path}
          to={route.path}
          onClick={() => setOpen(false)}
          className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-all duration-200 group ${
            mobile ? 'py-3' : ''
          } ${
            isActive(route.path) 
              ? "bg-accent text-accent-foreground translate-x-2" 
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:translate-x-1"
          }`}
        >
          <div className="relative">
            <route.icon 
              className={`transition-transform duration-200 ${
                isActive(route.path) 
                  ? "scale-110" 
                  : "group-hover:scale-105"
              }`} 
              size={mobile ? responsive.iconSize.base : responsive.iconSize.small}
            />
            {route.notificationCount && route.path === '/chat' && totalUnread > 0 && (
              <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-xs rounded-full h-6 w-6 flex items-center justify-center animate-pulse shadow-md border-2 border-background font-bold">
                {totalUnread}
              </span>
            )}
          </div>
          <span 
            style={{ fontSize: mobile ? responsive.fontSize.base : responsive.fontSize.small }}
          >
            {t(`navigation.${route.label.toLowerCase()}`)}
          </span>
        </NavLink>
      ))}
    </>
  );

  // Check if we're in a chat detail route
  const isChatDetailRoute = location.pathname.match(/^\/chat\/[0-9a-f-]+$/);

  return (
    <nav className="hidden md:flex sticky top-0 flex-col space-y-2 p-4 min-h-screen bg-background text-foreground backdrop-blur-lg border-r">
      <div className="mb-8 px-3">
        <RoshLinguaLogo 
          size="md" 
          darkMode={true}
          className="mt-2"
        />
      </div>
      <NavigationItems />
      <div className="mt-auto pt-4 border-t border-white/20">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"/>
            <span 
              className="text-white/80"
              style={{ fontSize: responsive.fontSize.small }}
            >
              {t('navigation.online')}
            </span>
          </div>
          {!location.pathname.includes('/chat') && !location.pathname.includes('/settings') && (
            null
          )}
        </div>
      </div>
    </nav>
  );
}

export default MainNav;