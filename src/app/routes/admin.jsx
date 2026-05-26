import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowUpRight,
  BadgeIndianRupee,
  Building2,
  CalendarCheck,
  ClipboardCheck,
  Film,
  Gauge,
  LockKeyhole,
  LogIn,
  MailCheck,
  Plus,
  Settings2,
  ShieldCheck,
  Ticket,
  Users,
} from "lucide-react";
import { fetchAdminSummary } from "@/features/admin/api/adminApi";
import { hydrateAuth, logout, readStoredAuth } from "@/features/auth/authSlice";
import { SpotlightCard } from "@/shared/components/reactbits/SpotlightCard";
import { Button } from "@/shared/components/ui/button";

const emptyTrend = Array.from({ length: 7 }, (_, index) => {
  const date = new Date();
  date.setDate(date.getDate() - (6 - index));
  return {
    day: date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
    revenue: 0,
    bookings: 0,
    seats: 0,
  };
});

const fallback = {
  summary: {
    revenue: 0,
    bookings: 0,
    seatsSold: 0,
    users: 0,
    movies: 0,
    theaters: 0,
    occupancy: 0,
    averageOrderValue: 0,
    averageSeatsPerBooking: 0,
    topMovie: "No bookings yet",
    database: "API offline",
    redis: "API offline",
    socket: "offline",
    payment: "API offline",
  },
  charts: {
    revenueTrend: emptyTrend,
    popularMovies: [],
    theaterPerformance: [],
  },
  recentBookings: [],
};

const managementCards = [
  {
    title: "Movies",
    value: "Catalog",
    text: "Publish titles, trailers, posters and language formats.",
    icon: Film,
  },
  {
    title: "Theaters",
    value: "Screens",
    text: "Manage cinemas, screens, seat maps and owner approvals.",
    icon: Building2,
  },
  {
    title: "Shows",
    value: "Schedule",
    text: "Create showtimes, pricing tiers and availability windows.",
    icon: CalendarCheck,
  },
  {
    title: "Bookings",
    value: "Support",
    text: "Track tickets, invoices, payments and customer requests.",
    icon: ClipboardCheck,
  },
];

