import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BadgePercent,
  BellRing,
  BookOpen,
  CalendarDays,
  CarFront,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clapperboard,
  Film,
  Flame,
  Gift,
  Heart,
  Landmark,
  Play,
  Popcorn,
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
    text: "Hygienic theatres for your safe & comfortable experience.",
    icon: CarFront,
    visual: "screen",
    tone: "from-emerald-100 via-teal-50 to-cyan-100 dark:from-emerald-500/18 dark:via-teal-500/12 dark:to-cyan-500/16",
    iconTone: "bg-emerald-100 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-300",
  },
  {
    title: "Gift Passes",
    text: "Send movie magic to your loved ones.",
    icon: Gift,
    visual: "gift",
    tone: "from-violet-100 via-fuchsia-50 to-amber-100 dark:from-violet-500/18 dark:via-fuchsia-500/12 dark:to-amber-500/14",
    iconTone: "bg-violet-100 text-violet-600 dark:bg-violet-400/15 dark:text-violet-300",
  },
  {
    title: "Film Journal",
    text: "Reviews, stories and exclusive guides for movie lovers.",
    icon: BookOpen,
    visual: "journal",
    tone: "from-sky-100 via-blue-50 to-cyan-100 dark:from-sky-500/18 dark:via-blue-500/12 dark:to-cyan-500/14",
    iconTone: "bg-sky-100 text-blue-600 dark:bg-sky-400/15 dark:text-sky-300",
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

const recommendedOrder = [
  "interstellar",
  "dune-part-two",
  "oppenheimer",
  "spider-verse",
  "inception",
  "the-batman",
];

const ratingOverrides = {
  "spider-verse": "8.6",
  oppenheimer: "9.3",
};

const premiereRatingOverrides = {
  "spider-verse": "8.6",
  "the-batman": "7.2",
};

const allFilterValue = "All";
const sortOptions = ["Popularity", "Rating", "A-Z"];

function Home() {
  const loadedMovies = Route.useLoaderData();
  const catalog = loadedMovies.length > 0 ? loadedMovies : fallbackMovies;
  const featured = catalog.find((movie) => movie.id === "interstellar") ?? catalog[0];
  const [query, setQuery] = useState(readHomeSearchQuery);
  const [selectedCity, setSelectedCity] = useState(readPreferredCity);
  const [cinemaCatalog, setCinemaCatalog] = useState(theaters);
  const [activeGenre, setActiveGenre] = useState(allFilterValue);
  const [activeLanguage, setActiveLanguage] = useState(allFilterValue);
  const [activeFormat, setActiveFormat] = useState(allFilterValue);
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

  const cityListedMovies = useMemo(
    () => buildCityMovieCatalog(catalog, selectedCity, cinemaCatalog),
    [catalog, cinemaCatalog, selectedCity],
  );
  const topMovies = useMemo(() => buildTopMovies(cityListedMovies), [cityListedMovies]);
  const genres = useMemo(
    () => [
      allFilterValue,
      ...Array.from(new Set(cityListedMovies.flatMap((movie) => getMovieGenres(movie)))),
    ],
    [cityListedMovies],
  );
  const languages = useMemo(
    () => Array.from(new Set(cityListedMovies.flatMap((movie) => getMovieLanguages(movie)))),
    [cityListedMovies],
  );
  const formats = useMemo(
    () => Array.from(new Set(cityListedMovies.flatMap((movie) => getMovieFormats(movie)))),
    [cityListedMovies],
  );
  const languageOptions = useMemo(() => [allFilterValue, ...languages], [languages]);
  const formatOptions = useMemo(() => [allFilterValue, ...formats], [formats]);
  const hasActiveFilters =
    activeGenre !== allFilterValue ||
    activeLanguage !== allFilterValue ||
    activeFormat !== allFilterValue ||
    sortBy !== "Popularity";
  const visibleMovies = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = cityListedMovies.filter((movie) => {
      const movieGenres = getMovieGenres(movie);
      const movieLanguages = getMovieLanguages(movie);
      const movieFormats = getMovieFormats(movie);
      const genreMatch = activeGenre === allFilterValue || movieGenres.includes(activeGenre);
      const languageMatch =
        activeLanguage === allFilterValue || movieLanguages.includes(activeLanguage);
      const formatMatch = activeFormat === allFilterValue || movieFormats.includes(activeFormat);
      const text = [
        movie.title,
        movie.duration,
        movie.certificate,
        movie.description,
        ...movieGenres,
        ...movieLanguages,
        ...movieFormats,
      ]
        .join(" ")
        .toLowerCase();
      return genreMatch && languageMatch && formatMatch && (!needle || text.includes(needle));
    });

    return [...filtered].sort((left, right) => {
      if (sortBy === "Rating") return Number(right.rating || 0) - Number(left.rating || 0);
      if (sortBy === "A-Z") return left.title.localeCompare(right.title);
      return (
        parseVoteCount(right.votes ?? right.votesText) -
        parseVoteCount(left.votes ?? left.votesText)
      );
    });
  }, [activeFormat, activeGenre, activeLanguage, cityListedMovies, query, sortBy]);

  const recommended = hasActiveFilters
    ? visibleMovies.slice(0, 6)
    : buildRecommendedMovies(visibleMovies);
  const moviesPageSearch = buildMoviesPageSearch({
    city: selectedCity,
    genre: activeGenre,
    language: activeLanguage,
    format: activeFormat,
    sort: sortBy,
  });
  const premieres = rotateMovies(catalog, 3).slice(0, 4);
  const comingSoon = rotateMovies(catalog, 2).slice(0, 3);
  const comingSoonDates = useMemo(
    () => buildComingSoonDates(comingSoon.length),
    [comingSoon.length],
  );
  const topCinemas = buildTopCinemas(selectedCity, cinemaCatalog);
  const showSearch = query.trim().length > 0;
  const matchingCinemas = useMemo(
    () => searchCinemas(cinemaCatalog, selectedCity, query).slice(0, 8),
    [cinemaCatalog, query, selectedCity],
  );

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
      <main className="mx-auto max-w-[1168px] px-4 py-8">
        <section className="rounded-lg border border-border/70 bg-card/85 p-5 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Search results</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {visibleMovies.length} movies and {matchingCinemas.length} cinemas for "
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

          {visibleMovies.length || matchingCinemas.length ? (
            <div className="mt-6 grid gap-7">
              {visibleMovies.length ? (
                <div>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h2 className="text-lg font-bold">Movies</h2>
                    <span className="text-xs font-semibold text-muted-foreground">
                      {visibleMovies.length} found
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                    {visibleMovies.map((movie) => (
                      <CompactMovieCard key={movie.id} movie={movie} />
                    ))}
                  </div>
                </div>
              ) : null}

              {matchingCinemas.length ? (
                <div>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h2 className="text-lg font-bold">Cinemas</h2>
                    <span className="text-xs font-semibold text-muted-foreground">
                      {matchingCinemas.length} found in {selectedCity}
                    </span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {matchingCinemas.map((cinema) => (
                      <CinemaSearchResult key={cinema.id} cinema={cinema} />
                    ))}
                  </div>
                </div>
              ) : null}
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

        <div className="relative mx-auto grid min-h-[390px] max-w-[1168px] items-center gap-8 px-4 py-8 md:min-h-[398px] md:grid-cols-[minmax(0,1fr)_330px]">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary shadow-sm backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              Trending #1 This Week
            </span>
            <h1 className="mt-4 text-5xl font-extrabold leading-none tracking-tight text-foreground md:text-[64px]">
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

          <div className="hidden justify-start md:flex">
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

      <section id="movie-filters" className="scroll-mt-28 mx-auto -mt-5 max-w-[1248px] px-4">
        <div className="grid gap-2 rounded-xl border border-primary/15 bg-gradient-to-r from-card/95 via-background/95 to-primary/8 p-2 shadow-2xl shadow-black/8 backdrop-blur dark:from-card/92 dark:via-background/90 dark:to-primary/10 md:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,0.72fr))_minmax(0,3.1fr)]">
          <FilterMetric
            icon={Film}
            title="Genres"
            value={activeGenre}
            detail={activeGenre === allFilterValue ? `+${genres.length - 1}` : ""}
            options={genres}
            onChange={setActiveGenre}
          />
          <FilterMetric
            icon={Clapperboard}
            title="Languages"
            value={activeLanguage}
            detail={activeLanguage === allFilterValue ? `+${languages.length}` : ""}
            options={languageOptions}
            onChange={setActiveLanguage}
          />
          <FilterMetric
            icon={Ticket}
            title="Format"
            value={activeFormat}
            detail={activeFormat === allFilterValue ? `+${formats.length}` : ""}
            options={formatOptions}
            onChange={setActiveFormat}
          />
          <FilterMetric
            icon={SlidersHorizontal}
            title="Sort by"
            value={sortBy}
            options={sortOptions}
            onChange={setSortBy}
          />
          <div className="relative min-w-0 overflow-hidden rounded-xl border border-border/60 bg-background/70 p-1.5 shadow-sm md:col-span-2 lg:col-span-1">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-cyan-400/10" />
            <div className="relative flex items-center gap-2">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-primary/12 text-primary">
                <SlidersHorizontal className="h-3 w-3" />
              </span>
              <p className="text-[11px] font-extrabold uppercase tracking-wide text-foreground">
                Quick Filters
              </p>
            </div>
            <div className="relative mt-1 flex gap-1.5 overflow-x-auto rounded-full border border-border/50 bg-card/80 p-1 shadow-inner">
              {genres.slice(0, 8).map((genre) => (
                <button
                  key={genre}
                  type="button"
                  onClick={() => setActiveGenre(genre)}
                  className={`h-6 shrink-0 whitespace-nowrap rounded-full border px-2.5 text-[11px] font-bold transition-all ${
                    activeGenre === genre
                      ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                      : "border-transparent bg-transparent text-foreground hover:border-primary/35 hover:bg-background hover:text-primary"
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
        subtitle={`Curated picks from ${cityListedMovies.length} movies listed in ${selectedCity}`}
        icon={Star}
        actionLabel="See all"
        actionTo="/movies/"
        actionSearch={moviesPageSearch}
        wide
      >
        {recommended.length ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {recommended.map((movie) => (
              <CompactMovieCard key={movie.id} movie={movie} prominent />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border/70 bg-card/70 p-8 text-center">
            <Search className="mx-auto h-7 w-7 text-primary" />
            <h3 className="mt-3 text-base font-semibold">No movies match these filters</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose All in genres, languages, or format to see more movies.
            </p>
          </div>
        )}
      </HomeSection>

      <section className="mx-auto mt-7 max-w-[1168px] px-4">
        <div className="grid gap-5 lg:grid-cols-3">
          {featureCards.map((card) => (
            <FeatureBanner key={card.title} card={card} />
          ))}
        </div>
      </section>

      <section className="mx-auto mt-7 grid max-w-[1168px] gap-5 px-4 lg:grid-cols-[1.1fr_0.78fr_0.66fr]">
        <PanelCard
          id="top-movies"
          icon={Star}
          title="Top movies"
          subtitle="Highest rated films this week"
          actionLabel="See all"
        >
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            {topMovies.map((movie) => (
              <MiniMovieTile key={movie.id} movie={movie} badge="TOP" />
            ))}
          </div>
        </PanelCard>

        <PanelCard
          icon={CalendarDays}
          title="Coming soon"
          subtitle="Exciting movies heading your way"
        >
          <div className="mt-4 grid gap-2">
            {comingSoon.map((movie, index) => (
              <Link
                key={movie.id}
                to="/movies/$id"
                params={{ id: movie.id }}
                className="grid grid-cols-[44px_1fr] gap-2 rounded-lg border border-border/60 bg-background/55 p-1.5 transition-colors hover:border-primary/40"
              >
                <div className="grid h-11 place-items-center rounded-md bg-primary/10 text-center text-primary">
                  <span className="text-sm font-bold">{comingSoonDates[index]?.day}</span>
                  <span className="text-[10px] font-semibold">{comingSoonDates[index]?.month}</span>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold leading-5">{movie.title}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {movie.genres.slice(0, 3).join(" - ")}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </PanelCard>

        <PanelCard id="offers" icon={Sparkles} title="Offers for you" subtitle="Limited-time deals">
          <div className="relative mt-4 min-h-[138px] overflow-hidden rounded-lg border border-rose-200/70 bg-gradient-to-br from-rose-50 to-orange-100 p-4 text-slate-950 shadow-sm dark:border-rose-400/20 dark:from-rose-500/15 dark:to-orange-500/10 dark:text-foreground">
            <div className="absolute -bottom-4 -right-2 grid h-28 w-28 place-items-center rounded-full bg-white/65 text-rose-500 shadow-inner dark:bg-background/45">
              <Popcorn className="h-16 w-16" />
            </div>
            <div className="absolute bottom-5 right-16 grid h-12 w-12 place-items-center rounded-full bg-rose-500 text-white shadow-lg">
              <BadgePercent className="h-7 w-7" />
            </div>
            <p className="relative text-lg font-bold">Flat 25% OFF</p>
            <p className="mt-1 text-sm text-slate-700 dark:text-muted-foreground">
              on your first booking
            </p>
            <div className="mt-4 inline-flex rounded-md border border-dashed border-rose-400 bg-white px-4 py-2 text-sm font-bold text-slate-900 dark:bg-background dark:text-foreground">
              WELCOME25
            </div>
            <Button className="relative mt-4 h-9 gap-2">
              Grab Offer <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </PanelCard>
      </section>

      <PremiereSpotlightSection movies={premieres} />

      <section className="mx-auto mt-5 grid max-w-[1168px] gap-5 px-4">
        <PanelCard
          icon={Quote}
          title="Loved by movie lovers"
          subtitle="Real reviews from real users"
        >
          <div className="mt-4 grid items-stretch gap-3 md:grid-cols-3">
            {testimonials.map((item) => (
              <article
                key={item.name}
                className="relative min-h-[188px] overflow-hidden rounded-lg border border-border/60 bg-gradient-to-br from-background via-card to-primary/8 p-4 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/12 text-primary">
                    <Quote className="h-4 w-4" />
                  </span>
                  <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-primary">
                    Verified
                  </span>
                </div>
                <p className="mt-3 line-clamp-4 text-sm leading-6 text-foreground/85">
                  "{item.text}"
                </p>
                <div className="mt-3 flex gap-0.5 text-primary">
                  {Array.from({ length: 5 }, (_, index) => (
                    <Star key={index} className="h-3.5 w-3.5 fill-primary" />
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-2 border-t border-border/50 pt-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-primary to-emerald-400 text-sm font-extrabold text-white shadow-sm">
                    {item.name[0]}
                  </div>
                  <div className="min-w-0">
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

      <section className="mx-auto mt-7 max-w-[1168px] px-4">
        <div className="relative grid items-center gap-5 overflow-hidden rounded-lg border border-primary/20 bg-gradient-to-r from-primary/18 via-card to-amber-200/30 p-6 shadow-sm dark:from-primary/12 dark:via-card dark:to-amber-500/10 md:grid-cols-[auto_1fr_auto]">
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
          <BellRing className="pointer-events-none absolute -right-4 -top-3 h-28 w-28 rotate-12 text-amber-300/55" />
        </div>
        {newsletterMessage && (
          <p className="mt-3 text-center text-sm text-primary">{newsletterMessage}</p>
        )}
      </section>
    </main>
  );
}

function FilterMetric({ icon: Icon, title, value, detail, options = [], onChange }) {
  const isActive = value !== allFilterValue && value !== "Popularity";
  return (
    <label
      className={`group relative block overflow-hidden rounded-xl border p-1.5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
        isActive
          ? "border-primary/35 bg-primary/8 shadow-primary/10"
          : "border-border/60 bg-background/72 hover:border-primary/30"
      }`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(20,184,166,0.16),transparent_34%)] opacity-80" />
      <div className="relative flex h-full items-center gap-2">
        <div
          className={`grid h-7 w-7 shrink-0 place-items-center rounded-full transition-colors ${
            isActive
              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
              : "bg-primary/12 text-primary"
          }`}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-extrabold uppercase tracking-wide text-muted-foreground">
            {title}
          </p>
          <span
            className={`mt-1 flex min-w-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] shadow-sm transition-colors ${
              isActive
                ? "border-primary/25 bg-primary/10"
                : "border-border/50 bg-card/85 group-hover:bg-primary/8"
            }`}
          >
            <span className="min-w-0 flex-1 truncate font-bold text-foreground">{value}</span>
            {detail ? (
              <span className="shrink-0 rounded-full bg-primary/14 px-1.5 py-0.5 text-[10px] font-extrabold text-primary">
                {detail}
              </span>
            ) : null}
            <ChevronDown
              className={`h-3 w-3 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`}
            />
          </span>
        </div>
      </div>
      <select
        aria-label={title}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer appearance-none border-0 bg-transparent text-transparent opacity-0"
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

function HomeSection({
  id,
  title,
  subtitle,
  icon: Icon,
  actionTo,
  actionSearch,
  actionHref,
  actionLabel = "See all",
  onAction,
  wide = false,
  children,
}) {
  return (
    <section id={id} className={`mx-auto mt-7 px-4 ${wide ? "max-w-[1248px]" : "max-w-[1168px]"}`}>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div className="flex items-start gap-2">
          <Icon className="mt-1 h-5 w-5 text-primary" />
          <div>
            <h2 className="text-xl font-bold tracking-tight">{title}</h2>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        {onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary"
          >
            {actionLabel} <ArrowRight className="h-4 w-4" />
          </button>
        ) : actionTo ? (
          <Link
            to={actionTo}
            search={actionSearch}
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary"
          >
            {actionLabel} <ArrowRight className="h-4 w-4" />
          </Link>
        ) : actionHref ? (
          <a
            href={actionHref}
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary"
          >
            {actionLabel} <ArrowRight className="h-4 w-4" />
          </a>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function CompactMovieCard({ movie, prominent = false }) {
  return (
    <Link
      to="/movies/$id"
      params={{ id: movie.id }}
      className={`group overflow-hidden rounded-lg border border-border/60 bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg ${
        prominent ? "shadow-md" : ""
      }`}
    >
      <div
        className={`relative overflow-hidden bg-muted ${
          prominent ? "aspect-[3/4]" : "aspect-[1.08/1]"
        }`}
      >
        <img
          src={movie.poster}
          alt={movie.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <span
          className={`absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-md bg-black/70 font-semibold text-white backdrop-blur ${
            prominent ? "px-2.5 py-1.5 text-sm" : "px-2 py-1 text-xs"
          }`}
        >
          <Star className={`${prominent ? "h-4 w-4" : "h-3.5 w-3.5"} fill-primary text-primary`} />
          {displayMovieRating(movie)}
        </span>
      </div>
      <div className={prominent ? "p-4" : "p-2.5"}>
        <h3
          className={`line-clamp-2 font-bold ${
            prominent ? "min-h-12 text-base leading-6" : "min-h-9 text-sm leading-5"
          }`}
        >
          {movie.title}
        </h3>
        <p className={`${prominent ? "mt-1.5" : "mt-1"} truncate text-xs text-muted-foreground`}>
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
      className={`group relative block h-[132px] overflow-hidden rounded-lg border border-white/70 bg-gradient-to-br ${card.tone} p-4 shadow-sm shadow-slate-200/70 transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:shadow-black/20`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_24%,rgba(255,255,255,0.92),transparent_28%)] dark:bg-[radial-gradient(circle_at_82%_24%,rgba(255,255,255,0.12),transparent_30%)]" />
      <div className="relative z-10 flex h-full max-w-[60%] items-center gap-3 pr-2">
        <div
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg ${card.iconTone} shadow-sm`}
        >
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0 pt-1">
          <h3 className="text-lg font-extrabold tracking-tight text-slate-950 dark:text-foreground">
            {card.title}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-700 dark:text-muted-foreground">
            {card.text}
          </p>
          <span className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-primary">
            Explore{" "}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
      <FeatureArtwork type={card.visual} />
    </a>
  );
}

function FeatureArtwork({ type }) {
  if (type === "screen") {
    return (
      <div className="pointer-events-none absolute bottom-0 right-1 h-full w-[36%] min-w-28">
        <div className="absolute bottom-4 right-3 h-14 w-24 rounded-[18px] bg-emerald-300/55 blur-xl dark:bg-emerald-400/20" />
        <div className="absolute bottom-4 right-6 flex items-end gap-1.5">
          {[0, 1, 2].map((seat) => (
            <div
              key={seat}
              className="relative h-10 w-8 rounded-b-xl rounded-t-md bg-gradient-to-b from-emerald-400 to-teal-600 shadow-lg shadow-emerald-700/20"
            >
              <span className="absolute -top-4 left-1/2 h-5 w-6 -translate-x-1/2 rounded-t-xl bg-gradient-to-b from-emerald-200 to-emerald-400 shadow-sm" />
              <span className="absolute bottom-2 left-1/2 h-1.5 w-5 -translate-x-1/2 rounded-full bg-white/45" />
            </div>
          ))}
        </div>
        <div className="absolute right-9 top-5 grid h-12 w-12 place-items-center rounded-2xl bg-white/78 text-emerald-600 shadow-xl shadow-emerald-700/15 rotate-6 dark:bg-background/55">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <span className="absolute right-24 top-8 h-2 w-2 rounded-full bg-emerald-400/70" />
        <span className="absolute bottom-8 right-2 h-2.5 w-2.5 rounded-full bg-teal-300/80" />
      </div>
    );
  }

  if (type === "gift") {
    return (
      <div className="pointer-events-none absolute bottom-0 right-2 h-full w-[36%] min-w-28">
        <div className="absolute bottom-5 right-4 h-14 w-24 rounded-[20px] bg-violet-300/35 blur-xl dark:bg-violet-400/18" />
        <div className="absolute bottom-5 right-7 h-16 w-20 rounded-xl bg-gradient-to-br from-violet-300 via-fuchsia-200 to-amber-200 shadow-xl shadow-violet-700/15 rotate-3">
          <span className="absolute left-1/2 top-0 h-full w-3 -translate-x-1/2 bg-violet-600/75" />
          <span className="absolute left-0 top-6 h-3 w-full bg-violet-600/75" />
          <span className="absolute -top-3 left-5 h-6 w-6 rounded-full border-[6px] border-violet-500/85" />
          <span className="absolute -top-3 right-5 h-6 w-6 rounded-full border-[6px] border-fuchsia-500/85" />
        </div>
        <Gift className="absolute bottom-10 right-12 h-9 w-9 text-white/80 drop-shadow" />
        <span className="absolute right-6 top-8 h-3 w-3 rounded-full bg-amber-300 shadow-sm" />
        <span className="absolute right-28 top-5 h-2.5 w-2.5 rounded-full bg-fuchsia-300 shadow-sm" />
        <span className="absolute bottom-11 right-2 h-2 w-2 rounded-full bg-violet-400/80" />
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute bottom-0 right-1 h-full w-[36%] min-w-28">
      <div className="absolute bottom-4 right-4 h-16 w-24 rounded-[20px] bg-blue-300/40 blur-xl dark:bg-blue-400/18" />
      <div className="absolute bottom-5 right-8 h-20 w-14 rounded-xl bg-gradient-to-br from-blue-500 via-sky-400 to-cyan-300 shadow-xl shadow-blue-800/20 -rotate-12">
        <span className="absolute left-2 top-2 h-3 w-3 rounded-sm bg-white/65" />
        <span className="absolute bottom-3 left-2 h-1.5 w-9 rounded-full bg-white/65" />
        <span className="absolute bottom-7 left-2 h-1.5 w-8 rounded-full bg-white/45" />
        <span className="absolute right-1 top-3 grid gap-1">
          {[0, 1, 2, 3].map((dot) => (
            <i key={dot} className="h-1.5 w-1.5 rounded-sm bg-white/70" />
          ))}
        </span>
      </div>
      <div className="absolute bottom-8 right-[72px] grid h-10 w-10 place-items-center rounded-xl bg-white/75 text-blue-600 shadow-lg dark:bg-background/55">
        <Film className="h-6 w-6" />
      </div>
      <span className="absolute right-5 top-7 h-2.5 w-2.5 rounded-full bg-cyan-300" />
      <span className="absolute bottom-10 right-2 h-2 w-2 rounded-full bg-blue-400/80" />
    </div>
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

function PremiereSpotlightSection({ movies }) {
  return (
    <section id="events" className="mx-auto mt-7 max-w-[1168px] px-4">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-lg bg-primary/14 text-primary">
            <Flame className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">Premieres of the week</h2>
            <p className="text-sm text-muted-foreground">Brand new films, only in theatres</p>
          </div>
        </div>
        <a
          href="#events"
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary"
        >
          See all <ChevronRight className="h-4 w-4" />
        </a>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {movies.map((movie) => (
          <PremiereSpotlightCard key={movie.id} movie={movie} />
        ))}
      </div>
    </section>
  );
}

function PremiereSpotlightCard({ movie }) {
  return (
    <Link
      to="/movies/$id"
      params={{ id: movie.id }}
      className="group relative grid min-h-[176px] overflow-hidden rounded-lg border border-border/70 bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-lg sm:grid-cols-[108px_1fr]"
    >
      <img
        src={movie.backdrop || movie.poster}
        alt=""
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover opacity-85 transition-transform duration-500 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/86 to-background/20 dark:from-card dark:via-card/82 dark:to-card/25" />
      <div className="absolute inset-0 bg-gradient-to-t from-background/45 via-transparent to-transparent dark:from-background/80" />

      <div className="relative z-10 hidden items-center p-5 sm:flex">
        <img
          src={movie.poster}
          alt={movie.title}
          loading="lazy"
          className="h-28 w-20 rounded-md object-cover shadow-xl shadow-black/25"
        />
      </div>
      <div className="relative z-10 flex min-w-0 flex-col justify-center p-5 sm:pl-0">
        <span className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-primary/18 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-primary">
          <Flame className="h-3.5 w-3.5" />
          Premiere
        </span>
        <h3 className="line-clamp-2 text-xl font-extrabold tracking-tight text-foreground">
          {movie.title}
        </h3>
        <p className="mt-2 line-clamp-2 max-w-xl text-sm leading-6 text-muted-foreground">
          {movie.description}
        </p>
        <p className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-foreground">
          <Star className="h-4 w-4 fill-primary text-primary" />
          <span>{displayMovieRating(movie, "premiere")}</span>
          <span className="text-muted-foreground">
            - {movie.duration} - {movie.certificate}
          </span>
        </p>
      </div>
    </Link>
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
        {displayMovieRating(movie, "premiere")} - {movie.duration} - {movie.certificate}
      </p>
    </Link>
  );
}

function buildRecommendedMovies(list) {
  const byId = new Map(list.map((movie) => [movie.id, movie]));
  const preferred = recommendedOrder.map((id) => byId.get(id)).filter(Boolean);
  const rest = list.filter((movie) => !recommendedOrder.includes(movie.id));
  return [...preferred, ...rest].slice(0, 6);
}

function buildMoviesPageSearch({ city, genre, language, format, sort }) {
  const search = { city };
  if (genre && genre !== allFilterValue) search.genre = genre;
  if (language && language !== allFilterValue) search.language = language;
  if (format && format !== allFilterValue) search.format = format;
  if (sort && sort !== "Popularity") search.sort = sort;
  return search;
}

function buildTopMovies(list) {
  return [...list]
    .sort((left, right) => Number(right.rating || 0) - Number(left.rating || 0))
    .slice(0, 4);
}

function getMovieGenres(movie) {
  return toFilterList(movie.genres);
}

function getMovieLanguages(movie) {
  return toFilterList(movie.languages ?? movie.language);
}

function getMovieFormats(movie) {
  return toFilterList(movie.formats ?? movie.format);
}

function toFilterList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return value ? [value] : [];
}

function parseVoteCount(value) {
  if (typeof value === "number") return value;
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase();
  const amount = Number.parseFloat(normalized.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(amount)) return 0;
  if (normalized.includes("M")) return amount * 1_000_000;
  if (normalized.includes("K")) return amount * 1_000;
  return amount;
}

function displayMovieRating(movie, variant = "card") {
  if (variant === "premiere" && premiereRatingOverrides[movie.id]) {
    return premiereRatingOverrides[movie.id];
  }
  return ratingOverrides[movie.id] ?? movie.rating;
}

function buildCityMovieCatalog(catalog, selectedCity, cinemaCatalog) {
  const cityKey = normalizeHomeText(selectedCity);
  const localTheaters = cinemaCatalog.filter(
    (theater) => normalizeHomeText(theater.city) === cityKey,
  );
  if (!localTheaters.length) return catalog;

  const theaterMovieIds = localTheaters.map((theater) => splitList(theater.movieIds));
  const hasOpenCatalogTheater = theaterMovieIds.some((movieIds) => movieIds.length === 0);
  if (hasOpenCatalogTheater) return catalog;

  const listedMovieIds = new Set(theaterMovieIds.flat());
  if (!listedMovieIds.size) return catalog;
  return catalog.filter((movie) => listedMovieIds.has(movie.id));
}

function CinemaCard({ cinema, image }) {
  const featureBadges = splitList(cinema.features).slice(0, 2);
  return (
    <Link
      to="/cinemas/$id"
      params={{ id: cinema.id }}
      className="group block overflow-hidden rounded-lg border border-border/60 bg-background/55 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        <img
          src={image}
          alt={cinema.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <span className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white backdrop-blur">
          <Heart className="h-3.5 w-3.5 fill-white" />
        </span>
        <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-md bg-black/70 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur">
          <Star className="h-3 w-3 fill-primary text-primary" />
          {cinema.rating}
        </span>
      </div>
      <div className="p-3">
        <p className="truncate text-sm font-bold">{cinema.name}</p>
        <p className="mt-1 truncate text-[11px] text-muted-foreground">
          {cinema.area}, {cinema.city}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {featureBadges.map((feature) => (
            <span
              key={feature}
              className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary"
            >
              {feature}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}

function buildTopCinemas(selectedCity, cinemaCatalog) {
  const cityKey = normalizeHomeText(selectedCity);
  const local = cinemaCatalog
    .filter((theater) => normalizeHomeText(theater.city) === cityKey)
    .slice(0, 4);
  const source = local.length ? local : cinemaCatalog.slice(0, 4);

  return source.map((theater, index) => ({
    id: theater.id,
    name: theater.name,
    area: theater.area,
    city: theater.city,
    features: splitList(theater.amenities).slice(0, 2).join(", ") || "M-Ticket, Snacks",
    rating: (4.5 + (index % 3) * 0.1).toFixed(1),
  }));
}

function CinemaSearchResult({ cinema }) {
  const amenities = splitList(cinema.amenities).slice(0, 4);
  const movieCount = splitList(cinema.movieIds).length || fallbackMovies.length;
  return (
    <Link
      to="/cinemas/$id"
      params={{ id: cinema.id }}
      className="group grid gap-3 rounded-lg border border-border/60 bg-background/65 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg sm:grid-cols-[56px_1fr_auto]"
    >
      <div className="grid h-14 w-14 place-items-center rounded-lg border border-primary/20 bg-primary/10 text-sm font-extrabold text-primary">
        {cinema.logoText || initials(cinema.name)}
      </div>
      <div className="min-w-0">
        <h3 className="truncate text-base font-bold">{cinema.name}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {cinema.area}, {cinema.city} - {cinema.distance || "near you"}
        </p>
        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{cinema.address}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {amenities.map((amenity) => (
            <span
              key={amenity}
              className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary"
            >
              {amenity}
            </span>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 text-xs font-semibold text-muted-foreground sm:flex-col sm:items-end">
        <span>{movieCount} movies</span>
        <span className="inline-flex items-center gap-1 text-primary">
          View shows <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
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

function searchCinemas(cinemaCatalog, selectedCity, query) {
  const needle = normalizeHomeText(query);
  if (!needle) return [];
  const cityKey = normalizeHomeText(selectedCity);
  return cinemaCatalog.filter((cinema) => {
    if (cityKey && normalizeHomeText(cinema.city) !== cityKey) return false;
    const text = [
      cinema.name,
      cinema.city,
      cinema.area,
      cinema.address,
      cinema.distance,
      ...splitList(cinema.amenities),
    ]
      .join(" ")
      .toLowerCase();
    return text.includes(needle);
  });
}

function normalizeHomeText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
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

export { Route };
