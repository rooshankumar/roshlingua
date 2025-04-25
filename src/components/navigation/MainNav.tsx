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
    path: "/Dashboard",
    label: "Dashboard",
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
  const { t } = useTranslation(); // Added useTranslation hook

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const NavigationItems = () => (
    <>
      {routes.map((route) => (
        <NavLink
          key={route.path}
          to={route.path}
          onClick={() => setOpen(false)}
          className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-all duration-200 group ${
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
              <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {totalUnread}
              </span>
            )}
          </div>
          <span>{t(`navigation.${route.label.toLowerCase()}`)}</span> {/* Use t() for translation */}
        </NavLink>
      ))}
    </>
  );

  return (
    <>
      {/* Mobile Navigation */}
      <div className="lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[240px] p-4">
            <nav className="flex flex-col space-y-2">
              <NavigationItems />
            </nav>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Navigation */}
      <nav className="hidden lg:flex sticky top-0 flex-col space-y-2 p-4 min-h-screen bg-background/80 backdrop-blur-lg border-r">
        <div className="mb-8">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            {t('navigation.menu')} {/* Translate the menu title */}
          </h2>
        </div>
        <NavigationItems />
        <div className="mt-auto pt-4 border-t">
          <div className="flex items-center space-x-2 px-3 py-2 rounded-md bg-muted/50">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"/>
            <span className="text-sm text-muted-foreground">{t('navigation.online')}</span> {/* Translate online status */}
          </div>
        </div>
      </nav>
    </>
  );
}

export default MainNav;