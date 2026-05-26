import { Link, useNavigate } from "@tanstack/react-router";
import { Search, User, Film, LayoutDashboard, Moon, Sun, Building2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { hydrateAuth, readStoredAuth } from "@/features/auth/authSlice";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

const navItems = [
  { label: "Movies", to: "/" },
  { label: "Sports", to: "/sports" },
];
const THEME_STORAGE_KEY = "bms-theme";

function applyTheme(theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("light", theme === "light");
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
}

function readTheme() {
  if (typeof window === "undefined") return "dark";
  return window.localStorage.getItem(THEME_STORAGE_KEY) === "light" ? "light" : "dark";
}

function Navbar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const auth = useSelector((state) => state.auth);
  const [navSearch, setNavSearch] = useState("");
  const [theme, setTheme] = useState("dark");
  const isAdmin = auth.user?.role === "admin";
  const isOwner = auth.user?.role === "theater-owner";
  const accountPath = !auth.user ? "/auth" : isAdmin ? "/admin" : isOwner ? "/owner" : "/dashboard";
  const accountLabel = !auth.user ? "Sign in" : isAdmin ? "Admin" : isOwner ? "Owner" : "Dashboard";

  useEffect(() => {
    if (!auth.hydrated) dispatch(hydrateAuth(readStoredAuth()));
  }, [auth.hydrated, dispatch]);

  useEffect(() => {
    const storedTheme = readTheme();
    setTheme(storedTheme);
    applyTheme(storedTheme);
  }, []);

  const submitSearch = async (event) => {
    event.preventDefault();
    await navigate({
      to: "/",
      search: navSearch.trim() ? { q: navSearch.trim() } : {},
    });
  };

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    applyTheme(nextTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-primary">
            <Film className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight">
            book<span className="text-primary">my</span>screen
          </span>
        </Link>

        <div className="ml-4 hidden flex-1 md:block">
          <form onSubmit={submitSearch} className="relative max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={navSearch}
              onChange={(event) => setNavSearch(event.target.value)}
              placeholder="Search for movies, theaters..."
              className="h-10 border-border/60 bg-card/60 pl-9"
            />
          </form>
        </div>

        {isAdmin && (
          <Button size="sm" variant="secondary" className="hidden gap-2 sm:inline-flex" asChild>
            <Link to="/admin">
              <LayoutDashboard className="h-4 w-4" /> Admin panel
            </Link>
          </Button>
        )}

        {isOwner && (
          <Button size="sm" variant="secondary" className="hidden gap-2 sm:inline-flex" asChild>
            <Link to="/owner">
              <Building2 className="h-4 w-4" /> Owner panel
            </Link>
          </Button>
        )}

        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={toggleTheme}
          className="gap-2"
          aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
        >
          {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          <span className="hidden sm:inline">{theme === "light" ? "Dark" : "Light"}</span>
        </Button>

        <Button size="sm" className="gap-2" asChild>
          <Link to={accountPath}>
            <User className="h-4 w-4" /> {accountLabel}
          </Link>
        </Button>
      </div>

      <nav className="border-t border-border/60">
        <div className="mx-auto flex max-w-7xl gap-6 overflow-x-auto px-4 py-2 text-sm text-muted-foreground">
          {navItems.map((item) => (
            <Link key={item.to} to={item.to} className="whitespace-nowrap hover:text-foreground">
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
export { Navbar };