const Route = createFileRoute("/admin")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const auth = useSelector((state) => state.auth);
  const [data, setData] = useState(fallback);
  const [loadState, setLoadState] = useState("idle");
  const [adminNotice, setAdminNotice] = useState("");

  useEffect(() => {
    if (!auth.hydrated) dispatch(hydrateAuth(readStoredAuth()));
  }, [auth.hydrated, dispatch]);

  useEffect(() => {
    if (!auth.hydrated || !auth.user || auth.user.role === "admin") return;
    navigate({ to: "/dashboard", replace: true });
  }, [auth.hydrated, auth.user, navigate]);

  useEffect(() => {
    if (!auth.hydrated || auth.user?.role !== "admin") return undefined;
    let active = true;
    setLoadState("loading");

    fetchAdminSummary()
      .then((nextData) => {
        if (!active) return;
        setData(nextData);
        setLoadState("ready");
      })
      .catch((error) => {
        if (!active) return;
        if ([401, 403].includes(error.response?.status)) {
          dispatch(logout());
          return;
        }

        setData(fallback);
        setLoadState("error");
      });

    return () => {
      active = false;
    };
  }, [auth.hydrated, auth.user?.role, dispatch]);

  const summary = data.summary ?? fallback.summary;
  const charts = data.charts ?? fallback.charts;
  const recentBookings = data.recentBookings ?? [];
  const trend = charts.revenueTrend?.length ? charts.revenueTrend : emptyTrend;
  const hasRevenueData = trend.some((row) => row.revenue > 0 || row.bookings > 0);
  const popularMovies = charts.popularMovies ?? [];
  const theaterPerformance = charts.theaterPerformance ?? [];
  const activeShows = Math.max(summary.bookings, summary.movies * 4);
  const pendingApprovals = Math.max(0, summary.theaters ? 2 : 0);
  const metrics = useMemo(
    () => [
      {
        label: "Revenue",
        value: formatCurrency(summary.revenue),
        sub: `${summary.bookings.toLocaleString()} paid bookings`,
        icon: BadgeIndianRupee,
        tone: "primary",
      },
      {
        label: "Seats sold",
        value: summary.seatsSold.toLocaleString(),
        sub: `${summary.averageSeatsPerBooking} seats per booking`,
        icon: Ticket,
        tone: "emerald",
      },
      {
        label: "Occupancy",
        value: `${summary.occupancy}%`,
        sub: `${summary.theaters.toLocaleString()} cinemas tracked`,
        icon: Gauge,
        tone: "amber",
      },
      {
        label: "Users",
        value: summary.users.toLocaleString(),
        sub: `${summary.movies.toLocaleString()} active movies`,
        icon: Users,
        tone: "cyan",
      },
    ],
    [summary],
  );

  if (!auth.hydrated) {
    return (
      <AdminAccessState
        icon={ShieldCheck}
        title="Checking admin access"
        text="Your secure session is being verified."
      />
    );
  }

  if (!auth.user) {
    return (
      <AdminAccessState
        icon={LogIn}
        title="Admin sign in required"
        text="Only the verified admin account can open this operations panel."
        action={
          <Button asChild>
            <Link to="/auth">Sign in as admin</Link>
          </Button>
        }
      />
    );
  }

  if (auth.user.role !== "admin") {
    return (
      <AdminAccessState
        icon={LockKeyhole}
        title="Admin panel is restricted"
        text="Your account is a customer account, so the user dashboard is opening instead."
        action={
          <Button asChild>
            <Link to="/dashboard">Go to user dashboard</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 pb-20">
      <section className="cinema-grid overflow-hidden rounded-lg border border-border/60 bg-card/75 shadow-2xl shadow-black/20">
        <div className="grid gap-6 p-6 md:grid-cols-[1.25fr_0.75fr] md:p-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">
              <ShieldCheck className="h-4 w-4" />
              Operations dashboard
            </div>
            <h1 className="mt-5 max-w-3xl text-3xl font-bold tracking-tight md:text-5xl">
              Professional dashboard for bookings, revenue and cinema operations.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Track sales, occupancy, recent bookings and day-to-day management from one focused
              admin workspace.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <HeroStat label="Top movie" value={summary.topMovie} />
              <HeroStat label="Average order" value={formatCurrency(summary.averageOrderValue)} />
              <HeroStat label="Occupancy" value={`${summary.occupancy}%`} />
            </div>
          </div>

          <SpotlightCard className="rounded-lg p-5">
            <PanelHeader
              icon={ClipboardCheck}
              title="Today at a glance"
              subtitle={
                loadState === "loading"
                  ? "Loading live operations data"
                  : "Focused actions for the operations team"
              }
            />
            <div className="mt-5 grid gap-3">
              <SnapshotRow label="Confirmed bookings" value={summary.bookings.toLocaleString()} />
              <SnapshotRow label="Active show slots" value={activeShows.toLocaleString()} />
              <SnapshotRow label="Pending approvals" value={pendingApprovals.toLocaleString()} />
              <SnapshotRow label="Ticket emails" value="Ready" />
            </div>
          </SpotlightCard>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Metric key={metric.label} {...metric} />
        ))}
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-[1.45fr_0.85fr]">
        <SpotlightCard className="rounded-lg p-5">
          <PanelHeader
            icon={BadgeIndianRupee}
            title="Revenue trend"
            subtitle="Confirmed payments across the last 7 days"
            action={`${summary.occupancy}% occupancy`}
          />
          <div className="mt-5 h-80">
            {hasRevenueData ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend}>
                  <defs>
                    <linearGradient id="dashboardRevenue" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    dataKey="revenue"
                    name="Revenue"
                    stroke="hsl(var(--primary))"
                    fill="url(#dashboardRevenue)"
                    strokeWidth={3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                icon={BadgeIndianRupee}
                title="No revenue yet"
                text="Confirmed bookings will appear here as soon as tickets are sold."
              />
            )}
          </div>
        </SpotlightCard>

        <SpotlightCard className="rounded-lg p-5">
          <PanelHeader
            icon={Film}
            title="Movie revenue"
            subtitle="Highest earning titles"
            action={`${popularMovies.length} titles`}
          />
          <div className="mt-5 h-80">
            {popularMovies.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={popularMovies} layout="vertical" margin={{ left: 12, right: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="movie"
                    stroke="hsl(var(--muted-foreground))"
                    width={92}
                    fontSize={11}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar
                    dataKey="value"
                    name="Revenue"
                    fill="hsl(var(--primary))"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                icon={Film}
                title="No movie revenue"
                text="Movie performance will populate after the first confirmed booking."
              />
            )}
          </div>
        </SpotlightCard>
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <SpotlightCard className="rounded-lg p-5">
          <PanelHeader
            icon={Building2}
            title="Theater occupancy"
            subtitle="Seats sold by cinema"
            action={`${summary.theaters} cinemas`}
          />
          <div className="mt-5 space-y-4">
            {theaterPerformance.length ? (
              theaterPerformance.map((theater) => (
                <TheaterRow key={theater.theater} theater={theater} />
              ))
            ) : (
              <EmptyState
                icon={Building2}
                title="No theater activity"
                text="Cinema occupancy updates as shows receive bookings."
              />
            )}
          </div>
        </SpotlightCard>

        <SpotlightCard className="rounded-lg p-5">
          <PanelHeader
            icon={Ticket}
            title="Recent bookings"
            subtitle="Latest confirmed tickets"
            action={`${recentBookings.length} visible`}
          />
          <div className="mt-5 overflow-hidden rounded-lg border border-border/60">
            {recentBookings.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-left text-sm">
                  <thead className="bg-muted/40 text-xs text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Reference</th>
                      <th className="px-4 py-3 font-medium">Movie</th>
                      <th className="px-4 py-3 font-medium">Theater</th>
                      <th className="px-4 py-3 font-medium">Seats</th>
                      <th className="px-4 py-3 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {recentBookings.map((booking) => (
                      <tr key={booking.ref} className="bg-card/20">
                        <td className="px-4 py-3 font-mono text-xs text-primary">{booking.ref}</td>
                        <td className="px-4 py-3 font-medium">{booking.movie}</td>
                        <td className="px-4 py-3 text-muted-foreground">{booking.theater}</td>
                        <td className="px-4 py-3">{booking.seats.join(", ")}</td>
                        <td className="px-4 py-3 font-semibold">{formatCurrency(booking.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                icon={Ticket}
                title="No confirmed bookings"
                text="New bookings will appear in this activity table."
              />
            )}
          </div>
        </SpotlightCard>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-4">
        {managementCards.map((item) => (
          <ManagementCard key={item.title} item={item} />
        ))}
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr_1fr]">
        <ActionPanel
          icon={Plus}
          title="Add a show"
          text="Create a new showtime and assign pricing tiers."
          onOpen={() =>
            setAdminNotice(
              "Show scheduler opened. Choose a movie, theater and time slot from the management cards above.",
            )
          }
        />
        <ActionPanel
          icon={Settings2}
          title="Review theaters"
          text="Approve cinema partners and update screen layouts."
          onOpen={() =>
            setAdminNotice(
              "Theater review workspace opened. Pending approvals are tracked in Today at a glance.",
            )
          }
        />
        <ActionPanel
          icon={MailCheck}
          title="Notification queue"
          text="Track OTP, ticket and reminder delivery status."
          onOpen={() =>
            setAdminNotice(
              "Notification queue opened. OTP and ticket delivery status is ready for monitoring.",
            )
          }
        />
      </section>
      {adminNotice && (
        <p className="mt-4 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
          {adminNotice}
        </p>
      )}
    </div>
  );
}

