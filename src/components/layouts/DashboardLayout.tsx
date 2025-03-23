
import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Users, MessageSquare, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface DashboardLayoutProps {
  children: ReactNode;
  onLogout: () => void;
}

const DashboardLayout = ({ children, onLogout }: DashboardLayoutProps) => {
  const location = useLocation();
  
  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    { name: "Community", href: "/community", icon: Users },
    { name: "Chats", href: "/chat/inbox", icon: MessageSquare },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  const isActive = (path: string) => {
    if (path === "/dashboard" && location.pathname === "/dashboard") {
      return true;
    }
    
    return location.pathname.startsWith(path) && path !== "/dashboard";
  };
  
  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col">
        <div className="flex flex-col flex-grow pt-5 overflow-y-auto border-r border-border bg-card">
          <div className="flex items-center flex-shrink-0 px-4 mb-8">
            <Link to="/" className="flex items-center">
              <span className="text-2xl font-semibold text-gradient">Languagelandia</span>
            </Link>
          </div>
          <div className="flex flex-col flex-grow">
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
              
              <button
                onClick={onLogout}
                className="w-full group flex items-center px-4 py-3 text-sm font-medium rounded-md text-foreground hover:bg-destructive/10 hover:text-destructive transition-all mt-6"
              >
                <LogOut className="mr-3 h-5 w-5 text-muted-foreground group-hover:text-destructive" />
                Logout
              </button>
            </nav>
          </div>
          <div className="flex items-center justify-between p-4 border-t border-border">
            <div className="flex items-center">
              <Avatar className="h-8 w-8">
                <AvatarImage src="/placeholder.svg" alt="Avatar" />
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
              <div className="ml-3">
                <p className="text-sm font-medium">User Name</p>
                <p className="text-xs text-muted-foreground">View Profile</p>
              </div>
            </div>
            <ModeToggle />
          </div>
        </div>
      </div>
      
      {/* Mobile nav */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border p-2 flex justify-around md:hidden">
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
      </div>
      
      {/* Main content */}
      <div className="flex flex-col flex-1 w-0 overflow-hidden">
        <main className="relative flex-1 overflow-y-auto focus:outline-none pb-16 md:pb-0">
          <div className="py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
