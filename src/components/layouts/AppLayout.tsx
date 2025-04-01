import { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Home, Users, MessageSquare, Settings } from "lucide-react";
import MainNav from "../navigation/MainNav";

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

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <div className="hidden md:block">
        <MainNav />
      </div>
      <main className="flex-1 pb-24 md:p-4 md:pb-4">{children}</main>

      {/* Mobile Bottom Navigation */}
      {!isChatDetailRoute && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-lg border-t flex justify-around p-2 z-50 shadow-lg">
          {routes.map((route) => (
            <NavLink
              key={route.path}
              to={route.path}
              className={({ isActive }) =>
                `flex flex-col items-center p-2 rounded-lg transition-all duration-200 ${
                  isActive 
                    ? "text-primary scale-110 bg-primary/10" 
                    : "text-muted-foreground hover:text-primary hover:bg-primary/5 active:scale-95"
                }`
              }
            >
              <route.icon className={`h-5 w-5 transition-transform duration-200`} />
              <span className="text-xs mt-1 font-medium">{route.label}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
};

export default AppLayout;