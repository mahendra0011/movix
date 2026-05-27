import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
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
  MapPin,
  Monitor,
  Plus,
  Save,
  ShieldCheck,
  Ticket,
  Trash2,
  Users,
} from "lucide-react";
import { hydrateAuth, logout, readStoredAuth } from "@/features/auth/authSlice";
import { buildSeatLayout, normalizeSeatLayoutConfig } from "@/features/booking/data/seatLayout";
import { movies } from "@/features/movies/data/movieCatalog";
import { SpotlightCard } from "@/shared/components/reactbits/SpotlightCard";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { TrendAreaChart, VerticalBars } from "@/shared/components/ui/lightweight-chart";
import { getOwnerApprovalForUser } from "@/shared/services/ownerApplications";

const Route = createFileRoute("/owner")({
  component: OwnerDashboard,
});

const screenSeeds = [
  {
    id: "imax-01",
    name: "IMAX 01",
    type: "IMAX Laser",
    seats: 148,
    occupancy: 82,
    seatLayout: { rowCount: 11, seatsPerRow: 14, platinumRows: 2, vipRows: 2, aisleAfter: 7 },
  },
  {
    id: "dolby-02",
    name: "Dolby 02",
    type: "Dolby Atmos",
    seats: 126,
    occupancy: 76,
    seatLayout: { rowCount: 9, seatsPerRow: 14, platinumRows: 2, vipRows: 2, aisleAfter: 7 },
  },
  {
    id: "premiere-03",
    name: "Premiere 03",
    type: "Premium",
    seats: 96,
    occupancy: 68,
    seatLayout: { rowCount: 8, seatsPerRow: 12, platinumRows: 1, vipRows: 2, aisleAfter: 6 },
  },
];

const blankScreen = {
  name: "",
  type: "Premium",
  rowCount: "10",
  seatsPerRow: "14",
  platinumRows: "2",
  vipRows: "2",
  aisleAfter: "7",
  blockedSeats: "",
};

const defaultCinemaProfile = {
  id: "pvr-inox-orion-mall-bengaluru",
  name: "PVR INOX: Orion Mall",
  city: "Bengaluru",
  area: "Rajajinagar",
  address: "Orion Mall, Dr Rajkumar Road, Rajajinagar",
  distance: "3.2 km",
  contact: "+91 98765 43210",
  manager: "Operations desk",
  amenities: "IMAX Laser, Dolby Atmos, Recliners, Parking, F&B",
  cancellationPolicy: "Cancellation available up to 2 hours before showtime.",
};

function createBlankShow(screens = screenSeeds) {
  return {
    listingType: "live",
    movieId: movies[0]?.id ?? "",
    customTitle: "",
    screen: screens[0]?.name ?? "",
    showDate: getDateInputValue(0),
    startTime: "18:30",
    endTime: "21:10",
    comingSoonDate: getDateInputValue(21),
    bookingOpensAt: getDateInputValue(14),
    language: "English",
    format: "2D",
    certificate: "UA",
    goldPrice: "350",
    platinumPrice: "480",
    vipPrice: "650",
    totalSeats: "120",
    status: "Open",
    trailerUrl: "",
    notes: "",
  };
}

const listingTypes = [
  { id: "live", label: "Now booking" },
  { id: "coming-soon", label: "Coming soon" },
];

const languageOptions = ["English", "Hindi", "Tamil", "Telugu", "Kannada"];
const formatOptions = ["2D", "3D", "IMAX", "4DX", "Dolby Atmos"];
const certificateOptions = ["U", "UA", "A"];
const showStatusOptions = ["Open", "Selling fast", "Sold out", "Draft"];
const OWNER_WORKSPACE_VERSION = 2;
const ownerOperationModules = [
  {
    title: "Cinema setup",
    value: "Onboarding",
    text: "Cinema profile, address, amenities, screen count and approval status.",
    icon: Building2,
  },
  {
    title: "Screen management",
    value: "Screens",
    text: "Screen type, capacity, cleaning gap, maintenance windows and seat layout.",
    icon: Monitor,
  },
  {
    title: "Show scheduling",
    value: "Shows",
    text: "Movie, date, time, language, format, draft/live and coming soon listings.",
    icon: Clapperboard,
  },
  {
    title: "Pricing",
    value: "Dynamic",
    text: "Gold, Platinum, VIP, weekend, holiday, morning and occupancy pricing.",
    icon: BadgeIndianRupee,
  },
  {
    title: "F&B menu",
    value: "Add-ons",
    text: "Popcorn, beverages, combos, stock and pre-order availability.",
    icon: Ticket,
  },
  {
    title: "Reports",
    value: "Analytics",
    text: "Occupancy, peak hours, movie performance and downloadable settlements.",
    icon: Gauge,
  },
  {
    title: "Staff access",
    value: "Roles",
    text: "Counter staff, manager access, shifts and QR scanner permissions.",
    icon: Users,
  },
  {
    title: "Feedback",
    value: "Reviews",
    text: "Customer complaints, rating summary and support response workflow.",
    icon: CheckCircle2,
  },
];

const selectClass =
  "h-11 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none transition-colors focus-visible:ring-1 focus-visible:ring-ring";

function OwnerDashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const auth = useSelector((state) => state.auth);
  const ownerKey = useMemo(() => getOwnerKey(auth.user), [auth.user]);
  const ownerApproval = useMemo(() => getOwnerApprovalForUser(auth.user), [auth.user]);
  const [activeTab, setActiveTab] = useState("overview");
  const [screens, setScreens] = useState([]);
  const [shows, setShows] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [cinemaProfile, setCinemaProfile] = useState(defaultCinemaProfile);
  const [screenForm, setScreenForm] = useState(blankScreen);
  const [showForm, setShowForm] = useState(() => createBlankShow(screenSeeds));
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!auth.hydrated) dispatch(hydrateAuth(readStoredAuth()));
  }, [auth.hydrated, dispatch]);

  useEffect(() => {
    if (!auth.hydrated || !auth.user) return;
    if (auth.user.role === "admin") navigate({ to: "/admin", replace: true });
    if (auth.user.role === "user") navigate({ to: "/dashboard", replace: true });
  }, [auth.hydrated, auth.user, navigate]);

  useEffect(() => {
    if (!auth.hydrated || auth.user?.role !== "theater-owner" || !ownerKey) return;
    const workspace = readOwnerWorkspace(ownerKey, ownerApproval.application);
    setCinemaProfile(workspace.cinemaProfile);
    setScreens(workspace.screens);
    setShows(workspace.shows);
    setBookings(workspace.bookings);
    setShowForm((current) => ({
      ...current,
      screen: workspace.screens[0]?.name ?? "",
      totalSeats: workspace.screens[0]?.seats
        ? String(workspace.screens[0].seats)
        : current.totalSeats,
    }));
    setWorkspaceReady(true);
  }, [auth.hydrated, auth.user?.role, ownerApproval.application, ownerKey]);

  useEffect(() => {
    if (!workspaceReady || auth.user?.role !== "theater-owner" || !ownerKey) return;
    const timer = window.setTimeout(() => {
      writeOwnerWorkspace(ownerKey, { cinemaProfile, screens, shows, bookings });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [auth.user?.role, bookings, cinemaProfile, ownerKey, screens, shows, workspaceReady]);

  const ownerScreens = useMemo(
    () => screens.filter((screen) => !screen.ownerKey || screen.ownerKey === ownerKey),
    [ownerKey, screens],
  );
  const ownerShows = useMemo(
    () => shows.filter((show) => !show.ownerKey || show.ownerKey === ownerKey),
    [ownerKey, shows],
  );
  const ownerBookings = useMemo(
    () => bookings.filter((booking) => !booking.ownerKey || booking.ownerKey === ownerKey),
    [bookings, ownerKey],
  );
  const listedMovies = useMemo(
    () => buildListedMovies(ownerShows, ownerBookings),
    [ownerBookings, ownerShows],
  );
  const ownerEarningsTrend = useMemo(() => buildEarningsTrend(ownerBookings), [ownerBookings]);

  const totals = useMemo(() => {
    const earnings = ownerBookings.reduce((sum, booking) => sum + Number(booking.total || 0), 0);
    const seatsSold = ownerBookings.reduce((sum, booking) => sum + booking.seats.length, 0);
    const capacity = ownerScreens.reduce((sum, screen) => sum + Number(screen.seats || 0), 0);
    const occupancy = ownerScreens.length
      ? Math.round(
          ownerScreens.reduce((sum, screen) => sum + Number(screen.occupancy || 0), 0) /
            ownerScreens.length,
        )
      : 0;

    return {
      earnings,
      seatsSold,
      capacity,
      occupancy,
      bookings: ownerBookings.length,
      shows: ownerShows.length,
      movies: listedMovies.length,
      comingSoon: ownerShows.filter((show) => show.listingType === "coming-soon").length,
    };
  }, [listedMovies.length, ownerBookings, ownerScreens, ownerShows]);

  const popularMovies = useMemo(() => {
    const map = ownerBookings.reduce((acc, booking) => {
      acc[booking.movie] = (acc[booking.movie] ?? 0) + Number(booking.total || 0);
      return acc;
    }, {});

    return Object.entries(map).map(([movie, value]) => ({ movie, value }));
  }, [ownerBookings]);

  const metrics = [
    {
      label: "Track earnings",
      value: formatCurrency(totals.earnings),
      text: `${totals.bookings} confirmed bookings`,
      icon: BadgeIndianRupee,
      tone: "primary",
    },
    {
      label: "Listed movies",
      value: totals.movies.toLocaleString(),
      text: `${totals.shows} shows, ${totals.comingSoon} coming soon`,
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
      text: `${ownerScreens.length} active screens`,
      icon: Monitor,
      tone: "emerald",
    },
  ];

  const saveCinemaProfile = (event) => {
    event.preventDefault();
    const name = cinemaProfile.name.trim() || defaultCinemaProfile.name;
    const city = cinemaProfile.city.trim() || defaultCinemaProfile.city;
    setCinemaProfile((current) => ({
      ...current,
      id: slugify(`${name}-${city}`),
      name,
      city,
      area: String(current.area ?? "").trim(),
      address: String(current.address ?? "").trim(),
      distance: String(current.distance ?? "").trim(),
      contact: String(current.contact ?? "").trim(),
      manager: String(current.manager ?? "").trim(),
      amenities: String(current.amenities ?? "").trim(),
      cancellationPolicy: String(current.cancellationPolicy ?? "").trim(),
    }));
    setNotice(`${name} location saved for ${city}. Users can find your shows in this city.`);
  };

  const addScreen = (event) => {
    event.preventDefault();
    const name = screenForm.name.trim();
    if (!name) return;
    const seatLayout = normalizeSeatLayoutConfig(screenForm);
    const layout = buildSeatLayout(seatLayout);

    const nextScreen = {
      id: name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
      ownerKey,
      name,
      type: screenForm.type,
      seats: layout.totalSeats,
      seatLayout,
      occupancy: 0,
    };

    setScreens((current) => [nextScreen, ...current]);
    setShowForm((current) => ({
      ...current,
      screen: nextScreen.name,
      totalSeats: String(nextScreen.seats),
    }));
    setScreenForm(blankScreen);
    setNotice(`${name} added. You can schedule shows on this screen now.`);
  };

  const removeScreen = (id) => {
    const screen = screens.find((item) => item.id === id);
    setScreens((current) => current.filter((item) => item.id !== id));
    setShowForm((current) =>
      current.screen === screen?.name
        ? { ...current, screen: ownerScreens.find((item) => item.id !== id)?.name ?? "" }
        : current,
    );
    setNotice(`${screen?.name ?? "Screen"} removed from owner dashboard.`);
  };

  const addShow = (event) => {
    event.preventDefault();
    const movie = movies.find((item) => item.id === showForm.movieId) ?? movies[0];
    const isComingSoon = showForm.listingType === "coming-soon";
    const title = showForm.customTitle.trim() || movie?.title;
    if (!title || (!isComingSoon && !showForm.screen)) return;

    const goldPrice = Number(showForm.goldPrice) || 300;
    const platinumPrice = Number(showForm.platinumPrice) || goldPrice;
    const vipPrice = Number(showForm.vipPrice) || platinumPrice;
    const date = isComingSoon ? showForm.comingSoonDate : showForm.showDate;
    const selectedScreen = ownerScreens.find((screen) => screen.name === showForm.screen);
    const seatLayout = normalizeSeatLayoutConfig(selectedScreen?.seatLayout);
    const seatCount = selectedScreen?.seats ?? buildSeatLayout(seatLayout).totalSeats;

    const nextShow = {
      id: `${slugify(title)}-${Date.now()}`,
      ownerKey,
      theaterId: cinemaProfile.id || slugify(`${cinemaProfile.name}-${cinemaProfile.city}`),
      theater: cinemaProfile.name,
      city: cinemaProfile.city,
      area: cinemaProfile.area,
      address: cinemaProfile.address,
      distance: cinemaProfile.distance,
      amenities: cinemaProfile.amenities,
      listingType: showForm.listingType,
      movieId: movie?.id ?? slugify(title),
      movie: title,
      poster: movie?.poster,
      screen: isComingSoon ? showForm.screen || "TBA" : showForm.screen,
      date,
      time: isComingSoon ? "Coming soon" : formatShowTime(showForm.startTime, showForm.endTime),
      startTime: isComingSoon ? "" : showForm.startTime,
      endTime: isComingSoon ? "" : showForm.endTime,
      language: showForm.language,
      format: showForm.format,
      certificate: showForm.certificate,
      price: isComingSoon ? 0 : goldPrice,
      priceLabel: isComingSoon ? "Notify me" : `${formatCurrency(goldPrice)} onwards`,
      pricing: isComingSoon
        ? { gold: 0, platinum: 0, vip: 0 }
        : { gold: goldPrice, platinum: platinumPrice, vip: vipPrice },
      seats: isComingSoon ? 0 : seatCount,
      seatLayout: isComingSoon ? null : seatLayout,
      status: isComingSoon ? "Coming soon" : showForm.status,
      bookingOpensAt: showForm.bookingOpensAt,
      trailerUrl: showForm.trailerUrl.trim(),
      notes: showForm.notes.trim(),
    };

    setShows((current) => [nextShow, ...current]);
    setShowForm((current) => ({
      ...createBlankShow(ownerScreens),
      listingType: current.listingType,
      screen: current.screen,
      totalSeats: current.totalSeats,
    }));
    setNotice(
      isComingSoon
        ? `${title} listed as coming soon.`
        : `${title} listed for ${nextShow.time} on ${nextShow.screen}.`,
    );
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

  if (ownerApproval.status !== "Approved") {
    return (
      <OwnerApprovalState
        application={ownerApproval.application}
        status={ownerApproval.status}
        user={auth.user}
        onLogout={() => dispatch(logout())}
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
              Manage screens, shows, bookings and earnings for {cinemaProfile.name}.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Add your cinema location, schedule shows, view booking activity and track cinema
              revenue from one focused workspace.
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
              action={ownerApproval.status}
            />
            <div className="mt-5 grid gap-3">
              <SnapshotRow label="Owner" value={auth.user.name || "Theater owner"} />
              <SnapshotRow label="City" value={cinemaProfile.city || "City not set"} />
              <SnapshotRow label="Location" value={cinemaProfile.area || "Area not set"} />
              <SnapshotRow label="Screens" value={ownerScreens.length.toLocaleString()} />
              <SnapshotRow label="Listed movies" value={listedMovies.length.toLocaleString()} />
              <SnapshotRow label="Listed shows" value={ownerShows.length.toLocaleString()} />
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
          ["cinema", "Cinema"],
          ["movies", "My movies"],
          ["operations", "Operations"],
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
          earningsTrend={ownerEarningsTrend}
          screens={ownerScreens}
          popularMovies={popularMovies}
          listedMovies={listedMovies}
          totals={totals}
        />
      )}

      {activeTab === "cinema" && (
        <CinemaSetupTab
          cinemaProfile={cinemaProfile}
          onProfileChange={setCinemaProfile}
          onSave={saveCinemaProfile}
        />
      )}

      {activeTab === "movies" && (
        <OwnerMoviesTab
          listedMovies={listedMovies}
          onListShow={() => setActiveTab("shows")}
          onRemoveShow={removeShow}
        />
      )}

      {activeTab === "operations" && (
        <OwnerOperationsTab
          totals={totals}
          listedMovies={listedMovies}
          screens={ownerScreens}
          onOpen={(title) => setNotice(`${title} workspace ready for ${auth.user.name}.`)}
        />
      )}

      {activeTab === "screens" && (
        <ScreensTab
          screenForm={screenForm}
          screens={ownerScreens}
          onFormChange={setScreenForm}
          onAddScreen={addScreen}
          onRemoveScreen={removeScreen}
        />
      )}

      {activeTab === "shows" && (
        <ShowsTab
          showForm={showForm}
          shows={ownerShows}
          screens={ownerScreens}
          onFormChange={setShowForm}
          onAddShow={addShow}
          onRemoveShow={removeShow}
        />
      )}

      {activeTab === "bookings" && <BookingsTab bookings={ownerBookings} totals={totals} />}
    </div>
  );
}

function OverviewTab({ earningsTrend, screens, popularMovies, listedMovies, totals }) {
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
          <TrendAreaChart data={earningsTrend} valueKey="earnings" formatValue={formatCurrency} />
        </div>
      </SpotlightCard>

      <SpotlightCard className="rounded-lg p-5">
        <PanelHeader icon={Gauge} title="Occupancy rates" subtitle="Screen-wise occupancy" />
        <div className="mt-5 h-80">
          <VerticalBars
            data={screens}
            labelKey="name"
            valueKey="occupancy"
            formatValue={(value) => `${value}%`}
          />
        </div>
      </SpotlightCard>

      <SpotlightCard className="rounded-lg p-5 xl:col-span-2">
        <PanelHeader
          icon={Film}
          title="My listed movies"
          subtitle="Only movies listed by this theater owner"
          action={`${listedMovies.length} movies`}
        />
        {listedMovies.length || popularMovies.length ? (
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {(listedMovies.length ? listedMovies : popularMovies).map((movie) => (
              <div
                key={movie.movieId ?? movie.movie}
                className="rounded-lg border border-border/60 bg-background/35 p-4"
              >
                <p className="text-sm font-semibold">{movie.title ?? movie.movie}</p>
                <p className="mt-2 text-2xl font-bold">
                  {movie.revenue !== undefined
                    ? formatCurrency(movie.revenue)
                    : formatCurrency(movie.value)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {movie.showCount
                    ? `${movie.showCount} owner listings`
                    : "Confirmed ticket revenue"}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-lg border border-dashed border-border/70 p-6 text-center">
            <p className="text-sm font-semibold">No owner-listed movies yet</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              Movies will appear here only after this theater owner lists a live show or coming soon
              release.
            </p>
          </div>
        )}
      </SpotlightCard>
    </section>
  );
}

function OwnerMoviesTab({ listedMovies, onListShow, onRemoveShow }) {
  return (
    <section className="mt-6">
      <SpotlightCard className="rounded-lg p-5">
        <PanelHeader
          icon={Film}
          title="My listed movies"
          subtitle="This owner can see only movies listed from this owner account"
          action={`${listedMovies.length} movies`}
        />

        {listedMovies.length ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {listedMovies.map((movie) => (
              <div
                key={movie.movieId}
                className="overflow-hidden rounded-lg border border-border/60 bg-background/35"
              >
                <div className="relative h-56">
                  <img
                    src={movie.poster || movies[0].poster}
                    alt={movie.title}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/35 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-xl font-bold">{movie.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {movie.language} - {movie.format} - {movie.certificate}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 p-4">
                  <SnapshotRow label="Listings" value={movie.showCount.toLocaleString()} />
                  <SnapshotRow label="Live shows" value={movie.liveCount.toLocaleString()} />
                  <SnapshotRow label="Coming soon" value={movie.comingSoonCount.toLocaleString()} />
                  <SnapshotRow label="Revenue" value={formatCurrency(movie.revenue)} />
                </div>

                <div className="flex items-center gap-2 border-t border-border/60 p-4">
                  <Button size="sm" onClick={onListShow} className="flex-1 gap-2">
                    <Plus className="h-4 w-4" />
                    Add show
                  </Button>
                  {movie.latestShowId && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onRemoveShow(movie.latestShowId)}
                      className="gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove latest
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-lg border border-dashed border-border/70 p-8 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-primary/15 text-primary">
              <Film className="h-6 w-6" />
            </div>
            <h3 className="mt-4 font-semibold">No movies listed by this owner yet</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              List a now-booking show or coming-soon movie first. It will appear here and only for
              this theater-owner account.
            </p>
            <Button onClick={onListShow} className="mt-5 gap-2">
              <Plus className="h-4 w-4" />
              List first show
            </Button>
          </div>
        )}
      </SpotlightCard>
    </section>
  );
}

function OwnerOperationsTab({ totals, listedMovies, screens, onOpen }) {
  return (
    <section className="mt-6 grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
      <SpotlightCard className="rounded-lg p-5">
        <PanelHeader
          icon={Building2}
          title="Owner operations"
          subtitle="Cinema owner control modules"
          action={`${listedMovies.length} listed movies`}
        />
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {ownerOperationModules.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.title}
                type="button"
                onClick={() => onOpen(item.title)}
                className="group rounded-lg border border-border/60 bg-background/35 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/50"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="rounded-md bg-muted/60 px-2 py-1 text-[11px] font-medium text-muted-foreground">
                    {item.value}
                  </span>
                </div>
                <h3 className="mt-4 font-semibold">{item.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
              </button>
            );
          })}
        </div>
      </SpotlightCard>

      <div className="grid gap-4">
        <SpotlightCard className="rounded-lg p-5">
          <PanelHeader
            icon={BadgeIndianRupee}
            title="Settlement snapshot"
            subtitle="Owner revenue"
          />
          <div className="mt-5 grid gap-3">
            <SnapshotRow label="Gross revenue" value={formatCurrency(totals.earnings)} />
            <SnapshotRow
              label="Platform commission"
              value={formatCurrency(totals.earnings * 0.1)}
            />
            <SnapshotRow
              label="Estimated settlement"
              value={formatCurrency(totals.earnings * 0.9)}
            />
          </div>
        </SpotlightCard>

        <SpotlightCard className="rounded-lg p-5">
          <PanelHeader icon={Monitor} title="Cinema inventory" subtitle="Owner-owned capacity" />
          <div className="mt-5 grid gap-3">
            <SnapshotRow label="Screens" value={screens.length.toLocaleString()} />
            <SnapshotRow label="Seats" value={totals.capacity.toLocaleString()} />
            <SnapshotRow label="Occupancy" value={`${totals.occupancy}%`} />
          </div>
        </SpotlightCard>
      </div>
    </section>
  );
}

function CinemaSetupTab({ cinemaProfile, onProfileChange, onSave }) {
  const update = (field) => (event) =>
    onProfileChange((current) => ({ ...current, [field]: event.target.value }));
  const amenities = splitAmenities(cinemaProfile.amenities);

  return (
    <section className="mt-6 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
      <SpotlightCard className="rounded-lg p-5">
        <PanelHeader
          icon={MapPin}
          title="Cinema location"
          subtitle="City, address and public cinema profile"
          action={cinemaProfile.city || "City"}
        />

        <form onSubmit={onSave} className="mt-5 space-y-5">
          <FormSection title="Cinema details">
            <FormField label="Cinema name">
              <Input
                value={cinemaProfile.name}
                onChange={update("name")}
                placeholder="Cinema name"
              />
            </FormField>
            <FormField label="City">
              <Input value={cinemaProfile.city} onChange={update("city")} placeholder="City" />
            </FormField>
            <FormField label="Area">
              <Input
                value={cinemaProfile.area}
                onChange={update("area")}
                placeholder="Area or locality"
              />
            </FormField>
            <FormField label="Distance label">
              <Input
                value={cinemaProfile.distance}
                onChange={update("distance")}
                placeholder="3.2 km"
              />
            </FormField>
            <label className="md:col-span-2">
              <span className="text-xs font-medium uppercase text-muted-foreground">Address</span>
              <textarea
                value={cinemaProfile.address}
                onChange={update("address")}
                placeholder="Full cinema address"
                className="mt-2 min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
              />
            </label>
          </FormSection>

          <FormSection title="Operations">
            <FormField label="Contact number">
              <Input
                value={cinemaProfile.contact}
                onChange={update("contact")}
                placeholder="+91 98765 43210"
              />
            </FormField>
            <FormField label="Manager">
              <Input
                value={cinemaProfile.manager}
                onChange={update("manager")}
                placeholder="Manager or operations desk"
              />
            </FormField>
            <label className="md:col-span-2">
              <span className="text-xs font-medium uppercase text-muted-foreground">Amenities</span>
              <textarea
                value={cinemaProfile.amenities}
                onChange={update("amenities")}
                placeholder="IMAX, Dolby Atmos, Parking, F&B"
                className="mt-2 min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
              />
            </label>
            <label className="md:col-span-2">
              <span className="text-xs font-medium uppercase text-muted-foreground">
                Cancellation policy
              </span>
              <textarea
                value={cinemaProfile.cancellationPolicy}
                onChange={update("cancellationPolicy")}
                placeholder="Cancellation and entry rules"
                className="mt-2 min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
              />
            </label>
          </FormSection>

          <Button className="h-11 w-full gap-2">
            <Save className="h-4 w-4" />
            Save cinema location
          </Button>
        </form>
      </SpotlightCard>

      <SpotlightCard className="rounded-lg p-5">
        <PanelHeader icon={Building2} title="Public preview" subtitle="Cinema card for users" />
        <div className="mt-5 rounded-lg border border-border/60 bg-background/35 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold tracking-tight">{cinemaProfile.name}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {cinemaProfile.area}, {cinemaProfile.city}
              </p>
            </div>
            <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
              Approved
            </span>
          </div>

          <div className="mt-5 grid gap-3">
            <SnapshotRow label="Address" value={cinemaProfile.address || "Address not set"} />
            <SnapshotRow label="Distance" value={cinemaProfile.distance || "Distance not set"} />
            <SnapshotRow label="Contact" value={cinemaProfile.contact || "Contact not set"} />
            <SnapshotRow label="Manager" value={cinemaProfile.manager || "Manager not set"} />
          </div>

          {amenities.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {amenities.map((amenity) => (
                <span
                  key={amenity}
                  className="rounded-md border border-border/60 px-2 py-1 text-xs text-muted-foreground"
                >
                  {amenity}
                </span>
              ))}
            </div>
          )}

          {cinemaProfile.cancellationPolicy && (
            <p className="mt-5 rounded-lg border border-border/60 bg-card/40 p-3 text-sm text-muted-foreground">
              {cinemaProfile.cancellationPolicy}
            </p>
          )}
        </div>
      </SpotlightCard>
    </section>
  );
}

function ScreensTab({ screenForm, screens, onFormChange, onAddScreen, onRemoveScreen }) {
  const update = (field) => (event) =>
    onFormChange((current) => ({ ...current, [field]: event.target.value }));
  const previewLayout = buildSeatLayout(normalizeSeatLayoutConfig(screenForm));

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
            value={screenForm.rowCount}
            onChange={update("rowCount")}
            placeholder="Rows"
            type="number"
            min="4"
            max="26"
          />
          <Input
            value={screenForm.seatsPerRow}
            onChange={update("seatsPerRow")}
            placeholder="Seats per row"
            type="number"
            min="6"
            max="30"
          />
          <Input
            value={screenForm.platinumRows}
            onChange={update("platinumRows")}
            placeholder="Platinum rows from front"
            type="number"
            min="0"
          />
          <Input
            value={screenForm.vipRows}
            onChange={update("vipRows")}
            placeholder="VIP rows from back"
            type="number"
            min="0"
          />
          <Input
            value={screenForm.aisleAfter}
            onChange={update("aisleAfter")}
            placeholder="Aisle after seat no."
            type="number"
            min="0"
          />
          <Input
            value={screenForm.blockedSeats}
            onChange={update("blockedSeats")}
            placeholder="Blocked seats e.g. A1,A2"
          />
          <div className="rounded-lg border border-border/60 bg-background/40 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Seat panel preview</p>
            <p className="mt-1">
              {previewLayout.rowCount} rows x {previewLayout.seatsPerRow} seats,{" "}
              {previewLayout.totalSeats} bookable seats
            </p>
            <p className="mt-1">
              Platinum {previewLayout.platinumRows} rows, Gold{" "}
              {Math.max(
                0,
                previewLayout.rowCount - previewLayout.platinumRows - previewLayout.vipRows,
              )}{" "}
              rows, VIP {previewLayout.vipRows} rows
            </p>
          </div>
          <div className="overflow-x-auto rounded-lg border border-border/60 bg-background/30 p-3">
            <SeatMiniMap layout={previewLayout} />
          </div>
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
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Screen</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Seats</th>
                  <th className="px-4 py-3 font-medium">Layout</th>
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
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {formatSeatLayoutSummary(screen.seatLayout)}
                    </td>
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

function SeatMiniMap({ layout }) {
  const seatLayout = layout?.rows ? layout : buildSeatLayout(layout);

  return (
    <div className="inline-flex min-w-max flex-col gap-1">
      {seatLayout.rows.map((row) => (
        <div key={row} className="flex items-center gap-1">
          <span className="w-4 text-[10px] text-muted-foreground">{row}</span>
          {Array.from({ length: seatLayout.seatsPerRow }, (_, index) => index + 1).map((seat) => {
            const id = `${row}${seat}`;
            const tier = seatLayout.tierFor(row);
            const isBlocked = seatLayout.blockedSet.has(id);
            const tierClass =
              tier === "platinum"
                ? "bg-[var(--platinum)]"
                : tier === "vip"
                  ? "bg-[var(--vip)]"
                  : "bg-[var(--gold)]";

            return (
              <span key={id} className="flex items-center gap-1">
                <span
                  className={`h-3 w-3 rounded-sm ${isBlocked ? "bg-muted-foreground/30" : tierClass}`}
                  title={`${id} ${isBlocked ? "blocked" : tier}`}
                />
                {seatLayout.aisleAfter === seat && <span className="w-2" />}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function formatSeatLayoutSummary(config) {
  const layout = buildSeatLayout(config);
  const goldRows = Math.max(0, layout.rowCount - layout.platinumRows - layout.vipRows);
  return `${layout.rowCount} rows x ${layout.seatsPerRow}, ${layout.totalSeats} seats - Platinum ${layout.platinumRows}, Gold ${goldRows}, VIP ${layout.vipRows}`;
}

function ShowsTab({ showForm, shows, screens, onFormChange, onAddShow, onRemoveShow }) {
  const update = (field) => (event) =>
    onFormChange((current) => ({ ...current, [field]: event.target.value }));
  const isComingSoon = showForm.listingType === "coming-soon";
  const selectedMovie = movies.find((movie) => movie.id === showForm.movieId) ?? movies[0];
  const selectedScreen = screens.find((screen) => screen.name === showForm.screen);
  const previewShow = buildPreviewShow(showForm, selectedMovie);

  return (
    <section className="mt-6 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
      <SpotlightCard className="rounded-lg p-5">
        <PanelHeader
          icon={Clapperboard}
          title="List a show"
          subtitle="Complete listing form for booking or coming soon"
          action={isComingSoon ? "Coming soon" : "Now booking"}
        />

        <form onSubmit={onAddShow} className="mt-5 space-y-5">
          <div className="grid grid-cols-2 gap-1 rounded-lg border border-border/60 bg-background/50 p-1 text-sm">
            {listingTypes.map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() =>
                  onFormChange((current) => ({
                    ...current,
                    listingType: type.id,
                    status: type.id === "coming-soon" ? "Coming soon" : "Open",
                  }))
                }
                className={`rounded-md px-3 py-2 font-medium transition-colors ${
                  showForm.listingType === type.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>

          <FormSection title="Movie details">
            <FormField label="Platform movie to list">
              <select value={showForm.movieId} onChange={update("movieId")} className={selectClass}>
                {movies.map((movie) => (
                  <option key={movie.id} value={movie.id}>
                    {movie.title}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Custom listing title">
              <Input
                value={showForm.customTitle}
                onChange={update("customTitle")}
                placeholder={selectedMovie?.title ?? "Movie title"}
              />
            </FormField>
            <FormField label="Language">
              <select
                value={showForm.language}
                onChange={update("language")}
                className={selectClass}
              >
                {languageOptions.map((language) => (
                  <option key={language}>{language}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Format">
              <select value={showForm.format} onChange={update("format")} className={selectClass}>
                {formatOptions.map((format) => (
                  <option key={format}>{format}</option>
                ))}
              </select>
            </FormField>
          </FormSection>

          <FormSection title={isComingSoon ? "Launch window" : "Show schedule"}>
            <FormField label={isComingSoon ? "Expected release date" : "Show date"}>
              <Input
                value={isComingSoon ? showForm.comingSoonDate : showForm.showDate}
                onChange={update(isComingSoon ? "comingSoonDate" : "showDate")}
                type="date"
              />
            </FormField>
            <FormField label={isComingSoon ? "Preferred screen" : "Screen"}>
              <select
                value={showForm.screen}
                onChange={(event) => {
                  const screen = screens.find((item) => item.name === event.target.value);
                  onFormChange((current) => ({
                    ...current,
                    screen: event.target.value,
                    totalSeats: screen?.seats ? String(screen.seats) : current.totalSeats,
                  }));
                }}
                className={selectClass}
              >
                {screens.length ? (
                  screens.map((screen) => (
                    <option key={screen.id} value={screen.name}>
                      {screen.name}
                    </option>
                  ))
                ) : (
                  <option value="">No screen added</option>
                )}
              </select>
            </FormField>

            {isComingSoon ? (
              <FormField label="Booking opens">
                <Input
                  value={showForm.bookingOpensAt}
                  onChange={update("bookingOpensAt")}
                  type="date"
                />
              </FormField>
            ) : (
              <>
                <FormField label="Start time">
                  <Input value={showForm.startTime} onChange={update("startTime")} type="time" />
                </FormField>
                <FormField label="End time">
                  <Input value={showForm.endTime} onChange={update("endTime")} type="time" />
                </FormField>
              </>
            )}
          </FormSection>

          {!isComingSoon && (
            <FormSection title="Pricing and seats">
              <FormField label="Gold price">
                <Input
                  value={showForm.goldPrice}
                  onChange={update("goldPrice")}
                  type="number"
                  min="50"
                />
              </FormField>
              <FormField label="Platinum price">
                <Input
                  value={showForm.platinumPrice}
                  onChange={update("platinumPrice")}
                  type="number"
                  min="50"
                />
              </FormField>
              <FormField label="VIP price">
                <Input
                  value={showForm.vipPrice}
                  onChange={update("vipPrice")}
                  type="number"
                  min="50"
                />
              </FormField>
              <FormField label="Total seats">
                <Input
                  value={selectedScreen?.seats ?? showForm.totalSeats}
                  readOnly
                  type="number"
                  min="20"
                />
              </FormField>
              {selectedScreen?.seatLayout && (
                <div className="md:col-span-2 rounded-lg border border-border/60 bg-background/40 p-3 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">Seat panel for this show</p>
                  <p className="mt-1">{formatSeatLayoutSummary(selectedScreen.seatLayout)}</p>
                  <div className="mt-3 overflow-x-auto">
                    <SeatMiniMap layout={buildSeatLayout(selectedScreen.seatLayout)} />
                  </div>
                </div>
              )}
            </FormSection>
          )}

          <FormSection title="Publishing">
            <FormField label="Certificate">
              <select
                value={showForm.certificate}
                onChange={update("certificate")}
                className={selectClass}
              >
                {certificateOptions.map((certificate) => (
                  <option key={certificate}>{certificate}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Status">
              <select
                value={isComingSoon ? "Coming soon" : showForm.status}
                onChange={update("status")}
                className={selectClass}
                disabled={isComingSoon}
              >
                {isComingSoon ? (
                  <option>Coming soon</option>
                ) : (
                  showStatusOptions.map((status) => <option key={status}>{status}</option>)
                )}
              </select>
            </FormField>
            <FormField label="Trailer URL">
              <Input
                value={showForm.trailerUrl}
                onChange={update("trailerUrl")}
                placeholder="https://youtube.com/..."
              />
            </FormField>
            <label className="md:col-span-2">
              <span className="text-xs font-medium uppercase text-muted-foreground">
                Listing note
              </span>
              <textarea
                value={showForm.notes}
                onChange={update("notes")}
                placeholder={
                  isComingSoon
                    ? "Advance booking opens soon..."
                    : "Premium format, special screening, offers..."
                }
                className="mt-2 min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
              />
            </label>
          </FormSection>

          <Button className="h-11 w-full gap-2">
            <Plus className="h-4 w-4" />
            {isComingSoon ? "List coming soon" : "List show"}
          </Button>
        </form>
      </SpotlightCard>

      <SpotlightCard className="rounded-lg p-5">
        <PanelHeader icon={Film} title="Listing preview" subtitle="User-facing show card" />
        <ShowPreview show={previewShow} />
      </SpotlightCard>

      <SpotlightCard className="rounded-lg p-5 xl:col-span-2">
        <PanelHeader icon={CalendarClock} title="Shows" subtitle="Listed show schedule" />
        <div className="mt-5 overflow-hidden rounded-lg border border-border/60">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Listing</th>
                  <th className="px-4 py-3 font-medium">Screen</th>
                  <th className="px-4 py-3 font-medium">Schedule</th>
                  <th className="px-4 py-3 font-medium">Pricing</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {shows.map((show) => (
                  <tr key={show.id} className="bg-card/20">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={show.poster || movies[0].poster}
                          alt={show.movie}
                          className="h-14 w-10 rounded-md object-cover"
                        />
                        <div>
                          <p className="font-medium">{show.movie}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {show.language} - {show.format} - {show.certificate}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{show.screen}</td>
                    <td className="px-4 py-3">
                      <p>{formatDateLabel(show.date)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{show.time}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold">
                        {show.listingType === "coming-soon"
                          ? "Notify me"
                          : show.priceLabel || formatCurrency(show.price)}
                      </p>
                      {show.listingType !== "coming-soon" && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {show.seats} seats - VIP {formatCurrency(show.pricing?.vip)}
                        </p>
                      )}
                    </td>
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

function FormSection({ title, children }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase text-muted-foreground">{title}</h3>
      <div className="mt-3 grid gap-3 md:grid-cols-2">{children}</div>
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase text-muted-foreground">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function ShowPreview({ show }) {
  const isComingSoon = show.listingType === "coming-soon";

  return (
    <div className="mt-5 overflow-hidden rounded-lg border border-border/60 bg-background/35">
      <div className="relative h-64">
        <img
          src={show.poster || movies[0].poster}
          alt={show.movie}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute left-4 top-4">
          <StatusPill status={show.status} />
        </div>
        <div className="absolute bottom-4 left-4 right-4">
          <h3 className="text-2xl font-bold tracking-tight">{show.movie}</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {show.language} - {show.format} - {show.certificate}
          </p>
        </div>
      </div>

      <div className="grid gap-3 p-4">
        <SnapshotRow
          label={isComingSoon ? "Expected date" : "Show date"}
          value={formatDateLabel(show.date)}
        />
        <SnapshotRow label="Screen" value={show.screen || "TBA"} />
        <SnapshotRow
          label={isComingSoon ? "Booking opens" : "Time"}
          value={isComingSoon ? formatDateLabel(show.bookingOpensAt) : show.time}
        />
        <SnapshotRow label="Price" value={isComingSoon ? "Notify me" : show.priceLabel} />
      </div>

      {show.notes && (
        <p className="border-t border-border/60 px-4 py-3 text-sm text-muted-foreground">
          {show.notes}
        </p>
      )}
    </div>
  );
}

function buildPreviewShow(showForm, selectedMovie) {
  const isComingSoon = showForm.listingType === "coming-soon";
  const title = showForm.customTitle.trim() || selectedMovie?.title || "Untitled show";
  const goldPrice = Number(showForm.goldPrice) || 300;

  return {
    listingType: showForm.listingType,
    movie: title,
    poster: selectedMovie?.poster,
    screen: isComingSoon ? showForm.screen || "TBA" : showForm.screen,
    date: isComingSoon ? showForm.comingSoonDate : showForm.showDate,
    time: isComingSoon ? "Coming soon" : formatShowTime(showForm.startTime, showForm.endTime),
    language: showForm.language,
    format: showForm.format,
    certificate: showForm.certificate,
    priceLabel: isComingSoon ? "Notify me" : `${formatCurrency(goldPrice)} onwards`,
    status: isComingSoon ? "Coming soon" : showForm.status,
    bookingOpensAt: showForm.bookingOpensAt,
    notes: showForm.notes.trim(),
  };
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

function OwnerApprovalState({ application, status, user, onLogout }) {
  const isRejected = status === "Rejected";
  return (
    <div className="mx-auto grid min-h-[calc(100vh-190px)] max-w-4xl place-items-center px-4 py-12">
      <SpotlightCard className="w-full rounded-lg p-6 shadow-2xl shadow-black/20">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">
              <ShieldCheck className="h-4 w-4" />
              Owner approval
            </div>
            <h1 className="mt-5 text-2xl font-bold tracking-tight">
              {isRejected ? "Application needs changes" : "Application submitted for review"}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {isRejected
                ? "Admin rejected this theater owner request. Update your cinema details and submit again."
                : "Admin approval is required before this owner account can manage locations, movies, screens, show days, time slots and pricing."}
            </p>
          </div>
          <StatusPill status={status} />
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <SnapshotRow label="Owner" value={user?.name || application?.ownerName || "Owner"} />
          <SnapshotRow
            label="Cinema"
            value={application?.theaterName || "Application details pending"}
          />
          <SnapshotRow label="City" value={application?.city || "City not set"} />
          <SnapshotRow label="Screens" value={(application?.screens || 1).toLocaleString()} />
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="secondary" onClick={onLogout} className="gap-2">
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
          <Button asChild className="gap-2">
            <Link to="/">
              <Ticket className="h-4 w-4" />
              Browse movies
            </Link>
          </Button>
        </div>
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
  const tones = {
    Approved: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500",
    Pending: "border-amber-500/30 bg-amber-500/10 text-amber-500",
    Rejected: "border-destructive/30 bg-destructive/10 text-destructive",
    "Coming soon": "border-cyan-500/30 bg-cyan-500/10 text-cyan-500",
    "Selling fast": "border-amber-500/30 bg-amber-500/10 text-amber-500",
    "Sold out": "border-destructive/30 bg-destructive/10 text-destructive",
    Draft: "border-border bg-muted text-muted-foreground",
  };
  const tone = tones[status] ?? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500";

  return (
    <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${tone}`}>{status}</span>
  );
}

function getOwnerKey(user) {
  if (!user) return "";
  return String(user.id || user.email || user.name || "owner")
    .trim()
    .toLowerCase();
}

function ownerStorageKey(ownerKey) {
  return `bms-owner-workspace:${encodeURIComponent(ownerKey)}`;
}

function createCinemaProfile(ownerKey, application = null) {
  const source = application && typeof application === "object" ? application : {};
  const name = source.theaterName || defaultCinemaProfile.name;
  const city = source.city || defaultCinemaProfile.city;
  return {
    ...defaultCinemaProfile,
    name,
    city,
    area: source.area || defaultCinemaProfile.area,
    address: source.address || defaultCinemaProfile.address,
    contact: source.contact || defaultCinemaProfile.contact,
    manager: source.ownerName || source.companyName || defaultCinemaProfile.manager,
    amenities: source.documents || defaultCinemaProfile.amenities,
    ownerKey,
    id: slugify(`${name}-${city}`),
  };
}

function createOwnerWorkspace(ownerKey, application = null) {
  return {
    version: OWNER_WORKSPACE_VERSION,
    cinemaProfile: createCinemaProfile(ownerKey, application),
    screens: createInitialScreens(ownerKey, application),
    shows: [],
    bookings: [],
  };
}

function createInitialScreens(ownerKey, application = null) {
  const count = Math.min(12, Math.max(1, Number(application?.screens) || screenSeeds.length));
  return Array.from({ length: count }, (_, index) => {
    const seed = screenSeeds[index % screenSeeds.length];
    return {
      ...seed,
      id: `${slugify(seed.name)}-${index + 1}`,
      name: count === screenSeeds.length ? seed.name : `Screen ${index + 1}`,
      ownerKey,
      seatLayout: normalizeSeatLayoutConfig(seed.seatLayout),
      seats: buildSeatLayout(seed.seatLayout).totalSeats,
    };
  });
}

function readOwnerWorkspace(ownerKey, application = null) {
  if (typeof window === "undefined" || !ownerKey)
    return createOwnerWorkspace(ownerKey, application);

  try {
    const raw = window.localStorage.getItem(ownerStorageKey(ownerKey));
    if (!raw) return createOwnerWorkspace(ownerKey, application);

    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== OWNER_WORKSPACE_VERSION) {
      return createOwnerWorkspace(ownerKey, application);
    }

    return {
      version: OWNER_WORKSPACE_VERSION,
      cinemaProfile: normalizeCinemaProfile(parsed.cinemaProfile, ownerKey),
      screens: normalizeOwnerScreens(parsed.screens, ownerKey),
      shows: normalizeOwnerItems(parsed.shows, ownerKey),
      bookings: normalizeOwnerItems(parsed.bookings, ownerKey),
    };
  } catch {
    return createOwnerWorkspace(ownerKey, application);
  }
}

function writeOwnerWorkspace(ownerKey, workspace) {
  if (typeof window === "undefined" || !ownerKey) return;
  window.localStorage.setItem(
    ownerStorageKey(ownerKey),
    JSON.stringify({
      version: OWNER_WORKSPACE_VERSION,
      cinemaProfile: normalizeCinemaProfile(workspace.cinemaProfile, ownerKey),
      screens: normalizeOwnerScreens(workspace.screens, ownerKey),
      shows: normalizeOwnerItems(workspace.shows, ownerKey),
      bookings: normalizeOwnerItems(workspace.bookings, ownerKey),
    }),
  );
}

function normalizeOwnerItems(items, ownerKey) {
  return Array.isArray(items) ? items.map((item) => ({ ...item, ownerKey })) : [];
}

function normalizeOwnerScreens(items, ownerKey) {
  if (!Array.isArray(items)) return [];
  return items.map((item) => {
    const seatLayout = normalizeSeatLayoutConfig(
      item.seatLayout ?? inferSeatLayoutFromCapacity(item.seats),
    );
    return {
      ...item,
      ownerKey,
      seatLayout,
      seats: buildSeatLayout(seatLayout).totalSeats,
    };
  });
}

function inferSeatLayoutFromCapacity(seats) {
  const count = Number(seats) || 120;
  return {
    rowCount: Math.min(26, Math.max(4, Math.ceil(count / 14))),
    seatsPerRow: 14,
    platinumRows: 2,
    vipRows: 2,
    aisleAfter: 7,
  };
}

function normalizeCinemaProfile(profile, ownerKey) {
  const normalized = {
    ...createCinemaProfile(ownerKey),
    ...(profile && typeof profile === "object" ? profile : {}),
    ownerKey,
  };
  const idSource = `${normalized.name || defaultCinemaProfile.name}-${
    normalized.city || defaultCinemaProfile.city
  }`;
  return {
    ...normalized,
    id: normalized.id || slugify(idSource),
  };
}

function splitAmenities(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildListedMovies(shows, bookings) {
  const revenueByMovie = bookings.reduce((acc, booking) => {
    acc[booking.movie] = (acc[booking.movie] ?? 0) + Number(booking.total || 0);
    return acc;
  }, {});

  const listings = shows.reduce((acc, show) => {
    const movieId = show.movieId || slugify(show.movie);
    if (!acc[movieId]) {
      acc[movieId] = {
        movieId,
        title: show.movie,
        poster: show.poster,
        language: show.language,
        format: show.format,
        certificate: show.certificate,
        showCount: 0,
        liveCount: 0,
        comingSoonCount: 0,
        revenue: revenueByMovie[show.movie] ?? 0,
        latestShowId: show.id,
      };
    }

    acc[movieId].showCount += 1;
    acc[movieId].latestShowId = show.id;
    if (show.listingType === "coming-soon") acc[movieId].comingSoonCount += 1;
    else acc[movieId].liveCount += 1;
    acc[movieId].revenue = revenueByMovie[show.movie] ?? acc[movieId].revenue;
    return acc;
  }, {});

  return Object.values(listings).sort((a, b) => b.showCount - a.showCount);
}

function buildEarningsTrend(bookings) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    return {
      key,
      day: date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
      earnings: 0,
      bookings: 0,
      occupancy: 0,
      seats: 0,
    };
  });

  const byKey = new Map(days.map((day) => [day.key, day]));
  bookings.forEach((booking) => {
    const key = normalizeDateKey(booking.bookedAt || booking.createdAt || booking.date);
    const row = byKey.get(key) ?? days[days.length - 1];
    row.earnings += Number(booking.total || 0);
    row.bookings += 1;
    row.seats += booking.seats?.length ?? 0;
    row.occupancy = Math.min(100, Math.round(row.seats * 8));
  });

  return days;
}

function normalizeDateKey(value) {
  if (!value) return new Date().toISOString().slice(0, 10);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function formatCurrency(value) {
  return `Rs ${Number(value || 0).toLocaleString("en-IN")}`;
}

function getDateInputValue(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function slugify(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatTimeLabel(value) {
  if (!value) return "TBA";
  const [hourText, minute = "00"] = value.split(":");
  const hour = Number(hourText);
  if (Number.isNaN(hour)) return value;

  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12.toString().padStart(2, "0")}:${minute} ${suffix}`;
}

function formatShowTime(startTime, endTime) {
  return `${formatTimeLabel(startTime)} - ${formatTimeLabel(endTime)}`;
}

function formatDateLabel(value) {
  if (!value) return "TBA";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;

  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export { Route };
