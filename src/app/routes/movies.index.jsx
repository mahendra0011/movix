import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BadgePercent,
  CalendarDays,
  Check,
  ChevronDown,
  Clapperboard,
  Film,
  MapPin,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  Ticket,
  X,
} from "lucide-react";
import { fetchMovies } from "@/features/movies/api/moviesApi";
import { movies as fallbackMovies, theaters } from "@/features/movies/data/movieCatalog";
import { movieImageFallback, normalizeMovieImageUrl } from "@/features/movies/services/movieMedia";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { requestJson } from "@/shared/services/httpClient";
import {
  readPreferredCity,
  subscribePreferredCity,
  writePreferredCity,
} from "@/shared/services/cityPreference";

const allFilterValue = "All";
const sortOptions = ["Popularity", "Rating", "A-Z"];
const categoryOrder = [
  "All",
  "Blockbusters",
  "Family",
  "Critics' picks",
  "Premium formats",
  "New releases",
];

function validateMoviesSearch(search) {
  return {
    city: typeof search.city === "string" ? search.city : "",
    genre: typeof search.genre === "string" ? search.genre : allFilterValue,
    language: typeof search.language === "string" ? search.language : allFilterValue,
    format: typeof search.format === "string" ? search.format : allFilterValue,
    category: typeof search.category === "string" ? search.category : allFilterValue,
    sort: typeof search.sort === "string" ? search.sort : "Popularity",
    q: typeof search.q === "string" ? search.q : "",
  };
}

const Route = createFileRoute("/movies/")({
  loader: () => fetchMovies(),
  validateSearch: validateMoviesSearch,
  component: MoviesListing,
});

function MoviesListing() {
  const loadedMovies = Route.useLoaderData();
  const initialSearch = Route.useSearch();
  return <MoviesListingView loadedMovies={loadedMovies} initialSearch={initialSearch} />;
}

