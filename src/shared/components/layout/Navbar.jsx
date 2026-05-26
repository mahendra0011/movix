import { Link, useNavigate } from "@tanstack/react-router";
import { Search, MapPin, User, Film, LayoutDashboard } from "lucide-react";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { hydrateAuth, readStoredAuth } from "@/features/auth/authSlice";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

const navItems = [
  { label: "Movies", to: "/" },
  { label: "Stream", to: "/stream" },
  { label: "Events", to: "/events" },
  { label: "Plays", to: "/plays" },
  { label: "Sports", to: "/sports" },
];

function Navbar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const auth = useSelector((state) => state.auth);
  const [navSearch, setNavSearch] = useState("");
  const isAdmin = auth.user?.role === "admin";
  const accountPath = !auth.user ? "/auth" : isAdmin ? "/admin" : "/dashboard";
  const accountLabel = !auth.user ? "Sign in" : isAdmin ? "Admin" : "Dashboard";

  useEffect(() => {
    if (!auth.hydrated) dispatch(hydrateAuth(readStoredAuth()));
  }, [auth.hydrated, dispatch]);

  const submitSearch = async (event) => {
    event.preventDefault();
    await navigate({
      to: "/",
      search: navSearch.trim() ? { q: navSearch.trim() } : {},
    });
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
              placeholder="Search for movies, events, theaters..."
              className="h-10 border-border/60 bg-card/60 pl-9"
            />
          </form>
        </div>

        <Link
          to="/events"
          className="hidden items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground md:flex"
        >
          <MapPin className="h-4 w-4" />
          Bengaluru
        </Link>

        {isAdmin && (
          <Button size="sm" variant="secondary" className="hidden gap-2 sm:inline-flex" asChild>
            <Link to="/admin">
              <LayoutDashboard className="h-4 w-4" /> Admin panel
            </Link>
          </Button>
        )}

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
          <Link to={accountPath} className="whitespace-nowrap hover:text-foreground">
            Dashboard
          </Link>
        </div>
      </nav>
    </header>
  );
}
export { Navbar };
