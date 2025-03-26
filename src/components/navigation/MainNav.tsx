import * as React from "react"
import { NavLink } from "react-router-dom"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

const routes = [
  {
    path: "/dashboard",
    label: "Dashboard"
  },
  {
    path: "/chat",
    label: "Chat"
  },
  {
    path: "/community",
    label: "Community"
  },
  {
    path: "/profile",
    label: "Profile"
  },
  {
    path: "/settings",
    label: "Settings"
  }
]

export function MainNav() {
  return (
    <div className="flex items-center">
      {/* Mobile Navigation */}
      <Sheet>
        <SheetTrigger asChild className="lg:hidden">
          <Button variant="ghost" size="icon" className="mr-2">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[240px] sm:w-[300px]">
          <nav className="flex flex-col gap-4">
            {routes.map((route) => (
              <NavLink
                key={route.path}
                to={route.path}
                className={({ isActive }) =>
                  cn(
                    "text-sm font-medium transition-colors hover:text-primary",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )
                }
              >
                {route.label}
              </NavLink>
            ))}
          </nav>
        </SheetContent>
      </Sheet>

      {/* Desktop Navigation */}
      <nav className="hidden lg:flex items-center gap-6 mx-6">
        {routes.map((route) => (
          <NavLink
            key={route.path}
            to={route.path}
            className={({ isActive }) =>
              cn(
                "text-sm font-medium transition-colors hover:text-primary",
                isActive ? "text-primary" : "text-muted-foreground"
              )
            }
          >
            {route.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export default MainNav;