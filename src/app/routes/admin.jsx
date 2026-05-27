import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  BadgeIndianRupee,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Film,
  Gauge,
  LockKeyhole,
  LogIn,
  Plus,
  ShieldCheck,
  Ticket,
  Trash2,
  XCircle,
} from "lucide-react";
import {
  fetchAdminSummary,
  fetchTheaterApplications,
  updateTheaterApplicationStatus,
} from "@/features/admin/api/adminApi";
import { hydrateAuth, logout, readStoredAuth } from "@/features/auth/authSlice";
import { createMovie, deleteMovie, fetchMovies } from "@/features/movies/api/moviesApi";
import { movies as catalogMovies } from "@/features/movies/data/movieCatalog";
import { SpotlightCard } from "@/shared/components/reactbits/SpotlightCard";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { TrendAreaChart, VerticalBars } from "@/shared/components/ui/lightweight-chart";

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
  },
  charts: {
    revenueTrend: emptyTrend,
    popularMovies: [],
    theaterPerformance: [],
  },
  recentBookings: [],
};

const pendingTheatersSeed = [
  {
    id: "sterling-imax",
    name: "Sterling IMAX",
    owner: "Aarav Cinemas LLP",
    screens: 6,
    status: "Pending",
    documents: "GST, FSSAI, Fire NOC",
  },
  {
    id: "galaxy-premium",
    name: "Galaxy Premium Screens",
    owner: "Galaxy Motion Pvt Ltd",
    screens: 4,
    status: "Pending",
    documents: "GST, Fire NOC",
  },
  {
    id: "liberty-dolby",
    name: "Liberty Dolby Cinema",
    owner: "Liberty Entertainment",
    screens: 3,
    status: "Pending",
    documents: "GST, Lease, Safety",
  },
];

const blankMovie = {
  title: "",
  language: "English",
  duration: "2h 10m",
  genres: "Action, Drama",
  certificate: "UA",
};

