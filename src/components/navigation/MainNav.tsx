import * as React from "react"
import { NavLink, useLocation } from "react-router-dom";
import { Home, Users, MessageSquare, Settings, Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useTranslation } from 'react-i18next'; // Added import


const routes = [
  {
    path: "/dashboard",
    label: "dashboard",
    icon: Home
  },
  {
    path: "/community",
    label: "Community",
    icon: Users
  },
  {
    path: "/chat",
    label: "Chat",
    icon: MessageSquare,
    notificationCount: (notifications) => notifications?.unreadMessages || 0
  },
  {
    path: "/settings",
    label: "Settings",
    icon: Settings
  }
];

export function MainNav() {
  const location = useLocation();
  const [open, setOpen] = React.useState(false);
  const { user } = useAuth();
  const { unreadCounts } = useUnreadMessages(user?.id);
  const totalUnread = unreadCounts ? Object.values(unreadCounts).reduce((sum, count) => sum + count, 0) : 0;
  const { t } = useTranslation();
  const isMobile = window.innerWidth < 768;

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
              ? "bg-primary/10 text-primary translate-x-2" 
              : "hover:bg-secondary hover:translate-x-1"
          }`}
        >
          <div className="relative">
            <route.icon className={`h-5 w-5 transition-transform duration-200 ${
              isActive(route.path) 
                ? "scale-110" 
                : "group-hover:scale-105"
            }`} />
            {route.notificationCount && route.path === '/chat' && totalUnread > 0 && (
              <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                {totalUnread}
              </span>
            )}
          </div>
          <span className={mobile ? "text-base" : ""}>{t(`navigation.${route.label.toLowerCase()}`)}</span>
        </NavLink>
      ))}
    </>
  );

  return (
    <>
      {/* Mobile Navigation */}
      <div className="lg:hidden sticky top-0 z-50">
        <div className="flex items-center justify-between p-3 border-b bg-background/90 backdrop-blur-lg">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[270px] p-4">
              <div className="mb-6 mt-2">
                <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  {t('navigation.menu')}
                </h2>
              </div>
              <nav className="flex flex-col space-y-3">
                <NavigationItems mobile={true} />
              </nav>
              <div className="mt-auto pt-4 border-t absolute bottom-6 left-4 right-4">
                <div className="flex items-center space-x-2 px-3 py-2 rounded-md bg-muted/50">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"/>
                  <span className="text-sm text-muted-foreground">{t('navigation.online')}</span>
                </div>
              </div>
            </SheetContent>
          </Sheet>
          <h2 className="text-lg font-medium">{routes.find(route => isActive(route.path))?.label || "Dashboard"}</h2>
          <div className="w-10"></div> {/* Spacer for balance */}
        </div>
      </div>

      {/* Desktop Navigation */}
      <nav className="hidden lg:flex sticky top-0 flex-col space-y-2 p-4 min-h-screen bg-background/80 backdrop-blur-lg border-r">
        <div className="mb-8">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            {t('navigation.menu')}
          </h2>
        </div>
        <NavigationItems />
        <div className="mt-auto pt-4 border-t">
          <div className="flex items-center space-x-2 px-3 py-2 rounded-md bg-muted/50">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"/>
            <span className="text-sm text-muted-foreground">{t('navigation.online')}</span>
          </div>
        </div>
      </nav>
    </>
  );
}

export default MainNav;