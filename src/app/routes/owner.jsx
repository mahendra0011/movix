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
  BadgeIndianRupee,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clapperboard,
  Film,
  Gauge,
  LockKeyhole,
  LogIn,
  LogOut,
  Monitor,
  Plus,
  ShieldCheck,
  Ticket,
  Trash2,
  Users,
} from "lucide-react";
import { hydrateAuth, logout, readStoredAuth } from "@/features/auth/authSlice";
import { movies } from "@/features/movies/data/movieCatalog";
import { SpotlightCard } from "@/shared/components/reactbits/SpotlightCard";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

const Route = createFileRoute("/owner")({
  component: OwnerDashboard,
});

const screenSeeds = [
  { id: "imax-01", name: "IMAX 01", type: "IMAX Laser", seats: 148, occupancy: 82 },
  { id: "dolby-02", name: "Dolby 02", type: "Dolby Atmos", seats: 126, occupancy: 76 },
  { id: "premiere-03", name: "Premiere 03", type: "Premium", seats: 96, occupancy: 68 },
];

const showSeeds = [
  {
    id: "show-interstellar-1030",
    movie: "Interstellar",
    screen: "IMAX 01",
    time: "10:30 AM",
    price: 480,
    status: "Open",
  },
  {
    id: "show-dune-1345",
    movie: "Dune: Part Two",
    screen: "Dolby 02",
    time: "01:45 PM",
    price: 470,
    status: "Open",
  },
  {
    id: "show-oppenheimer-1930",
    movie: "Oppenheimer",
    screen: "Premiere 03",
    time: "07:30 PM",
    price: 520,
    status: "Selling fast",
  },
];

const bookingSeeds = [
  {
    ref: "BMS-OR-2041",
    movie: "Interstellar",
    screen: "IMAX 01",
    time: "10:30 AM",
    seats: ["A5", "A6"],
    total: 960,
    customer: "Priya Shah",
  },
  {
    ref: "BMS-OR-2042",
    movie: "Dune: Part Two",
    screen: "Dolby 02",
    time: "01:45 PM",
    seats: ["C3", "C4", "C5"],
    total: 1410,
    customer: "Rahul Mehta",
  },
  {
    ref: "BMS-OR-2043",
    movie: "Oppenheimer",
    screen: "Premiere 03",
    time: "07:30 PM",
    seats: ["F8", "F9"],
    total: 1040,
    customer: "Sneha Rao",
  },
  {
    ref: "BMS-OR-2044",
    movie: "Interstellar",
    screen: "IMAX 01",
    time: "10:30 AM",
    seats: ["D1", "D2", "D3", "D4"],
    total: 1920,
    customer: "Aman Verma",
  },
];

const earningsTrend = [
  { day: "20 May", earnings: 2840, bookings: 5, occupancy: 58 },
  { day: "21 May", earnings: 3560, bookings: 7, occupancy: 62 },
  { day: "22 May", earnings: 4120, bookings: 8, occupancy: 66 },
  { day: "23 May", earnings: 5380, bookings: 11, occupancy: 72 },
  { day: "24 May", earnings: 6460, bookings: 13, occupancy: 78 },
  { day: "25 May", earnings: 7140, bookings: 15, occupancy: 81 },
  { day: "26 May", earnings: 5330, bookings: 10, occupancy: 76 },
];

const blankScreen = {
  name: "",
  type: "Premium",
  seats: "100",
};

const blankShow = {
  movieId: movies[0]?.id ?? "",
  screen: screenSeeds[0].name,
  time: "06:30 PM",
  price: "350",
};

const selectClass =
  "h-11 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none transition-colors focus-visible:ring-1 focus-visible:ring-ring";

function OwnerDashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const auth = useSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState("overview");
  const [screens, setScreens] = useState(screenSeeds);
  const [shows, setShows] = useState(showSeeds);
  const [bookings] = useState(bookingSeeds);
  const [screenForm, setScreenForm] = useState(blankScreen);
  const [showForm, setShowForm] = useState(blankShow);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!auth.hydrated) dispatch(hydrateAuth(readStoredAuth()));
  }, [auth.hydrated, dispatch]);

  useEffect(() => {
    if (!auth.hydrated || !auth.user) return;
    if (auth.user.role === "admin") navigate({ to: "/admin", replace: true });
    if (auth.user.role === "user") navigate({ to: "/dashboard", replace: true });
  }, [auth.hydrated, auth.user, navigate]);

  const totals = useMemo(() => {
    const earnings = bookings.reduce((sum, booking) => sum + Number(booking.total || 0), 0);
    const seatsSold = bookings.reduce((sum, booking) => sum + booking.seats.length, 0);
    const capacity = screens.reduce((sum, screen) => sum + Number(screen.seats || 0), 0);
    const occupancy = screens.length
      ? Math.round(
          screens.reduce((sum, screen) => sum + Number(screen.occupancy || 0), 0) / screens.length,
        )
      : 0;

    return {
      earnings,
      seatsSold,
      capacity,
      occupancy,
      bookings: bookings.length,
      shows: shows.length,
    };
  }, [bookings, screens, shows.length]);

  const popularMovies = useMemo(() => {
    const map = bookings.reduce((acc, booking) => {
      acc[booking.movie] = (acc[booking.movie] ?? 0) + Number(booking.total || 0);
      return acc;
    }, {});

    return Object.entries(map).map(([movie, value]) => ({ movie, value }));
  }, [bookings]);

  const metrics = [
    {
      label: "Track earnings",
      value: formatCurrency(totals.earnings),
      text: `${totals.bookings} confirmed bookings`,
      icon: BadgeIndianRupee,
      tone: "primary",
    },
    {
      label: "Active shows",
      value: totals.shows.toLocaleString(),
      text: "Running across your screens",
      icon: CalendarClock,
      tone: "cyan",
    },
    {
      label: "Occupancy",
      value: `${totals.occupancy}%`,
      text: `${totals.seatsSold} seats sold today`,
      icon: Gauge,
      tone: "amber",
    },
    {
      label: "Screen capacity",
      value: totals.capacity.toLocaleString(),
      text: `${screens.length} active screens`,
      icon: Monitor,
      tone: "emerald",
    },
  ];

  const addScreen = (event) => {
    event.preventDefault();
    const name = screenForm.name.trim();
    if (!name) return;

    const nextScreen = {
      id: name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
      name,
      type: screenForm.type,
      seats: Number(screenForm.seats) || 80,
      occupancy: 0,
    };

    setScreens((current) => [nextScreen, ...current]);
    setShowForm((current) => ({ ...current, screen: nextScreen.name }));
    setScreenForm(blankScreen);
    setNotice(`${name} added. You can schedule shows on this screen now.`);
  };

  const removeScreen = (id) => {
    const screen = screens.find((item) => item.id === id);
    setScreens((current) => current.filter((item) => item.id !== id));
    setNotice(`${screen?.name ?? "Screen"} removed from owner dashboard.`);
  };

  const addShow = (event) => {
    event.preventDefault();
    const movie = movies.find((item) => item.id === showForm.movieId) ?? movies[0];
    if (!movie || !showForm.screen) return;

    const nextShow = {
      id: `${movie.id}-${Date.now()}`,
      movie: movie.title,
      screen: showForm.screen,
      time: showForm.time.trim() || "06:30 PM",
      price: Number(showForm.price) || 300,
      status: "Open",
    };

    setShows((current) => [nextShow, ...current]);
    setShowForm((current) => ({ ...current, time: "06:30 PM", price: "350" }));
    setNotice(`${movie.title} show added for ${nextShow.time} on ${nextShow.screen}.`);
  };

  const removeShow = (id) => {
    const show = shows.find((item) => item.id === id);
    setShows((current) => current.filter((item) => item.id !== id));
    setNotice(`${show?.movie ?? "Show"} removed from today's schedule.`);
  };

  if (!auth.hydrated) {
    return (
      <AccessState
        icon={ShieldCheck}
        title="Checking owner access"
        text="Your secure session is being verified."
      />
    );
  }

  if (!auth.user) {
    return (
      <AccessState
        icon={LogIn}
        title="Owner sign in required"
        text="Only verified theater owner accounts can open this cinema dashboard."
        action={
          <Button asChild>
            <Link to="/auth">Sign in as owner</Link>
          </Button>
        }
      />
    );
  }

  if (auth.user.role !== "theater-owner") {
    return (
      <AccessState
        icon={LockKeyhole}
        title="Owner dashboard is restricted"
        text="This panel is available for theater owner accounts only."
      />
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 pb-20">
      <section className="cinema-grid overflow-hidden rounded-lg border border-border/60 bg-card/75 shadow-2xl shadow-black/20">
        <div className="grid gap-6 p-6 lg:grid-cols-[1.2fr_0.8fr] lg:p-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">
              <Building2 className="h-4 w-4" />
              Theater owner dashboard
            </div>
            <h1 className="mt-5 max-w-3xl text-3xl font-bold tracking-tight md:text-5xl">
              Manage screens, shows, bookings and earnings for PVR INOX: Orion Mall.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Add screens, schedule shows, view booking activity and track cinema revenue from one
              focused workspace.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button onClick={() => setActiveTab("shows")} className="gap-2">
                <Plus className="h-4 w-4" />
                Add show
              </Button>
              <Button variant="secondary" onClick={() => dispatch(logout())} className="gap-2">
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            </div>
          </div>

          <SpotlightCard className="rounded-lg p-5">
            <PanelHeader
              icon={CheckCircle2}
              title="Cinema status"
              subtitle="Live owner operations"
              action="Approved"
            />
            <div className="mt-5 grid gap-3">
              <SnapshotRow label="Owner" value={auth.user.name || "Theater owner"} />
              <SnapshotRow label="Screens" value={screens.length.toLocaleString()} />
              <SnapshotRow label="Shows today" value={shows.length.toLocaleString()} />
              <SnapshotRow label="Seats available" value={totals.capacity.toLocaleString()} />
            </div>
          </SpotlightCard>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Metric key={metric.label} {...metric} />
        ))}
      </section>

      <div className="mt-6 flex gap-2 overflow-x-auto rounded-lg border border-border/60 bg-card/50 p-1">
        {[
          ["overview", "Overview"],
          ["screens", "Screens"],
          ["shows", "Shows"],
          ["bookings", "Bookings"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`shrink-0 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {notice && (
        <p className="mt-4 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
          {notice}
        </p>
      )}

      {activeTab === "overview" && (
        <OverviewTab
          earningsTrend={earningsTrend}
          screens={screens}
          popularMovies={popularMovies}
          totals={totals}
        />
      )}

      {activeTab === "screens" && (
        <ScreensTab
          screenForm={screenForm}
          screens={screens}
          onFormChange={setScreenForm}
          onAddScreen={addScreen}
          onRemoveScreen={removeScreen}
        />
      )}

      {activeTab === "shows" && (
        <ShowsTab
          showForm={showForm}
          shows={shows}
          screens={screens}
          onFormChange={setShowForm}
          onAddShow={addShow}
          onRemoveShow={removeShow}
        />
      )}

      {activeTab === "bookings" && <BookingsTab bookings={bookings} totals={totals} />}
    </div>
  );
}

function OverviewTab({ earningsTrend, screens, popularMovies, totals }) {
  return (
    <section className="mt-6 grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
      <SpotlightCard className="rounded-lg p-5">
        <PanelHeader
          icon={BadgeIndianRupee}
          title="Track earnings"
          subtitle="Daily paid bookings and revenue"
          action={formatCurrency(totals.earnings)}
        />
        <div className="mt-5 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={earningsTrend}>
              <defs>
                <linearGradient id="ownerEarnings" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip content={<ChartTooltip />} />
              <Area
                dataKey="earnings"
                name="Earnings"
                stroke="hsl(var(--primary))"
                fill="url(#ownerEarnings)"
                strokeWidth={3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </SpotlightCard>

      <SpotlightCard className="rounded-lg p-5">
        <PanelHeader icon={Gauge} title="Occupancy rates" subtitle="Screen-wise occupancy" />
        <div className="mt-5 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={screens}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip content={<ChartTooltip />} />
              <Bar
                dataKey="occupancy"
                name="Occupancy"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SpotlightCard>

      <SpotlightCard className="rounded-lg p-5 xl:col-span-2">
        <PanelHeader icon={Film} title="Popular movies" subtitle="Earnings by movie title" />
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {popularMovies.map((movie) => (
            <div
              key={movie.movie}
              className="rounded-lg border border-border/60 bg-background/35 p-4"
            >
              <p className="text-sm font-semibold">{movie.movie}</p>
              <p className="mt-2 text-2xl font-bold">{formatCurrency(movie.value)}</p>
              <p className="mt-1 text-xs text-muted-foreground">Confirmed ticket revenue</p>
            </div>
          ))}
        </div>
      </SpotlightCard>
    </section>
  );
}

function ScreensTab({ screenForm, screens, onFormChange, onAddScreen, onRemoveScreen }) {
  const update = (field) => (event) =>
    onFormChange((current) => ({ ...current, [field]: event.target.value }));

  return (
    <section className="mt-6 grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
      <SpotlightCard className="rounded-lg p-5">
        <PanelHeader icon={Monitor} title="Add screen" subtitle="Create a screen with capacity" />
        <form onSubmit={onAddScreen} className="mt-5 grid gap-3">
          <Input value={screenForm.name} onChange={update("name")} placeholder="Screen name" />
          <select value={screenForm.type} onChange={update("type")} className={selectClass}>
            <option>IMAX Laser</option>
            <option>Dolby Atmos</option>
            <option>Premium</option>
            <option>Regular</option>
          </select>
          <Input
            value={screenForm.seats}
            onChange={update("seats")}
            placeholder="Total seats"
            type="number"
            min="20"
          />
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add screen
          </Button>
        </form>
      </SpotlightCard>

      <SpotlightCard className="rounded-lg p-5">
        <PanelHeader icon={Building2} title="Screens" subtitle="Active cinema screens" />
        <div className="mt-5 overflow-hidden rounded-lg border border-border/60">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Screen</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Seats</th>
                  <th className="px-4 py-3 font-medium">Occupancy</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {screens.map((screen) => (
                  <tr key={screen.id} className="bg-card/20">
                    <td className="px-4 py-3 font-medium">{screen.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{screen.type}</td>
                    <td className="px-4 py-3">{screen.seats}</td>
                    <td className="px-4 py-3">{screen.occupancy}%</td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onRemoveScreen(screen.id)}
                        className="gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </SpotlightCard>
    </section>
  );
}

function ShowsTab({ showForm, shows, screens, onFormChange, onAddShow, onRemoveShow }) {
  const update = (field) => (event) =>
    onFormChange((current) => ({ ...current, [field]: event.target.value }));

  return (
    <section className="mt-6 grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
      <SpotlightCard className="rounded-lg p-5">
        <PanelHeader icon={Clapperboard} title="Add show" subtitle="Schedule movie timing" />
        <form onSubmit={onAddShow} className="mt-5 grid gap-3">
          <select value={showForm.movieId} onChange={update("movieId")} className={selectClass}>
            {movies.map((movie) => (
              <option key={movie.id} value={movie.id}>
                {movie.title}
              </option>
            ))}
          </select>
          <select value={showForm.screen} onChange={update("screen")} className={selectClass}>
            {screens.map((screen) => (
              <option key={screen.id} value={screen.name}>
                {screen.name}
              </option>
            ))}
          </select>
          <Input value={showForm.time} onChange={update("time")} placeholder="Show time" />
          <Input
            value={showForm.price}
            onChange={update("price")}
            placeholder="Ticket price"
            type="number"
            min="50"
          />
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add show
          </Button>
        </form>
      </SpotlightCard>

      <SpotlightCard className="rounded-lg p-5">
        <PanelHeader icon={CalendarClock} title="Shows" subtitle="Today's show schedule" />
        <div className="mt-5 overflow-hidden rounded-lg border border-border/60">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Movie</th>
                  <th className="px-4 py-3 font-medium">Screen</th>
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {shows.map((show) => (
                  <tr key={show.id} className="bg-card/20">
                    <td className="px-4 py-3 font-medium">{show.movie}</td>
                    <td className="px-4 py-3 text-muted-foreground">{show.screen}</td>
                    <td className="px-4 py-3">{show.time}</td>
                    <td className="px-4 py-3">{formatCurrency(show.price)}</td>
                    <td className="px-4 py-3">
                      <StatusPill status={show.status} />
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onRemoveShow(show.id)}
                        className="gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </SpotlightCard>
    </section>
  );
}

function BookingsTab({ bookings, totals }) {
  return (
    <section className="mt-6 grid gap-4 xl:grid-cols-[0.75fr_1.25fr]">
      <SpotlightCard className="rounded-lg p-5">
        <PanelHeader
          icon={Ticket}
          title="Booking statistics"
          subtitle="Today's confirmed tickets"
        />
        <div className="mt-5 grid gap-3">
          <SnapshotRow label="Bookings" value={totals.bookings.toLocaleString()} />
          <SnapshotRow label="Seats sold" value={totals.seatsSold.toLocaleString()} />
          <SnapshotRow label="Revenue" value={formatCurrency(totals.earnings)} />
          <SnapshotRow
            label="Average order"
            value={formatCurrency(totals.earnings / totals.bookings)}
          />
        </div>
      </SpotlightCard>

      <SpotlightCard className="rounded-lg p-5">
        <PanelHeader icon={Users} title="View bookings" subtitle="Customer booking list" />
        <div className="mt-5 overflow-hidden rounded-lg border border-border/60">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Reference</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Movie</th>
                  <th className="px-4 py-3 font-medium">Show</th>
                  <th className="px-4 py-3 font-medium">Seats</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {bookings.map((booking) => (
                  <tr key={booking.ref} className="bg-card/20">
                    <td className="px-4 py-3 font-mono text-xs text-primary">{booking.ref}</td>
                    <td className="px-4 py-3 font-medium">{booking.customer}</td>
                    <td className="px-4 py-3">{booking.movie}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {booking.screen} - {booking.time}
                    </td>
                    <td className="px-4 py-3">{booking.seats.join(", ")}</td>
                    <td className="px-4 py-3 font-semibold">{formatCurrency(booking.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </SpotlightCard>
    </section>
  );
}

function AccessState({ icon: Icon, title, text, action }) {
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

function Metric({ icon: Icon, label, value, text, tone }) {
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
          <p className="mt-1 text-xs text-muted-foreground">{text}</p>
        </div>
        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </SpotlightCard>
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
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/40 px-4 py-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-right text-sm font-semibold">{value}</p>
    </div>
  );
}

function StatusPill({ status }) {
  const tone =
    status === "Selling fast"
      ? "border-amber-500/30 bg-amber-500/10 text-amber-500"
      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-500";

  return (
    <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${tone}`}>{status}</span>
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
            {item.dataKey === "earnings" || item.dataKey === "value"
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
