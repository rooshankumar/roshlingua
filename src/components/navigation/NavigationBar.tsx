import { Home, MessageSquare, Users, Settings, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Chat", href: "/chat", icon: MessageSquare },
  { name: "Community", href: "/community", icon: Users },
  { name: "Profile", href: "/profile", icon: User }, // Added Profile link
  { name: "Settings", href: "/settings", icon: Settings }
];

export const NavigationBar = () => {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === "/dashboard" && location.pathname === "/dashboard") {
      return true;
    }
    return location.pathname.startsWith(path) && path !== "/dashboard";
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col fixed h-full left-0 top-0 z-50">
        <div className="flex flex-col flex-grow pt-5 overflow-y-auto border-r border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">
          <div className="flex items-center flex-shrink-0 px-4 mb-8">
            <Link to="/" className="flex items-center">
              <span className="text-2xl font-semibold text-gradient">App</span>
            </Link>
          </div>
          <nav className="flex-1 px-2 pb-4 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "group flex items-center px-4 py-3 text-sm font-medium rounded-md transition-all",
                  isActive(item.href)
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-secondary"
                )}
              >
                <item.icon 
                  className={cn(
                    "mr-3 h-5 w-5 transition-colors",
                    isActive(item.href) ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75 z-50">
        <nav className="flex justify-around py-2">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex flex-col items-center p-2 rounded-md transition-all",
                isActive(item.href)
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs mt-1">{item.name}</span>
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
};