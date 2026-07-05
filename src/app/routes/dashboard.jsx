import { Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  CalendarDays,
  Clapperboard,
  Download,
  FileText,
  Heart,
  LogIn,
  LogOut,
  MailCheck,
  ShieldCheck,
  Sparkles,
  Ticket,
  WalletCards,
  X,
} from "lucide-react";
import { useGetMyBookingsQuery } from "@/features/booking/api/bookingApiEndpoints";
import { movies } from "@/features/movies/data/movieCatalog";
import { movieImageFallback, normalizeMovieImageUrl } from "@/features/movies/services/movieMedia";
import { hydrateAuth, logout, readStoredAuth } from "@/features/auth/authSlice";
import { SpotlightCard } from "@/shared/components/reactbits/SpotlightCard";
import { Button } from "@/shared/components/ui/button";
import { SkeletonList } from "@/shared/components/ui/skeleton";
import { apiUrl } from "@/features/api/baseApi";
import { usePageMeta } from "@/shared/hooks/usePageMeta";

function UserDashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const auth = useSelector((state) => state.auth);
  const accountRole = auth.user?.role;
  const accountEmail = auth.user?.email;
  const [shortlist, setShortlist] = useState([]);
  const {
    data: bookingsData,
    isLoading,
    error,
  } = useGetMyBookingsQuery(undefined, {
    skip: !auth.hydrated || accountRole !== "user",
  });
  const bookings = bookingsData ?? [];
  const isError = Boolean(error);

  usePageMeta({ title: "Dashboard" });

  useEffect(() => {
    if (!auth.hydrated) dispatch(hydrateAuth(readStoredAuth()));
  }, [auth.hydrated, dispatch]);

  useEffect(() => {
    if (!auth.hydrated) return;
    if (accountRole === "admin") navigate("/admin", { replace: true });
    if (accountRole === "theater-owner") navigate("/owner", { replace: true });
  }, [accountRole, auth.hydrated, navigate]);

  useEffect(() => {
    if (error && [401, 403].includes(error.status)) {
      dispatch(logout());
    }
  }, [error, dispatch]);

  useEffect(() => {
    if (!auth.hydrated || !accountEmail || accountRole !== "user") return;
    setShortlist(readShortlist());
  }, [accountEmail, accountRole, auth.hydrated]);

  const removeShortlist = (id) => {
    const next = shortlist.filter((item) => item.id !== id);
    setShortlist(next);
    writeShortlist(next);
  };

  const stats = useMemo(() => {
    const totalSpent = bookings.reduce((sum, booking) => sum + Number(booking.total || 0), 0);
    const seats = bookings.reduce((sum, booking) => sum + (booking.seats?.length ?? 0), 0);
    return [
      {
        label: "Tickets",
        value: bookings.length.toLocaleString(),
        text: "Confirmed bookings",
        icon: Ticket,
      },
      {
        label: "Seats",
        value: seats.toLocaleString(),
        text: "Seats booked by you",
        icon: CalendarDays,
      },
      {
        label: "Total paid",
        value: formatCurrency(totalSpent),
        text: "Across your ticket history",
        icon: WalletCards,
      },
    ];
  }, [bookings]);

  const recommendations = useMemo(() => movies.slice(0, 4), []);

  if (!auth.hydrated) {
    return (
      <DashboardAccessState
        icon={ShieldCheck}
        title="Checking your session"
        text="Your dashboard is loading securely."
      />
    );
  }

  if (!auth.user) {
    return (
      <DashboardAccessState
        icon={LogIn}
        title="Sign in to open your dashboard"
        text="Your tickets, invoices and account details appear here after email OTP login."
        action={
          <Button asChild>
            <Link to="/auth">Sign in</Link>
          </Button>
        }
      />
    );
  }

  if (auth.user.role === "admin") {
    return (
      <DashboardAccessState
        icon={ShieldCheck}
        title="Opening admin panel"
        text="Admin accounts use the operations dashboard."
      />
    );
  }

  if (auth.user.role === "theater-owner") {
    return (
      <DashboardAccessState
        icon={ShieldCheck}
        title="Opening owner panel"
        text="Theater owner accounts use the cinema operations dashboard."
      />
    );
  }

  return (
    <div className="mx-auto max-w-[1560px] px-4 py-8 pb-20 sm:px-5 lg:px-6">
      <section className="cinema-grid overflow-hidden rounded-lg border border-border/60 bg-card/75 shadow-2xl shadow-black/20">
        <div className="grid gap-6 p-6 lg:grid-cols-[1.2fr_0.8fr] lg:p-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">
              <ShieldCheck className="h-4 w-4" />
              User dashboard
            </div>
            <h1 className="mt-5 max-w-3xl text-3xl font-bold tracking-tight md:text-5xl">
              Welcome back, {auth.user.name || "movie lover"}.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Manage your tickets, download invoices and continue booking from your personal account
              workspace.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/">Browse movies</Link>
              </Button>
              <Button variant="secondary" onClick={() => dispatch(logout())} className="gap-2">
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            </div>
          </div>

          <SpotlightCard className="rounded-lg p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="grid h-12 w-12 place-items-center rounded-lg bg-primary/15 text-primary">
                <MailCheck className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-xs uppercase text-muted-foreground">Verified account</p>
                <h2 className="mt-1 truncate text-xl font-bold">{auth.user.email}</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Email OTP is required before every login and ticket payment confirmation.
                </p>
              </div>
            </div>
          </SpotlightCard>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {stats.map((stat) => (
          <UserMetric key={stat.label} {...stat} />
        ))}
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <SpotlightCard className="rounded-lg p-5">
          <PanelHeader
            icon={Ticket}
            title="My tickets"
            subtitle={
              isLoading
                ? "Loading your confirmed bookings"
                : "Real bookings linked to your account email"
            }
          />
          <div className="mt-5">
            {bookings.length ? (
              <div className="overflow-hidden rounded-lg border border-border/60">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-left text-sm">
                    <thead className="bg-muted/40 text-xs text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-medium">Reference</th>
                        <th className="px-4 py-3 font-medium">Movie</th>
                        <th className="px-4 py-3 font-medium">Time</th>
                        <th className="px-4 py-3 font-medium">Seats</th>
                        <th className="px-4 py-3 font-medium">Total</th>
                        <th className="px-4 py-3 font-medium">Files</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {bookings.map((booking) => (
                        <tr key={booking.ref} className="bg-card/20">
                          <td className="px-4 py-3 font-mono text-xs text-primary">
                            {booking.ref}
                          </td>
                          <td className="px-4 py-3 font-medium">{booking.movie}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {booking.theater} - {booking.time}
                          </td>
                          <td className="px-4 py-3">{booking.seats.join(", ")}</td>
                          <td className="px-4 py-3 font-semibold">
                            {formatCurrency(booking.total)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <IconLink href={apiUrl(booking.ticketUrl)} label="Ticket">
                                <Download className="h-4 w-4" />
                              </IconLink>
                              <IconLink href={apiUrl(booking.invoiceUrl)} label="Invoice">
                                <FileText className="h-4 w-4" />
                              </IconLink>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : isLoading ? (
              <SkeletonList count={3} />
            ) : (
              <EmptyTicketState isLoading={isLoading} isError={isError} />
            )}
          </div>
        </SpotlightCard>

        <SpotlightCard className="rounded-lg p-5">
          <PanelHeader
            icon={Sparkles}
            title="Continue booking"
            subtitle="Quick picks from the live movie catalog"
          />
          <div className="mt-5 grid gap-3">
            {recommendations.map((movie) => (
              <Link
                key={movie.id}
                to={"/movies/" + movie.id}
                className="group grid grid-cols-[64px_1fr_auto] items-center gap-3 rounded-lg border border-border/60 bg-background/35 p-2 transition-colors hover:border-primary/50"
              >
                <img
                  src={normalizeMovieImageUrl(movie.poster, movie.title, "poster")}
                  alt={movie.title}
                  className="h-20 w-16 rounded-md object-cover"
                  onError={(event) => {
                    event.currentTarget.src = movieImageFallback(movie.title, "poster");
                  }}
                />
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold">{movie.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {movie.language} - {movie.duration}
                  </p>
                  <p className="mt-1 text-xs text-primary">{movie.rating}/10 rating</p>
                </div>
                <Clapperboard className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
              </Link>
            ))}
          </div>
        </SpotlightCard>
      </section>

      <section className="mt-6">
        <SpotlightCard className="rounded-lg p-5">
          <PanelHeader
            icon={Heart}
            title="My shortlist"
            subtitle="Movies saved from the frontend"
          />
          {shortlist.length ? (
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {shortlist.map((item) => (
                <div
                  key={item.id}
                  className="group overflow-hidden rounded-lg border border-border/60 bg-background/35"
                >
                  <img src={item.image} alt={item.title} className="h-32 w-full object-cover" />
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[11px] uppercase text-primary">{item.category}</p>
                        <h3 className="mt-1 truncate text-sm font-semibold">{item.title}</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeShortlist(item.id)}
                        aria-label={`Remove ${item.title}`}
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="mt-2 truncate text-xs text-muted-foreground">
                      {item.venue || "movix"}
                    </p>
                    {item.date && <p className="mt-1 text-xs text-primary">{item.date}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-lg border border-dashed border-border/70 p-6 text-center">
              <p className="text-sm font-semibold">No saved items yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Use Watchlist, Shortlist or Remind me anywhere in the app and it will appear here.
              </p>
            </div>
          )}
        </SpotlightCard>
      </section>
    </div>
  );
}

function DashboardAccessState({ icon: Icon, title, text, action }) {
  return (
    <div className="mx-auto grid min-h-[calc(100vh-190px)] max-w-3xl place-items-center px-4 py-12">
      <SpotlightCard className="w-full rounded-lg p-6 text-center shadow-2xl shadow-black/20">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-lg bg-primary/15 text-primary">
          <Icon className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{text}</p>
        {action && <div className="mt-6 flex justify-center">{action}</div>}
      </SpotlightCard>
    </div>
  );
}

function UserMetric({ icon: Icon, label, value, text }) {
  return (
    <SpotlightCard className="rounded-lg p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-bold">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{text}</p>
        </div>
        <div className="grid h-11 w-11 place-items-center rounded-lg bg-primary/15 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </SpotlightCard>
  );
}

function PanelHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-start gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h2 className="font-semibold">{title}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function EmptyTicketState({ isLoading, isError }) {
  const text = isError
    ? "Could not load tickets right now. Try again after the API is running."
    : "Bookings made with your account email will appear here with ticket and invoice downloads.";

  return (
    <div className="grid min-h-72 place-items-center rounded-lg border border-dashed border-border/70 p-6 text-center">
      <div>
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-muted text-muted-foreground">
          <Ticket className="h-6 w-6" />
        </div>
        <h3 className="mt-4 font-semibold">No tickets yet</h3>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{text}</p>
        <Button className="mt-5" asChild>
          <Link to="/">Book your first ticket</Link>
        </Button>
      </div>
    </div>
  );
}

function IconLink({ href, label, children }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      title={label}
      className="grid h-9 w-9 place-items-center rounded-md border border-border/60 bg-background/60 text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
    >
      {children}
    </a>
  );
}

function formatCurrency(value) {
  return `Rs ${Number(value || 0).toLocaleString("en-IN")}`;
}

function readShortlist() {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem("movix-shortlist") || "[]");
  } catch {
    return [];
  }
}

function writeShortlist(items) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("movix-shortlist", JSON.stringify(items));
}

export { UserDashboard };