const Route = createFileRoute("/admin")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const auth = useSelector((state) => state.auth);
  const [data, setData] = useState(fallback);
  const [loadState, setLoadState] = useState("idle");
  const [activeTab, setActiveTab] = useState("analytics");
  const [movieForm, setMovieForm] = useState(blankMovie);
  const [managedMovies, setManagedMovies] = useState(() => catalogMovies.slice(0, 8));
  const [movieBusy, setMovieBusy] = useState("");
  const [theaterApprovals, setTheaterApprovals] = useState(pendingTheatersSeed);
  const [approvalBusy, setApprovalBusy] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!auth.hydrated) dispatch(hydrateAuth(readStoredAuth()));
  }, [auth.hydrated, dispatch]);

  useEffect(() => {
    if (!auth.hydrated || !auth.user || auth.user.role === "admin") return;
    navigate({ to: auth.user.role === "theater-owner" ? "/owner" : "/dashboard", replace: true });
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

  useEffect(() => {
    if (!auth.hydrated || auth.user?.role !== "admin") return undefined;
    let active = true;

    fetchMovies().then((moviesList) => {
      if (active) setManagedMovies(moviesList);
    });

    return () => {
      active = false;
    };
  }, [auth.hydrated, auth.user?.role]);

  useEffect(() => {
    if (!auth.hydrated || auth.user?.role !== "admin") return undefined;
    let active = true;

    fetchTheaterApplications()
      .then((result) => {
        if (!active) return;
        const applications = result.theaters ?? [];
        setTheaterApprovals(applications.length ? applications : pendingTheatersSeed);
      })
      .catch(() => {
        if (active) setTheaterApprovals(pendingTheatersSeed);
      });

    return () => {
      active = false;
    };
  }, [auth.hydrated, auth.user?.role]);

  const summary = data.summary ?? fallback.summary;
  const charts = data.charts ?? fallback.charts;
  const recentBookings = data.recentBookings ?? [];
  const revenueTrend = charts.revenueTrend?.length ? charts.revenueTrend : emptyTrend;
  const popularMovies = charts.popularMovies ?? [];
  const theaterPerformance = charts.theaterPerformance ?? [];
  const hasRevenueData = revenueTrend.some((row) => row.revenue > 0 || row.bookings > 0);
  const pendingCount = theaterApprovals.filter((theater) => theater.status === "Pending").length;

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
        label: "Booking statistics",
        value: summary.bookings.toLocaleString(),
        sub: `${summary.averageOrderValue ? formatCurrency(summary.averageOrderValue) : "Rs 0"} AOV`,
        icon: Ticket,
        tone: "emerald",
      },
      {
        label: "Occupancy",
        value: `${summary.occupancy}%`,
        sub: `${summary.seatsSold.toLocaleString()} seats sold`,
        icon: Gauge,
        tone: "amber",
      },
      {
        label: "Approvals",
        value: pendingCount.toLocaleString(),
        sub: `${summary.theaters.toLocaleString()} active cinemas`,
        icon: Building2,
        tone: "cyan",
      },
    ],
    [pendingCount, summary],
  );

  const addMovie = async (event) => {
    event.preventDefault();
    const title = movieForm.title.trim();
    if (!title) return;

    const nextMovie = {
      id: title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
      title,
      language: movieForm.language.trim() || "English",
      duration: movieForm.duration.trim() || "2h 10m",
      genres: movieForm.genres
        .split(",")
        .map((genre) => genre.trim())
        .filter(Boolean),
      certificate: movieForm.certificate.trim() || "UA",
      rating: 8.1,
      votes: "New",
      poster: catalogMovies[0].poster,
      backdrop: catalogMovies[0].backdrop,
      description: `${title} is ready for publishing after poster, cast and show scheduling review.`,
      cast: [],
      format: ["2D"],
    };

    setMovieBusy("add");
    try {
      const savedMovie = await createMovie(nextMovie);
      setManagedMovies((current) => [savedMovie, ...current]);
      setMovieForm(blankMovie);
      setNotice(`${title} added to the movie catalog.`);
    } catch (error) {
      setNotice(error.response?.data?.error ?? `Could not add ${title}.`);
    } finally {
      setMovieBusy("");
    }
  };

  const removeMovie = async (id) => {
    const movie = managedMovies.find((item) => item.id === id);
    setMovieBusy(id);
    try {
      await deleteMovie(id);
      setManagedMovies((current) => current.filter((item) => item.id !== id));
      setNotice(`${movie?.title ?? "Movie"} removed from the movie catalog.`);
    } catch (error) {
      setNotice(error.response?.data?.error ?? `Could not remove ${movie?.title ?? "movie"}.`);
    } finally {
      setMovieBusy("");
    }
  };

  const updateApproval = async (id, status) => {
    const theater = theaterApprovals.find((item) => item.id === id);
    setApprovalBusy(id);
    try {
      const result = await updateTheaterApplicationStatus(id, status);
      setTheaterApprovals((current) =>
        current.map((item) =>
          item.id === id ? { ...item, ...(result.theater ?? {}), status } : item,
        ),
      );
      setNotice(`${theater?.name ?? "Theater"} marked as ${status.toLowerCase()}.`);
    } catch (error) {
      setNotice(error.response?.data?.error ?? `Could not update ${theater?.name ?? "theater"}.`);
    } finally {
      setApprovalBusy("");
    }
  };

  if (!auth.hydrated) {
    return (
      <AccessState
        icon={ShieldCheck}
        title="Checking admin access"
        text="Your secure session is being verified."
      />
    );
  }

  if (!auth.user) {
    return (
      <AccessState
        icon={LogIn}
        title="Admin sign in required"
        text="Only verified admin accounts can open this operations panel."
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
      <AccessState
        icon={LockKeyhole}
        title="Admin panel is restricted"
        text="Your account role does not have admin access."
      />
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 pb-20">
      <section className="cinema-grid overflow-hidden rounded-lg border border-border/60 bg-card/75 shadow-2xl shadow-black/20">
        <div className="grid gap-6 p-6 lg:grid-cols-[1.2fr_0.8fr] lg:p-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">
              <ShieldCheck className="h-4 w-4" />
              Admin dashboard
            </div>
            <h1 className="mt-5 max-w-3xl text-3xl font-bold tracking-tight md:text-5xl">
              Revenue, bookings, catalog and theater approvals in one control room.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Manage movies, approve cinema partners, watch booking statistics and track occupancy
              without leaving the admin workspace.
            </p>
          </div>

          <SpotlightCard className="rounded-lg p-5">
            <PanelHeader
              icon={ClipboardCheck}
              title="Operations snapshot"
              subtitle={loadState === "loading" ? "Loading live data" : "Live admin summary"}
            />
            <div className="mt-5 grid gap-3">
              <SnapshotRow label="Top movie" value={summary.topMovie} />
              <SnapshotRow
                label="Average order"
                value={formatCurrency(summary.averageOrderValue)}
              />
              <SnapshotRow label="Pending approvals" value={pendingCount.toLocaleString()} />
              <SnapshotRow label="Active movies" value={managedMovies.length.toLocaleString()} />
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
          ["analytics", "Analytics"],
          ["movies", "Movies"],
          ["theaters", "Theater approvals"],
          ["bookings", "Booking statistics"],
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

      {activeTab === "analytics" && (
        <AnalyticsTab
          hasRevenueData={hasRevenueData}
          revenueTrend={revenueTrend}
          popularMovies={popularMovies}
          theaterPerformance={theaterPerformance}
          summary={summary}
        />
      )}

      {activeTab === "movies" && (
        <MoviesTab
          movieForm={movieForm}
          managedMovies={managedMovies}
          onFormChange={setMovieForm}
          onAddMovie={addMovie}
          onRemoveMovie={removeMovie}
          movieBusy={movieBusy}
        />
      )}

      {activeTab === "theaters" && (
        <TheaterApprovalsTab
          theaters={theaterApprovals}
          onUpdate={updateApproval}
          approvalBusy={approvalBusy}
        />
      )}

      {activeTab === "bookings" && (
        <BookingStatisticsTab recentBookings={recentBookings} revenueTrend={revenueTrend} />
      )}
    </div>
  );
}

