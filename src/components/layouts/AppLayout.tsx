import { ReactNode, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Home, Users, MessageSquare, Settings } from "lucide-react";
import MainNav from "../navigation/MainNav";
import { NotificationDropdown } from "../notifications/NotificationDropdown";
import { supabase } from "@/lib/supabase";
import subscriptionManager from "@/utils/subscriptionManager";
import { useAuth } from '@/providers/AuthProvider'; // Added import for useAuth


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
  const { user, refreshSubscriptions } = useAuth(); // Added to access user authentication status and refreshSubscriptions


  // Monitor connection status app-wide
  useEffect(() => {
    // Setup a global connection monitor
    const connectionKey = "app_connection_monitor";

    const channel = subscriptionManager.subscribe(connectionKey, () =>
      supabase.channel("global")
        .on("system", { event: "disconnect" }, (payload) => {
          console.log("Supabase disconnected:", payload);
          // Create a reconnection attempt
          setTimeout(() => {
            console.log("Attempting to reconnect...");
            // Force reconnection by creating a new subscription
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

    // When route changes, refresh any active subscriptions
    // This helps ensure data is fresh when switching between pages
    if (user?.id) {
      console.log('Route changed to:', location.pathname);

      // Call the AuthProvider's refreshSubscriptions method to refresh data
      if (location.pathname) {
        setTimeout(() => {
          console.log('Refreshing subscriptions after page change');
          // This will trigger a refresh of data in the current page
          refreshSubscriptions();
        }, 100);
      }
    }
  }, [location.pathname, user?.id, refreshSubscriptions]);

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Notification icon in top right corner - hidden on chat and settings pages */}
      {!location.pathname.includes('/chat') && !location.pathname.includes('/settings') && (
        <div className="absolute top-2 right-3 z-40 md:hidden">
          <NotificationDropdown className="mobile-touch-target" />
        </div>
      )}

      <div className="md:block">
        <MainNav />
      </div>
      <main className={`flex-1 pb-24 md:pb-4 pt-2 sm:pt-4 px-0 sm:px-3 md:px-6 overflow-x-hidden`}>{children}</main>

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