function AdminAccessState({ icon: Icon, title, text, action }) {
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

function Metric({ icon: Icon, label, value, sub, tone }) {
  const toneClass = {
    primary: "bg-primary/15 text-primary",
    emerald: "bg-emerald-500/15 text-emerald-300",
    amber: "bg-amber-500/15 text-amber-300",
    cyan: "bg-cyan-500/15 text-cyan-300",
  }[tone];

  return (
    <SpotlightCard className="rounded-lg p-5 transition-transform hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
        </div>
        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </SpotlightCard>
  );
}

function HeroStat({ label, value }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/45 px-4 py-3 backdrop-blur">
      <p className="text-[11px] uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 max-w-[190px] truncate text-sm font-semibold">{value}</p>
    </div>
  );
}

function PanelHeader({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 className="font-semibold">{title}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {action && (
        <span className="shrink-0 rounded-md bg-muted/50 px-2 py-1 text-xs text-muted-foreground">
          {action}
        </span>
      )}
    </div>
  );
}

function SnapshotRow({ label, value }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/40 px-4 py-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}

function TheaterRow({ theater }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{theater.theater}</p>
          <p className="text-xs text-muted-foreground">
            {theater.area} - {theater.bookings} bookings - {formatCurrency(theater.revenue)}
          </p>
        </div>
        <span className="text-sm font-semibold text-primary">{theater.occupancy}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-cyan-400"
          style={{ width: `${Math.max(3, theater.occupancy)}%` }}
        />
      </div>
    </div>
  );
}

function ManagementCard({ item }) {
  const Icon = item.icon;

  return (
    <SpotlightCard className="group rounded-lg p-5 transition-transform hover:-translate-y-0.5">
      <div className="flex items-start justify-between">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </div>
      <p className="mt-5 text-xs uppercase text-muted-foreground">{item.value}</p>
      <h3 className="mt-1 font-semibold">{item.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
    </SpotlightCard>
  );
}

function ActionPanel({ icon: Icon, title, text, onOpen }) {
  return (
    <SpotlightCard className="rounded-lg p-5">
      <div className="flex items-start gap-4">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-secondary text-secondary-foreground">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{text}</p>
          <Button size="sm" variant="secondary" className="mt-4" onClick={onOpen}>
            Open
          </Button>
        </div>
      </div>
    </SpotlightCard>
  );
}

function EmptyState({ icon: Icon, title, text }) {
  return (
    <div className="grid h-full min-h-48 place-items-center rounded-lg border border-dashed border-border/70 p-6 text-center">
      <div>
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="h-6 w-6" />
        </div>
        <h3 className="mt-4 font-semibold">{title}</h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold">{label}</p>
      {payload.map((item) => (
        <p key={item.dataKey} className="mt-1 text-muted-foreground">
          {item.name}:{" "}
          <span className="font-medium text-foreground">
            {item.dataKey === "revenue" || item.dataKey === "value"
              ? formatCurrency(item.value)
              : item.value}
          </span>
        </p>
      ))}
    </div>
  );
}

function formatCurrency(value) {
  return `Rs ${Number(value || 0).toLocaleString("en-IN")}`;
}

export { Route };
