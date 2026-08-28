import { Link, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  BadgeIndianRupee,
  Building2,
  CalendarClock,
  CheckCircle2,
  Camera,
  CreditCard,
  Film,
  Gauge,
  ImagePlus,
  LockKeyhole,
  LogIn,
  LogOut,
  MapPin,
  Monitor,
  Plus,
  QrCode,
  RefreshCcw,
  Save,
  ScanLine,
  ShieldCheck,
  Ticket,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { hydrateAuth, logout, readStoredAuth } from "@/features/auth/authSlice";
import { buildSeatLayout, normalizeSeatLayoutConfig } from "@/features/booking/data/seatLayout";
import { movies } from "@/features/movies/data/movieCatalog";
import {
  castAvatarFallback,
  movieImageFallback,
  normalizeCastImageUrl,
  normalizeMovieImageUrl,
} from "@/features/movies/services/movieMedia";
import { fetchOwnerWorkspace, fetchScanStats, saveOwnerWorkspace, verifyTicketByQr } from "@/features/owner/api/ownerApi";
import { SpotlightCard } from "@/shared/components/reactbits/SpotlightCard";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { TrendAreaChart, VerticalBars } from "@/shared/components/ui/lightweight-chart";
import { baseRequest } from "@/features/api/baseApi";
import { uploadFile } from "@/shared/services/httpClient";

const screenSeeds = [
  {
    id: "imax-01",
    name: "IMAX 01",
    type: "IMAX Laser",
    seats: 148,
    occupancy: 82,
    seatLayout: {
      rowCount: 11,
      seatsPerRow: 14,
      platinumRows: 2,
      silverRows: 2,
      vipRows: 2,
      aisleAfter: 7,
    },
  },
  {
    id: "dolby-02",
    name: "Dolby 02",
    type: "Dolby Atmos",
    seats: 126,
    occupancy: 76,
    seatLayout: {
      rowCount: 9,
      seatsPerRow: 14,
      platinumRows: 2,
      silverRows: 2,
      vipRows: 2,
      aisleAfter: 7,
    },
  },
  {
    id: "premiere-03",
    name: "Premiere 03",
    type: "Premium",
    seats: 96,
    occupancy: 68,
    seatLayout: {
      rowCount: 8,
      seatsPerRow: 12,
      platinumRows: 1,
      silverRows: 2,
      vipRows: 2,
      aisleAfter: 6,
    },
  },
];

const blankScreen = {
  name: "",
  type: "Premium",
  rowCount: "10",
  seatsPerRow: "14",
  platinumRows: "2",
  silverRows: "2",
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
  manager: "Manager desk",
  amenities: "IMAX Laser, Dolby Atmos, Recliners, Parking, Food counter",
  cancellationPolicy: "Cancellation available up to 2 hours before movie timing.",
  coverImage: "",
};

function createBlankShow(screens = screenSeeds) {
  return {
    listingType: "live",
    movieId: "",
    customTitle: "",
    poster: "",
    backdrop: "",
    duration: "",
    genres: "",
    releaseDate: "",
    description: "",
    cast: normalizeCastRows(),
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
    silverPrice: "420",
    platinumPrice: "480",
    vipPrice: "650",
    totalSeats: "120",
    status: "Open",
    trailerUrl: "",
    notes: "",
  };
}

const languageOptions = ["English", "Hindi", "Tamil", "Telugu", "Kannada"];
const formatOptions = ["2D", "3D", "IMAX", "4DX", "Dolby Atmos"];
const certificateOptions = ["U", "UA", "A"];
const listingTypeOptions = [
  { value: "coming-soon", label: "Coming soon" },
  { value: "live", label: "Released / booking ready" },
];
const showStatusOptions = ["Open", "Selling fast", "Sold out", "Draft"];
const MAX_IMAGE_UPLOAD_BYTES = 2.5 * 1024 * 1024;
const ownerPanelTabs = [
  { id: "overview", label: "Overview", icon: Gauge },
  { id: "cinema", label: "Cinema", icon: Building2 },
  { id: "movies", label: "Movies", icon: Film },
  { id: "timings", label: "Timings", icon: CalendarClock },
  { id: "screens", label: "Screens", icon: Monitor },
  { id: "bookings", label: "Bookings", icon: Ticket },
  { id: "scan", label: "Scan QR", icon: ScanLine },
  { id: "refunds", label: "Refunds", icon: RefreshCcw },
  { id: "revenue", label: "Revenue", icon: BadgeIndianRupee },
];

const selectClass =
  "h-11 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none transition-colors focus-visible:ring-1 focus-visible:ring-ring";

function OwnerDashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const auth = useSelector((state) => state.auth);
  const ownerKey = useMemo(() => getOwnerKey(auth.user), [auth.user]);
  const [ownerApproval, setOwnerApproval] = useState(() => getOwnerApprovalFromUser(null));
  const [activeTab, setActiveTab] = useState("overview");
  const [screens, setScreens] = useState([]);
  const [shows, setShows] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [services, setServices] = useState(createDefaultServices);
  const [cinemaProfile, setCinemaProfile] = useState(defaultCinemaProfile);
  const [screenForm, setScreenForm] = useState(blankScreen);
  const [showForm, setShowForm] = useState(() => createBlankShow(screenSeeds));
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [workspaceState, setWorkspaceState] = useState("idle");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!auth.hydrated) dispatch(hydrateAuth(readStoredAuth()));
  }, [auth.hydrated, dispatch]);

  useEffect(() => {
    if (!auth.hydrated || !auth.user) return;
    if (auth.user.role === "admin") navigate("/admin", { replace: true });
    if (auth.user.role === "user") navigate("/dashboard", { replace: true });
    if (auth.user.role === "theater-owner") setOwnerApproval(getOwnerApprovalFromUser(auth.user));
  }, [auth.hydrated, auth.user, navigate]);

  useEffect(() => {
    if (!auth.hydrated || auth.user?.role !== "theater-owner" || !ownerKey) return undefined;
    let active = true;
    setWorkspaceState("loading");

    fetchOwnerWorkspace()
      .then((workspace) => {
        if (!active) return;
        applyWorkspace(workspace);
        setOwnerApproval({
          status: workspace.ownerStatus || "Approved",
          application: workspace.application || auth.user.ownerApplication || null,
        });
        setWorkspaceReady(true);
        setWorkspaceState("ready");
      })
      .catch((error) => {
        if (!active) return;
        if (error.response?.status === 403) {
          setOwnerApproval({
            status: error.response.data?.status || auth.user.ownerStatus || "Pending",
            application: error.response.data?.application || auth.user.ownerApplication || null,
          });
          setWorkspaceState("blocked");
          return;
        }
        setNotice(error.response?.data?.error || "Could not load owner workspace.");
        setWorkspaceState("error");
      });

    return () => {
      active = false;
    };
  }, [auth.hydrated, auth.user, ownerKey]);

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
  const ownerRefundCases = useMemo(
    () => buildRefundCases(ownerBookings, services),
    [ownerBookings, services],
  );
  const ownerEarningsTrend = useMemo(() => buildEarningsTrend(ownerBookings), [ownerBookings]);

  const totals = useMemo(() => {
    const confirmedBookings = ownerBookings.filter((booking) => !isCancelledBooking(booking));
    const earnings = confirmedBookings.reduce(
      (sum, booking) => sum + Number(booking.total || 0),
      0,
    );
    const seatsSold = confirmedBookings.reduce((sum, booking) => sum + booking.seats.length, 0);
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
      bookings: confirmedBookings.length,
      totalBookings: ownerBookings.length,
      shows: ownerShows.length,
      movies: listedMovies.length,
      comingSoon: ownerShows.filter((show) => show.listingType === "coming-soon").length,
      refunds: ownerRefundCases.length,
      refundAmount: ownerRefundCases.reduce((sum, refund) => sum + Number(refund.amount || 0), 0),
    };
  }, [listedMovies.length, ownerBookings, ownerRefundCases, ownerScreens, ownerShows]);

  const popularMovies = useMemo(() => {
    const map = ownerBookings.reduce((acc, booking) => {
      acc[booking.movie] = (acc[booking.movie] ?? 0) + Number(booking.total || 0);
      return acc;
    }, {});

    return Object.entries(map).map(([movie, value]) => ({ movie, value }));
  }, [ownerBookings]);

  const applyWorkspace = (workspace) => {
    setCinemaProfile(workspace.cinemaProfile ?? defaultCinemaProfile);
    setScreens(workspace.screens ?? []);
    setShows(workspace.shows ?? []);
    setBookings(workspace.bookings ?? []);
    setServices(workspace.services ?? createDefaultServices());
    setShowForm((current) => ({
      ...current,
      screen: workspace.screens?.[0]?.name ?? "",
      totalSeats: workspace.screens?.[0]?.seats
        ? String(workspace.screens[0].seats)
        : current.totalSeats,
    }));
  };

  const workspacePayload = (overrides = {}) => ({
    cinemaProfile,
    screens,
    shows,
    bookings,
    services,
    ...overrides,
  });

  const persistWorkspace = async (nextWorkspace, successMessage) => {
    try {
      const saved = await saveOwnerWorkspace(nextWorkspace);
      applyWorkspace(saved);
      setWorkspaceReady(true);
      if (successMessage) setNotice(successMessage);
      return true;
    } catch (error) {
      setNotice(error.response?.data?.error || "Could not save owner workspace.");
      return false;
    }
  };

  const saveCinemaProfile = async (event) => {
    event.preventDefault();
    const name = cinemaProfile.name.trim() || defaultCinemaProfile.name;
    const city = cinemaProfile.city.trim() || defaultCinemaProfile.city;
    const nextProfile = {
      ...cinemaProfile,
      id: slugify(`${name}-${city}`),
      name,
      city,
      area: String(cinemaProfile.area ?? "").trim(),
      address: String(cinemaProfile.address ?? "").trim(),
      distance: String(cinemaProfile.distance ?? "").trim(),
      contact: String(cinemaProfile.contact ?? "").trim(),
      manager: String(cinemaProfile.manager ?? "").trim(),
      amenities: String(cinemaProfile.amenities ?? "").trim(),
      cancellationPolicy: String(cinemaProfile.cancellationPolicy ?? "").trim(),
      coverImage: String(cinemaProfile.coverImage ?? "").trim(),
    };
    setCinemaProfile(nextProfile);
    await persistWorkspace(
      workspacePayload({ cinemaProfile: nextProfile }),
      `${name} location saved for ${city}. Users can find this cinema in this city.`,
    );
  };

  const addScreen = async (event) => {
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

    const nextScreens = [nextScreen, ...screens];
    setScreens(nextScreens);
    setShowForm((current) => ({
      ...current,
      screen: nextScreen.name,
      totalSeats: String(nextScreen.seats),
    }));
    setScreenForm(blankScreen);
    await persistWorkspace(
      workspacePayload({ screens: nextScreens }),
      `${name} added. Seat layout is ready for this cinema.`,
    );
  };

  const removeScreen = async (id) => {
    const screen = screens.find((item) => item.id === id);
    const nextScreens = screens.filter((item) => item.id !== id);
    const nextShows = shows.filter((show) => show.screen !== screen?.name);
    setScreens(nextScreens);
    setShows(nextShows);
    setShowForm((current) =>
      current.screen === screen?.name
        ? { ...current, screen: nextScreens[0]?.name ?? "" }
        : current,
    );
    await persistWorkspace(
      workspacePayload({ screens: nextScreens, shows: nextShows }),
      `${screen?.name ?? "Screen"} removed from owner dashboard.`,
    );
  };

  const addMovieListing = async (event) => {
    event.preventDefault();
    const nextListing = createOwnerListing({ mode: "movie" });
    if (!nextListing) return;

    const nextShows = [nextListing, ...shows];
    setShows(nextShows);
    setShowForm((current) => ({
      ...createBlankShow(ownerScreens),
      movieId: nextListing.movieId,
      screen: current.screen,
      totalSeats: current.totalSeats,
    }));
    const message =
      nextListing.listingType === "coming-soon"
        ? `${nextListing.movie} coming soon me ${nextListing.city} ke liye listed hai.`
        : `${nextListing.movie} released movie master saved. Timings add karne ke baad Movies page me dikhegi.`;
    await persistWorkspace(workspacePayload({ shows: nextShows }), message);
  };

  const addTiming = async (event) => {
    event.preventDefault();
    const nextTiming = createOwnerListing({ mode: "timing" });
    if (!nextTiming) return;

    const nextShows = [nextTiming, ...shows];
    setShows(nextShows);
    setShowForm((current) => ({
      ...createBlankShow(ownerScreens),
      movieId: current.movieId,
      screen: current.screen,
      totalSeats: current.totalSeats,
    }));
    await persistWorkspace(
      workspacePayload({ shows: nextShows }),
      `${nextTiming.movie} timing added for ${nextTiming.time} on ${nextTiming.screen}.`,
    );
  };

  const createOwnerListing = ({ mode }) => {
    const listedMovie = listedMovies.find((item) => item.movieId === showForm.movieId);
    const movie = listedMovie ?? movies.find((item) => item.id === showForm.movieId);
    const isMovieOnly = mode === "movie";
    const isComingSoonListing = isMovieOnly && showForm.listingType === "coming-soon";
    const sourceMovie = isMovieOnly ? null : movie;
    const customTitle = showForm.customTitle.trim();
    const title = isMovieOnly ? customTitle : customTitle || sourceMovie?.title;
    if (!title || (!isMovieOnly && !showForm.screen)) return null;

    const goldPrice = Number(showForm.goldPrice) || 300;
    const silverPrice = Number(showForm.silverPrice) || goldPrice;
    const platinumPrice = Number(showForm.platinumPrice) || goldPrice;
    const vipPrice = Number(showForm.vipPrice) || platinumPrice;
    const date = isComingSoonListing ? showForm.comingSoonDate : showForm.showDate;
    const selectedScreen = ownerScreens.find((screen) => screen.name === showForm.screen);
    const seatLayout = normalizeSeatLayoutConfig(selectedScreen?.seatLayout);
    const seatCount = selectedScreen?.seats ?? buildSeatLayout(seatLayout).totalSeats;
    const poster = showForm.poster || sourceMovie?.poster || movieImageFallback(title, "poster");
    const backdrop =
      showForm.backdrop || sourceMovie?.backdrop || poster || movieImageFallback(title, "backdrop");
    const genres = splitAmenities(showForm.genres).length
      ? splitAmenities(showForm.genres)
      : sourceMovie?.genres || [];
    const cast = normalizeCastRows(showForm.cast, sourceMovie?.cast);

    return {
      id: `${slugify(title)}-${Date.now()}`,
      ownerKey,
      theaterId: cinemaProfile.id || slugify(`${cinemaProfile.name}-${cinemaProfile.city}`),
      theater: cinemaProfile.name,
      city: cinemaProfile.city,
      area: cinemaProfile.area,
      address: cinemaProfile.address,
      distance: cinemaProfile.distance,
      amenities: cinemaProfile.amenities,
      listingType: isComingSoonListing ? "coming-soon" : "live",
      movieId: isMovieOnly
        ? slugify(title)
        : sourceMovie?.movieId || sourceMovie?.id || slugify(title),
      movie: title,
      poster,
      backdrop,
      duration: showForm.duration.trim() || sourceMovie?.duration || "",
      genres,
      releaseDate: showForm.releaseDate.trim() || sourceMovie?.releaseDate || "",
      description: showForm.description.trim() || sourceMovie?.description || "",
      cast,
      screen: isMovieOnly ? "Timing pending" : showForm.screen,
      date,
      time: isMovieOnly ? "Timing pending" : formatShowTime(showForm.startTime, showForm.endTime),
      startTime: isMovieOnly ? "TBA" : showForm.startTime,
      endTime: isMovieOnly ? "TBA" : showForm.endTime,
      language: showForm.language,
      format: showForm.format,
      certificate: showForm.certificate,
      price: isMovieOnly ? 0 : goldPrice,
      priceLabel: isMovieOnly ? "Timing pending" : `${formatCurrency(goldPrice)} onwards`,
      pricing: isMovieOnly
        ? { gold: 0, silver: 0, platinum: 0, vip: 0 }
        : { gold: goldPrice, silver: silverPrice, platinum: platinumPrice, vip: vipPrice },
      seats: isMovieOnly ? 0 : seatCount,
      seatLayout: isMovieOnly ? null : seatLayout,
      status: isComingSoonListing ? "Coming soon" : isMovieOnly ? "Draft" : showForm.status,
      bookingOpensAt: showForm.bookingOpensAt,
      trailerUrl: showForm.trailerUrl.trim(),
      notes: showForm.notes.trim(),
    };
  };

  const removeShow = async (id) => {
    const show = shows.find((item) => item.id === id);
    const nextShows = shows.filter((item) => item.id !== id);
    setShows(nextShows);
    await persistWorkspace(
      workspacePayload({ shows: nextShows }),
      `${show?.movie ?? "Listing"} removed from today's schedule.`,
    );
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

  if (!workspaceReady) {
    return (
      <AccessState
        icon={Building2}
        title={
          workspaceState === "error" ? "Owner workspace unavailable" : "Loading owner workspace"
        }
        text={
          workspaceState === "error"
            ? "The owner panel could not load live MongoDB data right now."
            : "Fetching cinema, screens and bookings from MongoDB."
        }
      />
    );
  }

  return (
    <div className="mx-auto max-w-[1560px] px-4 py-4 pb-20 sm:px-5 lg:px-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/70 px-4 py-3 shadow-sm sm:px-5 sm:gap-4">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary sm:h-10 sm:w-10">
            <Building2 className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold tracking-tight sm:text-lg">Theater owner panel</h1>
            <p className="truncate text-xs text-muted-foreground">
              {auth.user.name || "Owner"} &middot; {cinemaProfile.city || "No city"} &middot;{" "}
              {ownerScreens.length} screen{ownerScreens.length !== 1 ? "s" : ""} &middot;{" "}
              {listedMovies.length} movie{listedMovies.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <StatusPill status={ownerApproval.status} />
          <Button size="sm" onClick={() => setActiveTab("screens")} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Add screen</span>
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => dispatch(logout())}
            className="gap-1.5"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto rounded-lg border border-border/60 bg-card/50 p-1 surface-rise">
        {ownerPanelTabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
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
          showForm={showForm}
          listedMovies={listedMovies}
          onFormChange={setShowForm}
          onAddMovie={addMovieListing}
          onOpenTimings={() => setActiveTab("timings")}
          onRemoveShow={removeShow}
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

      {activeTab === "timings" && (
        <MovieTimingsTab
          showForm={showForm}
          timings={ownerShows.filter((item) => item.listingType !== "coming-soon")}
          listedMovies={listedMovies}
          screens={ownerScreens}
          onFormChange={setShowForm}
          onAddTiming={addTiming}
          onRemoveShow={removeShow}
        />
      )}

      {activeTab === "bookings" && (
        <BookingsTab bookings={ownerBookings} totals={totals} screens={ownerScreens} />
      )}

      {activeTab === "scan" && <QrScanTab />}

      {activeTab === "refunds" && <RefundsTab refundCases={ownerRefundCases} totals={totals} />}

      {activeTab === "revenue" && (
        <RevenueTab
          bookings={ownerBookings}
          listedMovies={listedMovies}
          earningsTrend={ownerEarningsTrend}
          totals={totals}
        />
      )}
    </div>
  );
}

function OverviewTab({ earningsTrend, screens, popularMovies, listedMovies, totals }) {
  const topMovies = [...(listedMovies.length ? listedMovies : popularMovies)].slice(0, 6);

  return (
    <section className="mt-6 space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 stat-stagger">
        <SpotlightCard className="relative overflow-hidden rounded-xl p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total revenue
              </p>
              <p className="mt-2 text-2xl font-bold tracking-tight">
                {formatCurrency(totals.earnings)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {totals.bookings} confirmed bookings
              </p>
            </div>
            <div className="stat-pulse grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
              <BadgeIndianRupee className="h-5 w-5" />
            </div>
          </div>
          <div className="relative mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-cyan-400 transition-all"
              style={{
                width: `${Math.min(100, (totals.bookings / Math.max(totals.bookings, 50)) * 100)}%`,
              }}
            />
          </div>
        </SpotlightCard>

        <SpotlightCard className="relative overflow-hidden rounded-xl p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-emerald-500/10 blur-2xl" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Seats sold
              </p>
              <p className="mt-2 text-2xl font-bold tracking-tight">
                {totals.seatsSold.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {totals.capacity.toLocaleString()} total capacity
              </p>
            </div>
            <div className="stat-pulse grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-500/15 text-emerald-500">
              <Ticket className="h-5 w-5" />
            </div>
          </div>
          <div className="relative mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all"
              style={{
                width: `${Math.min(100, totals.capacity ? (totals.seatsSold / totals.capacity) * 100 : 0)}%`,
              }}
            />
          </div>
        </SpotlightCard>

        <SpotlightCard className="relative overflow-hidden rounded-xl p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-amber-500/10 blur-2xl" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Occupancy
              </p>
              <p className="mt-2 text-2xl font-bold tracking-tight">{totals.occupancy}%</p>
              <p className="mt-1 text-xs text-muted-foreground">{screens.length} active screens</p>
            </div>
            <div className="stat-pulse grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-500/15 text-amber-500">
              <Gauge className="h-5 w-5" />
            </div>
          </div>
          <div className="relative mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all"
              style={{ width: `${totals.occupancy}%` }}
            />
          </div>
        </SpotlightCard>

        <SpotlightCard className="relative overflow-hidden rounded-xl p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-sky-500/10 blur-2xl" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Shows
              </p>
              <p className="mt-2 text-2xl font-bold tracking-tight">
                {totals.shows.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{totals.movies} movies listed</p>
            </div>
            <div className="stat-pulse grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sky-500/15 text-sky-500">
              <Film className="h-5 w-5" />
            </div>
          </div>
          <div className="relative mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-500 transition-all"
              style={{
                width: `${Math.min(100, (totals.shows / Math.max(totals.shows, 30)) * 100)}%`,
              }}
            />
          </div>
        </SpotlightCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <SpotlightCard className="relative overflow-hidden rounded-xl p-5">
          <div className="pointer-events-none absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-primary/5 blur-3xl" />
          <div className="relative">
            <PanelHeader
              icon={BadgeIndianRupee}
              title="Track earnings"
              subtitle="Daily paid bookings and revenue"
              action={formatCurrency(totals.earnings)}
            />
          </div>
          <div className="relative mt-5 h-60 sm:h-72">
            <TrendAreaChart data={earningsTrend} valueKey="earnings" formatValue={formatCurrency} />
          </div>
        </SpotlightCard>

        <SpotlightCard className="relative overflow-hidden rounded-xl p-5">
          <div className="pointer-events-none absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-amber-500/5 blur-3xl" />
          <div className="relative">
            <PanelHeader icon={Gauge} title="Occupancy rates" subtitle="Screen-wise occupancy" />
          </div>
          <div className="relative mt-5 h-60 sm:h-72">
            <VerticalBars
              data={screens}
              labelKey="name"
              valueKey="occupancy"
              formatValue={(value) => `${value}%`}
            />
          </div>
        </SpotlightCard>
      </div>

      <SpotlightCard className="relative overflow-hidden rounded-xl p-5">
        <div className="pointer-events-none absolute -left-8 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full bg-primary/5 blur-3xl" />
        <div className="relative">
          <PanelHeader
            icon={Film}
            title="My listed movies"
            subtitle="Only movies listed by this theater owner"
            action={`${listedMovies.length} movies`}
          />
        </div>
        {topMovies.length > 0 ? (
          <div className="relative mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 offer-stagger">
            {topMovies.map((movie, index) => {
              const gradients = [
                "from-violet-500/10 via-fuchsia-500/5 to-transparent",
                "from-blue-500/10 via-cyan-500/5 to-transparent",
                "from-emerald-500/10 via-teal-500/5 to-transparent",
                "from-amber-500/10 via-orange-500/5 to-transparent",
                "from-rose-500/10 via-pink-500/5 to-transparent",
                "from-sky-500/10 via-indigo-500/5 to-transparent",
              ];
              const borderColors = [
                "border-violet-500/20 hover:border-violet-500/40",
                "border-blue-500/20 hover:border-blue-500/40",
                "border-emerald-500/20 hover:border-emerald-500/40",
                "border-amber-500/20 hover:border-amber-500/40",
                "border-rose-500/20 hover:border-rose-500/40",
                "border-sky-500/20 hover:border-sky-500/40",
              ];
              const g = gradients[index % gradients.length];
              const b = borderColors[index % borderColors.length];
              return (
                <div
                  key={movie.movieId ?? movie.movie}
                  className={`group relative overflow-hidden rounded-xl border ${b} bg-gradient-to-br ${g} p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg`}
                >
                  <div className="relative flex items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                      <Film className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold leading-5 line-clamp-1">
                        {movie.title ?? movie.movie}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="text-lg font-bold tracking-tight">
                          {movie.revenue !== undefined
                            ? formatCurrency(movie.revenue)
                            : formatCurrency(movie.value)}
                        </span>
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                          #{index + 1}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {movie.showCount
                          ? `${movie.showCount} owner listings`
                          : "Confirmed ticket revenue"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="relative mt-5 rounded-xl border border-dashed border-border/70 p-8 text-center">
            <Film className="mx-auto h-10 w-10 text-muted-foreground/30" />
            <p className="mt-3 text-sm font-semibold">No owner-listed movies yet</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              Movies appear here from confirmed bookings and approved cinema activity.
            </p>
          </div>
        )}
      </SpotlightCard>
    </section>
  );
}

function OwnerMoviesTab({
  showForm,
  listedMovies,
  onFormChange,
  onAddMovie,
  onOpenTimings,
  onRemoveShow,
}) {
  const update = (field) => (event) =>
    onFormChange((current) => ({ ...current, [field]: event.target.value }));
  const moviePreview = buildMovieMasterPreview(showForm);
  const [uploadProgress, setUploadProgress] = useState({});
  const castRows = normalizeCastRows(showForm.cast);

  const setFieldProgress = (field, value) =>
    setUploadProgress((prev) => ({ ...prev, [field]: value }));

  const uploadImage = (field) => async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setFieldProgress(field, 0);
      const imageUrl = await uploadImageFile(file, {
        folder: `movix/owner/movies/${field}`,
        onProgress: ({ loaded, total }) =>
          setFieldProgress(field, Math.round((loaded / total) * 100)),
      });
      onFormChange((current) => ({ ...current, [field]: imageUrl }));
    } catch (error) {
      setUploadProgress((prev) => ({ ...prev, [field]: "error" }));
    } finally {
      event.target.value = "";
      setTimeout(() => setFieldProgress(field, null), 2000);
    }
  };

  const updateCast = (index, field) => (event) => {
    const value = event.target.value;
    onFormChange((current) => ({
      ...current,
      cast: normalizeCastRows(current.cast).map((member, memberIndex) =>
        memberIndex === index ? { ...member, [field]: value } : member,
      ),
    }));
  };

  const uploadCastPhoto = (index) => async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const key = `cast-${index}`;
    try {
      setFieldProgress(key, 0);
      const imageUrl = await uploadImageFile(file, {
        folder: "movix/owner/cast",
        onProgress: ({ loaded, total }) =>
          setFieldProgress(key, Math.round((loaded / total) * 100)),
      });
      onFormChange((current) => ({
        ...current,
        cast: normalizeCastRows(current.cast).map((member, memberIndex) =>
          memberIndex === index ? { ...member, avatar: imageUrl } : member,
        ),
      }));
    } catch (error) {
      setUploadProgress((prev) => ({ ...prev, [key]: "error" }));
    } finally {
      event.target.value = "";
      setTimeout(() => setFieldProgress(key, null), 2000);
    }
  };

  const addCastMember = () => {
    onFormChange((current) => ({
      ...current,
      cast: [...normalizeCastRows(current.cast), { name: "", role: "Actor", avatar: "" }],
    }));
  };

  const removeCastMember = (index) => {
    onFormChange((current) => ({
      ...current,
      cast: normalizeCastRows(current.cast).filter((_, memberIndex) => memberIndex !== index),
    }));
  };

  return (
    <section className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-[0.85fr_1.15fr] surface-rise">
      <SpotlightCard className="relative overflow-hidden rounded-lg p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
        <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-cyan-500/8 blur-3xl" />
        <PanelHeader
          icon={Film}
          title="Add movie details"
          subtitle="Create a cinema-ready movie master with media, cast and release details"
          action="Movie master"
        />

        <form onSubmit={onAddMovie} className="mt-5 space-y-5">
          <FormSection title="Movie information">
            <FormField label="Listing type">
              <select
                value={showForm.listingType}
                onChange={update("listingType")}
                className={selectClass}
              >
                {listingTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Movie name">
              <Input
                value={showForm.customTitle}
                onChange={update("customTitle")}
                placeholder="Enter any movie name"
                required
              />
            </FormField>
            <FormField label="Runtime">
              <Input value={showForm.duration} onChange={update("duration")} placeholder="2h 46m" />
            </FormField>
            <FormField label="Genres">
              <Input
                value={showForm.genres}
                onChange={update("genres")}
                placeholder="Action, Drama, Thriller"
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
            <FormField label="Release date">
              <Input
                value={showForm.releaseDate}
                onChange={update("releaseDate")}
                placeholder="07 Nov, 2026"
              />
            </FormField>
            <FormField label="Expected start date">
              <Input
                value={showForm.comingSoonDate}
                onChange={update("comingSoonDate")}
                type="date"
              />
            </FormField>
          </FormSection>

          <FormSection title="Poster and gallery">
            <ImageUploadField
              label="Poster upload"
              value={showForm.poster}
              placeholder="Paste poster URL or upload image"
              onChange={update("poster")}
              onUpload={uploadImage("poster")}
              progress={uploadProgress.poster}
            />
            <ImageUploadField
              label="Backdrop upload"
              value={showForm.backdrop}
              placeholder="Paste banner/backdrop URL or upload image"
              onChange={update("backdrop")}
              onUpload={uploadImage("backdrop")}
              progress={uploadProgress.backdrop}
            />
          </FormSection>

          <FormSection title="Story and trailer">
            <FormField label="Trailer URL">
              <Input
                value={showForm.trailerUrl}
                onChange={update("trailerUrl")}
                placeholder="https://youtube.com/..."
              />
            </FormField>
            <label className="md:col-span-2">
              <span className="text-xs font-medium uppercase text-muted-foreground">
                About the movie
              </span>
              <textarea
                value={showForm.description}
                onChange={update("description")}
                placeholder="Storyline, language version, distributor synopsis..."
                className="mt-2 min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
              />
            </label>
            <label className="md:col-span-2">
              <span className="text-xs font-medium uppercase text-muted-foreground">
                Owner notes
              </span>
              <textarea
                value={showForm.notes}
                onChange={update("notes")}
                placeholder="Dubbed version note, distributor terms, special screening note..."
                className="mt-2 min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
              />
            </label>
          </FormSection>

          <div>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xs font-semibold uppercase text-muted-foreground">Cast</h3>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={addCastMember}
                className="gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Add cast
              </Button>
            </div>
            <div className="mt-3 grid gap-3">
              {castRows.map((member, index) => (
                <div
                  key={`${index}-${member.name || "cast"}`}
                  className="grid grid-cols-1 gap-3 rounded-lg border border-border/60 bg-background/40 p-3 sm:grid-cols-[76px_1fr_1fr_auto] md:grid-cols-[76px_1fr_1fr_auto]"
                >
                  <CastPhotoControl
                    member={member}
                    index={index}
                    onUpload={uploadCastPhoto(index)}
                    onAvatarChange={updateCast(index, "avatar")}
                    uploadProgress={uploadProgress}
                  />
                  <FormField label="Name">
                    <Input
                      value={member.name}
                      onChange={updateCast(index, "name")}
                      placeholder="Actor name"
                    />
                  </FormField>
                  <FormField label="Role">
                    <Input
                      value={member.role}
                      onChange={updateCast(index, "role")}
                      placeholder="Actor / Director / Producer"
                    />
                  </FormField>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      onClick={() => removeCastMember(index)}
                      aria-label={`Remove cast member ${index + 1}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {Object.values(uploadProgress).some((v) => v === "error") && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
              Image upload failed.
            </p>
          )}

          <div className="overflow-hidden rounded-lg border border-border/60 bg-background/35">
            <div className="relative h-56">
              {moviePreview.backdrop || moviePreview.poster ? (
                <img
                  src={normalizeMovieImageUrl(
                    moviePreview.backdrop || moviePreview.poster,
                    moviePreview.title,
                    "backdrop",
                  )}
                  alt={moviePreview.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="grid h-full place-items-center bg-gradient-to-br from-primary/20 via-background to-secondary">
                  <div className="grid h-20 w-20 place-items-center rounded-full bg-primary/15 text-primary">
                    <Film className="h-9 w-9" />
                  </div>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/35 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <p className="text-xs uppercase text-primary">Preview</p>
                <h3 className="mt-1 text-xl font-bold">{moviePreview.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {moviePreview.duration} - {moviePreview.language} - {moviePreview.format} -{" "}
                  {moviePreview.certificate}
                </p>
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                  {moviePreview.description || "Movie description will appear here."}
                </p>
              </div>
            </div>
          </div>

          <Button className="h-11 w-full gap-2">
            <Plus className="h-4 w-4" />
            Save movie details
          </Button>
        </form>
      </SpotlightCard>

      <SpotlightCard className="relative overflow-hidden rounded-lg p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
        <div className="pointer-events-none absolute -right-10 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-primary/8 blur-3xl" />
        <PanelHeader
          icon={Film}
          title="Movie list"
          subtitle="Full details saved by this owner account"
          action={`${listedMovies.length} movies`}
        />

        {listedMovies.length ? (
          <div className="mt-5 grid gap-4 offer-stagger">
            {listedMovies.map((movie) => (
              <div
                key={movie.movieId}
                className="overflow-hidden rounded-lg border border-border/60 bg-background/35"
              >
                <div className="grid gap-4 p-4 md:grid-cols-[132px_1fr]">
                  <MoviePosterFrame
                    src={movie.poster}
                    title={movie.title}
                    className="aspect-[2/3] w-full rounded-lg shadow-sm md:w-32"
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-bold">{movie.title}</h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {movie.duration || "Runtime not set"} - {movie.language} - {movie.format}{" "}
                          - {movie.certificate}
                        </p>
                      </div>
                      <StatusPill status={movie.liveCount ? "Open" : "Coming soon"} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {splitAmenities(movie.genres)
                        .slice(0, 4)
                        .map((genre) => (
                          <span
                            key={genre}
                            className="rounded-md border border-border/60 px-2 py-1 text-xs text-muted-foreground"
                          >
                            {genre}
                          </span>
                        ))}
                    </div>
                    <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                      {movie.description || movie.notes || "No synopsis added yet."}
                    </p>
                    {movie.cast?.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs font-semibold uppercase text-muted-foreground">
                          Cast
                        </p>
                        <CastAvatarStack cast={movie.cast} />
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid gap-3 border-t border-border/60 p-4 md:grid-cols-2">
                  <SnapshotRow label="Timing slots" value={movie.liveCount.toLocaleString()} />
                  <SnapshotRow label="Release" value={movie.releaseDate || "Not set"} />
                  <SnapshotRow
                    label="Next date"
                    value={movie.nextDate ? formatDateLabel(movie.nextDate) : "Timing pending"}
                  />
                  <SnapshotRow label="Revenue" value={formatCurrency(movie.revenue)} />
                  {movie.trailerUrl && <SnapshotRow label="Trailer" value="Added" />}
                </div>

                {movie.notes && (
                  <p className="border-t border-border/60 px-4 py-3 text-sm text-muted-foreground">
                    {movie.notes}
                  </p>
                )}

                <div className="flex items-center gap-2 border-t border-border/60 p-4">
                  <Button size="sm" onClick={onOpenTimings} className="flex-1 gap-2">
                    <CalendarClock className="h-4 w-4" />
                    Add timing
                  </Button>
                  {movie.latestShowId && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onRemoveShow(movie.latestShowId)}
                      className="gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
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
            <h3 className="mt-4 font-semibold">No movie added yet</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Add movie details first, then open Timings to set day, screen, price and time.
            </p>
          </div>
        )}
      </SpotlightCard>
    </section>
  );
}

function CinemaSetupTab({ cinemaProfile, onProfileChange, onSave }) {
  const update = (field) => (event) =>
    onProfileChange((current) => ({ ...current, [field]: event.target.value }));
  const amenities = splitAmenities(cinemaProfile.amenities);
  const previewImage = cinemaProfile.coverImage || "";
  const [cinemaUploadProgress, setCinemaUploadProgress] = useState(null);

  const uploadCinemaImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setCinemaUploadProgress(0);
      const imageUrl = await uploadImageFile(file, {
        folder: "movix/owner/cinemas",
        onProgress: ({ loaded, total }) =>
          setCinemaUploadProgress(Math.round((loaded / total) * 100)),
      });
      onProfileChange((current) => ({ ...current, coverImage: imageUrl }));
      setTimeout(() => setCinemaUploadProgress(null), 2000);
    } catch (error) {
      setCinemaUploadProgress("error");
    } finally {
      event.target.value = "";
    }
  };

  return (
    <section className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-[1.05fr_0.95fr] surface-rise">
      <SpotlightCard className="relative overflow-hidden rounded-lg p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
        <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-primary/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-emerald-500/8 blur-3xl" />
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

          <FormSection title="Cinema photo">
            <ImageUploadField
              label="Cinema photo"
              value={cinemaProfile.coverImage || ""}
              placeholder="Paste cinema photo URL or upload one image"
              onChange={update("coverImage")}
              onUpload={uploadCinemaImage}
              previewClassName="aspect-video"
              progress={cinemaUploadProgress}
            />
            {cinemaUploadProgress === "error" && (
              <p className="md:col-span-2 rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
                Cinema image upload failed.
              </p>
            )}
          </FormSection>

          <FormSection title="Contact and rules">
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
                placeholder="Manager or support desk"
              />
            </FormField>
            <label className="md:col-span-2">
              <span className="text-xs font-medium uppercase text-muted-foreground">Amenities</span>
              <textarea
                value={cinemaProfile.amenities}
                onChange={update("amenities")}
                placeholder="IMAX, Dolby Atmos, Parking, Food counter"
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

      <SpotlightCard className="relative overflow-hidden rounded-lg p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
        <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-amber-500/10 blur-2xl" />
        <PanelHeader icon={Building2} title="Public preview" subtitle="Cinema card for users" />
        <div className="mt-5 rounded-lg border border-border/60 bg-background/35 p-5">
          {previewImage && (
            <div className="mb-5 overflow-hidden rounded-lg border border-border/60 bg-muted">
              <img
                src={previewImage}
                alt={cinemaProfile.name || "Cinema"}
                className="aspect-video w-full object-cover"
              />
            </div>
          )}
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
  const totalSeats = screens.reduce((sum, screen) => sum + Number(screen.seats || 0), 0);
  const averageOccupancy = screens.length
    ? Math.round(
        screens.reduce((sum, screen) => sum + Number(screen.occupancy || 0), 0) / screens.length,
      )
    : 0;
  const blockedSeats = screens.reduce(
    (sum, screen) => sum + (screen.seatLayout?.blockedSeats?.length ?? 0),
    0,
  );

  return (
    <section className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-[0.85fr_1.15fr] surface-rise">
      <SpotlightCard className="relative overflow-hidden rounded-lg p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
        <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-primary/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-sky-500/8 blur-3xl" />
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
            value={screenForm.silverRows}
            onChange={update("silverRows")}
            placeholder="Silver rows after platinum"
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
              Platinum {previewLayout.platinumRows} rows, Silver {previewLayout.silverRows} rows,
              Gold{" "}
              {Math.max(
                0,
                previewLayout.rowCount -
                  previewLayout.platinumRows -
                  previewLayout.silverRows -
                  previewLayout.vipRows,
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

      <SpotlightCard className="relative overflow-hidden rounded-lg p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
        <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-amber-500/10 blur-2xl" />
        <PanelHeader
          icon={Building2}
          title="Screen inventory"
          subtitle="Seat maps, capacity and blocked-seat control"
          action={`${screens.length} screens`}
        />

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <SnapshotRow label="Total seats" value={totalSeats.toLocaleString()} />
          <SnapshotRow label="Avg occupancy" value={`${averageOccupancy}%`} />
          <SnapshotRow label="Blocked seats" value={blockedSeats.toLocaleString()} />
        </div>

        <div className="mt-5 grid gap-4 offer-stagger">
          {screens.map((screen) => {
            const layout = buildSeatLayout(screen.seatLayout);
            return (
              <div
                key={screen.id}
                className="rounded-lg border border-border/60 bg-background/35 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{screen.name}</h3>
                      <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                        {screen.type}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {formatSeatLayoutSummary(screen.seatLayout)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onRemoveScreen(screen.id)}
                    className="gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>

                <div className="mt-4 grid gap-4 grid-cols-1 lg:grid-cols-[1fr_0.9fr]">
                  <div className="overflow-x-auto rounded-lg border border-border/60 bg-card/30 p-3">
                    <SeatMiniMap layout={layout} />
                  </div>
                  <div className="grid content-start gap-3">
                    <SnapshotRow
                      label="Capacity"
                      value={Number(screen.seats || 0).toLocaleString()}
                    />
                    <SnapshotRow label="Occupancy" value={`${screen.occupancy || 0}%`} />
                    <SnapshotRow
                      label="Blocked"
                      value={(screen.seatLayout?.blockedSeats?.length ?? 0).toLocaleString()}
                    />
                    <div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${Math.min(100, Number(screen.occupancy || 0))}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {layout.rowCount} rows, {layout.seatsPerRow} seats per row
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {!screens.length && (
            <div className="rounded-lg border border-dashed border-border/70 p-8 text-center">
              <Monitor className="mx-auto h-8 w-8 text-muted-foreground" />
              <h3 className="mt-3 font-semibold">No screen added yet</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                Add at least one screen with a seat map before creating movie timings.
              </p>
            </div>
          )}
        </div>
      </SpotlightCard>
    </section>
  );
}

function SeatMiniMap({ layout, bookedSeats = [] }) {
  const seatLayout = layout?.rows ? layout : buildSeatLayout(layout);
  const bookedSet = new Set(bookedSeats.map((seat) => String(seat).trim().toUpperCase()));

  return (
    <div className="inline-flex min-w-max flex-col gap-1">
      {seatLayout.rows.map((row, rowIndex) => (
        <div key={row} className="flex items-center gap-1">
          <span className="w-4 text-[10px] text-muted-foreground">{row}</span>
          {Array.from({ length: seatLayout.seatsPerRow }, (_, index) => index + 1).map(
            (seat, seatIndex) => {
              const id = `${row}${seat}`;
              const tier = seatLayout.tierFor(row);
              const isBlocked = seatLayout.blockedSet.has(id);
              const isBooked = bookedSet.has(id) || seatLayout.bookedSet?.has(id);
              const tierClass =
                tier === "platinum"
                  ? "bg-[var(--platinum)]"
                  : tier === "silver"
                    ? "bg-[var(--silver)]"
                    : tier === "vip"
                      ? "bg-[var(--vip)]"
                      : "bg-[var(--gold)]";
              const seatClass = isBooked
                ? "bg-primary ring-2 ring-primary/30"
                : isBlocked
                  ? "bg-muted-foreground/30"
                  : tierClass;

              return (
                <span key={id} className="flex items-center gap-1">
                  <span
                    className={`h-3 w-3 rounded-sm transition-transform duration-200 hover:scale-125 ${seatClass} animate-[seat-rise_420ms_ease-out_both]`}
                    style={{ animationDelay: `${Math.min(360, rowIndex * 24 + seatIndex * 8)}ms` }}
                    title={`${id} ${isBooked ? "booked" : isBlocked ? "blocked" : tier}`}
                  />
                  {seatLayout.aisleAfter === seat && <span className="w-2" />}
                </span>
              );
            },
          )}
        </div>
      ))}
    </div>
  );
}

function formatSeatLayoutSummary(config) {
  const layout = buildSeatLayout(config);
  const goldRows = Math.max(
    0,
    layout.rowCount - layout.platinumRows - layout.silverRows - layout.vipRows,
  );
  return `${layout.rowCount} rows x ${layout.seatsPerRow}, ${layout.totalSeats} seats - Platinum ${layout.platinumRows}, Silver ${layout.silverRows}, Gold ${goldRows}, VIP ${layout.vipRows}`;
}

function MovieTimingsTab({
  showForm,
  timings,
  listedMovies,
  screens,
  onFormChange,
  onAddTiming,
  onRemoveShow,
}) {
  const update = (field) => (event) =>
    onFormChange((current) => ({ ...current, [field]: event.target.value }));
  const movieOptions = listedMovies;
  const selectedMovieId = movieOptions.some((movie) => movie.movieId === showForm.movieId)
    ? showForm.movieId
    : "";
  const selectedListedMovie = movieOptions.find((movie) => movie.movieId === showForm.movieId);
  const selectedMovie = selectedListedMovie ?? {
    title: "Movie",
    poster: "",
    backdrop: "",
    genres: [],
    cast: [],
  };
  const selectedScreen = screens.find((screen) => screen.name === showForm.screen);
  const previewTiming = buildPreviewTiming(showForm, selectedMovie);

  return (
    <section className="mt-6 grid gap-4 xl:grid-cols-[1.15fr_0.85fr] surface-rise">
      <SpotlightCard className="relative overflow-hidden rounded-lg p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
        <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-primary/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-emerald-500/8 blur-3xl" />
        <PanelHeader
          icon={CalendarClock}
          title="Movie timing and day"
          subtitle="Set movie, screen, day, time, price and seat map"
          action="Timing desk"
        />

        <form onSubmit={onAddTiming} className="mt-5 space-y-5">
          <FormSection title="Movie and screen">
            <FormField label="Movie">
              <select
                value={selectedMovieId}
                onChange={(event) => {
                  const movie = movieOptions.find((item) => item.movieId === event.target.value);
                  if (!movie) return;
                  onFormChange((current) => ({
                    ...current,
                    ...movieToFormPatch(movie),
                    movieId: event.target.value,
                    listingType: "live",
                  }));
                }}
                disabled={!movieOptions.length}
                className={selectClass}
              >
                {movieOptions.length ? (
                  movieOptions.map((movie) => (
                    <option key={movie.movieId} value={movie.movieId}>
                      {movie.title}
                    </option>
                  ))
                ) : (
                  <option value="">Add movie details first</option>
                )}
              </select>
            </FormField>
            <FormField label="Screen">
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
          </FormSection>

          <FormSection title="Day and time">
            <FormField label="Date">
              <Input value={showForm.showDate} onChange={update("showDate")} type="date" />
            </FormField>
            <FormField label="Day">
              <Input value={formatWeekday(showForm.showDate)} readOnly />
            </FormField>
            <FormField label="Start time">
              <Input value={showForm.startTime} onChange={update("startTime")} type="time" />
            </FormField>
            <FormField label="End time">
              <Input value={showForm.endTime} onChange={update("endTime")} type="time" />
            </FormField>
            <FormField label="Status">
              <select value={showForm.status} onChange={update("status")} className={selectClass}>
                {showStatusOptions.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Booking opens">
              <Input
                value={showForm.bookingOpensAt}
                onChange={update("bookingOpensAt")}
                type="date"
              />
            </FormField>
          </FormSection>

          <FormSection title="Pricing and seats">
            <FormField label="Gold price">
              <Input
                value={showForm.goldPrice}
                onChange={update("goldPrice")}
                type="number"
                min="50"
              />
            </FormField>
            <FormField label="Silver price">
              <Input
                value={showForm.silverPrice}
                onChange={update("silverPrice")}
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
                <p className="font-medium text-foreground">Seat panel for this timing</p>
                <p className="mt-1">{formatSeatLayoutSummary(selectedScreen.seatLayout)}</p>
                <div className="mt-3 overflow-x-auto">
                  <SeatMiniMap layout={buildSeatLayout(selectedScreen.seatLayout)} />
                </div>
              </div>
            )}
          </FormSection>

          <Button className="h-11 w-full gap-2">
            <Plus className="h-4 w-4" />
            Add timing
          </Button>
        </form>
      </SpotlightCard>

      <SpotlightCard className="relative overflow-hidden rounded-lg p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
        <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-sky-500/10 blur-2xl" />
        <PanelHeader icon={Film} title="Timing preview" subtitle="Customer-facing booking slot" />
        <TimingPreview timing={previewTiming} />
      </SpotlightCard>

      <SpotlightCard className="rounded-lg p-5 xl:col-span-2">
        <PanelHeader icon={CalendarClock} title="Timing calendar" subtitle="Day-wise movie slots" />
        <div className="mt-5 overflow-hidden rounded-lg border border-border/60">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Movie</th>
                  <th className="px-4 py-3 font-medium">Day</th>
                  <th className="px-4 py-3 font-medium">Screen</th>
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">Pricing</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {timings.map((timing) => (
                  <tr key={timing.id} className="bg-card/20">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <MoviePosterFrame
                          src={timing.poster}
                          title={timing.movie}
                          className="h-14 w-10 rounded-md"
                        />
                        <div>
                          <p className="font-medium">{timing.movie}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {timing.language} - {timing.format} - {timing.certificate}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p>{formatWeekday(timing.date)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDateLabel(timing.date)}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{timing.screen}</td>
                    <td className="px-4 py-3">{timing.time}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold">
                        {timing.priceLabel || formatCurrency(timing.price)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {timing.seats} seats - VIP {formatCurrency(timing.pricing?.vip)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={timing.status} />
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onRemoveShow(timing.id)}
                        className="gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
                {!timings.length && (
                  <tr className="bg-card/20">
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      No timing added yet. Add movie details first, then create a timing here.
                    </td>
                  </tr>
                )}
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

function UploadProgressBar({ progress }) {
  if (progress === undefined || progress === null) return null;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-primary/10">
      <div
        className="h-full rounded-full bg-primary transition-all duration-300"
        style={{ width: `${Math.min(progress, 100)}%` }}
      />
    </div>
  );
}

function ImageUploadField({
  label,
  value,
  placeholder,
  onChange,
  onUpload,
  previewClassName = "aspect-[2/3]",
  progress,
}) {
  return (
    <div>
      <span className="text-xs font-medium uppercase text-muted-foreground">{label}</span>
      <div className="mt-2 grid gap-3 rounded-lg border border-border/60 bg-background/40 p-3">
        <div className="grid grid-cols-[80px_1fr] gap-3 sm:grid-cols-[88px_1fr]">
          <div
            className={`grid place-items-center overflow-hidden rounded-md bg-muted ${previewClassName}`}
          >
            {value ? (
              <img src={value} alt="" className="h-full w-full object-cover" />
            ) : (
              <ImagePlus className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <div className="grid content-start gap-2">
            <Input value={value || ""} onChange={onChange} placeholder={placeholder} />
            <label className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium shadow-sm transition-colors hover:bg-accent">
              <ImagePlus className="h-4 w-4" />
              {progress !== undefined && progress !== null ? `Uploading ${progress}%` : "Upload image"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={onUpload}
                className="sr-only"
              />
            </label>
            <UploadProgressBar progress={progress} />
            <p className="text-xs text-muted-foreground">PNG, JPG or WebP under 2.5 MB.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MoviePosterFrame({ src, title, className = "" }) {
  return (
    <img
      src={normalizeMovieImageUrl(src, title, "poster")}
      alt={title || "Movie"}
      className={`overflow-hidden object-cover ${className}`}
      onError={(event) => {
        event.currentTarget.src = movieImageFallback(title, "poster");
      }}
    />
  );
}

function CastPhotoControl({ member, index, onUpload, onAvatarChange, uploadProgress }) {
  const progress = uploadProgress?.[`cast-${index}`];
  return (
    <div>
      <span className="text-xs font-medium uppercase text-muted-foreground">Photo</span>
      <div className="mt-2 grid gap-2">
        <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-full bg-primary/10 ring-1 ring-primary/20">
          <img
            src={normalizeCastImageUrl(member.avatar, member.name)}
            alt={member.name || "Cast"}
            className="h-full w-full object-cover"
            onError={(event) => {
              event.currentTarget.src = castAvatarFallback(member.name);
            }}
          />
        </div>
        <label className="inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-input bg-background px-2 text-xs font-medium shadow-sm hover:bg-accent">
          {progress !== undefined && progress !== null && progress !== "error"
            ? `${progress}%`
            : "Upload"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={onUpload}
            className="sr-only"
          />
        </label>
        {progress !== undefined && progress !== null && progress !== "error" && (
          <div className="h-1 w-full overflow-hidden rounded-full bg-primary/10">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        )}
        <Input
          value={member.avatar || ""}
          onChange={onAvatarChange}
          placeholder={`Photo URL ${index + 1}`}
          className="h-8 text-xs"
        />
      </div>
    </div>
  );
}

function CastAvatarStack({ cast }) {
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {cast.slice(0, 6).map((member, index) => (
        <div
          key={`${member.name}-${index}`}
          className="flex items-center gap-2 rounded-full border border-border/60 bg-background/60 py-1 pl-1 pr-3"
        >
          <div className="grid h-8 w-8 place-items-center overflow-hidden rounded-full bg-primary/10">
            <img
              src={normalizeCastImageUrl(member.avatar, member.name)}
              alt={member.name || "Cast"}
              className="h-full w-full object-cover"
              onError={(event) => {
                event.currentTarget.src = castAvatarFallback(member.name);
              }}
            />
          </div>
          <div>
            <p className="text-xs font-medium leading-tight">{member.name}</p>
            <p className="text-[10px] leading-tight text-muted-foreground">{member.role}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function TimingPreview({ timing }) {
  const heroImage = normalizeMovieImageUrl(
    timing.backdrop || timing.poster,
    timing.movie,
    "backdrop",
  );

  return (
    <div className="mt-5 overflow-hidden rounded-lg border border-border/60 bg-background/35">
      <div className="relative h-64">
        <img src={heroImage} alt={timing.movie} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute left-4 top-4">
          <StatusPill status={timing.status} />
        </div>
        <div className="absolute bottom-4 left-4 right-4">
          <h3 className="text-2xl font-bold tracking-tight">{timing.movie}</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {timing.duration ? `${timing.duration} - ` : ""}
            {timing.language} - {timing.format} - {timing.certificate}
          </p>
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{timing.description}</p>
        </div>
      </div>

      <div className="grid gap-3 p-4">
        <SnapshotRow
          label="Genres"
          value={splitAmenities(timing.genres).slice(0, 3).join(", ") || "Not set"}
        />
        <SnapshotRow label="Day" value={formatWeekday(timing.date)} />
        <SnapshotRow label="Date" value={formatDateLabel(timing.date)} />
        <SnapshotRow label="Screen" value={timing.screen || "Screen not selected"} />
        <SnapshotRow label="Time" value={timing.time} />
        <SnapshotRow label="Price" value={timing.priceLabel} />
      </div>

      {timing.notes && (
        <p className="border-t border-border/60 px-4 py-3 text-sm text-muted-foreground">
          {timing.notes}
        </p>
      )}
    </div>
  );
}

function buildPreviewTiming(showForm, selectedMovie) {
  const title = showForm.customTitle.trim() || selectedMovie?.title || "Movie";
  const goldPrice = Number(showForm.goldPrice) || 300;

  return {
    listingType: "live",
    movie: title,
    poster: showForm.poster || selectedMovie?.poster,
    backdrop: showForm.backdrop || selectedMovie?.backdrop,
    duration: showForm.duration || selectedMovie?.duration,
    genres: splitAmenities(showForm.genres).length
      ? splitAmenities(showForm.genres)
      : selectedMovie?.genres,
    description: showForm.description || selectedMovie?.description || "",
    cast: normalizeCastRows(showForm.cast, selectedMovie?.cast),
    screen: showForm.screen,
    date: showForm.showDate,
    time: formatShowTime(showForm.startTime, showForm.endTime),
    language: showForm.language,
    format: showForm.format,
    certificate: showForm.certificate,
    priceLabel: `${formatCurrency(goldPrice)} onwards`,
    status: showForm.status,
    bookingOpensAt: showForm.bookingOpensAt,
    notes: showForm.notes.trim(),
  };
}

function RefundsTab({ refundCases, totals }) {
  const pendingCount = refundCases.filter((refund) => refund.status !== "Refunded").length;

  return (
    <section className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-[0.8fr_1.2fr] surface-rise">
      <SpotlightCard className="relative overflow-hidden rounded-lg p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
        <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-primary/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-amber-500/8 blur-3xl" />
        <PanelHeader
          icon={RefreshCcw}
          title="Refund queue"
          subtitle="Cancelled tickets land here for owner review"
          action={`${refundCases.length} cases`}
        />
        <div className="mt-5 grid gap-3">
          <SnapshotRow label="Pending cases" value={pendingCount.toLocaleString()} />
          <SnapshotRow label="Refund amount" value={formatCurrency(totals.refundAmount)} />
          <SnapshotRow label="Gateway SLA" value="T+1 settlement" />
          <SnapshotRow label="Customer alerts" value="Email + SMS" />
        </div>
      </SpotlightCard>

      <SpotlightCard className="relative overflow-hidden rounded-lg p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
        <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-rose-500/10 blur-2xl" />
        <PanelHeader
          icon={CreditCard}
          title="Cancelled ticket details"
          subtitle="Customer, email, ticket and payment trail"
        />
        <div className="mt-5 grid gap-3 offer-stagger">
          {refundCases.map((refund) => (
            <div
              key={refund.ref}
              className="rounded-lg border border-border/60 bg-background/35 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-xs text-primary">{refund.ref}</p>
                  <h3 className="mt-1 font-semibold">{refund.movie}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {refund.customer} - {refund.email || "Email not available"}
                  </p>
                </div>
                <StatusPill status={refund.status} />
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <SnapshotRow label="Seats" value={formatSeatList(refund.seats)} />
                <SnapshotRow label="Timing" value={`${refund.screen} - ${refund.time}`} />
                <SnapshotRow label="Refundable" value={formatCurrency(refund.amount)} />
                <SnapshotRow label="Payment" value={refund.paymentStatus || "Paid"} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" className="gap-2">
                  <CreditCard className="h-4 w-4" />
                  Approve refund
                </Button>
                <Button size="sm" variant="secondary" className="gap-2">
                  <Ticket className="h-4 w-4" />
                  View ticket
                </Button>
              </div>
            </div>
          ))}
          {!refundCases.length && (
            <div className="rounded-lg border border-dashed border-border/70 p-8 text-center">
              <RefreshCcw className="mx-auto h-8 w-8 text-muted-foreground" />
              <h3 className="mt-3 font-semibold">No cancelled tickets yet</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                When a customer cancels a ticket, it will appear here with email, seats, amount and
                refund status.
              </p>
            </div>
          )}
        </div>
      </SpotlightCard>
    </section>
  );
}

function RevenueTab({ bookings, listedMovies, earningsTrend, totals }) {
  const [period, setPeriod] = useState("7");
  const [movieFilter, setMovieFilter] = useState("all");
  const filteredBookings = useMemo(
    () => filterRevenueBookings(bookings, period, movieFilter),
    [bookings, movieFilter, period],
  );
  const revenueTrend = useMemo(
    () => buildRevenueTrend(filteredBookings, Number(period)),
    [filteredBookings, period],
  );
  const revenue = filteredBookings.reduce((sum, booking) => sum + Number(booking.total || 0), 0);
  const seats = filteredBookings.reduce((sum, booking) => sum + (booking.seats?.length ?? 0), 0);
  const commission = revenue * 0.1;
  const settlement = revenue - commission;

  return (
    <section className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-[1.25fr_0.75fr] surface-rise">
      <SpotlightCard className="relative overflow-hidden rounded-lg p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
        <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-primary/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-emerald-500/8 blur-3xl" />
        <PanelHeader
          icon={BadgeIndianRupee}
          title="Revenue analytics"
          subtitle="Filter by period and movie"
          action={formatCurrency(revenue)}
        />

        <div className="mt-5 flex flex-wrap gap-3">
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            className={selectClass}
          >
            <option value="1">Today</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
          </select>
          <select
            value={movieFilter}
            onChange={(event) => setMovieFilter(event.target.value)}
            className={selectClass}
          >
            <option value="all">All movies</option>
            {listedMovies.map((movie) => (
              <option key={movie.movieId} value={movie.title}>
                {movie.title}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-5 h-80">
          <TrendAreaChart
            data={revenueTrend.length ? revenueTrend : earningsTrend}
            valueKey="earnings"
            formatValue={formatCurrency}
          />
        </div>
      </SpotlightCard>

      <SpotlightCard className="relative overflow-hidden rounded-lg p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
        <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-amber-500/10 blur-2xl" />
        <PanelHeader
          icon={CreditCard}
          title="Settlement details"
          subtitle="Owner payout estimate"
          action="Production view"
        />
        <div className="mt-5 grid gap-3">
          <SnapshotRow label="Gross revenue" value={formatCurrency(revenue)} />
          <SnapshotRow label="Platform commission" value={formatCurrency(commission)} />
          <SnapshotRow label="Estimated payout" value={formatCurrency(settlement)} />
          <SnapshotRow label="Tickets" value={filteredBookings.length.toLocaleString()} />
          <SnapshotRow label="Seats" value={seats.toLocaleString()} />
          <SnapshotRow
            label="Avg order"
            value={formatCurrency(filteredBookings.length ? revenue / filteredBookings.length : 0)}
          />
          <SnapshotRow label="All-time revenue" value={formatCurrency(totals.earnings)} />
        </div>
      </SpotlightCard>

      <SpotlightCard className="relative overflow-hidden rounded-lg p-5 xl:col-span-2 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
        <div className="pointer-events-none absolute -left-8 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-primary/8 blur-3xl" />
        <PanelHeader icon={Ticket} title="Revenue ledger" subtitle="Paid booking details" />
        <div className="mt-5 overflow-hidden rounded-lg border border-border/60">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[840px] text-left text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Ref</th>
                  <th className="px-4 py-3 font-medium">Customer email</th>
                  <th className="px-4 py-3 font-medium">Movie</th>
                  <th className="px-4 py-3 font-medium">Seats</th>
                  <th className="px-4 py-3 font-medium">Payment</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredBookings.map((booking) => (
                  <tr key={booking.ref} className="bg-card/20">
                    <td className="px-4 py-3 font-mono text-xs text-primary">{booking.ref}</td>
                    <td className="px-4 py-3">{booking.email || "Not available"}</td>
                    <td className="px-4 py-3">{booking.movie}</td>
                    <td className="px-4 py-3">{formatSeatList(booking.seats)}</td>
                    <td className="px-4 py-3">{booking.paymentStatus || "Paid"}</td>
                    <td className="px-4 py-3 font-semibold">{formatCurrency(booking.total)}</td>
                  </tr>
                ))}
                {!filteredBookings.length && (
                  <tr className="bg-card/20">
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No paid bookings match this revenue filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </SpotlightCard>
    </section>
  );
}

function BookingsTab({ bookings, totals, screens }) {
  const [selectedRef, setSelectedRef] = useState(bookings[0]?.ref ?? "");
  const [showScanner, setShowScanner] = useState(false);
  const [scannerResult, setScannerResult] = useState(null);
  const [scanError, setScanError] = useState("");
  const selectedBooking = bookings.find((booking) => booking.ref === selectedRef) ?? bookings[0];
  const selectedScreen =
    screens.find((screen) => screen.name === selectedBooking?.screen) ??
    screens[0] ??
    screenSeeds[0];
  const selectedLayout = buildSeatLayout(selectedScreen?.seatLayout);
  const displayTotals = totals;

  useEffect(() => {
    if (!bookings.length) {
      setSelectedRef("");
      return;
    }
    if (!bookings.some((booking) => booking.ref === selectedRef)) {
      setSelectedRef(bookings[0].ref);
    }
  }, [bookings, selectedRef]);

  const handleScan = useCallback((decodedText) => {
    try {
      const data = JSON.parse(decodedText);
      const ref = data.ref;
      if (ref) {
        setSelectedRef(ref);
        setScannerResult(data);
        setScanError("");
        setShowScanner(false);
      } else {
        setScanError("QR code does not contain a valid ticket reference.");
      }
    } catch {
      setScanError("Could not read this QR code. Try a different ticket.");
    }
  }, []);

  return (
    <section className="mt-6 space-y-4 surface-rise">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/60 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/12 text-primary">
            <ScanLine className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">Gate ticket scanner</p>
            <p className="text-xs text-muted-foreground">
              {showScanner ? "Point camera at customer QR code" : "Scan QR to verify ticket"}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant={showScanner ? "secondary" : "default"}
          onClick={() => {
            setShowScanner((v) => !v);
            setScanError("");
            setScannerResult(null);
          }}
          className="gap-2"
        >
          <Camera className="h-4 w-4" />
          {showScanner ? "Close scanner" : "Scan ticket"}
        </Button>
      </div>

      {showScanner && <QrTicketScanner onScan={handleScan} onError={setScanError} />}

      {scanError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {scanError}
        </div>
      )}

      {scannerResult && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
            Ticket scanned: {scannerResult.movie || "Movie"} &middot; {scannerResult.theater}{" "}
            &middot; {scannerResult.time}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.75fr_1.25fr]">
        <SpotlightCard className="relative overflow-hidden rounded-lg p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-primary/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-sky-500/8 blur-3xl" />
          <PanelHeader
            icon={Ticket}
            title="Booking control"
            subtitle="Customer tickets, emails, seats and payment status"
          />
          <div className="mt-5 grid gap-3">
            <SnapshotRow
              label="Total tickets"
              value={displayTotals.totalBookings.toLocaleString()}
            />
            <SnapshotRow label="Confirmed" value={displayTotals.bookings.toLocaleString()} />
            <SnapshotRow label="Refund queue" value={displayTotals.refunds.toLocaleString()} />
            <SnapshotRow label="Seats sold" value={displayTotals.seatsSold.toLocaleString()} />
            <SnapshotRow label="Revenue" value={formatCurrency(displayTotals.earnings)} />
            <SnapshotRow
              label="Average order"
              value={formatCurrency(
                displayTotals.bookings ? displayTotals.earnings / displayTotals.bookings : 0,
              )}
            />
          </div>
        </SpotlightCard>

        <SpotlightCard className="relative overflow-hidden rounded-lg p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-amber-500/10 blur-2xl" />
          <PanelHeader
            icon={Users}
            title="Booking list"
            subtitle="Click a booking to inspect ticket"
          />
          <div className="mt-5 overflow-hidden rounded-lg border border-border/60">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Reference</th>
                    <th className="px-4 py-3 font-medium">Customer</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Movie</th>
                    <th className="px-4 py-3 font-medium">Timing</th>
                    <th className="px-4 py-3 font-medium">Seats</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {bookings.map((booking) => (
                    <tr
                      key={booking.ref}
                      onClick={() => setSelectedRef(booking.ref)}
                      className={`cursor-pointer transition-colors ${
                        selectedBooking?.ref === booking.ref
                          ? "bg-primary/10"
                          : "bg-card/20 hover:bg-muted/30"
                      }`}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-primary">{booking.ref}</td>
                      <td className="px-4 py-3 font-medium">{booking.customer}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {booking.email || "Not available"}
                      </td>
                      <td className="px-4 py-3">{booking.movie}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {booking.screen} - {booking.time}
                      </td>
                      <td className="px-4 py-3">{booking.seats.join(", ")}</td>
                      <td className="px-4 py-3">
                        <StatusPill status={booking.ticketStatus || "Confirmed"} />
                      </td>
                      <td className="px-4 py-3 font-semibold">{formatCurrency(booking.total)}</td>
                    </tr>
                  ))}
                  {!bookings.length && (
                    <tr className="bg-card/20">
                      <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                        No customer bookings for this cinema yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </SpotlightCard>

        {selectedBooking ? (
          <SpotlightCard className="relative overflow-hidden rounded-lg p-5 xl:col-span-2 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
            <div className="pointer-events-none absolute -right-10 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-primary/8 blur-3xl" />
            <PanelHeader
              icon={QrCode}
              title="Booked seat and ticket details"
              subtitle="Selected customer, highlighted seats and ticket audit"
              action={selectedBooking.ticketStatus || "Confirmed"}
            />
            <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="overflow-x-auto rounded-lg border border-border/60 bg-background/35 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{selectedScreen?.name || "Screen"}</p>
                    <p className="text-xs text-muted-foreground">
                      Blue seats are booked by {selectedBooking.customer || "customer"}
                    </p>
                  </div>
                  <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                    {formatSeatList(selectedBooking.seats)}
                  </span>
                </div>
                <SeatMiniMap layout={selectedLayout} bookedSeats={selectedBooking.seats ?? []} />
              </div>

              <div className="grid gap-3">
                <SnapshotRow label="Booked user" value={selectedBooking.customer || "Customer"} />
                <SnapshotRow label="Email" value={selectedBooking.email || "Not available"} />
                <SnapshotRow label="Phone" value={selectedBooking.phone || "Not available"} />
                <SnapshotRow label="Movie" value={selectedBooking.movie || "Movie"} />
                <SnapshotRow
                  label="Timing"
                  value={`${selectedBooking.screen || "Screen"} - ${selectedBooking.time || "Time"}`}
                />
                <SnapshotRow label="Seats" value={formatSeatList(selectedBooking.seats)} />
                <SnapshotRow label="Ticket ref" value={selectedBooking.ref || "No ref"} />
                <SnapshotRow
                  label="Payment"
                  value={`${selectedBooking.paymentStatus || "Paid"} - ${formatCurrency(
                    selectedBooking.total,
                  )}`}
                />
                <SnapshotRow label="Booked at" value={selectedBooking.bookedAt || "Today"} />
              </div>
            </div>
          </SpotlightCard>
        ) : null}
      </div>
    </section>
  );
}

// ─── QR Scan Tab ────────────────────────────────────────────────────
function QrScanTab() {
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [stats, setStats] = useState(null);
  useEffect(() => {
    fetchScanStats().then(setStats).catch(() => {});
  }, []);
  const handleScan = useCallback(async (decodedText) => {
    setVerifying(true);
    setScanError("");
    setScanResult(null);
    try {
      const result = await verifyTicketByQr(decodedText);
      setScanResult(result);
      fetchScanStats().then(setStats).catch(() => {});
    } catch (error) {
      const errData = error.response?.data;
      if (errData) {
        setScanResult(errData);
        setScanError(errData.alreadyVerified ? "Already verified." : errData.message || "Failed.");
      } else {
        setScanError(error.message || "Connection failed.");
      }
    } finally {
      setVerifying(false);
    }
  }, []);
  const handleManualVerify = async () => {
    if (!manualInput.trim()) { setScanError("Enter QR data."); return; }
    await handleScan(manualInput.trim());
  };
  const handleReset = () => {
    setScanResult(null); setScanError(""); setManualInput(""); setVerifying(false);
  };
  const handleScannerError = (message) => { setScanError(message); };
  return (
    <section className="mt-6 space-y-6">
      {stats && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border/60 bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Today verified</p>
            <p className="mt-1 text-2xl font-bold">{stats.todayVerified}</p>
          </div>
          <div className="rounded-lg border border-border/60 bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total verified</p>
            <p className="mt-1 text-2xl font-bold">{stats.totalVerified}</p>
          </div>
          <div className="rounded-lg border border-border/60 bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pending entry</p>
            <p className="mt-1 text-2xl font-bold">{stats.pendingVerification}</p>
          </div>
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-lg border border-border/60 bg-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Scan QR Code</h3>
              <p className="text-xs text-muted-foreground">Point camera at the ticket QR code</p>
            </div>
            <ScanLine className="h-5 w-5 text-primary" />
          </div>
          <div className="mt-4">
            <QrTicketScanner onScan={handleScan} onError={handleScannerError} />
          </div>
          <div className="mt-3 flex items-center justify-between">
            <button type="button" onClick={() => setShowManual(p => !p)}
              className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground">
              {showManual ? "Hide" : "Or paste QR data manually"}
            </button>
            {scanResult && (
              <button type="button" onClick={handleReset}
                className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground">
                Scan another
              </button>
            )}
          </div>
          {showManual && (
            <div className="mt-3 flex gap-2">
              <input type="text" value={manualInput} onChange={e => setManualInput(e.target.value)}
                placeholder="Paste QR text or booking ref..."
                className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring" />
              <button onClick={handleManualVerify} disabled={verifying || !manualInput.trim()}
                className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50">
                {verifying ? "..." : "Verify"}
              </button>
            </div>
          )}
        </div>
        <div className="rounded-lg border border-border/60 bg-card p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Verification Result</h3>
            {verifying && <span className="text-xs text-muted-foreground">Verifying...</span>}
          </div>
          <div className="mt-4">
            {!scanResult && !scanError && !verifying && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <QrCode className="h-12 w-12 text-muted-foreground/40" />
                <p className="mt-3 text-sm text-muted-foreground">Scan a ticket QR code to verify entry</p>
              </div>
            )}
            {scanError && !scanResult?.verified && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center dark:border-red-800 dark:bg-red-950/30">
                <X className="mx-auto h-8 w-8 text-red-500" />
                <p className="mt-2 font-semibold text-red-600 dark:text-red-400">Invalid Ticket</p>
                <p className="mt-1 text-sm text-red-500">{scanError}</p>
              </div>
            )}
            {scanResult?.verified && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center dark:border-emerald-800 dark:bg-emerald-950/30">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
                <p className="mt-2 font-semibold text-emerald-600 dark:text-emerald-400">Entry Verified ✓</p>
                <p className="mt-1 text-sm text-emerald-500">{scanResult.message}</p>
              </div>
            )}
            {scanResult?.booking && (
              <div className="mt-4 space-y-2 rounded-lg border border-border/60 bg-muted/50 p-4 text-sm">
                <h4 className="font-semibold text-foreground">{scanResult.booking.movie}</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-muted-foreground">
                  <span>Ref:</span><span className="font-mono text-foreground">{scanResult.booking.ref}</span>
                  <span>Theater:</span><span className="text-foreground">{scanResult.booking.theater}</span>
                  <span>Screen:</span><span className="text-foreground">{scanResult.booking.screen}</span>
                  <span>Time:</span><span className="text-foreground">{scanResult.booking.time}</span>
                  <span>Seats:</span><span className="text-foreground">{scanResult.booking.seats?.join(", ")}</span>
                  {scanResult.booking.total && (<><span>Total:</span><span className="text-foreground">Rs {scanResult.booking.total}</span></>)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function QrTicketScanner({ onScan, onError }) {
  const scannerRef = useRef(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    let html5QrCode = null;
    let mounted = true;

    import("html5-qrcode")
      .then(({ Html5Qrcode }) => {
        if (!mounted) return;
        html5QrCode = new Html5Qrcode("qr-scanner-container");
        html5QrCode
          .start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 220, height: 220 } },
            (decodedText) => {
              if (mounted && !scanning) {
                setScanning(true);
                onScan(decodedText);
                html5QrCode?.stop().catch(() => {});
              }
            },
            () => {},
          )
          .catch(() => {
            if (mounted) onError("Camera access denied or unavailable. Grant camera permission.");
          });
      })
      .catch(() => {
        if (mounted) onError("QR scanner library failed to load.");
      });

    return () => {
      mounted = false;
      html5QrCode?.stop().catch(() => {});
    };
  }, [onScan, onError]);

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card p-4">
      <div id="qr-scanner-container" className="mx-auto max-w-sm overflow-hidden rounded-lg" />
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Hold QR code steady in front of camera
      </p>
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
                : "Admin approval is required before this owner account can manage locations, movies, screens, movie days, time slots and pricing."}
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

function PanelHeader({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3">
        <div className="stat-pulse grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
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
    Listed: "border-primary/30 bg-primary/10 text-primary",
    Confirmed: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500",
    Cancelled: "border-destructive/30 bg-destructive/10 text-destructive",
    Review: "border-amber-500/30 bg-amber-500/10 text-amber-500",
    Refunded: "border-cyan-500/30 bg-cyan-500/10 text-cyan-500",
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

function getOwnerApprovalFromUser(user) {
  if (!user || user.role !== "theater-owner") return { status: "Approved", application: null };
  return {
    status: user.ownerStatus || "Pending",
    application: user.ownerApplication || null,
  };
}

function createDefaultServices() {
  return {
    foodMenu: [
      { item: "Classic popcorn combo", stock: "86 packs", price: 349, status: "Live" },
      { item: "Nachos and cola", stock: "42 packs", price: 299, status: "Live" },
      { item: "Family interval box", stock: "18 packs", price: 699, status: "Low stock" },
    ],
    staff: [
      { name: "Counter desk", role: "Counter staff", shift: "10 AM - 6 PM", access: "Bookings" },
      { name: "Floor manager", role: "Manager", shift: "2 PM - 11 PM", access: "Refunds" },
      { name: "Gate scanner", role: "Entry staff", shift: "5 PM - 12 AM", access: "QR scan" },
    ],
    refundCases: [],
    scanStats: [
      { gate: "Gate A", value: "0 scanned", text: "Entry scans appear here" },
      { gate: "Gate B", value: "0 scanned", text: "No duplicate QR attempts" },
      { gate: "Exceptions", value: "0 checks", text: "Manual verification queue" },
    ],
  };
}

function movieToFormPatch(movie = {}) {
  const format = Array.isArray(movie.format) ? movie.format[0] : movie.format;
  return {
    customTitle: movie.title || "",
    poster: movie.poster || "",
    backdrop: movie.backdrop || "",
    duration: movie.duration || "",
    genres: splitAmenities(movie.genres).join(", "),
    releaseDate: movie.releaseDate || "",
    description: movie.description || "",
    cast: normalizeCastRows(movie.cast),
    language: movie.language || "English",
    format: format || "2D",
    certificate: movie.certificate || "UA",
  };
}

function buildMovieMasterPreview(showForm) {
  return {
    title: showForm.customTitle.trim() || "Movie name",
    poster: showForm.poster || "",
    backdrop: showForm.backdrop || showForm.poster || "",
    duration: showForm.duration || "Runtime",
    language: showForm.language || "Language",
    format: showForm.format || "2D",
    certificate: showForm.certificate || "UA",
    description: showForm.description || "",
  };
}

function normalizeCastRows(input = [], fallback = []) {
  const source =
    Array.isArray(input) && input.length
      ? input
      : Array.isArray(fallback) && fallback.length
        ? fallback
        : [{ name: "", role: "Actor", avatar: "" }];

  return source.slice(0, 12).map((member) => ({
    name: String(member?.name ?? ""),
    role: String(member?.role || "Actor"),
    avatar: String(member?.avatar ?? ""),
  }));
}

async function uploadImageFile(file, options = {}) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files are supported.");
  }
  if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
    throw new Error("Image size 2.5 MB se kam rakho.");
  }

  const result = await uploadFile("/api/uploads/image", file, {
    fieldName: "file",
    timeoutMs: 30000,
    onProgress: options.onProgress,
  });

  return result.image?.secureUrl || result.image?.url || "";
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
        backdrop: show.backdrop,
        duration: show.duration,
        genres: show.genres ?? [],
        releaseDate: show.releaseDate,
        description: show.description,
        cast: normalizeCastRows(show.cast).filter((member) => member.name),
        language: show.language,
        format: show.format,
        certificate: show.certificate,
        showCount: 0,
        liveCount: 0,
        comingSoonCount: 0,
        revenue: revenueByMovie[show.movie] ?? 0,
        latestShowId: show.id,
        nextDate: "",
        trailerUrl: show.trailerUrl,
        notes: show.notes,
      };
    }

    acc[movieId].showCount += 1;
    acc[movieId].latestShowId = show.id;
    if (show.listingType === "coming-soon") acc[movieId].comingSoonCount += 1;
    else {
      acc[movieId].liveCount += 1;
      if (!acc[movieId].nextDate || show.date < acc[movieId].nextDate) {
        acc[movieId].nextDate = show.date;
      }
    }
    if (show.trailerUrl) acc[movieId].trailerUrl = show.trailerUrl;
    if (show.notes) acc[movieId].notes = show.notes;
    if (show.poster) acc[movieId].poster = show.poster;
    if (show.backdrop) acc[movieId].backdrop = show.backdrop;
    if (show.duration) acc[movieId].duration = show.duration;
    if (show.genres?.length) acc[movieId].genres = show.genres;
    if (show.releaseDate) acc[movieId].releaseDate = show.releaseDate;
    if (show.description) acc[movieId].description = show.description;
    if (show.cast?.length) {
      acc[movieId].cast = normalizeCastRows(show.cast).filter((member) => member.name);
    }
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
  bookings
    .filter((booking) => !isCancelledBooking(booking))
    .forEach((booking) => {
      const key = normalizeDateKey(booking.bookedAt || booking.createdAt || booking.date);
      const row = byKey.get(key) ?? days[days.length - 1];
      row.earnings += Number(booking.total || 0);
      row.bookings += 1;
      row.seats += booking.seats?.length ?? 0;
      row.occupancy = Math.min(100, Math.round(row.seats * 8));
    });

  return days;
}

function buildRefundCases(bookings, services = {}) {
  const cancelledTickets = bookings.filter(isCancelledBooking).map((booking) => ({
    ref: booking.ref,
    customer: booking.customer,
    email: booking.email,
    movie: booking.movie,
    screen: booking.screen,
    time: booking.time,
    seats: booking.seats ?? [],
    amount: Number(booking.total || 0),
    paymentStatus: booking.paymentStatus,
    status: booking.paymentStatus === "Refunded" ? "Refunded" : "Review",
  }));
  const serviceCases = (services?.refundCases ?? [])
    .filter((refund) => refund?.ref)
    .map((refund) => ({
      ref: refund.ref,
      customer: refund.customer || "Customer",
      email: refund.email || "",
      movie: refund.movie || refund.reason || "Cancelled ticket",
      screen: refund.screen || "Screen",
      time: refund.time || "Timing",
      seats: refund.seats || [],
      amount: Number(refund.amount || 0),
      paymentStatus: refund.paymentStatus || "Paid",
      status: refund.status || "Review",
    }));

  return [...cancelledTickets, ...serviceCases];
}

function isCancelledBooking(booking) {
  const status = String(booking?.status || booking?.ticketStatus || "").toLowerCase();
  return status.includes("cancel");
}

function filterRevenueBookings(bookings, period, movieFilter) {
  const days = Math.max(1, Number(period) || 7);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  return bookings
    .filter((booking) => !isCancelledBooking(booking))
    .filter((booking) => movieFilter === "all" || booking.movie === movieFilter)
    .filter((booking) => getBookingDate(booking) >= start);
}

function buildRevenueTrend(bookings, periodDays) {
  const count = Math.min(30, Math.max(1, Number(periodDays) || 7));
  const days = Array.from({ length: count }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (count - 1 - index));
    const key = date.toISOString().slice(0, 10);
    return {
      key,
      day: date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
      earnings: 0,
      bookings: 0,
      seats: 0,
    };
  });
  const byKey = new Map(days.map((day) => [day.key, day]));
  bookings.forEach((booking) => {
    const key = getBookingDate(booking).toISOString().slice(0, 10);
    const row = byKey.get(key);
    if (!row) return;
    row.earnings += Number(booking.total || 0);
    row.bookings += 1;
    row.seats += booking.seats?.length ?? 0;
  });
  return days;
}

function getBookingDate(booking) {
  const date = new Date(booking.createdAt || booking.bookedAt || booking.date || Date.now());
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function normalizeDateKey(value) {
  if (!value) return new Date().toISOString().slice(0, 10);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function formatSeatList(seats) {
  return Array.isArray(seats) && seats.length ? seats.join(", ") : "Seats not assigned";
}

function formatCurrency(value) {
  return `Rs ${Number(value || 0).toLocaleString("en-IN")}`;
}

function formatWeekday(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Day not set";
  return date.toLocaleDateString("en-IN", { weekday: "long" });
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

function initials(value) {
  return String(value || "NA")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
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

export { OwnerDashboard };
