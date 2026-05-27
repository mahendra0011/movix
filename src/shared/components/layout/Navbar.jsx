import { Link, useNavigate } from "@tanstack/react-router";
import { Search, User, Film, LayoutDashboard, Moon, Sun, Building2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { hydrateAuth, readStoredAuth } from "@/features/auth/authSlice";
import { theaters } from "@/features/movies/data/movieCatalog";
import { CitySelect } from "@/shared/components/location/CitySelect";
import { Button } from "@/shared/components/ui/button";
import { SearchBox } from "@/shared/components/ui/search-box";
import {
  readPreferredCity,
  subscribePreferredCity,
  writePreferredCity,
} from "@/shared/services/cityPreference";
import { writeHomeSearchQuery } from "@/shared/services/homeSearch";
import { clearSearchBox, readSearchBoxValue } from "@/shared/services/searchBox";

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
  if (typeof window === "undefined") return "light";
  return window.localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
}

function Navbar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const auth = useSelector((state) => state.auth);
  const [theme, setTheme] = useState("light");
  const [selectedCity, setSelectedCity] = useState(readPreferredCity);
  const citySuggestions = useMemo(() => theaters.map((theater) => theater.city), []);
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

  useEffect(() => subscribePreferredCity(setSelectedCity), []);

  const submitSearch = (event) => {
    event.preventDefault();
    const nextSearch = readSearchBoxValue(event.currentTarget);
    writeHomeSearchQuery(nextSearch);
    clearSearchBox(event.currentTarget);
    if (window.location.pathname === "/") return;
    void navigate({
      to: "/",
    });
  };

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    applyTheme(nextTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  };

  const changeCity = (nextCity) => {
    setSelectedCity(nextCity);
    writePreferredCity(nextCity);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:gap-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-primary">
            <Film className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight">
            movie<span className="text-primary">x</span>
          </span>
        </Link>

        <CitySelect
          value={selectedCity}
          options={citySuggestions}
          onChange={changeCity}
          selectClassName="w-[92px] text-xs sm:w-32 sm:text-sm"
        />

        <div className="ml-4 hidden flex-1 md:block">
          <form onSubmit={submitSearch} className="relative max-w-xl">
            <button
              type="submit"
              className="absolute left-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-primary"
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </button>
            <SearchBox
              placeholder="Search for movies..."
              className="h-10 border border-border/60 bg-card/60 pl-9"
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
            <User className="h-4 w-4" /> <span className="hidden sm:inline">{accountLabel}</span>
          </Link>
        </Button>
      </div>

      <div className="border-t border-border/60 px-4 py-2 md:hidden">
        <form onSubmit={submitSearch} className="relative mx-auto max-w-7xl">
          <button
            type="submit"
            className="absolute left-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-primary"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </button>
          <SearchBox
            placeholder="Search movies..."
            className="h-10 border border-border/60 bg-card/60 pl-9"
          />
        </form>
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
