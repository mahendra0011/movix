import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BellRing,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clapperboard,
  Film,
  Gift,
  Heart,
  Landmark,
  Play,
  Quote,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  Ticket,
} from "lucide-react";
import { fetchMovies } from "@/features/movies/api/moviesApi";
import { movies as fallbackMovies, theaters } from "@/features/movies/data/movieCatalog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { HAS_CONFIGURED_API_URL, requestJson } from "@/shared/services/httpClient";
import {
  readHomeSearchQuery,
  subscribeHomeSearchQuery,
  writeHomeSearchQuery,
} from "@/shared/services/homeSearch";
import { readPreferredCity, subscribePreferredCity } from "@/shared/services/cityPreference";

const Route = createFileRoute("/")({
  loader: () => fetchMovies(),
  component: Home,
});

const featureCards = [
  {
    title: "ScreenCare",
    text: "Hygienic theatres for your safe and comfortable experience.",
    icon: ShieldCheck,
    tone: "from-emerald-500/18 via-emerald-300/10 to-cyan-300/20",
  },
  {
    title: "Gift Passes",
    text: "Send movie magic to your loved ones.",
    icon: Gift,
    tone: "from-violet-500/18 via-fuchsia-300/10 to-amber-200/20",
  },
  {
    title: "Film Journal",
    text: "Reviews, stories and exclusive guides for movie lovers.",
    icon: BookOpen,
    tone: "from-sky-500/18 via-blue-300/10 to-primary/15",
  },
];

const testimonials = [
  {
    name: "Aarav S.",
    role: "Frequent moviegoer",
    text: "Booking was instant. Seat selection was simple, clear and quick.",
  },
  {
    name: "Priya M.",
    role: "Film student",
    text: "Clearest movie booking UI I've used. Cinematic, dark, beautiful.",
  },
  {
    name: "Rahul K.",
    role: "Casual viewer",
    text: "Loved the QR ticket. Walked in, scanned, popcorn. Done.",
  },
];

const cinemaImages = [
  "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1505686994434-e3cc5abf1330?auto=format&fit=crop&w=600&q=80",
];

