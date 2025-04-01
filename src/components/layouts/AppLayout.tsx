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
  const isChatRoute = location.pathname.startsWith('/chat');

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <div className="hidden md:block">
        <MainNav />
      </div>
      <main className="flex-1 pb-24 md:p-4 md:pb-4">{children}</main>

      {/* Mobile Bottom Navigation */}
      {!isChatRoute && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t flex justify-around p-2 z-50">
          {routes.map((route) => (
            <NavLink
              key={route.path}
              to={route.path}
              className={({ isActive }) =>
                `flex flex-col items-center p-2 ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`
              }
            >
              <route.icon className="h-5 w-5" />
              <span className="text-xs mt-1">{route.label}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
};

export default AppLayout;