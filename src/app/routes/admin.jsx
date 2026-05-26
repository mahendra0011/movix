import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import { Activity, BadgeIndianRupee, Database, Film, Radio, Ticket, Users } from "lucide-react";
import { fetchAdminSummary } from "@/features/admin/api/adminApi";
import { SpotlightCard } from "@/shared/components/reactbits/SpotlightCard";

const fallback = {
  summary: {
    revenue: 248500,
    bookings: 928,
    seatsSold: 2240,
    users: 1200,
    movies: 8,
    theaters: 4,
    occupancy: 64,
    database: "memory",
    redis: "memory-locks",
    socket: "enabled",
  },
  charts: {
    revenueTrend: [
      { day: "D1", revenue: 18000 },
      { day: "D2", revenue: 26000 },
      { day: "D3", revenue: 22000 },
      { day: "D4", revenue: 41000 },
      { day: "D5", revenue: 38000 },
      { day: "D6", revenue: 52000 },
      { day: "D7", revenue: 61000 },
    ],
    popularMovies: [
      { movie: "Interstellar", value: 82000 },
      { movie: "Dune", value: 64000 },
      { movie: "Oppenheimer", value: 56000 },
    ],
  },
};

const Route = createFileRoute("/admin")({
  loader: () => fetchAdminSummary().catch(() => fallback),
  component: AdminDashboard,
});

function AdminDashboard() {
  const loaderData = Route.useLoaderData();
  const [data, setData] = useState(loaderData ?? fallback);

  useEffect(() => {
    fetchAdminSummary()
      .then(setData)
      .catch(() => setData(fallback));
  }, []);

  const { summary, charts } = data;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Operations dashboard</p>
          <h1 className="text-3xl font-bold tracking-tight">Bookings, revenue and live systems</h1>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <Status label="MongoDB" value={summary.database} icon={Database} />
          <Status label="Redis" value={summary.redis} icon={Activity} />
          <Status label="Socket.IO" value={summary.socket} icon={Radio} />
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          icon={BadgeIndianRupee}
          label="Revenue"
          value={`Rs ${summary.revenue.toLocaleString()}`}
        />
        <Metric icon={Ticket} label="Bookings" value={summary.bookings.toLocaleString()} />
        <Metric icon={Users} label="Users" value={summary.users.toLocaleString()} />
        <Metric
          icon={Film}
          label="Movies/Theaters"
          value={`${summary.movies}/${summary.theaters}`}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <SpotlightCard className="rounded-lg p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Revenue trend</h2>
              <p className="text-xs text-muted-foreground">
                Mock gateway + confirmed booking totals
              </p>
            </div>
            <span className="rounded-md bg-primary/15 px-2 py-1 text-xs text-primary">
              {summary.occupancy}% occupancy
            </span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.revenueTrend}>
                <defs>
                  <linearGradient id="revenue" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                  }}
                />
                <Area
                  dataKey="revenue"
                  stroke="hsl(var(--primary))"
                  fill="url(#revenue)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SpotlightCard>

        <SpotlightCard className="rounded-lg p-5">
          <h2 className="font-semibold">Popular movies</h2>
          <p className="text-xs text-muted-foreground">Revenue by title</p>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={
                  charts.popularMovies.length ? charts.popularMovies : fallback.charts.popularMovies
                }
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="movie" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                  }}
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SpotlightCard>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {[
          ["Admin", "Approve theaters, manage movies, view users and revenue analytics."],
          ["Theater owner", "Add screens, publish shows, track bookings and earnings."],
          [
            "Scale layer",
            "Redis locks, Socket.IO rooms, email queue hooks and cached movie lists.",
          ],
        ].map(([title, text]) => (
          <SpotlightCard key={title} className="rounded-lg p-5">
            <h3 className="font-semibold">{title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{text}</p>
          </SpotlightCard>
        ))}
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value }) {
  return (
    <SpotlightCard className="rounded-lg p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </SpotlightCard>
  );
}

function Status({ icon: Icon, label, value }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card px-3 py-2">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1 font-medium text-foreground">{value}</p>
    </div>
  );
}

export { Route };
