import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Calendar, Clock, Heart, MapPin, Play, Share2, Star } from "lucide-react";
import { fetchMovie } from "@/features/movies/api/moviesApi";
import { theaters, showTimes } from "@/features/movies/data/movieCatalog";
import { Button } from "@/shared/components/ui/button";

const dateOptions = buildDateOptions();
const ownerWorkspacePrefix = "bms-owner-workspace:";

const Route = createFileRoute("/movies/$id")({
  component: MoviePage,
  loader: async ({ params }) => {
    const movie = await fetchMovie(params.id);
    if (!movie) throw notFound();
    return { movie };
  },
});

function MoviePage() {
  const { movie } = Route.useLoaderData();
  const [message, setMessage] = useState("");
  const [activeDate, setActiveDate] = useState(dateOptions[0]?.key ?? "");
  const [selectedCity, setSelectedCity] = useState(readPreferredCity);
  const [ownerWorkspaces, setOwnerWorkspaces] = useState([]);

  useEffect(() => {
    setOwnerWorkspaces(readOwnerWorkspaces());
  }, []);

  const cityOptions = useMemo(() => buildCityOptions(ownerWorkspaces), [ownerWorkspaces]);

  useEffect(() => {
    if (cityOptions.length > 0 && !cityOptions.includes(selectedCity)) {
      setSelectedCity(cityOptions[0]);
    }
  }, [cityOptions, selectedCity]);

  useEffect(() => {
    writePreferredCity(selectedCity);
  }, [selectedCity]);

  const selectedDateLabel = useMemo(() => getDateLabel(activeDate), [activeDate]);
  const cinemaListings = useMemo(
    () => buildCinemaListings({ movie, selectedCity, activeDate, ownerWorkspaces }),
    [activeDate, movie, ownerWorkspaces, selectedCity],
  );

  const addToWatchlist = () => {
    const item = {
      id: movie.id,
      title: movie.title,
      category: "Movie",
      image: movie.poster,
      savedAt: new Date().toISOString(),
    };
    saveShortlistItem(item);
    setMessage(`${movie.title} added to your dashboard watchlist.`);
  };

  const shareMovie = async () => {
    const url = `${window.location.origin}/movies/${movie.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: movie.title, text: movie.description, url });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      }
      setMessage("Movie link copied for sharing.");
    } catch {
      setMessage("Share cancelled.");
    }
  };

  return (
    <div className="pb-20">
      <section className="relative">
        <div className="relative h-[360px] overflow-hidden md:h-[440px]">
          <img
            src={movie.backdrop}
            alt={movie.title}
            className="absolute inset-0 h-full w-full object-cover blur-sm"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/85 to-background/40" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4">
          <div className="-mt-40 grid grid-cols-1 gap-6 md:grid-cols-[260px_1fr] md:gap-10">
            <div className="overflow-hidden rounded-2xl shadow-2xl ring-1 ring-border/60">
              <img
                src={movie.poster}
                alt={movie.title}
                className="aspect-[2/3] w-full object-cover"
              />
            </div>
            <div className="pt-2 md:pt-32">
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{movie.title}</h1>
              <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-card/70 px-3 py-2 backdrop-blur">
                <Star className="h-4 w-4 fill-primary text-primary" />
                <span className="text-sm font-semibold">{movie.rating}/10</span>
                <span className="text-xs text-muted-foreground">({movie.votes} votes)</span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                {movie.format.map((f) => (
                  <span
                    key={f}
                    className="rounded border border-border/60 px-2 py-1 text-muted-foreground"
                  >
                    {f}
                  </span>
                ))}
                <span className="rounded border border-border/60 px-2 py-1 text-muted-foreground">
                  {movie.language}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4" /> {movie.duration}
                </span>
                <span>- {movie.genres.join(", ")}</span>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" /> {movie.releaseDate}
                </span>
                <span>- {movie.certificate}</span>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <a href="#showtimes">Book tickets</a>
                </Button>
                <Button size="lg" variant="secondary" className="gap-2" asChild>
                  <a href={trailerSearchUrl(movie.title)} target="_blank" rel="noreferrer">
                    <Play className="h-4 w-4" /> Trailer
                  </a>
                </Button>
                <Button size="lg" variant="ghost" className="gap-2" onClick={addToWatchlist}>
                  <Heart className="h-4 w-4" /> Watchlist
                </Button>
                <Button size="lg" variant="ghost" className="gap-2" onClick={shareMovie}>
                  <Share2 className="h-4 w-4" /> Share
                </Button>
              </div>
              {message && (
                <p className="mt-4 rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">
                  {message}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-12 max-w-7xl px-4">
        <h2 className="text-xl font-bold">About the movie</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          {movie.description}
        </p>
      </section>

      <section className="mx-auto mt-10 max-w-7xl px-4">
        <h2 className="text-xl font-bold">Cast</h2>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
          {movie.cast.map((c) => (
            <div key={c.name} className="text-center">
              <div className="mx-auto grid h-20 w-20 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-primary/25 to-accent/25 ring-1 ring-border/60">
                {c.avatar ? (
                  <img src={c.avatar} alt={c.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-foreground">{initials(c.name)}</span>
                )}
              </div>
              <p className="mt-2 text-sm font-medium">{c.name}</p>
              <p className="text-xs text-muted-foreground">as {c.role}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="showtimes" className="mx-auto mt-12 max-w-7xl px-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-bold">Select a show</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {cinemaListings.length} cinemas in {selectedCity} for {selectedDateLabel}
            </p>
          </div>

          <div className="flex flex-col gap-3 md:items-end">
            <label className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/60 px-3 py-2 text-sm">
              <MapPin className="h-4 w-4 text-primary" />
              <select
                value={selectedCity}
                onChange={(event) => setSelectedCity(event.target.value)}
                className="min-w-36 bg-transparent text-sm font-medium outline-none"
              >
                {cityOptions.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-wrap gap-2">
              {dateOptions.map((date) => (
                <button
                  key={date.key}
                  type="button"
                  onClick={() => setActiveDate(date.key)}
                  className={`rounded-lg border px-4 py-2 text-xs font-medium ${
                    activeDate === date.key
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border/60"
                  }`}
                >
                  {date.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {cinemaListings.length > 0 ? (
            cinemaListings.map((cinema) => (
              <CinemaShowCard
                key={cinema.id}
                cinema={cinema}
                movie={movie}
                activeDateLabel={selectedDateLabel}
              />
            ))
          ) : (
            <div className="rounded-xl border border-border/60 bg-card/60 p-6 text-center">
              <h3 className="font-semibold">No cinema found in {selectedCity}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Try another city or ask a cinema owner to list shows for this movie.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function CinemaShowCard({ cinema, movie, activeDateLabel }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/60 p-5 backdrop-blur transition-colors hover:border-border">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{cinema.name}</h3>
            {cinema.isOwner && (
              <span className="rounded-md bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">
                Owner listed
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {cinema.area}, {cinema.city} - {cinema.distance || "near you"}
          </p>
          {cinema.address && (
            <p className="mt-1 max-w-2xl text-xs text-muted-foreground">{cinema.address}</p>
          )}
          {cinema.amenities.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {cinema.amenities.slice(0, 5).map((amenity) => (
                <span
                  key={amenity}
                  className="rounded-md border border-border/60 px-2 py-1 text-[11px] text-muted-foreground"
                >
                  {amenity}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Available
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-500" /> Filling fast
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-rose-500" /> Sold out
          </span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {cinema.shows.map((show) => {
          const cls = showTimeClass(show.status);
          const content = (
            <>
              <span>{show.label}</span>
              <span className="text-[10px] opacity-70">
                {show.format} - {formatCurrency(show.price.gold)}
              </span>
            </>
          );

          return show.status === "sold" ? (
            <span
              key={show.id}
              className={`inline-flex flex-col rounded-md border px-3 py-1.5 text-xs font-medium ${cls}`}
            >
              {content}
            </span>
          ) : (
            <Link
              key={show.id}
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
                goldPrice: show.price.gold,
                vipPrice: show.price.vip,
              }}
              className={`inline-flex flex-col rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${cls}`}
            >
              {content}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function buildCinemaListings({ movie, selectedCity, activeDate, ownerWorkspaces }) {
  const city = selectedCity || "Bengaluru";
  const staticListings = theaters
    .filter((theater) => sameCity(theater.city, city))
    .map((theater) => ({
      id: theater.id,
      name: theater.name,
      city: theater.city,
      area: theater.area,
      address: theater.address,
      distance: theater.distance,
      amenities: splitAmenities(theater.amenities),
      isOwner: false,
      shows: showTimes.map((time, index) => buildStaticShow(movie, theater, time, index)),
    }));

  const ownerListings = ownerWorkspaces
    .map((workspace) => {
      const profile = workspace.cinemaProfile;
      const shows = workspace.shows
        .filter((show) => {
          const showCity = show.city || profile.city;
          return (
            show.movieId === movie.id &&
            show.listingType !== "coming-soon" &&
            show.status !== "Draft" &&
            sameCity(showCity, city) &&
            show.date === activeDate
          );
        })
        .map(formatOwnerShow);

      if (shows.length === 0) return null;

      return {
        id: profile.id,
        name: profile.name,
        city: profile.city,
        area: profile.area,
        address: profile.address,
        distance: profile.distance,
        amenities: splitAmenities(profile.amenities),
        isOwner: true,
        shows,
      };
    })
    .filter(Boolean);

  return [...ownerListings, ...staticListings].filter((cinema) => cinema.shows.length > 0);
}

function buildStaticShow(movie, theater, time, index) {
  return {
    id: `${movie.id}-${theater.id}-${index}`,
    label: time,
    screen: "Screen 3",
    status: index === 4 ? "sold" : index === 3 ? "fast" : "ok",
    format: index % 2 === 0 ? "IMAX" : "2D",
    language: movie.language,
    price: {
      platinum: 180 + index * 10,
      gold: 250 + index * 15,
      vip: 400 + index * 20,
    },
  };
}

function formatOwnerShow(show) {
  const gold = Number(show.pricing?.gold || show.price || 250);
  const platinum = Number(show.pricing?.platinum || gold);
  const vip = Number(show.pricing?.vip || platinum);

  return {
    id: show.id,
    label: show.startTime ? formatTimeLabel(show.startTime) : show.time || "Showtime",
    screen: show.screen || "Screen 1",
    status: normalizeShowStatus(show.status),
    format: show.format || "2D",
    language: show.language || "English",
    price: { platinum, gold, vip },
  };
}

function normalizeShowStatus(status) {
  const value = String(status ?? "").toLowerCase();
  if (value.includes("sold")) return "sold";
  if (value.includes("fast")) return "fast";
  return "ok";
}

function showTimeClass(status) {
  if (status === "sold") {
    return "cursor-not-allowed border-border/60 text-muted-foreground line-through";
  }
  if (status === "fast") {
    return "border-amber-500/60 text-amber-400 hover:bg-amber-500/10";
  }
  return "border-emerald-500/60 text-emerald-400 hover:bg-emerald-500/10";
}

function buildCityOptions(ownerWorkspaces) {
  const cities = new Set(theaters.map((theater) => theater.city).filter(Boolean));
  ownerWorkspaces.forEach((workspace) => {
    if (workspace.cinemaProfile?.city) cities.add(workspace.cinemaProfile.city);
  });

  return Array.from(cities).sort((a, b) => {
    if (a === "Bengaluru") return -1;
    if (b === "Bengaluru") return 1;
    return a.localeCompare(b);
  });
}

function readOwnerWorkspaces() {
  if (typeof window === "undefined") return [];
  const workspaces = [];

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key?.startsWith(ownerWorkspacePrefix)) continue;

    try {
      const parsed = JSON.parse(window.localStorage.getItem(key) || "{}");
      const ownerKey = decodeURIComponent(key.slice(ownerWorkspacePrefix.length));
      workspaces.push({
        cinemaProfile: normalizeCinemaProfile(parsed.cinemaProfile, ownerKey),
        shows: Array.isArray(parsed.shows) ? parsed.shows : [],
      });
    } catch {
      // Ignore older or partial owner workspace records.
    }
  }

  return workspaces;
}

function normalizeCinemaProfile(profile, ownerKey) {
  const fallback = {
    id: `owner-cinema-${ownerKey || "local"}`,
    name: "Owner cinema",
    city: "Bengaluru",
    area: "Local area",
    address: "",
    distance: "",
    amenities: "",
  };
  const normalized =
    profile && typeof profile === "object" ? { ...fallback, ...profile } : fallback;
  return {
    ...normalized,
    id: normalized.id || slugify(`${normalized.name}-${normalized.city}`),
  };
}

function buildDateOptions() {
  return Array.from({ length: 4 }, (_, index) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + index);

    return {
      key: toDateInputValue(date),
      label:
        index === 0
          ? "Today"
          : index === 1
            ? "Tomorrow"
            : date.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit" }),
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

function sameCity(left, right) {
  return normalizeText(left) === normalizeText(right);
}

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function splitAmenities(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatCurrency(value) {
  return `Rs ${Number(value || 0).toLocaleString("en-IN")}`;
}

function formatTimeLabel(value) {
  if (!value) return "Showtime";
  const [hourText, minute = "00"] = value.split(":");
  const hour = Number(hourText);
  if (Number.isNaN(hour)) return value;

  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12.toString().padStart(2, "0")}:${minute} ${suffix}`;
}

function slugify(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function readPreferredCity() {
  if (typeof window === "undefined") return "Bengaluru";
  return window.localStorage.getItem("bms-selected-city") || "Bengaluru";
}

function writePreferredCity(city) {
  if (typeof window === "undefined" || !city) return;
  window.localStorage.setItem("bms-selected-city", city);
}

function initials(name) {
  return String(name)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function trailerSearchUrl(title) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${title} official trailer`)}`;
}

function saveShortlistItem(item) {
  if (typeof window === "undefined") return;
  const key = "bms-shortlist";
  let existing = [];
  try {
    existing = JSON.parse(window.localStorage.getItem(key) || "[]");
  } catch {
    existing = [];
  }
  const next = [item, ...existing.filter((saved) => saved.id !== item.id)].slice(0, 12);
  window.localStorage.setItem(key, JSON.stringify(next));
}

export { Route };
