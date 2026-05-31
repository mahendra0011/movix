import { createFileRoute, Link } from "@tanstack/react-router";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Bell,
  CalendarClock,
  CalendarDays,
  Check,
  ChevronDown,
  Clapperboard,
  Film,
  Flame,
  Languages,
  Search,
  SlidersHorizontal,
  Star,
  Ticket,
  X,
} from "lucide-react";
import { comingSoonMovies as fallbackMovies } from "@/features/movies/data/movieCatalog";
import {
  isFallbackMovieArtwork,
  movieImageFallback,
  normalizeMovieImageUrl,
  normalizeMovieMedia,
} from "@/features/movies/services/movieMedia";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { requestJson } from "@/shared/services/httpClient";
import { readPreferredCity, subscribePreferredCity } from "@/shared/services/cityPreference";
import { createSearchIndex, joinSearchFields, searchEntries } from "@/shared/services/flexSearch";

const allFilterValue = "All";
const sortOptions = ["Release date", "Popularity", "A-Z"];
const initialVisibleMovieLimit = 60;
const visibleMovieIncrement = 40;
const bundledComingSoonById = new Map(
  fallbackMovies
    .map(normalizeMovieMedia)
    .flatMap((movie) =>
      [movie.id, movie.movieId, movie.title]
        .filter(Boolean)
        .map((key) => [normalizeText(key), movie]),
    ),
);

const Route = createFileRoute("/coming-soon")({
  loader: () => fetchComingSoonMovies(readPreferredCity()),
  validateSearch: (search) => ({
    q: typeof search.q === "string" ? search.q : "",
    genre: typeof search.genre === "string" ? search.genre : allFilterValue,
    language: typeof search.language === "string" ? search.language : allFilterValue,
    format: typeof search.format === "string" ? search.format : allFilterValue,
    month: typeof search.month === "string" ? search.month : allFilterValue,
    sort: typeof search.sort === "string" ? search.sort : "Release date",
  }),
  component: ComingSoonPage,
});