function MoviesListingView({ loadedMovies = [], initialSearch = {} }) {
  const { city, genre, language, format, category, sort, q } = initialSearch;
  const catalog = loadedMovies.length > 0 ? loadedMovies : fallbackMovies;
  const [selectedCity, setSelectedCity] = useState(city || readPreferredCity());
  const [cinemaCatalog, setCinemaCatalog] = useState(theaters);
  const [activeGenre, setActiveGenre] = useState(genre || allFilterValue);
  const [activeLanguage, setActiveLanguage] = useState(language || allFilterValue);
  const [activeFormat, setActiveFormat] = useState(format || allFilterValue);
  const [activeCategory, setActiveCategory] = useState(category || allFilterValue);
  const [sortBy, setSortBy] = useState(sort || "Popularity");
  const [searchTerm, setSearchTerm] = useState(q || "");
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    if (city) {
      setSelectedCity(city);
      writePreferredCity(city);
    }
    setActiveGenre(genre || allFilterValue);
    setActiveLanguage(language || allFilterValue);
    setActiveFormat(format || allFilterValue);
    setActiveCategory(category || allFilterValue);
    setSortBy(sortOptions.includes(sort) ? sort : "Popularity");
    setSearchTerm(q || "");
  }, [category, city, format, genre, language, q, sort]);

  useEffect(() => subscribePreferredCity(setSelectedCity), []);

  useEffect(() => {
    let active = true;

    requestJson("/api/theaters", { timeoutMs: 8000 })
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
  const genres = useMemo(
    () => [
      allFilterValue,
      ...Array.from(new Set(cityListedMovies.flatMap((movie) => getMovieGenres(movie)))),
    ],
    [cityListedMovies],
  );
  const languages = useMemo(
    () => [
      allFilterValue,
      ...Array.from(new Set(cityListedMovies.flatMap((movie) => getMovieLanguages(movie)))),
    ],
    [cityListedMovies],
  );
  const formats = useMemo(
    () => [
      allFilterValue,
      ...Array.from(new Set(cityListedMovies.flatMap((movie) => getMovieFormats(movie)))),
    ],
    [cityListedMovies],
  );
  const visibleCategories = categoryOrder;
  const activeCategoryFilter = visibleCategories.includes(activeCategory)
    ? activeCategory
    : allFilterValue;

  const filteredMovies = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();
    const filtered = cityListedMovies.filter((movie) => {
      const movieGenres = getMovieGenres(movie);
      const movieLanguages = getMovieLanguages(movie);
      const movieFormats = getMovieFormats(movie);
      const movieCategories = getMovieCategories(movie);
      const categoryMatch =
        activeCategoryFilter === allFilterValue || movieCategories.includes(activeCategoryFilter);
      const genreMatch = activeGenre === allFilterValue || movieGenres.includes(activeGenre);
      const languageMatch =
        activeLanguage === allFilterValue || movieLanguages.includes(activeLanguage);
      const formatMatch = activeFormat === allFilterValue || movieFormats.includes(activeFormat);
      const searchableText = [
        movie.title,
        movie.description,
        movie.duration,
        movie.certificate,
        movie.language,
        ...movieCategories,
        ...movieGenres,
        ...movieLanguages,
        ...movieFormats,
      ]
        .join(" ")
        .toLowerCase();
      return (
        categoryMatch &&
        genreMatch &&
        languageMatch &&
        formatMatch &&
        (!needle || searchableText.includes(needle))
      );
    });

    return [...filtered].sort((left, right) => {
      if (sortBy === "Rating") return Number(right.rating || 0) - Number(left.rating || 0);
      if (sortBy === "A-Z") return left.title.localeCompare(right.title);
      return (
        parseVoteCount(right.votes ?? right.votesText) -
        parseVoteCount(left.votes ?? left.votesText)
      );
    });
  }, [
    activeCategoryFilter,
    activeFormat,
    activeGenre,
    activeLanguage,
    cityListedMovies,
    searchTerm,
    sortBy,
  ]);
  const bannerMovies = useMemo(() => buildBannerMovies(cityListedMovies), [cityListedMovies]);
  const featured =
    bannerMovies[activeSlide % Math.max(bannerMovies.length, 1)] ?? cityListedMovies[0];
  const activeFilterCount = [
    activeGenre !== allFilterValue,
    activeLanguage !== allFilterValue,
    activeFormat !== allFilterValue,
    activeCategoryFilter !== allFilterValue,
    sortBy !== "Popularity",
    searchTerm.trim().length > 0,
  ].filter(Boolean).length;

  useEffect(() => {
    setActiveSlide(0);
  }, [selectedCity, bannerMovies.length]);

  useEffect(() => {
    if (bannerMovies.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % bannerMovies.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, [bannerMovies.length]);

  const clearFilters = () => {
    setActiveGenre(allFilterValue);
    setActiveLanguage(allFilterValue);
    setActiveFormat(allFilterValue);
    setActiveCategory(allFilterValue);
    setSortBy("Popularity");
    setSearchTerm("");
  };

  return (
    <main className="bg-[radial-gradient(circle_at_top_left,color-mix(in_oklch,var(--primary)_11%,transparent),transparent_30%),linear-gradient(180deg,color-mix(in_oklch,var(--secondary)_48%,transparent),var(--background)_460px)] pb-12 dark:bg-[radial-gradient(circle_at_top_left,color-mix(in_oklch,var(--primary)_16%,transparent),transparent_32%),linear-gradient(180deg,color-mix(in_oklch,var(--card)_78%,transparent),var(--background)_540px)]">
      <section className="relative isolate overflow-hidden border-b border-border/60">
        <div className="absolute inset-0">
          {bannerMovies.map((movie, index) => (
            <img
              key={movie.id}
              src={normalizeMovieImageUrl(movie.backdrop || movie.poster, movie.title, "backdrop")}
              alt=""
              className={`absolute inset-0 h-full w-full object-cover transition-all duration-700 ${
                index === activeSlide % bannerMovies.length
                  ? "scale-100 opacity-55 dark:opacity-30"
                  : "scale-105 opacity-0"
              }`}
              onError={(event) => {
                event.currentTarget.src = movieImageFallback(movie.title, "backdrop");
              }}
            />
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/78 to-background/20 dark:via-background/86 dark:to-background/45" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

        <div className="relative mx-auto grid min-h-[360px] max-w-[1560px] items-center gap-8 px-4 py-8 sm:px-5 lg:grid-cols-[minmax(0,1fr)_270px] lg:px-6">
          <div className="max-w-2xl">
            <Link
              to="/"
              className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
              Home
            </Link>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary shadow-sm backdrop-blur">
              <MapPin className="h-3.5 w-3.5" />
              {selectedCity} movies
            </span>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-foreground md:text-6xl">
              All listed movies in {selectedCity}
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-foreground/80 dark:text-muted-foreground">
              Search, filter and book from every movie currently listed for your selected city.
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold">
              <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-primary">
                {cityListedMovies.length} listed movies
              </span>
              <span className="rounded-full border border-border/60 bg-card/75 px-3 py-1.5">
                {filteredMovies.length} matching now
              </span>
              <span className="rounded-full border border-border/60 bg-card/75 px-3 py-1.5">
                Auto-sliding picks
              </span>
            </div>
          </div>

          {featured ? (
            <Link
              to="/movies/$id"
              params={{ id: featured.id }}
              className="group hidden overflow-hidden rounded-lg border border-white/60 bg-white/25 p-2 shadow-2xl shadow-primary/10 backdrop-blur transition-transform hover:-translate-y-1 dark:border-white/15 dark:bg-white/8 lg:block"
            >
              <div className="relative">
                <img
                  src={normalizeMovieImageUrl(featured.poster, featured.title, "poster")}
                  alt={featured.title}
                  className="aspect-[2/3] w-full rounded-md object-cover"
                  onError={(event) => {
                    event.currentTarget.src = movieImageFallback(featured.title, "poster");
                  }}
                />
                <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-md bg-black/70 px-2.5 py-1.5 text-sm font-bold text-white backdrop-blur">
                  <Star className="h-4 w-4 fill-primary text-primary" />
                  {featured.rating}/10
                </span>
              </div>
              <div className="p-2">
                <p className="line-clamp-1 text-sm font-extrabold">{featured.title}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {getMovieGenres(featured).slice(0, 2).join(" - ")}
                </p>
              </div>
            </Link>
          ) : (
            <div className="hidden rounded-lg border border-dashed border-primary/25 bg-card/70 p-5 text-sm text-muted-foreground shadow-xl backdrop-blur lg:block">
              Released movies will appear here once a theater owner adds live timings.
            </div>
          )}

          {bannerMovies.length > 1 ? (
            <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-2">
              {bannerMovies.map((movie, index) => (
                <button
                  key={movie.id}
                  type="button"
                  aria-label={`Show ${movie.title}`}
                  onClick={() => setActiveSlide(index)}
                  className={`h-2 rounded-full transition-all ${
                    index === activeSlide % bannerMovies.length
                      ? "w-8 bg-primary"
                      : "w-2 bg-foreground/30 hover:bg-primary/60"
                  }`}
                />
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="mx-auto -mt-6 max-w-[1560px] px-4 sm:px-5 lg:px-6">
        <div className="relative overflow-hidden rounded-xl border border-primary/15 bg-gradient-to-r from-card/95 via-background/95 to-primary/8 p-4 shadow-2xl shadow-black/8 backdrop-blur dark:from-card/92 dark:via-background/90 dark:to-primary/10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_92%_12%,rgba(20,184,166,0.14),transparent_30%)]" />
          <div className="relative grid gap-3 lg:grid-cols-[1.35fr_repeat(4,minmax(0,0.82fr))]">
            <label className="relative block min-w-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search city movies, genres, languages..."
                className="h-[76px] rounded-xl border-border/60 bg-background/80 pl-10 pr-10 text-base font-semibold shadow-sm"
              />
              {searchTerm ? (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </label>
            <ListingFilterMetric
              icon={Film}
              title="Genres"
              value={activeGenre}
              detail={activeGenre === allFilterValue ? `+${genres.length - 1}` : ""}
              options={genres}
              onChange={setActiveGenre}
            />
            <ListingFilterMetric
              icon={Clapperboard}
              title="Languages"
              value={activeLanguage}
              detail={activeLanguage === allFilterValue ? `+${languages.length - 1}` : ""}
              options={languages}
              onChange={setActiveLanguage}
            />
            <ListingFilterMetric
              icon={Ticket}
              title="Format"
              value={activeFormat}
              detail={activeFormat === allFilterValue ? `+${formats.length - 1}` : ""}
              options={formats}
              onChange={setActiveFormat}
            />
            <ListingFilterMetric
              icon={SlidersHorizontal}
              title="Sort by"
              value={sortBy}
              options={sortOptions}
              onChange={setSortBy}
            />
          </div>

          <div className="relative mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-2 text-xs font-extrabold text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Categories
              </span>
              <div className="flex max-w-full gap-1.5 overflow-x-auto rounded-full border border-border/50 bg-background/75 p-1 shadow-inner">
                {visibleCategories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setActiveCategory(category)}
                    className={`h-8 shrink-0 whitespace-nowrap rounded-full border px-3 text-xs font-bold transition-all ${
                      activeCategoryFilter === category
                        ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                        : "border-transparent text-foreground hover:border-primary/35 hover:bg-card hover:text-primary"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {activeFilterCount ? (
                <span className="rounded-full bg-primary/10 px-3 py-2 text-xs font-bold text-primary">
                  {activeFilterCount} active
                </span>
              ) : null}
              <Button
                type="button"
                variant="secondary"
                onClick={clearFilters}
                className="h-9 gap-2 rounded-full"
              >
                <X className="h-4 w-4" />
                Clear
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-7 max-w-[1560px] px-4 sm:px-5 lg:px-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">Movies available now</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {filteredMovies.length} of {cityListedMovies.length} movies in {selectedCity}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-bold">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/75 px-3 py-1.5">
              <Check className="h-3.5 w-3.5 text-primary" />
              M-Ticket ready
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/75 px-3 py-1.5">
              <BadgePercent className="h-3.5 w-3.5 text-primary" />
              Offers live
            </span>
          </div>
        </div>

        {filteredMovies.length ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {filteredMovies.map((movie) => (
              <MovieListingCard key={movie.id} movie={movie} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border/70 bg-card/70 p-10 text-center">
            <Search className="mx-auto h-8 w-8 text-primary" />
            <h3 className="mt-4 text-lg font-bold">
              {cityListedMovies.length
                ? "No city movies match these filters"
                : `No released movies in ${selectedCity}`}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {cityListedMovies.length
                ? "Clear filters or search another movie title."
                : "Released movies appear here after a theater owner adds live timings."}
            </p>
            {cityListedMovies.length ? (
              <Button type="button" onClick={clearFilters} className="mt-5 rounded-full">
                Clear filters
              </Button>
            ) : null}
          </div>
        )}
      </section>
    </main>
  );
}

function ListingFilterMetric({ icon: Icon, title, value, detail, options = [], onChange }) {
  const isActive = value !== allFilterValue && value !== "Popularity";
  return (
    <label
      className={`group relative block min-h-[76px] overflow-hidden rounded-xl border p-2.5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
        isActive
          ? "border-primary/35 bg-primary/8 shadow-primary/10"
          : "border-border/60 bg-background/72 hover:border-primary/30"
      }`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(20,184,166,0.16),transparent_34%)] opacity-80" />
      <div className="relative flex h-full items-center gap-3">
        <div
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-full transition-colors ${
            isActive
              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
              : "bg-primary/12 text-primary"
          }`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground">
            {title}
          </p>
          <span
            className={`mt-1.5 flex min-w-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs shadow-sm transition-colors ${
              isActive
                ? "border-primary/25 bg-primary/10"
                : "border-border/50 bg-card/85 group-hover:bg-primary/8"
            }`}
          >
            <span className="min-w-0 flex-1 truncate font-bold text-foreground">{value}</span>
            {detail ? (
              <span className="shrink-0 rounded-full bg-primary/14 px-2 py-0.5 text-[11px] font-extrabold text-primary">
                {detail}
              </span>
            ) : null}
            <ChevronDown
              className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`}
            />
          </span>
        </div>
      </div>
      <select
        aria-label={title}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
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

function MovieListingCard({ movie }) {
  return (
    <Link
      to="/movies/$id"
      params={{ id: movie.id }}
      className="group overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl"
    >
      <div className="relative aspect-[2/3] overflow-hidden bg-muted">
        <img
          src={normalizeMovieImageUrl(movie.poster, movie.title, "poster")}
          alt={movie.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(event) => {
            event.currentTarget.src = movieImageFallback(movie.title, "poster");
          }}
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent p-3 text-white">
          <span className="inline-flex items-center gap-1 rounded-md bg-black/55 px-2 py-1 text-xs font-bold backdrop-blur">
            <Star className="h-3.5 w-3.5 fill-primary text-primary" />
            {movie.rating}/10
          </span>
        </div>
      </div>
      <div className="p-3.5">
        <h3 className="line-clamp-2 min-h-11 text-[15px] font-extrabold leading-[22px]">
          {movie.title}
        </h3>
        <p className="mt-1.5 truncate text-xs text-muted-foreground">
          {getMovieGenres(movie).slice(0, 3).join(" - ")}
        </p>
        <div className="mt-3 flex items-center justify-between gap-2 text-[11px] font-bold text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5 text-primary" />
            {movie.duration}
          </span>
          <span className="rounded-full bg-primary/10 px-2 py-1 text-primary">
            {movie.certificate}
          </span>
        </div>
      </div>
    </Link>
  );
}

function buildBannerMovies(list) {
  return [...list]
    .sort((left, right) => Number(right.rating || 0) - Number(left.rating || 0))
    .slice(0, 4);
}

function buildCityMovieCatalog(catalog, selectedCity, cinemaCatalog) {
  const cityKey = normalizeText(selectedCity);
  const localTheaters = cinemaCatalog.filter((theater) => normalizeText(theater.city) === cityKey);
  if (!localTheaters.length) return catalog;

  const hasOwnerTheater = localTheaters.some((theater) => theater.isOwner || theater.ownerId);
  const theaterMovieIds = localTheaters.map((theater) => splitList(theater.movieIds));
  const hasOpenCatalogTheater = localTheaters.some(
    (theater, index) =>
      !(theater.isOwner || theater.ownerId) && theaterMovieIds[index].length === 0,
  );
  if (hasOpenCatalogTheater) return catalog;

  const listedMovieIds = new Set(theaterMovieIds.flat());
  if (!listedMovieIds.size) return hasOwnerTheater ? [] : catalog;
  const listedMovies = catalog.filter((movie) => listedMovieIds.has(movie.id));
  if (
    !hasOwnerTheater &&
    catalog.length > 50 &&
    listedMovies.length < Math.min(24, Math.ceil(catalog.length * 0.12))
  ) {
    return catalog;
  }
  return listedMovies;
}

function getMovieCategories(movie) {
  const genres = getMovieGenres(movie).map(normalizeText);
  const formats = getMovieFormats(movie).map(normalizeText);
  const categories = [];

  if (
    genres.some((genre) =>
      ["action", "adventure", "crime", "sci-fi", "spy", "superhero", "thriller", "war"].includes(
        genre,
      ),
    )
  ) {
    categories.push("Blockbusters");
  }
  if (genres.some((genre) => ["animation", "comedy", "family", "fantasy"].includes(genre))) {
    categories.push("Family");
  }
  if (
    genres.some((genre) =>
      ["biography", "drama", "epic", "history", "mythological", "period"].includes(genre),
    )
  ) {
    categories.push("Critics' picks");
  }
  if (formats.some((format) => ["imax", "4dx", "laser"].includes(format))) {
    categories.push("Premium formats");
  }
  if (isNewRelease(movie) || categories.length === 0) {
    categories.push("New releases");
  }
  return categories;
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

function isNewRelease(movie) {
  const releaseAt = new Date(movie.releaseAt || movie.releaseDate || movie.date || "");
  if (Number.isNaN(releaseAt.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  releaseAt.setHours(0, 0, 0, 0);
  const ageInDays = (today.getTime() - releaseAt.getTime()) / 86_400_000;
  return ageInDays >= 0 && ageInDays <= 45;
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

// eslint-disable-next-line react-refresh/only-export-components
export { MoviesListingView, Route, validateMoviesSearch };
