import { Link, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  Building2,
  CalendarDays,
  Film,
  Heart,
  Home,
  LayoutDashboard,
  LogOut,
  Moon,
  Search,
  Sun,
  Ticket,
  User,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { hydrateAuth, logout, readStoredAuth } from "@/features/auth/authSlice";
import { theaters } from "@/features/movies/data/movieCatalog";
import { CitySelect } from "@/shared/components/location/CitySelect";
import { Button } from "@/shared/components/ui/button";
import { SearchBox } from "@/shared/components/ui/search-box";
import { createNotificationSocket } from "@/shared/services/socketClient";
import {
  readPreferredCity,
  subscribePreferredCity,
  writePreferredCity,
} from "@/shared/services/cityPreference";
import {
  readHomeSearchQuery,
  subscribeHomeSearchQuery,
  writeHomeSearchQuery,
} from "@/shared/services/homeSearch";
import { readSearchBoxValue } from "@/shared/services/searchBox";

const navItems = [
  { label: "Home", to: "/", icon: Home, exact: true },
  { label: "Movies", to: "/movies/", icon: Film },
  { label: "Coming Soon", to: "/coming-soon", icon: CalendarDays },
  { label: "Wishlist", to: "/wishlist", icon: Heart },
];

const panelLinks = [
  { label: "User Dashboard", to: "/dashboard", icon: User, roles: ["user"] },
  { label: "Theatre Owner Panel", to: "/owner", icon: Building2, roles: ["theater-owner"] },
  { label: "Admin Panel", to: "/admin", icon: LayoutDashboard, roles: ["admin"] },
];

const THEME_STORAGE_KEY = "movix-theme";
const MAX_NAV_NOTIFICATIONS = 8;

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
  const [searchValue, setSearchValue] = useState(readHomeSearchQuery);
  const [notifications, setNotifications] = useState([]);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState("connecting");
  const [unreadCount, setUnreadCount] = useState(3);
  const notificationRef = useRef(null);
  const notificationOpenRef = useRef(false);
  const citySuggestions = useMemo(() => theaters.map((theater) => theater.city), []);
  const isAdmin = auth.user?.role === "admin";
  const isOwner = auth.user?.role === "theater-owner";
  const accountPath = !auth.user ? "/auth" : isAdmin ? "/admin" : isOwner ? "/owner" : "/dashboard";
  const accountLabel = !auth.user
    ? "Login / Sign up"
    : isAdmin
      ? "Admin"
      : isOwner
        ? "Owner"
        : "Dashboard";
  const visiblePanelLinks = useMemo(
    () => panelLinks.filter((item) => auth.user && item.roles.includes(auth.user.role)),
    [auth.user],
  );

  useEffect(() => {
    if (!auth.hydrated) dispatch(hydrateAuth(readStoredAuth()));
  }, [auth.hydrated, dispatch]);

  useEffect(() => {
    const storedTheme = readTheme();
    setTheme(storedTheme);
    applyTheme(storedTheme);
  }, []);

  useEffect(() => subscribePreferredCity(setSelectedCity), []);
  useEffect(() => subscribeHomeSearchQuery(setSearchValue), []);

  useEffect(() => {
    notificationOpenRef.current = notificationOpen;
    if (notificationOpen) setUnreadCount(0);
  }, [notificationOpen]);

  useEffect(() => {
    if (!notificationOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!notificationRef.current?.contains(event.target)) setNotificationOpen(false);
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [notificationOpen]);

  useEffect(() => {
    if (!auth.hydrated) return undefined;
    let active = true;
    let notificationSocket;
    setNotificationStatus("connecting");

    createNotificationSocket()
      .then((socket) => {
        if (!active) {
          socket?.disconnect();
          return;
        }
        if (!socket) {
          setNotificationStatus("offline");
          return;
        }

        notificationSocket = socket;
        socket.on("connect", () => setNotificationStatus("live"));
        socket.on("disconnect", () => setNotificationStatus("offline"));
        socket.on("connect_error", () => setNotificationStatus("offline"));
        socket.on("notifications:sync", (items = []) => {
          setNotifications(normalizeNotifications(items));
        });
        socket.on("notification", (notification) => {
          setNotifications((current) => normalizeNotifications([notification, ...current]));
          if (!notificationOpenRef.current) setUnreadCount((current) => current + 1);
        });
      })
      .catch(() => active && setNotificationStatus("offline"));

    return () => {
      active = false;
      notificationSocket?.disconnect();
    };
  }, [auth.hydrated, auth.token]);

  const submitSearch = (event) => {
    event.preventDefault();
    const nextSearch = readSearchBoxValue(event.currentTarget);
    writeHomeSearchQuery(nextSearch);
    setSearchValue(nextSearch);
    if (!nextSearch || window.location.pathname === "/") return;
    void navigate({
      to: "/",
    });
  };

  const updateLiveSearch = (event) => {
    const nextSearch = event.currentTarget.value;
    setSearchValue(nextSearch);
    writeHomeSearchQuery(nextSearch);
    if (!nextSearch.trim() || window.location.pathname === "/") return;
    void navigate({ to: "/" });
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

  const handleLogout = () => {
    dispatch(logout());
    setNotificationOpen(false);
    void navigate({ to: "/auth" });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1560px] items-center gap-2 px-4 sm:gap-4 sm:px-5 lg:px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-primary">
            <Ticket className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight">
            mov<span className="text-primary">i</span>x
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
              value={searchValue}
              onChange={updateLiveSearch}
              placeholder="Search for movies, cinemas..."
              className="h-10 border border-border/60 bg-card/70 pl-9 shadow-sm"
            />
          </form>
        </div>

        <div className="hidden items-center gap-2 xl:flex">
          {visiblePanelLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.to}
                size="sm"
                variant="secondary"
                asChild
                className="border border-border/60 bg-card/70 hover:bg-primary/10 hover:text-primary"
              >
                <Link to={item.to}>
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </Button>
            );
          })}
        </div>

        <div ref={notificationRef} className="relative">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setNotificationOpen((current) => !current)}
            className="relative gap-2"
            aria-label="Notifications"
            aria-expanded={notificationOpen}
          >
            <Bell className="h-4 w-4" />
            <span className="hidden lg:inline">Alerts</span>
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>

          {notificationOpen && (
            <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-border/70 bg-popover shadow-2xl">
              <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
                <div>
                  <p className="text-sm font-semibold">Notifications</p>
                  <p className="text-xs text-muted-foreground">
                    {notificationStatus === "live"
                      ? "Live alerts active"
                      : notificationStatus === "connecting"
                        ? "Connecting alerts..."
                        : "Alerts offline"}
                  </p>
                </div>
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    notificationStatus === "live" ? "bg-emerald-400" : "bg-amber-400"
                  }`}
                />
              </div>

              <div className="max-h-80 overflow-y-auto py-1">
                {notifications.length ? (
                  notifications.map((notification) => (
                    <a
                      key={notification.id}
                      href={notification.href || "#"}
                      onClick={() => setNotificationOpen(false)}
                      className="block border-b border-border/40 px-3 py-2.5 last:border-b-0 hover:bg-accent"
                    >
                      <span className="block text-sm font-medium">{notification.title}</span>
                      <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                        {notification.message}
                      </span>
                      <span className="mt-1 block text-[11px] text-muted-foreground">
                        {formatNotificationTime(notification.createdAt)}
                      </span>
                    </a>
                  ))
                ) : (
                  <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                    No live notifications yet
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <Button
          type="button"
          size="icon"
          variant="secondary"
          onClick={toggleTheme}
          aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
        >
          {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </Button>

        {auth.user ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={handleLogout}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        ) : (
          <Button size="sm" className="gap-2" asChild>
            <Link to={accountPath}>
              <User className="h-4 w-4" /> <span className="hidden sm:inline">{accountLabel}</span>
            </Link>
          </Button>
        )}
      </div>

      {visiblePanelLinks.length > 0 && (
        <div className="border-t border-border/60 px-4 py-2 xl:hidden">
          <div className="mx-auto flex max-w-[1560px] gap-2 overflow-x-auto">
            {visiblePanelLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.to}
                  size="sm"
                  variant="secondary"
                  asChild
                  className="shrink-0 border border-border/60 bg-card/70 hover:bg-primary/10 hover:text-primary"
                >
                  <Link to={item.to}>
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                </Button>
              );
            })}
          </div>
        </div>
      )}

      <div className="border-t border-border/60 px-4 py-2 md:hidden">
        <form onSubmit={submitSearch} className="relative mx-auto max-w-[1560px]">
          <button
            type="submit"
            className="absolute left-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-primary"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </button>
          <SearchBox
            value={searchValue}
            onChange={updateLiveSearch}
            placeholder="Search movies, cinemas..."
            className="h-10 border border-border/60 bg-card/60 pl-9"
          />
        </form>
      </div>

      <nav className="border-t border-border/60">
        <div className="mx-auto flex max-w-[1560px] gap-6 overflow-x-auto px-4 py-2 sm:px-5 lg:px-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                to={item.to}
                search={item.to === "/movies/" ? { city: selectedCity } : undefined}
                activeOptions={{ exact: item.exact }}
                activeProps={{ className: "text-primary [&>span]:scale-x-100" }}
                inactiveProps={{ className: "text-muted-foreground" }}
                className="group relative inline-flex min-h-9 shrink-0 items-center gap-2 text-sm font-semibold transition-colors hover:text-primary"
              >
                <Icon className="h-4 w-4" />
                {item.label}
                <span className="absolute inset-x-0 -bottom-2 h-0.5 scale-x-0 rounded-full bg-primary transition-transform group-hover:scale-x-100" />
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}

function normalizeNotifications(items) {
  const seen = new Set();
  return items
    .filter(Boolean)
    .filter((notification) => {
      const key = notification.id || `${notification.title}-${notification.createdAt}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_NAV_NOTIFICATIONS);
}

function formatNotificationTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export { Navbar };