function AnalyticsTab({
  hasRevenueData,
  revenueTrend,
  popularMovies,
  theaterPerformance,
  summary,
}) {
  return (
    <section className="mt-6 grid gap-4 xl:grid-cols-[1.35fr_0.85fr]">
      <SpotlightCard className="rounded-lg p-5">
        <PanelHeader
          icon={BadgeIndianRupee}
          title="Revenue analytics"
          subtitle="Confirmed payments across the last 7 days"
          action={`${summary.occupancy}% occupancy`}
        />
        <div className="mt-5 h-80">
          {hasRevenueData ? (
            <TrendAreaChart data={revenueTrend} valueKey="revenue" formatValue={formatCurrency} />
          ) : (
            <EmptyState icon={BadgeIndianRupee} title="No revenue yet" text="Sales appear here." />
          )}
        </div>
      </SpotlightCard>

      <SpotlightCard className="rounded-lg p-5">
        <PanelHeader icon={Film} title="Popular movies" subtitle="Revenue by title" />
        <div className="mt-5 h-80">
          <VerticalBars
            data={popularMovies}
            labelKey="movie"
            valueKey="value"
            formatValue={formatCurrency}
          />
        </div>
      </SpotlightCard>

      <SpotlightCard className="rounded-lg p-5 xl:col-span-2">
        <PanelHeader
          icon={Gauge}
          title="Occupancy rates"
          subtitle="Cinema occupancy based on confirmed seats sold"
        />
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {theaterPerformance.map((theater) => (
            <TheaterRow key={theater.theater} theater={theater} />
          ))}
        </div>
      </SpotlightCard>
    </section>
  );
}