function Home() {
  const loadedMovies = Route.useLoaderData();
  const catalog = loadedMovies.length > 0 ? loadedMovies : fallbackMovies;
  const featured = catalog.find((movie) => movie.id === "interstellar") ?? catalog[0];
  const [query, setQuery] = useState(readHomeSearchQuery);
  const [selectedCity, setSelectedCity] = useState(readPreferredCity);
  const [cinemaCatalog, setCinemaCatalog] = useState(theaters);
  const [activeGenre, setActiveGenre] = useState("All");
  const [sortBy, setSortBy] = useState("Popularity");
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterMessage, setNewsletterMessage] = useState("");
  const [newsletterBusy, setNewsletterBusy] = useState(false);

  useEffect(() => subscribeHomeSearchQuery(setQuery), []);
  useEffect(() => subscribePreferredCity(setSelectedCity), []);

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

  const genres = useMemo(
    () => ["All", ...Array.from(new Set(catalog.flatMap((movie) => movie.genres ?? [])))],
    [catalog],
  );
  const languages = useMemo(
    () => Array.from(new Set(catalog.map((movie) => movie.language).filter(Boolean))),
    [catalog],
  );
  const formats = useMemo(
    () => Array.from(new Set(catalog.flatMap((movie) => movie.format ?? []))),
    [catalog],
  );
  const visibleMovies = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = catalog.filter((movie) => {
      const genreMatch = activeGenre === "All" || movie.genres?.includes(activeGenre);
      const text = [
        movie.title,
        movie.language,
        movie.duration,
        movie.certificate,
        movie.description,
        ...(movie.genres ?? []),
        ...(movie.format ?? []),
      ]
        .join(" ")
        .toLowerCase();
      return genreMatch && (!needle || text.includes(needle));
    });

    return filtered.sort((left, right) => {
      if (sortBy === "Rating") return Number(right.rating || 0) - Number(left.rating || 0);
      if (sortBy === "A-Z") return left.title.localeCompare(right.title);
      return (
        Number(right.votesText || right.rating || 0) - Number(left.votesText || left.rating || 0)
      );
    });
  }, [activeGenre, catalog, query, sortBy]);

  const recommended = visibleMovies.slice(0, 6);
  const topMovies = useMemo(
    () =>
      [...catalog]
        .sort((left, right) => Number(right.rating || 0) - Number(left.rating || 0))
        .slice(0, 4),
    [catalog],
  );
  const comingSoon = rotateMovies(catalog, 2).slice(0, 3);
  const comingSoonDates = useMemo(
    () => buildComingSoonDates(comingSoon.length),
    [comingSoon.length],
  );
  const topCinemas = buildTopCinemas(selectedCity, cinemaCatalog);
  const showSearch = query.trim().length > 0;

  const subscribe = async (event) => {
    event.preventDefault();
    setNewsletterBusy(true);
    setNewsletterMessage("");
    if (!HAS_CONFIGURED_API_URL) {
      setNewsletterMessage("Subscribed for launch alerts.");
      setNewsletterEmail("");
      setNewsletterBusy(false);
      return;
    }

    try {
      const result = await requestJson("/api/notifications/subscribe", {
        method: "POST",
        body: JSON.stringify({ email: newsletterEmail, source: "homepage" }),
      });
      setNewsletterMessage(result.message ?? "You are subscribed.");
      setNewsletterEmail("");
    } catch (error) {
      setNewsletterMessage(error.response?.data?.error ?? "Subscription failed.");
    } finally {
      setNewsletterBusy(false);
    }
  };

  if (!featured) return null;

  if (showSearch) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8">
        <section className="rounded-lg border border-border/70 bg-card/85 p-5 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Search results</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {visibleMovies.length} movie result{visibleMovies.length === 1 ? "" : "s"} for "
                {query.trim()}"
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setQuery("");
                writeHomeSearchQuery("");
              }}
            >
              Clear
            </Button>
          </div>

          {visibleMovies.length ? (
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {visibleMovies.map((movie) => (
                <CompactMovieCard key={movie.id} movie={movie} />
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-lg border border-dashed border-border/70 p-10 text-center">
              <Search className="mx-auto h-8 w-8 text-primary" />
              <h2 className="mt-4 text-lg font-semibold">No movies found</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Try another title, language, format, genre or cinema name.
              </p>
            </div>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="bg-[radial-gradient(circle_at_top_left,color-mix(in_oklch,var(--primary)_10%,transparent),transparent_32%),linear-gradient(180deg,color-mix(in_oklch,var(--secondary)_55%,transparent),var(--background)_520px)] pb-12 dark:bg-[radial-gradient(circle_at_top_left,color-mix(in_oklch,var(--primary)_16%,transparent),transparent_30%),linear-gradient(180deg,color-mix(in_oklch,var(--card)_75%,transparent),var(--background)_560px)]">
      <section className="relative isolate overflow-hidden border-b border-border/60">
        <img
          src={featured.backdrop}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-55 dark:opacity-28"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/65 to-background/10 dark:via-background/82 dark:to-background/35" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

        <div className="relative mx-auto grid min-h-[390px] max-w-7xl items-center gap-8 px-4 py-10 md:min-h-[430px] md:grid-cols-[minmax(0,1fr)_360px]">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary shadow-sm backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              Trending #1 This Week
            </span>
            <h1 className="mt-4 text-5xl font-extrabold tracking-tight text-foreground md:text-7xl">
              {featured.title}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
              <span className="inline-flex items-center gap-1.5 font-semibold">
                <Star className="h-5 w-5 fill-primary text-primary" />
                {featured.rating}/10
              </span>
              <span className="text-muted-foreground">412.3K votes</span>
              <span className="h-4 w-px bg-border" />
              <span>{featured.certificate}</span>
              <span className="h-4 w-px bg-border" />
              <span>{featured.duration}</span>
            </div>
            <p className="mt-4 max-w-xl text-base leading-7 text-foreground/80 dark:text-muted-foreground">
              {featured.description}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {featured.genres.slice(0, 3).map((genre) => (
                <span
                  key={genre}
                  className="rounded-md border border-border/70 bg-card/70 px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur"
                >
                  {genre}
                </span>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button size="lg" asChild className="h-11 gap-2 px-7 shadow-lg shadow-primary/20">
                <Link to="/movies/$id" params={{ id: featured.id }}>
                  <Ticket className="h-4 w-4" />
                  Book Tickets
                </Link>
              </Button>
              <Button size="lg" variant="secondary" asChild className="h-11 gap-2 px-7">
                <a href={trailerSearchUrl(featured.title)} target="_blank" rel="noreferrer">
                  <Play className="h-4 w-4" />
                  Watch Trailer
                </a>
              </Button>
            </div>
          </div>

          <div className="hidden justify-center md:flex">
            <div className="relative w-56 rounded-lg border border-white/60 bg-white/25 p-2 shadow-2xl shadow-primary/10 backdrop-blur dark:border-white/15 dark:bg-white/8">
              <img
                src={featured.poster}
                alt={featured.title}
                className="aspect-[2/3] w-full rounded-md object-cover"
              />
              <a
                href={trailerSearchUrl(featured.title)}
                target="_blank"
                rel="noreferrer"
                className="absolute inset-0 grid place-items-center"
                aria-label={`Watch ${featured.title} trailer`}
              >
                <span className="grid h-16 w-16 place-items-center rounded-full border border-white/70 bg-black/45 text-white shadow-xl backdrop-blur transition-transform hover:scale-105">
                  <Play className="ml-1 h-7 w-7 fill-white" />
                </span>
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto -mt-5 max-w-7xl px-4">
        <div className="grid gap-3 rounded-lg border border-border/70 bg-card/92 p-4 shadow-xl shadow-black/5 backdrop-blur dark:bg-card/88 md:grid-cols-[repeat(4,minmax(0,1fr))_minmax(0,2fr)]">
          <FilterMetric
            icon={Film}
            title="Genres"
            value={activeGenre}
            detail={`+${genres.length - 1}`}
          />
          <FilterMetric
            icon={Clapperboard}
            title="Languages"
            value="All"
            detail={`+${languages.length}`}
          />
          <FilterMetric icon={Ticket} title="Format" value="All" detail={`+${formats.length}`} />
          <label className="rounded-lg border border-border/60 bg-background/60 p-3">
            <span className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              Sort by
            </span>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className="mt-1 w-full bg-transparent text-xs font-medium outline-none"
            >
              <option>Popularity</option>
              <option>Rating</option>
              <option>A-Z</option>
            </select>
          </label>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground">Quick Filters</p>
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {genres.slice(0, 8).map((genre) => (
                <button
                  key={genre}
                  type="button"
                  onClick={() => setActiveGenre(genre)}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    activeGenre === genre
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border/70 bg-background/70 text-foreground hover:border-primary/50"
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <HomeSection
        id="movies"
        title="Recommended for you"
        subtitle="Curated picks based on what you love"
        icon={Star}
        actionHref="#movies"
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {recommended.map((movie) => (
            <CompactMovieCard key={movie.id} movie={movie} />
          ))}
        </div>
      </HomeSection>

      <section className="mx-auto mt-7 max-w-7xl px-4">
        <div className="grid gap-5 lg:grid-cols-3">
          {featureCards.map((card) => (
            <FeatureBanner key={card.title} card={card} />
          ))}
        </div>
      </section>

      <section className="mx-auto mt-7 grid max-w-7xl gap-5 px-4 lg:grid-cols-[1.1fr_0.78fr_0.66fr]">
        <PanelCard
          id="top-movies"
          icon={Star}
          title="Top movies"
          subtitle="Highest-rated picks in theatres"
          actionLabel="See all"
        >
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            {topMovies.map((movie) => (
              <MiniMovieTile key={movie.id} movie={movie} badge="TOP MOVIE" />
            ))}
          </div>
        </PanelCard>

        <PanelCard
          icon={CalendarDays}
          title="Coming soon"
          subtitle="Exciting movies heading your way"
        >
          <div className="mt-4 grid gap-3">
            {comingSoon.map((movie, index) => (
              <Link
                key={movie.id}
                to="/movies/$id"
                params={{ id: movie.id }}
                className="grid grid-cols-[52px_1fr] gap-3 rounded-lg border border-border/60 bg-background/55 p-2 transition-colors hover:border-primary/40"
              >
                <div className="grid h-14 place-items-center rounded-md bg-primary/10 text-center text-primary">
                  <span className="text-sm font-bold">{comingSoonDates[index]?.day}</span>
                  <span className="text-[10px] font-semibold">{comingSoonDates[index]?.month}</span>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{movie.title}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {movie.genres.slice(0, 3).join(" - ")}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </PanelCard>

        <PanelCard id="offers" icon={Sparkles} title="Offers for you" subtitle="Limited-time deals">
          <div className="mt-4 rounded-lg border border-rose-200/70 bg-gradient-to-br from-rose-50 to-orange-100 p-5 text-slate-950 shadow-sm dark:border-rose-400/20 dark:from-rose-500/15 dark:to-orange-500/10 dark:text-foreground">
            <p className="text-lg font-bold">Flat 25% OFF</p>
            <p className="mt-1 text-sm text-slate-700 dark:text-muted-foreground">
              on your first booking
            </p>
            <div className="mt-4 inline-flex rounded-md border border-dashed border-rose-400 bg-white px-4 py-2 text-sm font-bold text-slate-900 dark:bg-background dark:text-foreground">
              WELCOME25
            </div>
            <Button className="mt-5 w-full gap-2">
              Grab Offer <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </PanelCard>
      </section>

      <section className="mx-auto mt-5 grid max-w-7xl gap-5 px-4 lg:grid-cols-[1fr_1fr]">
        <PanelCard
          icon={Quote}
          title="Loved by movie lovers"
          subtitle="Real reviews from real users"
        >
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {testimonials.map((item) => (
              <article
                key={item.name}
                className="rounded-lg border border-border/60 bg-background/55 p-4"
              >
                <Quote className="h-5 w-5 text-primary" />
                <p className="mt-3 text-sm leading-relaxed">"{item.text}"</p>
                <div className="mt-4 flex items-center gap-2">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                    {item.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{item.name}</p>
                    <p className="text-[11px] text-muted-foreground">{item.role}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </PanelCard>

        <PanelCard
          id="cinemas"
          icon={Landmark}
          title={`Top cinemas in ${selectedCity}`}
          subtitle="Premium local screens"
        >
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            {topCinemas.map((cinema, index) => (
              <CinemaCard
                key={cinema.name}
                cinema={cinema}
                image={cinemaImages[index % cinemaImages.length]}
              />
            ))}
          </div>
        </PanelCard>
      </section>

      <section className="mx-auto mt-7 max-w-7xl px-4">
        <div className="grid items-center gap-5 overflow-hidden rounded-lg border border-primary/20 bg-gradient-to-r from-primary/18 via-card to-amber-200/30 p-6 shadow-sm dark:from-primary/12 dark:via-card dark:to-amber-500/10 md:grid-cols-[auto_1fr_auto]">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-primary/15 text-primary">
            <BellRing className="h-10 w-10" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Never miss a seat. Get launch alerts.
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Save your email and get notified about new releases, exclusive offers and early access
              updates.
            </p>
          </div>
          <form onSubmit={subscribe} className="grid min-w-0 gap-2 sm:grid-cols-[240px_auto]">
            <Input
              type="email"
              required
              value={newsletterEmail}
              onChange={(event) => setNewsletterEmail(event.target.value)}
              placeholder="you@example.com"
              className="h-11 bg-background/90"
            />
            <Button disabled={newsletterBusy} className="h-11 gap-2">
              {newsletterMessage ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <BellRing className="h-4 w-4" />
              )}
              {newsletterBusy ? "Saving..." : "Subscribe"}
            </Button>
          </form>
        </div>
        {newsletterMessage && (
          <p className="mt-3 text-center text-sm text-primary">{newsletterMessage}</p>
        )}
      </section>
    </main>
  );
}

function FilterMetric({ icon: Icon, title, value, detail }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/60 p-3">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/12 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold">{title}</p>
          <p className="truncate text-xs text-muted-foreground">
            {value} <span className="text-primary">{detail}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function HomeSection({ id, title, subtitle, icon: Icon, actionHref, children }) {
  return (
    <section id={id} className="mx-auto mt-7 max-w-7xl px-4">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div className="flex items-start gap-2">
          <Icon className="mt-1 h-5 w-5 text-primary" />
          <div>
            <h2 className="text-xl font-bold tracking-tight">{title}</h2>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        {actionHref && (
          <a
            href={actionHref}
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary"
          >
            See all <ArrowRight className="h-4 w-4" />
          </a>
        )}
      </div>
      {children}
    </section>
  );
}

function CompactMovieCard({ movie }) {
  return (
    <Link
      to="/movies/$id"
      params={{ id: movie.id }}
      className="group overflow-hidden rounded-lg border border-border/60 bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-muted">
        <img
          src={movie.poster}
          alt={movie.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-md bg-black/70 px-2 py-1 text-xs font-semibold text-white backdrop-blur">
          <Star className="h-3.5 w-3.5 fill-primary text-primary" />
          {movie.rating}
        </span>
      </div>
      <div className="p-3">
        <h3 className="line-clamp-2 min-h-10 text-sm font-bold leading-5">{movie.title}</h3>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {movie.genres.slice(0, 3).join(" - ")}
        </p>
      </div>
    </Link>
  );
}

function FeatureBanner({ card }) {
  const Icon = card.icon;
  const id = card.title.toLowerCase().replace(/\s+/g, "-");
  return (
    <a
      id={id}
      href={`#${id}`}
      className={`group block rounded-lg border border-border/60 bg-gradient-to-br ${card.tone} p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/35`}
    >
      <div className="flex min-h-24 items-center gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-background/70 text-primary shadow-sm">
          <Icon className="h-7 w-7" />
        </div>
        <div>
          <h3 className="text-xl font-bold tracking-tight">{card.title}</h3>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">{card.text}</p>
          <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary">
            Explore{" "}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </a>
  );
}

function PanelCard({ id, icon: Icon, title, subtitle, actionLabel = "See all", children }) {
  return (
    <section
      id={id}
      className="rounded-lg border border-border/60 bg-card/88 p-4 shadow-sm backdrop-blur"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/12 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">{title}</h2>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <a href={id ? `#${id}` : "#movies"} className="shrink-0 text-xs font-semibold text-primary">
          {actionLabel} <ChevronRight className="inline h-3.5 w-3.5" />
        </a>
      </div>
      {children}
    </section>
  );
}

function MiniMovieTile({ movie, badge }) {
  return (
    <Link to="/movies/$id" params={{ id: movie.id }} className="group block">
      <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-muted">
        <img
          src={movie.backdrop || movie.poster}
          alt={movie.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <span className="absolute left-2 top-2 rounded-md bg-primary px-2 py-1 text-[10px] font-bold text-primary-foreground">
          {badge}
        </span>
      </div>
      <p className="mt-2 line-clamp-2 text-xs font-bold leading-4">{movie.title}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {movie.rating} - {movie.duration} - {movie.certificate}
      </p>
    </Link>
  );
}

function CinemaCard({ cinema, image }) {
  return (
    <a href={`/movies/interstellar#showtimes`} className="group block">
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-muted">
        <img
          src={image}
          alt={cinema.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <span className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white">
          <Heart className="h-3.5 w-3.5 fill-white" />
        </span>
        <span className="absolute bottom-2 right-2 rounded-md bg-black/70 px-2 py-1 text-[11px] font-semibold text-white">
          {cinema.rating}
        </span>
      </div>
      <p className="mt-2 truncate text-sm font-bold">{cinema.name}</p>
      <p className="truncate text-[11px] text-muted-foreground">{cinema.features}</p>
    </a>
  );
}

function buildTopCinemas(selectedCity, cinemaCatalog) {
  const cityKey = normalizeHomeText(selectedCity);
  const local = cinemaCatalog
    .filter((theater) => normalizeHomeText(theater.city) === cityKey)
    .slice(0, 4);
  const source = local.length ? local : cinemaCatalog.slice(0, 4);

  return source.map((theater, index) => ({
    name: theater.name,
    area: theater.area,
    city: theater.city,
    features: splitList(theater.amenities).slice(0, 2).join(", ") || "M-Ticket, Snacks",
    rating: (4.5 + (index % 3) * 0.1).toFixed(1),
  }));
}

function rotateMovies(list, offset) {
  if (!list.length) return [];
  const normalizedOffset = offset % list.length;
  return [...list.slice(normalizedOffset), ...list.slice(0, normalizedOffset)];
}

function buildComingSoonDates(count) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + 24 + index * 7);
    return {
      day: String(date.getDate()).padStart(2, "0"),
      month: date.toLocaleDateString("en-IN", { month: "short" }).toUpperCase(),
    };
  });
}

function splitList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeHomeText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function trailerSearchUrl(title) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${title} official trailer`)}`;
}

export { Route };
