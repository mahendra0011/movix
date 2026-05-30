import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  Clock3,
  Film,
  MapPin,
  Search,
  SlidersHorizontal,
  Star,
  Ticket,
} from "lucide-react";
import { fetchMovies } from "@/features/movies/api/moviesApi";
import { movies as fallbackMovies, showTimes, theaters } from "@/features/movies/data/movieCatalog";
import { movieImageFallback, normalizeMovieImageUrl } from "@/features/movies/services/movieMedia";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { buildCatalogCinemaSchedule } from "@/features/movies/services/showSchedule";
import { HAS_CONFIGURED_API_URL, requestJson } from "@/shared/services/httpClient";

const dateOptions = buildDateOptions();
const allFilterValue = "All";
const priceOptions = ["Any price", "Under Rs 250", "Rs 250 - 350", "Rs 350+"];
const timeOptions = ["Any time", "Morning", "Afternoon", "Evening", "Night"];

const Route = createFileRoute("/cinemas/$id")({
  loader: () => fetchMovies(),
  component: CinemaDetailPage,
});

function CinemaDetailPage() {
  const catalog = Route.useLoaderData();
  const { id } = Route.useParams();
  const movieCatalog = catalog.length ? catalog : fallbackMovies;
  const [cinemaCatalog, setCinemaCatalog] = useState(theaters);
  const [remoteShows, setRemoteShows] = useState([]);
  const [activeDate, setActiveDate] = useState(dateOptions[0]?.key ?? "");
  const [movieSearch, setMovieSearch] = useState("");
  const [activeFormat, setActiveFormat] = useState(allFilterValue);
  const [priceRange, setPriceRange] = useState("Any price");
  const [preferredTime, setPreferredTime] = useState("Any time");

  useEffect(() => {
    if (!HAS_CONFIGURED_API_URL) return undefined;
    let active = true;

    requestJson("/api/theaters", { timeoutMs: 2500 })
      .then((data) => {
        if (active && data.theaters?.length) setCinemaCatalog(data.theaters);
      })
      .catch(() => {
        if (active) setCinemaCatalog(theaters);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    requestJson(
      `/api/shows?theaterId=${encodeURIComponent(id)}&date=${encodeURIComponent(activeDate)}`,
      { timeoutMs: 8000 },
    )
      .then((data) => {
        if (active) setRemoteShows(data.shows ?? []);
      })
      .catch(() => {
        if (active) setRemoteShows([]);
      });

    return () => {
      active = false;
    };
  }, [activeDate, id]);

  const cinema = useMemo(() => cinemaCatalog.find((item) => item.id === id), [cinemaCatalog, id]);
  const schedule = useMemo(
    () => (cinema ? buildCinemaSchedule(cinema, movieCatalog, activeDate, remoteShows) : []),
    [activeDate, cinema, movieCatalog, remoteShows],
  );
  const formatOptions = useMemo(
    () => [
      allFilterValue,
      ...Array.from(new Set(schedule.flatMap((item) => item.shows.map((show) => show.format)))),
    ],
    [schedule],
  );
  const visibleSchedule = useMemo(
    () =>
      filterSchedule({
        schedule,
        query: movieSearch,
        activeFormat,
        priceRange,
        preferredTime,
      }),
    [activeFormat, movieSearch, preferredTime, priceRange, schedule],
  );
  const activeDateLabel = getDateLabel(activeDate);

  if (!cinema) {
    return (
      <main className="mx-auto max-w-[1560px] px-4 py-12 sm:px-5 lg:px-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
          <ArrowLeft className="h-4 w-4" />
          Back home
        </Link>
        <div className="mt-8 rounded-lg border border-dashed border-border/70 bg-card/70 p-10 text-center">
          <Film className="mx-auto h-9 w-9 text-primary" />
          <h1 className="mt-4 text-2xl font-bold">Cinema not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Try searching another cinema from the home search box.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-[radial-gradient(circle_at_top_left,color-mix(in_oklch,var(--primary)_10%,transparent),transparent_30%),linear-gradient(180deg,color-mix(in_oklch,var(--secondary)_48%,transparent),var(--background)_440px)] pb-12 dark:bg-[radial-gradient(circle_at_top_left,color-mix(in_oklch,var(--primary)_16%,transparent),transparent_32%),linear-gradient(180deg,color-mix(in_oklch,var(--card)_78%,transparent),var(--background)_520px)]">
      <section className="border-b border-border/60">
        <div className="mx-auto grid max-w-[1560px] gap-6 px-4 py-8 sm:px-5 lg:grid-cols-[1fr_320px] lg:px-6">
          <div>
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
              Back home
            </Link>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">
              <MapPin className="h-3.5 w-3.5" />
              {cinema.area}, {cinema.city}
            </div>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight md:text-5xl">
              {cinema.name}
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
              {cinema.address || `${cinema.area}, ${cinema.city}`}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {splitList(cinema.amenities)
                .slice(0, 7)
                .map((amenity) => (
                  <span
                    key={amenity}
                    className="rounded-full border border-border/60 bg-card/70 px-3 py-1.5 text-xs font-semibold"
                  >
                    {amenity}
                  </span>
                ))}
            </div>
          </div>

          <div className="grid gap-4">
            {cinema.coverImage && (
              <div className="overflow-hidden rounded-xl border border-border/60 bg-muted shadow-lg">
                <img
                  src={cinema.coverImage}
                  alt={cinema.name}
                  className="aspect-video w-full object-cover"
                />
              </div>
            )}
            <div className="rounded-xl border border-border/60 bg-card/80 p-4 shadow-lg">
              <div className="grid grid-cols-2 gap-3">
                <StatCard icon={Star} label="Cinema rating" value={formatRating(cinema.rating)} />
                <StatCard icon={Film} label="Movies listed" value={String(schedule.length)} />
                <StatCard icon={Clock3} label="Shows today" value={String(countShows(schedule))} />
                <StatCard icon={Ticket} label="From price" value={lowestSchedulePrice(schedule)} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto -mt-5 max-w-[1560px] px-4 sm:px-5 lg:px-6">
        <div className="rounded-xl border border-primary/15 bg-gradient-to-r from-card/95 via-background/95 to-primary/8 p-4 shadow-2xl shadow-black/8 backdrop-blur">
          <div className="grid gap-3 lg:grid-cols-[1.25fr_repeat(3,minmax(0,0.72fr))]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={movieSearch}
                onChange={(event) => setMovieSearch(event.target.value)}
                placeholder="Search movies in this cinema..."
                className="h-[72px] rounded-xl border-border/60 bg-background/80 pl-10 text-base font-semibold shadow-sm"
              />
            </label>
            <CinemaFilterSelect
              icon={Film}
              label="Format"
              value={activeFormat}
              options={formatOptions}
              onChange={setActiveFormat}
            />
            <CinemaFilterSelect
              icon={Ticket}
              label="Price range"
              value={priceRange}
              options={priceOptions}
              onChange={setPriceRange}
            />
            <CinemaFilterSelect
              icon={Clock3}
              label="Timing"
              value={preferredTime}
              options={timeOptions}
              onChange={setPreferredTime}
            />
          </div>
        </div>
      </section>

      <section className="mx-auto mt-6 max-w-[1560px] px-4 sm:px-5 lg:px-6">
        <div className="flex gap-2 overflow-x-auto rounded-xl border border-border/60 bg-card/70 p-2 shadow-sm">
          {dateOptions.map((date) => (
            <button
              key={date.key}
              type="button"
              onClick={() => setActiveDate(date.key)}
              className={`grid min-w-20 place-items-center rounded-lg border px-4 py-2 text-center transition-colors ${
                activeDate === date.key
                  ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "border-transparent hover:border-border/70 hover:bg-background"
              }`}
            >
              <span className="text-[11px] font-semibold uppercase">{date.weekday}</span>
              <span className="text-xl font-bold leading-none">{date.day}</span>
              <span className="text-[11px] uppercase opacity-80">{date.month}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-6 max-w-[1560px] px-4 sm:px-5 lg:px-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">Movies and show timings</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {visibleSchedule.length} movies on {activeDateLabel}. Hover any time to see seat
              category prices.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setMovieSearch("");
              setActiveFormat(allFilterValue);
              setPriceRange("Any price");
              setPreferredTime("Any time");
            }}
            className="gap-2 rounded-full"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Reset filters
          </Button>
        </div>

        {visibleSchedule.length ? (
          <div className="overflow-hidden rounded-xl border border-border/60 bg-background shadow-sm">
            {visibleSchedule.map((item) => (
              <CinemaMovieRow
                key={item.movie.id}
                item={item}
                cinema={cinema}
                activeDateLabel={activeDateLabel}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border/70 bg-card/70 p-10 text-center">
            <Search className="mx-auto h-8 w-8 text-primary" />
            <h3 className="mt-4 text-lg font-bold">No matching shows</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Change movie search, price range, timing, or format.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/65 p-3">
      <Icon className="h-4 w-4 text-primary" />
      <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-lg font-extrabold">{value}</p>
    </div>
  );
}

function CinemaFilterSelect({ icon: Icon, label, value, options, onChange }) {
  const active = value !== allFilterValue && value !== "Any price" && value !== "Any time";
  return (
    <label
      className={`group relative block overflow-hidden rounded-xl border p-2.5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
        active
          ? "border-primary/35 bg-primary/8 shadow-primary/10"
          : "border-border/60 bg-background/72 hover:border-primary/30"
      }`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(20,184,166,0.16),transparent_34%)] opacity-80" />
      <div className="relative flex h-full min-h-[50px] items-center gap-3">
        <div
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
            active ? "bg-primary text-primary-foreground" : "bg-primary/12 text-primary"
          }`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 truncate text-sm font-bold">{value}</p>
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </div>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function CinemaMovieRow({ item, cinema, activeDateLabel }) {
  return (
    <article className="grid gap-5 border-b border-border/60 p-5 last:border-b-0 lg:grid-cols-[92px_1fr]">
      <Link to="/movies/$id" params={{ id: item.movie.id }} className="group hidden lg:block">
        <img
          src={normalizeMovieImageUrl(item.movie.poster, item.movie.title, "poster")}
          alt={item.movie.title}
          loading="lazy"
          className="aspect-[2/3] w-full rounded-lg object-cover shadow-sm transition-transform group-hover:scale-[1.02]"
          onError={(event) => {
            event.currentTarget.src = movieImageFallback(item.movie.title, "poster");
          }}
        />
      </Link>
      <div className="min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link
              to="/movies/$id"
              params={{ id: item.movie.id }}
              className="text-lg font-extrabold tracking-tight hover:text-primary"
            >
              {item.movie.title}
            </Link>
            <p className="mt-1 text-sm text-muted-foreground">
              {item.movie.duration} - {item.movie.certificate} -{" "}
              {splitList(item.movie.genres).slice(0, 3).join(" - ")}
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">
            <Star className="h-3.5 w-3.5 fill-primary" />
            {item.movie.rating}/10
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          {item.shows.map((show) => (
            <ShowTimeButton
              key={show.id}
              show={show}
              cinema={cinema}
              movie={item.movie}
              activeDateLabel={activeDateLabel}
            />
          ))}
        </div>
      </div>
    </article>
  );
}

function ShowTimeButton({ show, cinema, movie, activeDateLabel }) {
  const cls = showTimeClass(show.status);
  const content = (
    <>
      <span className="text-sm font-extrabold">{show.label}</span>
      <span className="text-[10px] uppercase opacity-70">{show.format}</span>
    </>
  );

  const tooltip = <SeatPriceTooltip price={show.price} />;

  if (show.status === "sold") {
    return (
      <span className={`group relative inline-flex flex-col rounded-lg border px-4 py-2 ${cls}`}>
        {content}
        {tooltip}
      </span>
    );
  }

  return (
    <Link
      to="/book/$showId"
      params={{ showId: show.id }}
      search={{
        time: show.label,
        date: activeDateLabel,
        theater: cinema.name,
        movie: movie.title,
        movieId: movie.id,
        theaterId: cinema.id,
        screen: show.screen,
        platinumPrice: show.price.platinum,
        silverPrice: show.price.silver,
        goldPrice: show.price.gold,
        vipPrice: show.price.vip,
        seatRows: show.seatLayout.rowCount,
        seatCols: show.seatLayout.seatsPerRow,
        platinumRows: show.seatLayout.platinumRows,
        silverRows: show.seatLayout.silverRows,
        vipRows: show.seatLayout.vipRows,
        aisleAfter: show.seatLayout.aisleAfter,
        blockedSeats: show.seatLayout.blockedSeats.join(","),
      }}
      className={`group relative inline-flex flex-col rounded-lg border px-4 py-2 text-xs font-medium transition-colors ${cls}`}
    >
      {content}
      {tooltip}
    </Link>
  );
}

function SeatPriceTooltip({ price }) {
  const rows = [
    ["Platinum", price.platinum, "Front rows"],
    ["Silver", price.silver, "Mid rows"],
    ["Gold", price.gold, "Prime rows"],
    ["VIP", price.vip, "Lounge rows"],
  ];

  return (
    <span className="pointer-events-none absolute left-1/2 top-[calc(100%+0.55rem)] z-20 hidden w-60 -translate-x-1/2 rounded-lg border border-border/70 bg-popover p-3 text-left text-popover-foreground shadow-2xl group-hover:block">
      <span className="block text-xs font-extrabold">Seat category prices</span>
      <span className="mt-2 grid gap-1.5">
        {rows.map(([label, amount, detail]) => (
          <span key={label} className="flex items-center justify-between gap-3 text-[11px]">
            <span className="min-w-0">
              <span className="block font-bold">{label}</span>
              <span className="block text-muted-foreground">{detail}</span>
            </span>
            <span className="rounded-full bg-primary/10 px-2 py-1 font-extrabold text-primary">
              Rs {amount}
            </span>
          </span>
        ))}
      </span>
      <span className="mt-2 block rounded-md bg-primary/10 px-2 py-1.5 text-[11px] font-semibold text-primary">
        Click this timing to select seats and book.
      </span>
    </span>
  );
}

function buildCinemaSchedule(cinema, catalog, activeDate, remoteShows) {
  if (remoteShows.length) {
    const remoteSchedule = buildRemoteCinemaSchedule(remoteShows, catalog);
    if (remoteSchedule.length) return remoteSchedule;
  }
  return buildCatalogCinemaSchedule({ cinema, catalog, activeDate, showTimes });
}

function buildRemoteCinemaSchedule(remoteShows, catalog) {
  const groups = new Map();

  remoteShows.forEach((show) => {
    const movie = resolveRemoteMovie(show, catalog);
    if (!movie) return;
    if (!groups.has(movie.id)) groups.set(movie.id, { movie, shows: [] });
    groups.get(movie.id).shows.push(formatRemoteShow(show, movie));
  });

  return Array.from(groups.values());
}

function resolveRemoteMovie(show, catalog) {
  const movieId = show.movieId || show.movie || show.id;
  return catalog.find((movie) => movie.id === movieId) ?? null;
}

function formatRemoteShow(show, movie) {
  const gold = Number(show.price?.gold || 260);
  return {
    id: show.id,
    label: show.startTime || show.time || "Showtime",
    screen: show.screen || "Screen 1",
    status: normalizeShowStatus(show.status),
    format: show.format || movie.format?.[0] || "2D",
    language: show.language || movie.language || "English",
    cancellable: show.cancellable !== false,
    price: {
      platinum: Number(show.price?.platinum || 180),
      silver: Number(show.price?.silver || 220),
      gold,
      vip: Number(show.price?.vip || 420),
    },
    seatLayout: normalizeRemoteSeatLayout(show.seatLayout),
  };
}

function normalizeRemoteSeatLayout(layout = {}) {
  const rowCount = Number(
    layout.rowCount || (Array.isArray(layout.rows) ? layout.rows.length : 0) || 10,
  );
  const seatsPerRow = Number(layout.seatsPerRow || layout.cols || 14);
  return {
    rowCount,
    seatsPerRow,
    platinumRows: Number(layout.platinumRows || 2),
    silverRows: Number(layout.silverRows || 2),
    vipRows: Number(layout.vipRows || 2),
    aisleAfter: Number(layout.aisleAfter || Math.max(0, Math.floor(seatsPerRow / 2))),
    blockedSeats: splitList(layout.blockedSeats),
  };
}

function filterSchedule({ schedule, query, activeFormat, priceRange, preferredTime }) {
  const needle = normalizeText(query);
  return schedule
    .map((item) => {
      const titleMatch =
        !needle ||
        [item.movie.title, item.movie.description, ...splitList(item.movie.genres)]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      const shows = item.shows.filter((show) => {
        const formatMatch = activeFormat === allFilterValue || show.format === activeFormat;
        const priceMatch = matchesPriceRange(show, priceRange);
        const timeMatch =
          preferredTime === "Any time" || timeBucket(show.label) === preferredTime.toLowerCase();
        return formatMatch && priceMatch && timeMatch;
      });
      return { ...item, shows: titleMatch ? shows : [] };
    })
    .filter((item) => item.shows.length > 0);
}

function matchesPriceRange(show, priceRange) {
  const lowest = Math.min(...Object.values(show.price).map(Number));
  if (priceRange === "Under Rs 250") return lowest < 250;
  if (priceRange === "Rs 250 - 350") return lowest >= 250 && lowest <= 350;
  if (priceRange === "Rs 350+") return lowest > 350;
  return true;
}

function showTimeClass(status) {
  if (status === "sold") {
    return "cursor-not-allowed border-border/60 bg-muted/30 text-muted-foreground line-through";
  }
  if (status === "fast") {
    return "border-amber-500/70 bg-amber-500/5 text-foreground hover:bg-amber-500/10";
  }
  return "border-emerald-500/70 bg-background text-foreground hover:bg-emerald-500/10";
}

function normalizeShowStatus(status) {
  const value = String(status ?? "").toLowerCase();
  if (value.includes("sold")) return "sold";
  if (value.includes("fast")) return "fast";
  return "ok";
}

function timeBucket(label) {
  const hour = parseShowHour(label);
  if (hour < 12) return "morning";
  if (hour < 16) return "afternoon";
  if (hour < 20) return "evening";
  return "night";
}

function parseShowHour(label) {
  const match = String(label).match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);
  if (!match) return 20;
  let hour = Number(match[1]);
  const suffix = match[3].toUpperCase();
  if (suffix === "PM" && hour !== 12) hour += 12;
  if (suffix === "AM" && hour === 12) hour = 0;
  return hour;
}

function countShows(schedule) {
  return schedule.reduce((sum, item) => sum + item.shows.length, 0);
}

function lowestSchedulePrice(schedule) {
  const prices = schedule.flatMap((item) =>
    item.shows.flatMap((show) => Object.values(show.price).map(Number)),
  );
  if (!prices.length) return "Rs 0";
  return `Rs ${Math.min(...prices)}`;
}

function formatRating(value) {
  const rating = Number(value || 4.6);
  return `${rating.toFixed(1)}/5`;
}

function buildDateOptions() {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + index);
    const weekday = date.toLocaleDateString("en-IN", { weekday: "short" }).toUpperCase();
    const day = String(date.getDate()).padStart(2, "0");
    const month = date.toLocaleDateString("en-IN", { month: "short" }).toUpperCase();

    return {
      key: toDateInputValue(date),
      weekday,
      day,
      month,
      label: index === 0 ? "Today" : index === 1 ? "Tomorrow" : `${weekday} ${day} ${month}`,
    };
  });
}

function getDateLabel(key) {
  return dateOptions.find((date) => date.key === key)?.label ?? "Selected date";
}

function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function splitList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

export { Route };