function MoviesTab({
  movieForm,
  managedMovies,
  onFormChange,
  onAddMovie,
  onRemoveMovie,
  movieBusy,
}) {
  const update = (field) => (event) =>
    onFormChange((current) => ({ ...current, [field]: event.target.value }));

  return (
    <section className="mt-6 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <SpotlightCard className="rounded-lg p-5">
        <PanelHeader icon={Plus} title="Add movie" subtitle="Create a catalog draft" />
        <form onSubmit={onAddMovie} className="mt-5 grid gap-3">
          <Input value={movieForm.title} onChange={update("title")} placeholder="Movie title" />
          <Input value={movieForm.language} onChange={update("language")} placeholder="Language" />
          <Input value={movieForm.duration} onChange={update("duration")} placeholder="Duration" />
          <Input
            value={movieForm.genres}
            onChange={update("genres")}
            placeholder="Genres, comma separated"
          />
          <Input
            value={movieForm.certificate}
            onChange={update("certificate")}
            placeholder="Certificate"
          />
          <Button className="gap-2" disabled={movieBusy === "add"}>
            <Plus className="h-4 w-4" />
            {movieBusy === "add" ? "Adding..." : "Add movie"}
          </Button>
        </form>
      </SpotlightCard>

      <SpotlightCard className="rounded-lg p-5">
        <PanelHeader
          icon={Film}
          title="Movie catalog"
          subtitle="Add, review and remove published titles"
          action={`${managedMovies.length} titles`}
        />
        <div className="mt-5 overflow-hidden rounded-lg border border-border/60">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Movie</th>
                  <th className="px-4 py-3 font-medium">Language</th>
                  <th className="px-4 py-3 font-medium">Genres</th>
                  <th className="px-4 py-3 font-medium">Runtime</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {managedMovies.map((movie) => (
                  <tr key={movie.id} className="bg-card/20">
                    <td className="px-4 py-3 font-medium">{movie.title}</td>
                    <td className="px-4 py-3 text-muted-foreground">{movie.language}</td>
                    <td className="px-4 py-3 text-muted-foreground">{movie.genres.join(", ")}</td>
                    <td className="px-4 py-3">{movie.duration}</td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onRemoveMovie(movie.id)}
                        disabled={movieBusy === movie.id}
                        className="gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        {movieBusy === movie.id ? "Removing..." : "Remove"}
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

function TheaterApprovalsTab({ theaters, onUpdate, approvalBusy }) {
  return (
    <section className="mt-6">
      <SpotlightCard className="rounded-lg p-5">
        <PanelHeader
          icon={Building2}
          title="Theater approvals"
          subtitle="Review owner requests before cinemas go live"
        />
        {theaters.length ? (
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {theaters.map((theater) => (
              <div
                key={theater.id}
                className="rounded-lg border border-border/60 bg-background/35 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{theater.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{theater.owner}</p>
                  </div>
                  <StatusPill status={theater.status} />
                </div>
                <div className="mt-4 grid gap-2 text-sm">
                  <SnapshotRow label="City" value={theater.city || "City not set"} />
                  <SnapshotRow label="Area" value={theater.area || "Area not set"} />
                  <SnapshotRow
                    label="Screens"
                    value={Number(theater.screens || 0).toLocaleString()}
                  />
                  <SnapshotRow label="Documents" value={theater.documents} />
                  {theater.contact && <SnapshotRow label="Contact" value={theater.contact} />}
                  {theater.ownerEmail && <SnapshotRow label="Email" value={theater.ownerEmail} />}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    onClick={() => onUpdate(theater.id, "Approved")}
                    disabled={approvalBusy === theater.id}
                    className="gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {approvalBusy === theater.id ? "Saving" : "Approve"}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onUpdate(theater.id, "Rejected")}
                    disabled={approvalBusy === theater.id}
                    className="gap-2"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Building2}
            title="No owner applications"
            text="New theater owner forms appear here for admin approval."
          />
        )}
      </SpotlightCard>
    </section>
  );
}

function BookingStatisticsTab({ recentBookings, revenueTrend }) {
  const totals = revenueTrend.reduce(
    (acc, row) => ({
      revenue: acc.revenue + Number(row.revenue || 0),
      bookings: acc.bookings + Number(row.bookings || 0),
      seats: acc.seats + Number(row.seats || 0),
    }),
    { revenue: 0, bookings: 0, seats: 0 },
  );

  return (
    <section className="mt-6 grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
      <SpotlightCard className="rounded-lg p-5">
        <PanelHeader icon={ClipboardCheck} title="Booking statistics" subtitle="7-day totals" />
        <div className="mt-5 grid gap-3">
          <SnapshotRow label="Revenue" value={formatCurrency(totals.revenue)} />
          <SnapshotRow label="Bookings" value={totals.bookings.toLocaleString()} />
          <SnapshotRow label="Seats" value={totals.seats.toLocaleString()} />
        </div>
      </SpotlightCard>

      <SpotlightCard className="rounded-lg p-5">
        <PanelHeader icon={Ticket} title="Recent bookings" subtitle="Latest confirmed tickets" />
        <BookingsTable bookings={recentBookings} />
      </SpotlightCard>
    </section>
  );
}

function BookingsTable({ bookings }) {
  return (
    <div className="mt-5 overflow-hidden rounded-lg border border-border/60">
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
            {bookings.map((booking) => (
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
    </div>
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

function TheaterRow({ theater }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{theater.theater}</p>
          <p className="text-xs text-muted-foreground">
            {theater.bookings} bookings - {formatCurrency(theater.revenue)}
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

function StatusPill({ status }) {
  const tone =
    status === "Approved"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
      : status === "Rejected"
        ? "border-destructive/30 bg-destructive/10 text-destructive"
        : "border-amber-500/30 bg-amber-500/10 text-amber-500";
  return (
    <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${tone}`}>{status}</span>
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

function formatCurrency(value) {
  return `Rs ${Number(value || 0).toLocaleString("en-IN")}`;
}

export { Route };
