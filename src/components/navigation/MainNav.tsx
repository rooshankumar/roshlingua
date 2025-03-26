import * as React from "react"
import { NavLink, useLocation } from "react-router-dom";
import { Home, Users, MessageSquare, Settings } from "lucide-react";

const routes = [
  {
    path: "/",
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
  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <nav className="flex flex-col space-y-2 p-4">
      {routes.map((route) => (
        <NavLink
          key={route.path}
          to={route.path}
          className={`flex items-center space-x-2 px-3 py-2 rounded-md transition ${
            isActive(route.path) ? "bg-primary/10 text-primary" : "hover:bg-secondary"
          }`}
        >
          <route.icon className="h-5 w-5" />
          <span>{route.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export default MainNav;