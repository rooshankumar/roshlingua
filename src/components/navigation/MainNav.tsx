
import { Link, useLocation } from "react-router-dom";

const MainNav = () => {
  const location = useLocation();
  
  const navItems = [
    { path: "/dashboard", label: "Dashboard" },
    { path: "/community", label: "Community" },
    { path: "/profile", label: "Profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 w-full bg-background border-t md:relative md:border-t-0 md:border-r">
      <div className="md:sticky md:top-0 md:w-64 md:h-screen">
        <div className="flex md:flex-col gap-2 p-4">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex-1 p-3 rounded-lg transition-colors ${
                location.pathname === item.path
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default MainNav;