function ComingSoonPage() {
  const loadedMovies = Route.useLoaderData();
  const initialSearch = Route.useSearch();
  const [selectedCity, setSelectedCity] = useState(readPreferredCity);
  const [comingSoonMovies, setComingSoonMovies] = useState(loadedMovies);
  const [loadedCity, setLoadedCity] = useState(readPreferredCity);
  const [searchTerm, setSearchTerm] = useState(initialSearch.q || "");
  const [activeGenre, setActiveGenre] = useState(initialSearch.genre || allFilterValue);
  const [activeLanguage, setActiveLanguage] = useState(initialSearch.language || allFilterValue);
  const [activeFormat, setActiveFormat] = useState(initialSearch.format || allFilterValue);
  const [activeMonth, setActiveMonth] = useState(initialSearch.month || allFilterValue);
  const [sortBy, setSortBy] = useState(
    sortOptions.includes(initialSearch.sort) ? initialSearch.sort : "Release date",
  );
  const [notifiedIds, setNotifiedIds] = useState(() => new Set());
  const [activeSlide, setActiveSlide] = useState(0);
  const [visibleMovieLimit, setVisibleMovieLimit] = useState(initialVisibleMovieLimit);
  const deferredSearchTerm = useDeferredValue(searchTerm);

  useEffect(() => subscribePreferredCity(setSelectedCity), []);

  useEffect(() => {
    setSearchTerm(initialSearch.q || "");
    setActiveGenre(initialSearch.genre || allFilterValue);
    setActiveLanguage(initialSearch.language || allFilterValue);
    setActiveFormat(initialSearch.format || allFilterValue);
    setActiveMonth(initialSearch.month || allFilterValue);
    setSortBy(sortOptions.includes(initialSearch.sort) ? initialSearch.sort : "Release date");
  }, [initialSearch]);

  useEffect(() => {
    if (normalizeText(selectedCity) === normalizeText(loadedCity)) return undefined;

    let active = true;
    fetchComingSoonMovies(selectedCity).then((movies) => {
      if (active) {
        setComingSoonMovies(movies);
        setLoadedCity(selectedCity);
      }
    });
    return () => {
      active = false;
    };
  }, [loadedCity, selectedCity]);

  const cityVisibleMovies = useMemo(
    () =>
      comingSoonMovies.filter(
        (movie) =>
          !selectedCity ||
          !movie.cities?.length ||
          movie.cities.some((city) => normalizeText(city) === normalizeText(selectedCity)),
      ),
    [comingSoonMovies, selectedCity],
  );
  const genres = useMemo(
    () => [allFilterValue, ...unique(cityVisibleMovies.flatMap((movie) => getMovieGenres(movie)))],
    [cityVisibleMovies],
  );
  const languages = useMemo(
    () => [
      allFilterValue,
      ...unique(cityVisibleMovies.flatMap((movie) => getMovieLanguages(movie))),
    ],
    [cityVisibleMovies],
  );
  const formats = useMemo(
    () => [allFilterValue, ...unique(cityVisibleMovies.flatMap((movie) => getMovieFormats(movie)))],
    [cityVisibleMovies],
  );
  const months = useMemo(
    () => [
      allFilterValue,
      ...unique(cityVisibleMovies.map((movie) => movie.monthBucket).filter(Boolean)),
    ],
    [cityVisibleMovies],
  );
  const comingSoonSearchIndex = useMemo(
    () =>
      createSearchIndex(
        cityVisibleMovies.map((movie) => ({
          id: movie.movieId || movie.id,
          item: movie,
          title: movie.title,
          searchText: buildComingSoonSearchText(movie),
          type: "coming-soon",
        })),
      ),
    [cityVisibleMovies],
  );

  const filteredMovies = useMemo(() => {
    const searchFilteredMovies = deferredSearchTerm.trim()
      ? searchEntries(comingSoonSearchIndex, deferredSearchTerm, {
          limit: cityVisibleMovies.length || initialVisibleMovieLimit,
        }).map((entry) => entry.item)
      : cityVisibleMovies;

    const filtered = searchFilteredMovies.filter((movie) => {
      const genres = getMovieGenres(movie);
      const languages = getMovieLanguages(movie);
      const formats = getMovieFormats(movie);
      const genreMatch = activeGenre === allFilterValue || genres.includes(activeGenre);
      const languageMatch = activeLanguage === allFilterValue || languages.includes(activeLanguage);
      const formatMatch = activeFormat === allFilterValue || formats.includes(activeFormat);
      const monthMatch = activeMonth === allFilterValue || movie.monthBucket === activeMonth;
      return genreMatch && languageMatch && formatMatch && monthMatch;
    });

    return [...filtered].sort((left, right) => {
      if (sortBy === "A-Z") return left.title.localeCompare(right.title);
      if (sortBy === "Popularity") {
        return (
          parseVoteCount(right.votes ?? right.votesText) -
          parseVoteCount(left.votes ?? left.votesText)
        );
      }
      return getReleaseTime(left) - getReleaseTime(right);
    });
  }, [
    activeFormat,
    activeGenre,
    activeLanguage,
    activeMonth,
    comingSoonSearchIndex,
    cityVisibleMovies,
    deferredSearchTerm,
    sortBy,
  ]);
  const visibleFilteredMovies = useMemo(
    () => filteredMovies.slice(0, visibleMovieLimit),
    [filteredMovies, visibleMovieLimit],
  );

  const bannerMovies = useMemo(
    () => buildBannerMovies(filteredMovies.length ? filteredMovies : cityVisibleMovies),
    [cityVisibleMovies, filteredMovies],
  );
  const featured =
    bannerMovies[activeSlide % Math.max(bannerMovies.length, 1)] ??
    filteredMovies[0] ??
    cityVisibleMovies[0] ??
    comingSoonMovies[0];
  const activeFilterCount = [
    searchTerm.trim().length > 0,
    activeGenre !== allFilterValue,
    activeLanguage !== allFilterValue,
    activeFormat !== allFilterValue,
    activeMonth !== allFilterValue,
    sortBy !== "Release date",
  ].filter(Boolean).length;
  const releaseMonths = unique(cityVisibleMovies.map((movie) => movie.monthBucket).filter(Boolean));

  useEffect(() => {
    setVisibleMovieLimit(initialVisibleMovieLimit);
  }, [
    activeFormat,
    activeGenre,
    activeLanguage,
    activeMonth,
    cityVisibleMovies.length,
    deferredSearchTerm,
    selectedCity,
    sortBy,
  ]);

  useEffect(() => {
    setActiveSlide(0);
  }, [bannerMovies.length, selectedCity]);

  useEffect(() => {
    if (bannerMovies.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % bannerMovies.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, [bannerMovies.length]);

  const clearFilters = () => {
    setSearchTerm("");
    setActiveGenre(allFilterValue);
    setActiveLanguage(allFilterValue);
    setActiveFormat(allFilterValue);
    setActiveMonth(allFilterValue);
    setSortBy("Release date");
  };

  const toggleNotify = (movieId) => {
    setNotifiedIds((current) => {
      const next = new Set(current);
      if (next.has(movieId)) next.delete(movieId);
      else next.add(movieId);
      return next;
    });
  };

  if (!featured) return null;

  return (
    <main className="bg-[radial-gradient(circle_at_top_left,color-mix(in_oklch,var(--primary)_12%,transparent),transparent_30%),linear-gradient(180deg,color-mix(in_oklch,var(--secondary)_55%,transparent),var(--background)_520px)] pb-12 dark:bg-[radial-gradient(circle_at_top_left,color-mix(in_oklch,var(--primary)_18%,transparent),transparent_32%),linear-gradient(180deg,color-mix(in_oklch,var(--card)_78%,transparent),var(--background)_560px)]">
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
              <CalendarClock className="h-3.5 w-3.5" />
              {selectedCity} upcoming releases
            </span>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-foreground md:text-6xl">
              Coming soon in {selectedCity}
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-foreground/80 dark:text-muted-foreground">
              Explore upcoming releases, filter by details and set reminders before bookings open.
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold">
              <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-primary">
                {cityVisibleMovies.length} upcoming movies
              </span>
              <span className="rounded-full border border-border/60 bg-card/75 px-3 py-1.5">
                {filteredMovies.length} matching now
              </span>
              <span className="rounded-full border border-border/60 bg-card/75 px-3 py-1.5">
                {releaseMonths.slice(0, 2).join(" + ") || "Release calendar"}
              </span>
            </div>
          </div>

          <div className="hidden overflow-hidden rounded-lg border border-white/60 bg-white/25 p-2 shadow-2xl shadow-primary/10 backdrop-blur dark:border-white/15 dark:bg-white/8 lg:block">
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
                <CalendarDays className="h-4 w-4 text-primary" />
                {featured.releaseDate}
              </span>
            </div>
            <div className="p-2">
              <p className="line-clamp-1 text-sm font-extrabold">{featured.title}</p>
              <p className="mt-1 truncate text-xs text-muted-foreground">{featured.category}</p>
            </div>
          </div>

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
        </div>
      </section>

      <section className="mx-auto -mt-6 max-w-[1560px] px-4 sm:px-5 lg:px-6">
        <div className="relative overflow-hidden rounded-xl border border-primary/15 bg-gradient-to-r from-card/95 via-background/95 to-primary/8 p-4 shadow-2xl shadow-black/8 backdrop-blur dark:from-card/92 dark:via-background/90 dark:to-primary/10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_92%_14%,color-mix(in_oklch,var(--primary)_18%,transparent),transparent_30%)]" />
          <div className="relative grid gap-3 lg:grid-cols-3 2xl:grid-cols-[1.35fr_repeat(5,minmax(0,0.78fr))]">
            <label className="relative block min-w-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search upcoming movies, genres, formats..."
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
            <ComingSoonFilter
              icon={Film}
              title="Genre"
              value={activeGenre}
              detail={activeGenre === allFilterValue ? `+${genres.length - 1}` : ""}
              options={genres}
              onChange={setActiveGenre}
            />
            <ComingSoonFilter
              icon={Languages}
              title="Language"
              value={activeLanguage}
              detail={activeLanguage === allFilterValue ? `+${languages.length - 1}` : ""}
              options={languages}
              onChange={setActiveLanguage}
            />
            <ComingSoonFilter
              icon={Ticket}
              title="Format"
              value={activeFormat}
              detail={activeFormat === allFilterValue ? `+${formats.length - 1}` : ""}
              options={formats}
              onChange={setActiveFormat}
            />
            <ComingSoonFilter
              icon={CalendarDays}
              title="Month"
              value={activeMonth}
              detail={activeMonth === allFilterValue ? `+${months.length - 1}` : ""}
              options={months}
              onChange={setActiveMonth}
            />
            <ComingSoonFilter
              icon={SlidersHorizontal}
              title="Sort"
              value={sortBy}
              options={sortOptions}
              onChange={setSortBy}
            />
          </div>

          <div className="relative mt-3 flex flex-wrap items-center justify-end gap-3">
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
            <h2 className="text-2xl font-extrabold tracking-tight">Release calendar</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Showing {visibleFilteredMovies.length} of {filteredMovies.length} matches for{" "}
              {selectedCity}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-bold">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/75 px-3 py-1.5">
              <Flame className="h-3.5 w-3.5 text-primary" />
              Early interest
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/75 px-3 py-1.5">
              <Bell className="h-3.5 w-3.5 text-primary" />
              Notify-ready
            </span>
          </div>
        </div>

        {filteredMovies.length ? (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {visibleFilteredMovies.map((movie) => (
                <ComingSoonMovieCard
                  key={movie.id}
                  movie={movie}
                  notified={notifiedIds.has(movie.id)}
                  onToggleNotify={() => toggleNotify(movie.id)}
                />
              ))}
            </div>
            {visibleFilteredMovies.length < filteredMovies.length ? (
              <div className="mt-7 flex justify-center">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setVisibleMovieLimit((current) => current + visibleMovieIncrement)}
                  className="rounded-full px-6"
                >
                  Show more movies
                </Button>
              </div>
            ) : null}
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-border/70 bg-card/70 p-10 text-center">
            <Search className="mx-auto h-8 w-8 text-primary" />
            <h3 className="mt-4 text-lg font-bold">No upcoming movies match these filters</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Clear filters or search another movie title.
            </p>
            <Button type="button" onClick={clearFilters} className="mt-5 rounded-full">
              Clear filters
            </Button>
          </div>
        )}
      </section>
    </main>
  );
}

function ComingSoonFilter({ icon: Icon, title, value, detail, options = [], onChange }) {
  const isActive = value !== allFilterValue && value !== "Release date";
  return (
    <label
      className={`group relative block min-h-[76px] overflow-hidden rounded-xl border p-2.5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
        isActive
          ? "border-primary/35 bg-primary/8 shadow-primary/10"
          : "border-border/60 bg-background/72 hover:border-primary/30"
      }`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,color-mix(in_oklch,var(--primary)_16%,transparent),transparent_34%)] opacity-80" />
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
              className={`h-3.5 w-3.5 shrink-0 ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
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

function ComingSoonMovieCard({ movie, notified, onToggleNotify }) {
  const genres = getMovieGenres(movie);
  const formats = getMovieFormats(movie);
  const cast = (movie.cast ?? []).slice(0, 7);
  const detailId = movie.movieId || movie.id;

  return (
    <article className="group overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl">
      <Link to="/coming-soon/$id" params={{ id: detailId }} preload="intent" className="block">
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
          <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2">
            <span className="inline-flex max-w-[72%] items-center gap-1 rounded-md bg-black/70 px-2 py-1 text-[10px] font-bold text-white backdrop-blur">
              <Clapperboard className="h-3 w-3 text-primary" />
              <span className="truncate">{movie.category}</span>
            </span>
            <span className="rounded-md bg-background/90 px-2 py-1 text-[10px] font-extrabold text-foreground shadow-sm backdrop-blur">
              {movie.certificate || "UA"}
            </span>
          </div>
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/38 to-transparent p-3 text-white">
            <span className="inline-flex items-center gap-1 rounded-md bg-black/55 px-2 py-1 text-xs font-bold backdrop-blur">
              <CalendarDays className="h-3.5 w-3.5 text-primary" />
              {movie.releaseDate}
            </span>
          </div>
        </div>
      </Link>

      <div className="p-3.5">
        <Link
          to="/coming-soon/$id"
          params={{ id: detailId }}
          preload="intent"
          className="block hover:text-primary"
        >
          <h3 className="line-clamp-2 min-h-11 text-[15px] font-extrabold leading-[22px]">
            {movie.title}
          </h3>
        </Link>
        <p className="mt-1.5 truncate text-xs text-muted-foreground">
          {genres.slice(0, 3).join(" - ")}
        </p>
        {cast.length ? (
          <p className="mt-3 min-h-4 truncate text-[11px] font-semibold text-muted-foreground">
            {cast.map((member) => member.name).join(", ")}
          </p>
        ) : null}
        <div className="mt-3 flex items-center justify-between gap-2 text-[11px] font-bold text-muted-foreground">
          <span className="inline-flex min-w-0 items-center gap-1">
            <Star className="h-3.5 w-3.5 shrink-0 fill-primary text-primary" />
            <span className="truncate">{movie.votes || "New"} interested</span>
          </span>
          <span className="shrink-0 rounded-full bg-primary/10 px-2 py-1 text-primary">
            {formats[0] || "2D"}
          </span>
        </div>
        <Button
          type="button"
          variant={notified ? "secondary" : "default"}
          onClick={onToggleNotify}
          className="mt-3 h-9 w-full gap-2 rounded-full text-xs"
        >
          {notified ? <Check className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
          {notified ? "Reminder set" : "Notify me"}
        </Button>
        <Button
          asChild
          type="button"
          variant="ghost"
          className="mt-2 h-9 w-full rounded-full text-xs"
        >
          <Link to="/coming-soon/$id" params={{ id: detailId }} preload="intent">
            View details
          </Link>
        </Button>
      </div>
    </article>
  );
}

function buildComingSoonSearchText(movie) {
  return joinSearchFields(
    movie.title,
    movie.movie,
    movie.description,
    movie.category,
    movie.releaseDate,
    movie.releaseAt,
    movie.duration,
    movie.certificate,
    movie.votes,
    movie.votesText,
    getMovieGenres(movie),
    getMovieLanguages(movie),
    getMovieFormats(movie),
    getMovieCastSearchFields(movie),
    movie.cities,
    movie.theaters,
  );
}

function getMovieCastSearchFields(movie) {
  if (!Array.isArray(movie.cast)) return [];
  return movie.cast.flatMap((member) => {
    if (typeof member === "string") return member;
    return [member.name, member.role, member.character];
  });
}

async function fetchComingSoonMovies(city = "") {
  const query = city ? `?city=${encodeURIComponent(city)}` : "";
  try {
    const data = await requestJson(`/api/shows/coming-soon${query}`, { timeoutMs: 8000 });
    if (data.movies?.length) return data.movies.map(normalizeComingSoonMovie);
  } catch {
    // Local static builds fall back to the bundled movie catalog.
  }

  return buildFallbackComingSoon(fallbackMovies, city).map(normalizeComingSoonMovie);
}

function buildFallbackComingSoon(catalog, city) {
  const source = catalog.length ? catalog : fallbackMovies;
  return source.map((movie, index) => {
    const releaseAt = resolveCatalogReleaseAt(movie, index);
    const normalized = normalizeMovieMedia(movie);
    return {
      ...normalized,
      id: `coming-soon-${normalized.id}`,
      movieId: normalized.id,
      releaseAt,
      releaseDate: displayCatalogReleaseDate(normalized.releaseDate, releaseAt),
      monthBucket: formatReleaseMonth(releaseAt),
      category: categorizeMovie(normalized),
      votes: normalized.votes || `${120 + index * 37}K`,
      cities: city ? [city] : ["Jabalpur", "Mumbai", "Delhi NCR", "Bengaluru"],
      theaters: ["PVR INOX", "Cinepolis", "MovieMax"].slice(0, 1 + (index % 3)),
    };
  });
}

function normalizeComingSoonMovie(movie) {
  const normalized = normalizeMovieMedia(movie);
  const bundled = findBundledComingSoonMovie(normalized);
  const poster = shouldUseBundledImage(normalized.poster, bundled?.poster)
    ? bundled.poster
    : normalized.poster;
  const backdrop = shouldUseBundledImage(normalized.backdrop, bundled?.backdrop)
    ? bundled.backdrop
    : normalized.backdrop;
  const releaseAt = normalizeDateInput(normalized.releaseAt || normalized.date);
  const releaseDate =
    normalized.releaseDate && normalized.releaseDate !== "Coming soon"
      ? normalized.releaseDate
      : formatReleaseDate(releaseAt);

  return {
    ...normalized,
    poster,
    backdrop,
    id: normalized.id || normalized.movieId,
    movieId: normalized.movieId || normalized.id,
    title: normalized.title || normalized.movie || "Untitled movie",
    genres: getMovieGenres(normalized),
    languages: getMovieLanguages(normalized),
    formats: getMovieFormats(normalized),
    releaseAt,
    releaseDate,
    monthBucket: normalized.monthBucket || formatReleaseMonth(releaseAt),
    category: normalized.category || categorizeMovie(normalized),
    cities: Array.isArray(normalized.cities) ? normalized.cities : toFilterList(normalized.city),
    theaters: Array.isArray(normalized.theaters)
      ? normalized.theaters
      : toFilterList(normalized.theater),
    votes: normalized.votes || normalized.votesText || "New",
  };
}

function findBundledComingSoonMovie(movie) {
  return (
    bundledComingSoonById.get(normalizeText(movie.id)) ||
    bundledComingSoonById.get(normalizeText(movie.movieId)) ||
    bundledComingSoonById.get(normalizeText(movie.title))
  );
}

function shouldUseBundledImage(remoteImage, bundledImage) {
  return Boolean(
    bundledImage &&
    !isFallbackMovieArtwork(bundledImage) &&
    (!remoteImage || isFallbackMovieArtwork(remoteImage)),
  );
}

function buildBannerMovies(list) {
  return [...list].sort((left, right) => getReleaseTime(left) - getReleaseTime(right)).slice(0, 4);
}

function categorizeMovie(movie) {
  const genres = getMovieGenres(movie).map(normalizeText);
  const formats = getMovieFormats(movie).map(normalizeText);
  if (formats.some((format) => ["imax", "4dx", "laser"].includes(format))) return "Premium formats";
  if (genres.some((genre) => ["animation", "comedy", "family", "fantasy"].includes(genre))) {
    return "Family";
  }
  if (genres.some((genre) => ["biography", "drama", "history"].includes(genre))) {
    return "Critics' picks";
  }
  if (
    genres.some((genre) => ["action", "adventure", "sci-fi", "thriller", "crime"].includes(genre))
  ) {
    return "Blockbusters";
  }
  return "New releases";
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

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
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

function futureIsoDate(offsetDays) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function resolveCatalogReleaseAt(movie, index) {
  const releaseAt = String(movie.releaseAt || movie.date || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(releaseAt)) return releaseAt;
  return futureIsoDate(10 + index * 6);
}

function displayCatalogReleaseDate(value, releaseAt) {
  const label = String(value || "").trim();
  if (label && label !== "2026" && label !== "2026+" && label !== "Coming soon") return label;
  return formatReleaseDate(releaseAt);
}

function normalizeDateInput(value) {
  const raw = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return futureIsoDate(14);
}

function formatReleaseDate(value) {
  const date = new Date(`${normalizeDateInput(value)}T00:00:00`);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatReleaseMonth(value) {
  const date = new Date(`${normalizeDateInput(value)}T00:00:00`);
  return date.toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
  });
}

function getReleaseTime(movie) {
  return new Date(`${normalizeDateInput(movie.releaseAt)}T00:00:00`).getTime();
}

export { Route };
