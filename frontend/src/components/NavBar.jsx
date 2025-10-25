import { Link, useLocation } from "react-router-dom";
import {
  Home,
  BarChart2,
  ArrowLeftRight,
  Grid2X2,
  User,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Home", path: "/dashboard", icon: Home },
  { label: "Analysis", path: "/analysis", icon: BarChart2 },
  { label: "Transactions", path: "/transactions", icon: ArrowLeftRight },
  { label: "Categories", path: "/categories", icon: Grid2X2 },
  { label: "Profile", path: "/profile", icon: User },
];

export default function NavBar() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-4 left-1/2 z-30 w-[90%] max-w-md -translate-x-1/2 rounded-full bg-base-card/95 px-6 py-4 shadow-soft border border-border/60">
      <div className="flex items-center justify-between">
        {NAV_ITEMS.map(({ label, path, icon: Icon }) => {
          const active = location.pathname.startsWith(path);
          return (
            <Link
              key={path}
              to={path}
              className={`flex h-12 w-12 items-center justify-center rounded-full transition ${
                active
                  ? "bg-brand text-base-dark shadow-card"
                  : "text-text-muted hover:text-text-secondary"
              }`}
              title={label}
            >
              <Icon size={20} />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
