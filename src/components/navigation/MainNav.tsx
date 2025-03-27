
import * as React from "react"
import { NavLink, useLocation } from "react-router-dom";
import { Home, Users, MessageSquare, Settings, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

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

export function MainNav() {
  const location = useLocation();
  const [open, setOpen] = React.useState(false);
  
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
          className={`flex items-center space-x-2 px-3 py-2 rounded-md transition ${
            isActive(route.path) ? "bg-primary/10 text-primary" : "hover:bg-secondary"
          }`}
        >
          <route.icon className="h-5 w-5" />
          <span>{route.label}</span>
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
      <nav className="hidden lg:flex flex-col space-y-2 p-4">
        <NavigationItems />
      </nav>
    </>
  );
}

export default MainNav;
