import { ReactNode, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import MainNav from "../navigation/MainNav";
import { NotificationDropdown } from "../notifications/NotificationDropdown";
import { supabase } from "@/lib/supabase";
import subscriptionManager from "@/utils/subscriptionManager";
import { useAuth } from '@/providers/AuthProvider';
import RealtimeConnectionCheck from "../RealtimeConnectionCheck";
import PageTransition from "../PageTransition";

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

interface AppLayoutProps {
  children: ReactNode;
}

const routes = [
  {
    path: "/Dashboard",
    label: "Dashboard",
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
    icon: (props) => <CustomIcon src="/icons/chat-icon.png" {...props} />
  },
  {
    path: "/settings",
    label: "Settings",
    icon: (props) => <CustomIcon src="/icons/settings-icon.png" {...props} />
  }
];

const AppLayout = ({ children }: AppLayoutProps) => {
  const location = useLocation();
  const isChatDetailRoute = location.pathname.match(/^\/chat\/[0-9a-f-]+$/);
  const isMobile = window.innerWidth < 768;
  const { user, refreshSubscriptions } = useAuth();


  // Monitor connection status app-wide
  useEffect(() => {
    const connectionKey = "app_connection_monitor";

    const channel = subscriptionManager.subscribe(connectionKey, () =>
      supabase.channel("global")
        .on("system", { event: "disconnect" }, (payload) => {
          console.log("Supabase disconnected:", payload);
          setTimeout(() => {
            console.log("Attempting to reconnect...");
            subscriptionManager.unsubscribe(connectionKey);
            subscriptionManager.subscribe(connectionKey, () =>
              supabase.channel("global-reconnect")
            );
          }, 2000);
        })
        .subscribe()
    );

    return () => {
      subscriptionManager.unsubscribe(connectionKey);
    };
  }, []);

  // Track scrolling positions and handle route changes
  useEffect(() => {
    window.scrollTo(0, 0);

    if (user?.id) {
      console.log('Route changed to:', location.pathname);
      if (location.pathname) {
        setTimeout(() => {
          console.log('Refreshing subscriptions after page change');
          refreshSubscriptions();
        }, 100);
      }
    }
  }, [location.pathname, user?.id, refreshSubscriptions]);

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {!location.pathname.includes('/chat') && !location.pathname.includes('/settings') && (
        <div className="absolute top-2 right-3 z-40 md:hidden">
          {/* Notification dropdown removed */}
        </div>
      )}

      <div className="md:block">
        <MainNav />
      </div>
      <main className={`flex-1 pb-24 md:pb-4 pt-2 sm:pt-4 px-0 sm:px-3 md:px-6 overflow-x-hidden ${location.pathname.includes('/chat/') ? 'md:p-0' : ''}`}>
        <PageTransition>{children}</PageTransition>
      </main>

      {!isChatDetailRoute && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background/90 backdrop-blur-xl border-t flex justify-around p-2 z-50 shadow-lg safe-area-bottom">
          {routes.map((route) => {
            const isActive = location.pathname === route.path;

            return (
              <NavLink
                key={route.path}
                to={route.path}
                className={
                  `flex flex-col items-center p-2 rounded-lg transition-colors duration-200 ${
                    isActive 
                      ? "text-primary bg-primary/10" 
                      : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                  }`
                }
              >
                <route.icon size={20} className={`${isActive ? 'animate-pulse' : ''}`} />
                <span className="text-xs mt-1 font-medium">{route.label}</span>
              </NavLink>
            );
          })}
        </nav>
      )}

      {/* Add hidden real-time connection health check */}
      <div className="hidden">
        {/* RealtimeConnectionCheck component needs to be implemented */}
        <RealtimeConnectionCheck /> {/* Placeholder -  Implementation missing */}
      </div>

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