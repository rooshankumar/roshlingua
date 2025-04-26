import { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Home, Users, MessageSquare, Settings } from "lucide-react";
import MainNav from "../navigation/MainNav";
import { NotificationDropdown } from "../notifications/NotificationDropdown";

interface AppLayoutProps {
  children: ReactNode;
}

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
    icon: MessageSquare
  },
  {
    path: "/settings",
    label: "Settings",
    icon: Settings
  }
];

const AppLayout = ({ children }: AppLayoutProps) => {
  const location = useLocation();
  const isChatDetailRoute = location.pathname.match(/^\/chat\/[0-9a-f-]+$/);
  const isMobile = window.innerWidth < 768;

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <div className="md:block">
        <MainNav />
      </div>
      <main className={`flex-1 pb-24 md:pb-4 pt-4 px-3 md:px-6`}>{children}</main>

      {/* Mobile Bottom Navigation */}
      {!isChatDetailRoute && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background/90 backdrop-blur-xl border-t flex justify-around p-2 z-50 shadow-lg safe-area-bottom">
          {routes.map((route) => {
            const isActive = location.pathname === route.path;
            
            return (
              <NavLink
                key={route.path}
                to={route.path}
                className={
                  `flex flex-col items-center p-2 rounded-lg transition-all duration-200 ${
                    isActive 
                      ? "text-primary scale-110 bg-primary/10" 
                      : "text-muted-foreground hover:text-primary hover:bg-primary/5 active:scale-95"
                  }`
                }
              >
                <route.icon className={`h-5 w-5 ${isActive ? 'animate-pulse' : ''}`} />
                <span className="text-xs mt-1 font-medium">{route.label}</span>
              </NavLink>
            );
          })}
          <div className="flex flex-col items-center p-2">
            <NotificationDropdown className="mobile-touch-target" />
            <span className="text-xs mt-1 font-medium">Alerts</span>
          </div>
        </nav>
      )}
      
      {/* Safe area for bottom padding in mobile browsers */}
      <style jsx="true" global="true">{`
        @supports (padding-bottom: env(safe-area-inset-bottom)) {
          .safe-area-bottom {
            padding-bottom: calc(0.5rem + env(safe-area-inset-bottom));
          }
        }
      `}</style>
    </div>
  );
};

export default AppLayout;