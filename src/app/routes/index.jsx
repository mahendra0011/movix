import { Link, useLoaderData } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePageMeta } from "@/shared/hooks/usePageMeta";
import {
  ArrowRight,
  BadgePercent,
  BellRing,
  BookOpen,
  CalendarDays,
  CarFront,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
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
import {
  comingSoonMovies,
  movies as fallbackMovies,
  theaters,
} from "@/features/movies/data/movieCatalog";
import {
  isFallbackMovieArtwork,
  movieImageFallback,
  normalizeMovieImageUrl,
  normalizeMovieMedia,
} from "@/features/movies/services/movieMedia";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { baseRequest, HAS_CONFIGURED_API_URL } from "@/features/api/baseApi";
import {
  readHomeSearchQuery,
  subscribeHomeSearchQuery,
  writeHomeSearchQuery,
} from "@/shared/services/homeSearch";
import { useSelector } from "react-redux";
import { createSearchIndex, joinSearchFields, searchEntries } from "@/shared/services/flexSearch";

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
  "https://res.cloudinary.com/dfmetzhrk/image/upload/f_auto,q_auto,w_1280,h_720,c_fill/v1780146462/movix/cinema-artwork/cinema-1.jpg",
  "https://res.cloudinary.com/dfmetzhrk/image/upload/f_auto,q_auto,w_1280,h_720,c_fill/v1780146463/movix/cinema-artwork/cinema-2.jpg",
  "https://res.cloudinary.com/dfmetzhrk/image/upload/f_auto,q_auto,w_1280,h_720,c_fill/v1780146464/movix/cinema-artwork/cinema-3.jpg",
  "https://res.cloudinary.com/dfmetzhrk/image/upload/f_auto,q_auto,w_1280,h_720,c_fill/v1780146465/movix/cinema-artwork/cinema-4.jpg",
];

const allFilterValue = "All";
const excludedHeroMovieIds = new Set(["i-love-boosters"]);
const recommendedPageSize = 6;
const recommendedSlideDurationMs = 640;
const sortOptions = ["Popularity", "Rating", "A-Z"];
const homeSearchResultLimit = 120;
const homeSearchMovieLimit = 24;
const homeSearchComingSoonLimit = 24;
const homeSearchCinemaLimit = 12;
const bundledComingSoonById = new Map(
  comingSoonMovies
    .map(normalizeMovieMedia)
    .flatMap((movie) =>
      [movie.id, movie.movieId, movie.title]
        .filter(Boolean)
        .map((key) => [normalizeHomeText(key), movie]),
    ),
);

function Home() {
  usePageMeta({ title: "Now Showing", description: "Browse movies now playing in your city." });
  const loadedMovies = useLoaderData() ?? [];
  const catalog = loadedMovies.length > 0 ? loadedMovies : fallbackMovies;
  const [query, setQuery] = useState(readHomeSearchQuery);
  const selectedCity = useSelector((state) => state.city.selectedCity);
  const [cinemaCatalog, setCinemaCatalog] = useState(theaters);
  const [activeGenre, setActiveGenre] = useState(allFilterValue);
  const [activeLanguage, setActiveLanguage] = useState(allFilterValue);
  const [activeFormat, setActiveFormat] = useState(allFilterValue);
  const [sortBy, setSortBy] = useState("Popularity");
  const [activeHeroSlide, setActiveHeroSlide] = useState(0);
  const [recommendedPage, setRecommendedPage] = useState(0);
  const [recommendedTransition, setRecommendedTransition] = useState(null);
  const [recommendedDrag, setRecommendedDrag] = useState(null);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterMessage, setNewsletterMessage] = useState("");
  const [newsletterBusy, setNewsletterBusy] = useState(false);
  const recommendedCarouselRef = useRef(null);
  const recommendedDragRef = useRef(null);
  const recommendedSuppressClickRef = useRef(false);
  const [homeComingSoonMovies, setHomeComingSoonMovies] = useState(() =>
    comingSoonMovies.map(normalizeHomeComingSoonMovie),
  );
  const [globalComingSoonMovies, setGlobalComingSoonMovies] = useState(() =>
    comingSoonMovies.map(normalizeHomeComingSoonMovie),
  );

  useEffect(() => subscribeHomeSearchQuery(setQuery), []);

  useEffect(() => {
    let active = true;

    baseRequest("/api/theaters", { timeoutMs: 8000 })
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

    baseRequest("/api/shows/coming-soon", { timeoutMs: 8000 })
      .then((data) => {
        if (active && data.movies?.length) {
          setGlobalComingSoonMovies(data.movies.map(normalizeHomeComingSoonMovie));
        }
      })
      .catch(() => {
        if (active) setGlobalComingSoonMovies(comingSoonMovies.map(normalizeHomeComingSoonMovie));
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const query = selectedCity ? `?city=${encodeURIComponent(selectedCity)}` : "";

    baseRequest(`/api/shows/coming-soon${query}`, { timeoutMs: 8000 })
      .then((data) => {
        if (active && data.movies?.length) {
          setHomeComingSoonMovies(data.movies.map(normalizeHomeComingSoonMovie));
        }
      })
      .catch(() => {
        if (active) setHomeComingSoonMovies(comingSoonMovies.map(normalizeHomeComingSoonMovie));
      });

    return () => {
      active = false;
    };
  }, [selectedCity]);

  const cityListedMovies = useMemo(
    () => buildCityMovieCatalog(catalog, selectedCity, cinemaCatalog),
    [catalog, cinemaCatalog, selectedCity],
  );
  const hasLiveMovies = cityListedMovies.length > 0;
  const homeDisplayMovies = hasLiveMovies ? cityListedMovies : homeComingSoonMovies;
  const topMovies = useMemo(() => buildTopMovies(homeDisplayMovies), [homeDisplayMovies]);
  const genres = useMemo(
    () => [
      allFilterValue,
      ...Array.from(new Set(homeDisplayMovies.flatMap((movie) => getMovieGenres(movie)))),
    ],
    [homeDisplayMovies],
  );
  const languages = useMemo(
    () => Array.from(new Set(homeDisplayMovies.flatMap((movie) => getMovieLanguages(movie)))),
    [homeDisplayMovies],
  );
  const formats = useMemo(
    () => Array.from(new Set(homeDisplayMovies.flatMap((movie) => getMovieFormats(movie)))),
    [homeDisplayMovies],
  );
  const languageOptions = useMemo(() => [allFilterValue, ...languages], [languages]);
  const formatOptions = useMemo(() => [allFilterValue, ...formats], [formats]);
  const hasActiveFilters =
    activeGenre !== allFilterValue ||
    activeLanguage !== allFilterValue ||
    activeFormat !== allFilterValue ||
    sortBy !== "Popularity";
  const visibleMovies = useMemo(() => {
    const filtered = homeDisplayMovies.filter((movie) => {
      const movieGenres = getMovieGenres(movie);
      const movieLanguages = getMovieLanguages(movie);
      const movieFormats = getMovieFormats(movie);
      const genreMatch = activeGenre === allFilterValue || movieGenres.includes(activeGenre);
      const languageMatch =
        activeLanguage === allFilterValue || movieLanguages.includes(activeLanguage);
      const formatMatch = activeFormat === allFilterValue || movieFormats.includes(activeFormat);
      return genreMatch && languageMatch && formatMatch;
    });

    return [...filtered].sort((left, right) => {
      if (sortBy === "Rating") return Number(right.rating || 0) - Number(left.rating || 0);
      if (sortBy === "A-Z") return left.title.localeCompare(right.title);
      return (
        parseVoteCount(right.votes ?? right.votesText) -
        parseVoteCount(left.votes ?? left.votesText)
      );
    });
  }, [activeFormat, activeGenre, activeLanguage, homeDisplayMovies, sortBy]);
  const heroMoviePool = (hasActiveFilters ? visibleMovies : homeDisplayMovies).filter(
    isHeroMovieAllowed,
  );
  const featured =
    heroMoviePool[activeHeroSlide % Math.max(heroMoviePool.length, 1)] ?? heroMoviePool[0] ?? null;
  const heroUsesComingSoon = !hasLiveMovies && Boolean(featured);
  const heroTitle =
    featured?.title ??
    (hasActiveFilters ? `Filtered movies in ${selectedCity}` : `Movies in ${selectedCity}`);
  const heroDescription =
    featured?.description ??
    (hasActiveFilters
      ? "No movies match these filters yet. Choose All in genres, languages, or format to see more movies."
      : "Released movies will appear here after theater owners publish live show timings.");
  const heroBackdrop = featured
    ? normalizeMovieImageUrl(featured.backdrop || featured.poster, featured.title, "backdrop")
    : movieImageFallback(`movix ${selectedCity} movies`, "backdrop");

  const recommendedPool = useMemo(
    () => (hasActiveFilters ? visibleMovies : buildRecommendedMovies(visibleMovies)),
    [hasActiveFilters, visibleMovies],
  );
  const recommendedPageCount = Math.max(1, Math.ceil(recommendedPool.length / recommendedPageSize));
  const activeRecommendedPage = Math.min(recommendedPage, recommendedPageCount - 1);
  const recommended = getCarouselPageItems(
    recommendedPool,
    activeRecommendedPage,
    recommendedPageSize,
  );
  const canSlideRecommended = recommendedPool.length > recommendedPageSize;
  const isRecommendedDragging = Boolean(recommendedDrag);
  const isRecommendedAnimating = Boolean(recommendedTransition || recommendedDrag);
  const getRecommendedViewportWidth = () =>
    Math.max(1, Math.round(recommendedCarouselRef.current?.getBoundingClientRect().width || 1));
  const getRecommendedPageForDirection = (page, direction) =>
    direction === "previous"
      ? page === 0
        ? recommendedPageCount - 1
        : page - 1
      : (page + 1) % recommendedPageCount;
  const startRecommendedTransition = (direction) => {
    if (!canSlideRecommended || isRecommendedAnimating) return;

    const fromPage = activeRecommendedPage;
    const toPage = getRecommendedPageForDirection(fromPage, direction);

    const key = `${fromPage}-${toPage}-${direction}-${Date.now()}`;

    setRecommendedTransition({
      direction,
      fromPage,
      isSliding: false,
      key,
      toPage,
      width: getRecommendedViewportWidth(),
    });
    setRecommendedPage(toPage);

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        setRecommendedTransition((current) =>
          current?.key === key ? { ...current, isSliding: true } : current,
        );
      });
    });

    window.setTimeout(() => {
      setRecommendedTransition((current) => (current?.key === key ? null : current));
    }, recommendedSlideDurationMs + 100);
  };
  const showPreviousRecommended = () => {
    startRecommendedTransition("previous");
  };
  const showNextRecommended = () => {
    startRecommendedTransition("next");
  };
  const recommendedTransitionPanels = recommendedTransition
    ? {
        from: getCarouselPageItems(
          recommendedPool,
          recommendedTransition.fromPage,
          recommendedPageSize,
        ),
        to: getCarouselPageItems(
          recommendedPool,
          recommendedTransition.toPage,
          recommendedPageSize,
        ),
      }
    : null;
  const recommendedDragPanels = recommendedDrag?.direction
    ? {
        from: getCarouselPageItems(recommendedPool, activeRecommendedPage, recommendedPageSize),
        to: getCarouselPageItems(
          recommendedPool,
          getRecommendedPageForDirection(activeRecommendedPage, recommendedDrag.direction),
          recommendedPageSize,
        ),
      }
    : null;
  const recommendedDragTransform = recommendedDrag?.direction
    ? getRecommendedDragTransform(recommendedDrag)
    : "";
  const beginRecommendedDrag = (event) => {
    if (
      !canSlideRecommended ||
      isRecommendedAnimating ||
      (event.pointerType === "mouse" && event.button !== 0)
    ) {
      return;
    }

    const width = getRecommendedViewportWidth();
    const key = `drag-${activeRecommendedPage}-${Date.now()}`;
    recommendedDragRef.current = {
      deltaX: 0,
      direction: null,
      hasCapture: false,
      key,
      pointerId: event.pointerId,
      started: false,
      startX: event.clientX,
      width,
    };
  };
  const moveRecommendedDrag = (event) => {
    const drag = recommendedDragRef.current;
    if (!drag || recommendedDrag?.isSettling) return;

    const deltaX = clampNumber(event.clientX - drag.startX, -drag.width, drag.width);
    const direction = Math.abs(deltaX) < 4 ? null : deltaX < 0 ? "next" : "previous";
    drag.deltaX = deltaX;
    drag.direction = direction;
    if (!drag.started && !direction) return;

    if (!drag.started) {
      drag.started = true;
      event.currentTarget.setPointerCapture?.(event.pointerId);
      drag.hasCapture = true;
    }

    if (Math.abs(deltaX) > 8) event.preventDefault();

    setRecommendedDrag((current) =>
      current
        ? {
            ...current,
            deltaX,
            direction,
            width: drag.width,
          }
        : {
            deltaX,
            direction,
            isSettling: false,
            key: drag.key,
            settleTo: null,
            toPage: activeRecommendedPage,
            width: drag.width,
          },
    );
  };
  const endRecommendedDrag = (event) => {
    const drag = recommendedDragRef.current;
    if (!drag) return;

    if (drag.hasCapture) event.currentTarget.releasePointerCapture?.(drag.pointerId);
    recommendedDragRef.current = null;

    if (!drag.started) return;

    const deltaX = drag.deltaX;
    const direction = deltaX < 0 ? "next" : "previous";
    const dragDirection = drag.direction;
    const threshold = Math.min(150, Math.max(72, drag.width * 0.18));
    const shouldSlide = Math.abs(deltaX) >= threshold;
    const shouldSuppressClick = Math.abs(deltaX) > 8;

    if (shouldSuppressClick) {
      recommendedSuppressClickRef.current = true;
      window.setTimeout(() => {
        recommendedSuppressClickRef.current = false;
      }, 160);
    }

    if (!dragDirection) {
      setRecommendedDrag(null);
      return;
    }

    const toPage = shouldSlide
      ? getRecommendedPageForDirection(activeRecommendedPage, direction)
      : activeRecommendedPage;
    const key = drag.key;

    setRecommendedDrag((current) =>
      current
        ? {
            ...current,
            direction,
            isSettling: true,
            settleTo: shouldSlide ? "commit" : "cancel",
            toPage,
          }
        : {
            deltaX,
            direction,
            isSettling: true,
            key,
            settleTo: shouldSlide ? "commit" : "cancel",
            toPage,
            width: drag.width,
          },
    );

    window.setTimeout(() => {
      setRecommendedDrag((current) => {
        if (current?.key !== key) return current;
        if (current.settleTo === "commit") setRecommendedPage(current.toPage);
        return null;
      });
    }, recommendedSlideDurationMs + 100);
  };
  const cancelRecommendedDrag = (event) => {
    if (!recommendedDragRef.current) return;
    if (recommendedDragRef.current.hasCapture) {
      event.currentTarget.releasePointerCapture?.(recommendedDragRef.current.pointerId);
    }
    recommendedDragRef.current = null;
    setRecommendedDrag(null);
  };
  const stopRecommendedDragClick = (event) => {
    if (!recommendedSuppressClickRef.current) return;
    recommendedSuppressClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  };
  const moviesPageSearch = buildMoviesPageSearch({
    city: selectedCity,
    genre: activeGenre,
    language: activeLanguage,
    format: activeFormat,
    sort: sortBy,
  });
  const premieres = rotateMovies(homeDisplayMovies, 3).slice(0, 4);
  const comingSoon = rotateMovies(homeComingSoonMovies, 0).slice(0, 3);
  const topCinemas = buildTopCinemas(selectedCity, cinemaCatalog);
  const trimmedSearchQuery = query.trim();
  const showSearch = trimmedSearchQuery.length > 0;
  const globalSearchIndex = useMemo(
    () =>
      createSearchIndex(
        buildHomeSearchEntries({
          cinemaCatalog,
          comingSoonCatalog: globalComingSoonMovies,
          movieCatalog: catalog,
        }),
      ),
    [catalog, cinemaCatalog, globalComingSoonMovies],
  );
  const searchGroups = useMemo(() => {
    if (!showSearch) {
      return { cinemas: [], comingSoon: [], movies: [], total: 0 };
    }

    const results = searchEntries(globalSearchIndex, trimmedSearchQuery, {
      limit: homeSearchResultLimit,
    });

    return {
      cinemas: results
        .filter((entry) => entry.type === "cinema")
        .slice(0, homeSearchCinemaLimit)
        .map((entry) => entry.item),
      comingSoon: results
        .filter((entry) => entry.type === "coming-soon")
        .slice(0, homeSearchComingSoonLimit)
        .map((entry) => entry.item),
      movies: results
        .filter((entry) => entry.type === "movie")
        .slice(0, homeSearchMovieLimit)
        .map((entry) => entry.item),
      total: results.length,
    };
  }, [globalSearchIndex, showSearch, trimmedSearchQuery]);
  const hasSearchResults = Boolean(
    searchGroups.movies.length || searchGroups.comingSoon.length || searchGroups.cinemas.length,
  );

  useEffect(() => {
    setActiveHeroSlide(0);
  }, [
    activeFormat,
    activeGenre,
    activeLanguage,
    homeDisplayMovies.length,
    query,
    selectedCity,
    sortBy,
  ]);

  useEffect(() => {
    if (heroMoviePool.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setActiveHeroSlide((current) => (current + 1) % heroMoviePool.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [heroMoviePool.length]);

  useEffect(() => {
    setRecommendedTransition(null);
    setRecommendedPage(0);
  }, [recommendedPool]);

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
      const result = await baseRequest("/api/notifications/subscribe", {
        method: "POST",
        body: { email: newsletterEmail, source: "homepage" },
      });
      setNewsletterMessage(result.message ?? "You are subscribed.");
      setNewsletterEmail("");
    } catch (error) {
      setNewsletterMessage(error.response?.data?.error ?? "Subscription failed.");
    } finally {
      setNewsletterBusy(false);
    }
  };

  if (showSearch) {
    return (
      <main className="mx-auto max-w-[1560px] px-4 py-8 sm:px-5 lg:px-6">
        <section className="rounded-lg border border-border/70 bg-card/85 p-5 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Search results</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {searchGroups.movies.length} movies, {searchGroups.comingSoon.length} coming soon
                and {searchGroups.cinemas.length} cinemas for "{trimmedSearchQuery}"
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

          {hasSearchResults ? (
            <div className="mt-6 grid gap-7">
              {searchGroups.movies.length ? (
                <div>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h2 className="text-lg font-bold">Movies</h2>
                    <span className="text-xs font-semibold text-muted-foreground">
                      {searchGroups.movies.length} found
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                    {searchGroups.movies.map((movie) => (
                      <CompactMovieCard key={movie.id} movie={movie} />
                    ))}
                  </div>
                </div>
              ) : null}

              {searchGroups.comingSoon.length ? (
                <div>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h2 className="text-lg font-bold">Coming Soon</h2>
                    <span className="text-xs font-semibold text-muted-foreground">
                      {searchGroups.comingSoon.length} found
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                    {searchGroups.comingSoon.map((movie) => (
                      <CompactMovieCard key={movie.movieId || movie.id} movie={movie} />
                    ))}
                  </div>
                </div>
              ) : null}

              {searchGroups.cinemas.length ? (
                <div>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h2 className="text-lg font-bold">Cinemas</h2>
                    <span className="text-xs font-semibold text-muted-foreground">
                      {searchGroups.cinemas.length} found
                    </span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {searchGroups.cinemas.map((cinema) => (
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
          src={heroBackdrop}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-55 dark:opacity-28 hero-kenburns"
          onError={(event) => {
            event.currentTarget.src = movieImageFallback(heroTitle, "backdrop");
          }}
        />
        <div className="hero-sweep absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/65 to-background/10 dark:via-background/82 dark:to-background/35" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

        <div className="relative mx-auto grid min-h-[390px] max-w-[1560px] items-center gap-8 px-4 py-8 sm:px-5 md:min-h-[398px] md:grid-cols-[minmax(0,1fr)_330px] lg:px-6 xl:grid-cols-[minmax(0,1fr)_370px]">
          <div className="max-w-2xl hero-content-enter">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary shadow-sm backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              {heroUsesComingSoon
                ? "Coming soon spotlight"
                : featured
                  ? activeGenre !== allFilterValue
                    ? `${activeGenre} spotlight`
                    : hasActiveFilters
                      ? "Filtered spotlight"
                      : "Trending #1 This Week"
                  : "Released movies"}
            </span>
            <h1 className="mt-4 text-5xl font-extrabold leading-none tracking-tight text-foreground md:text-[64px]">
              {heroTitle}
            </h1>
            {featured ? (
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                <span className="inline-flex items-center gap-1.5 font-semibold">
                  <Star className="h-5 w-5 fill-primary text-primary" />
                  {featured.rating}/10
                </span>
                <span className="text-muted-foreground">{featured.votes ?? "New"} votes</span>
                <span className="h-4 w-px bg-border" />
                <span>{featured.certificate}</span>
                <span className="h-4 w-px bg-border" />
                <span>{featured.duration}</span>
              </div>
            ) : null}
            <p className="mt-4 max-w-xl text-base leading-7 text-foreground/80 dark:text-muted-foreground">
              {heroDescription}
            </p>
            {featured ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {getMovieGenres(featured)
                  .slice(0, 3)
                  .map((genre) => (
                    <span
                      key={genre}
                      className="rounded-md border border-border/70 bg-card/70 px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur"
                    >
                      {genre}
                    </span>
                  ))}
              </div>
            ) : null}
            <div className="mt-5 flex flex-wrap gap-3">
              <Button size="lg" asChild className="h-11 gap-2 px-7 shadow-lg shadow-primary/20">
                {heroUsesComingSoon ? (
                  <Link to="/coming-soon">
                    <CalendarDays className="h-4 w-4" />
                    View Coming Soon
                  </Link>
                ) : featured ? (
                  <Link to={"/movies/" + featured.id}>
                    <Ticket className="h-4 w-4" />
                    Book Tickets
                  </Link>
                ) : (
                  <Link to={"/movies?" + new URLSearchParams(moviesPageSearch || {}).toString()}>
                    <Ticket className="h-4 w-4" />
                    View Released Movies
                  </Link>
                )}
              </Button>
              {featured ? (
                <Button size="lg" variant="secondary" asChild className="h-11 gap-2 px-7">
                  <a href={trailerSearchUrl(featured.title)} target="_blank" rel="noreferrer">
                    <Play className="h-4 w-4" />
                    Watch Trailer
                  </a>
                </Button>
              ) : (
                <Button size="lg" variant="secondary" asChild className="h-11 gap-2 px-7">
                  <Link to="/coming-soon">
                    <CalendarDays className="h-4 w-4" />
                    Coming Soon
                  </Link>
                </Button>
              )}
            </div>
          </div>

          <div className="hidden justify-start md:flex">
            <div className="relative w-56 rounded-lg border border-white/60 bg-white/25 p-2 shadow-2xl shadow-primary/10 backdrop-blur dark:border-white/15 dark:bg-white/8 xl:w-64 hero-poster-float">
              {featured ? (
                <>
                  <img
                    src={normalizeMovieImageUrl(featured.poster, featured.title, "poster")}
                    alt={featured.title}
                    className="aspect-[2/3] w-full rounded-md object-cover"
                    onError={(event) => {
                      event.currentTarget.src = movieImageFallback(featured.title, "poster");
                    }}
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
                </>
              ) : (
                <div className="grid aspect-[2/3] place-items-center rounded-md bg-background/75 p-5 text-center">
                  <div>
                    <Film className="mx-auto h-12 w-12 text-primary" />
                    <p className="mt-4 text-sm font-bold text-foreground">No live shows yet</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Theater owners can publish released movies from their panel.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section
        id="movie-filters"
        className="scroll-mt-28 mx-auto -mt-5 max-w-[1560px] px-4 sm:px-5 lg:px-6"
      >
        <div className="grid gap-2 rounded-xl border border-primary/15 bg-gradient-to-r from-card/95 via-background/95 to-primary/8 p-2 shadow-2xl shadow-black/8 backdrop-blur dark:from-card/92 dark:via-background/90 dark:to-primary/10 md:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,0.72fr))_minmax(0,3.1fr)] surface-rise">
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
          <div className="relative min-w-0 overflow-hidden rounded-xl border border-border/60 bg-background/75 p-2 shadow-sm md:col-span-2 lg:col-span-1">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,color-mix(in_oklch,var(--primary)_18%,transparent),transparent_34%)]" />
            <div className="relative flex min-h-[62px] items-center gap-3">
              <div className="flex shrink-0 items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/12 text-primary">
                  <SlidersHorizontal className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground">
                    Quick
                  </p>
                  <p className="text-sm font-extrabold text-foreground">Filters</p>
                </div>
              </div>
              <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto rounded-xl border border-border/50 bg-card/85 p-1.5 shadow-inner">
                {genres.slice(0, 8).map((genre) => (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => setActiveGenre(genre)}
                    className={`h-8 shrink-0 whitespace-nowrap rounded-lg border px-3 text-xs font-bold transition-all ${
                      activeGenre === genre
                        ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                        : "border-border/50 bg-background/70 text-foreground hover:border-primary/35 hover:bg-primary/8 hover:text-primary"
                    }`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <HomeSection
        id="movies"
        title="Recommended for you"
        subtitle={
          heroUsesComingSoon
            ? `Curated picks from ${homeDisplayMovies.length} upcoming movies for ${selectedCity}`
            : `Curated picks from ${homeDisplayMovies.length} movies listed in ${selectedCity}`
        }
        icon={Star}
        actionSlot={
          <div className="flex shrink-0 items-center gap-2">
            {canSlideRecommended ? (
              <div className="flex items-center gap-1 rounded-full border border-border/60 bg-card/75 p-1 shadow-sm">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={showPreviousRecommended}
                  disabled={isRecommendedAnimating}
                  className="h-8 w-8 rounded-full"
                  aria-label="Previous recommended movies"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="min-w-9 text-center text-xs font-bold text-muted-foreground">
                  {activeRecommendedPage + 1}/{recommendedPageCount}
                </span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={showNextRecommended}
                  disabled={isRecommendedAnimating}
                  className="h-8 w-8 rounded-full"
                  aria-label="Next recommended movies"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            ) : null}
            {heroUsesComingSoon ? (
              <Link
                to="/coming-soon"
                className="inline-flex items-center gap-1 text-sm font-semibold text-primary"
              >
                See all <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <Link
                to={"/movies?" + new URLSearchParams(moviesPageSearch || {}).toString()}
                className="inline-flex items-center gap-1 text-sm font-semibold text-primary"
              >
                See all <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        }
        wide
      >
        {recommended.length ? (
          <div
            ref={recommendedCarouselRef}
            data-dragging={isRecommendedDragging ? "true" : "false"}
            className="recommended-carousel-viewport pb-2"
            onClickCapture={stopRecommendedDragClick}
            onPointerCancel={cancelRecommendedDrag}
            onPointerDown={beginRecommendedDrag}
            onPointerMove={moveRecommendedDrag}
            onPointerUp={endRecommendedDrag}
          >
            {recommendedTransition && recommendedTransitionPanels ? (
              <div
                key={recommendedTransition.key}
                data-direction={recommendedTransition.direction}
                className="recommended-carousel-track"
                style={{
                  transform:
                    recommendedTransition.direction === "next"
                      ? `translateX(${
                          recommendedTransition.isSliding ? -recommendedTransition.width : 0
                        }px)`
                      : `translateX(${
                          recommendedTransition.isSliding ? 0 : -recommendedTransition.width
                        }px)`,
                }}
                onTransitionEnd={(event) => {
                  if (event.currentTarget === event.target && event.propertyName === "transform") {
                    setRecommendedTransition(null);
                  }
                }}
              >
                {(recommendedTransition.direction === "next"
                  ? [recommendedTransitionPanels.from, recommendedTransitionPanels.to]
                  : [recommendedTransitionPanels.to, recommendedTransitionPanels.from]
                ).map((movies, index) => (
                  <div
                    key={`${recommendedTransition.key}-${index}`}
                    className="recommended-carousel-panel"
                  >
                    <RecommendedMovieGrid movies={movies} />
                  </div>
                ))}
              </div>
            ) : recommendedDrag?.direction && recommendedDragPanels ? (
              <div
                key={recommendedDrag.key}
                data-direction={recommendedDrag.direction}
                className="recommended-carousel-track"
                style={{
                  transform: recommendedDragTransform,
                  transition: recommendedDrag.isSettling ? undefined : "none",
                }}
                onTransitionEnd={(event) => {
                  if (event.currentTarget === event.target && event.propertyName === "transform") {
                    if (recommendedDrag.settleTo === "commit") {
                      setRecommendedPage(recommendedDrag.toPage);
                    }
                    setRecommendedDrag(null);
                  }
                }}
              >
                {(recommendedDrag.direction === "next"
                  ? [recommendedDragPanels.from, recommendedDragPanels.to]
                  : [recommendedDragPanels.to, recommendedDragPanels.from]
                ).map((movies, index) => (
                  <div
                    key={`${recommendedDrag.key}-${index}`}
                    className="recommended-carousel-panel"
                  >
                    <RecommendedMovieGrid movies={movies} />
                  </div>
                ))}
              </div>
            ) : (
              <RecommendedMovieGrid movies={recommended} />
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border/70 bg-card/70 p-8 text-center">
            <Search className="mx-auto h-7 w-7 text-primary" />
            <h3 className="mt-3 text-base font-semibold">
              {heroUsesComingSoon
                ? "Coming soon movies are loading"
                : "No movies match these filters"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {heroUsesComingSoon
                ? "Please refresh once the upcoming catalog finishes loading."
                : "Choose All in genres, languages, or format to see more movies."}
            </p>
          </div>
        )}
      </HomeSection>

      <section className="mx-auto mt-7 max-w-[1560px] px-4 sm:px-5 lg:px-6">
        <div className="grid gap-5 lg:grid-cols-3 stagger-row">
          {featureCards.map((card) => (
            <FeatureBanner key={card.title} card={card} />
          ))}
        </div>
      </section>

      <section className="mx-auto mt-7 grid max-w-[1560px] gap-5 px-4 sm:px-5 lg:grid-cols-[1.08fr_0.78fr_0.66fr] lg:px-6">
        <PanelCard
          id="top-movies"
          icon={Star}
          title="Top movies"
          subtitle="Highest rated films this week"
          actionLabel="See all"
        >
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 stagger-grid">
            {topMovies.length ? (
              topMovies.map((movie) => <MiniMovieTile key={movie.id} movie={movie} badge="TOP" />)
            ) : (
              <PanelEmptyState message="Top movies appear after released movies get live timings." />
            )}
          </div>
        </PanelCard>

        <PanelCard
          icon={CalendarDays}
          title="Coming soon"
          subtitle="Exciting movies heading your way"
          actionTo="/coming-soon"
        >
          <div className="mt-4 grid gap-2">
            {comingSoon.map((movie, index) => {
              const date = formatComingSoonPanelDate(movie, index);
              return (
                <Link
                  key={movie.movieId || movie.id}
                  to="/coming-soon"
                  className="grid grid-cols-[44px_1fr] gap-2 rounded-lg border border-border/60 bg-background/55 p-1.5 transition-colors hover:border-primary/40"
                >
                  <div className="grid h-11 place-items-center rounded-md bg-primary/10 text-center text-primary">
                    <span className="text-sm font-bold">{date.day}</span>
                    <span className="text-[10px] font-semibold">{date.month}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold leading-5">{movie.title}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {getMovieGenres(movie).slice(0, 3).join(" - ")}
                    </p>
                  </div>
                </Link>
              );
            })}
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

      {premieres.length ? <PremiereSpotlightSection movies={premieres} /> : null}

      <section className="mx-auto mt-5 grid max-w-[1560px] gap-5 px-4 sm:px-5 lg:grid-cols-[0.95fr_1.05fr] lg:px-6">
        <PanelCard
          icon={Quote}
          title="Loved by movie lovers"
          subtitle="Real reviews from real users"
        >
          <div className="mt-4 grid items-stretch gap-3 md:grid-cols-3 stagger-grid">
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
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 stagger-grid">
            {topCinemas.map((cinema, index) => (
              <CinemaCard
                key={cinema.name}
                cinema={cinema}
                image={cinema.image || cinemaImages[index % cinemaImages.length]}
              />
            ))}
          </div>
        </PanelCard>
      </section>

      <section className="mx-auto mt-7 max-w-[1560px] px-4 sm:px-5 lg:px-6">
        <div className="relative grid items-center gap-5 overflow-hidden rounded-lg border border-primary/20 bg-gradient-to-r from-primary/18 via-card to-amber-200/30 p-6 shadow-sm dark:from-primary/12 dark:via-card dark:to-amber-500/10 md:grid-cols-[auto_1fr_auto] surface-rise">
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
  const selectId = `home-filter-${toDomId(title)}`;
  return (
    <div
      className={`group relative overflow-hidden rounded-xl border p-2 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
        isActive
          ? "border-primary/35 bg-primary/8 shadow-primary/10"
          : "border-border/60 bg-background/72 hover:border-primary/30"
      }`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(20,184,166,0.16),transparent_34%)] opacity-80" />
      <div className="relative flex items-center gap-2">
        <div
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-colors ${
            isActive
              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
              : "bg-primary/12 text-primary"
          }`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <label
            htmlFor={selectId}
            className="block text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground"
          >
            {title}
          </label>
          <div className="mt-1 flex min-h-5 items-center gap-1.5">
            {detail ? (
              <span className="shrink-0 rounded-full bg-primary/12 px-1.5 py-0.5 text-[10px] font-extrabold text-primary">
                {detail} options
              </span>
            ) : (
              <span aria-hidden="true" className="text-[11px]">
                &nbsp;
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="relative mt-2">
        <select
          id={selectId}
          aria-label={title}
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          className="h-9 w-full cursor-pointer appearance-none rounded-lg border border-border/60 bg-card/90 px-3 pr-9 text-sm font-bold text-foreground shadow-inner outline-none transition-colors hover:border-primary/35 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <ChevronDown
          className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 ${
            isActive ? "text-primary" : "text-muted-foreground"
          }`}
        />
      </div>
    </div>
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
  actionSlot,
  onAction,
  children,
}) {
  return (
    <section id={id} className="mx-auto mt-7 max-w-[1560px] px-4 sm:px-5 lg:px-6 surface-rise">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div className="flex items-start gap-2">
          <Icon className="mt-1 h-5 w-5 text-primary" />
          <div>
            <h2 className="text-xl font-bold tracking-tight">{title}</h2>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        {actionSlot ??
          (onAction ? (
            <button
              type="button"
              onClick={onAction}
              className="inline-flex items-center gap-1 text-sm font-semibold text-primary"
            >
              {actionLabel} <ArrowRight className="h-4 w-4" />
            </button>
          ) : actionTo ? (
            <Link
              to={
                actionTo +
                (actionSearch ? "?" + new URLSearchParams(actionSearch || {}).toString() : "")
              }
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
          ) : null)}
      </div>
      {children}
    </section>
  );
}

function MovieCardLink({ movie, className, children }) {
  if (isComingSoonMovie(movie)) {
    const detailId = movie.movieId || movie.id;
    return (
      <Link to={"/coming-soon/" + detailId} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <Link to={"/movies/" + movie.id} className={className}>
      {children}
    </Link>
  );
}

function RecommendedMovieGrid({ movies }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 movie-grid-animate">
      {movies.map((movie) => (
        <CompactMovieCard key={movie.id} movie={movie} prominent />
      ))}
    </div>
  );
}

function CompactMovieCard({ movie, prominent = false }) {
  return (
    <MovieCardLink
      movie={movie}
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
          src={normalizeMovieImageUrl(movie.poster, movie.title, "poster")}
          alt={movie.title}
          draggable={false}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(event) => {
            event.currentTarget.src = movieImageFallback(movie.title, "poster");
          }}
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
          {getMovieGenres(movie).slice(0, 3).join(" - ")}
        </p>
      </div>
    </MovieCardLink>
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

function PanelCard({
  id,
  icon: Icon,
  title,
  subtitle,
  actionLabel = "See all",
  actionTo,
  children,
}) {
  return (
    <section
      id={id}
      className="rounded-lg border border-border/60 bg-card/88 p-4 shadow-sm backdrop-blur surface-rise"
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
        {actionTo ? (
          <Link to={actionTo} className="shrink-0 text-xs font-semibold text-primary">
            {actionLabel} <ChevronRight className="inline h-3.5 w-3.5" />
          </Link>
        ) : (
          <a
            href={id ? `#${id}` : "#movies"}
            className="shrink-0 text-xs font-semibold text-primary"
          >
            {actionLabel} <ChevronRight className="inline h-3.5 w-3.5" />
          </a>
        )}
      </div>
      {children}
    </section>
  );
}

function PanelEmptyState({ message }) {
  return (
    <div className="col-span-full rounded-lg border border-dashed border-border/70 bg-background/60 p-5 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function PremiereSpotlightSection({ movies }) {
  return (
    <section id="events" className="mx-auto mt-7 max-w-[1560px] px-4 sm:px-5 lg:px-6">
      <div className="mb-5 flex items-end justify-between gap-3 surface-rise">
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
  const poster = normalizeMovieImageUrl(movie.poster, movie.title, "poster");
  const backdrop = normalizeMovieImageUrl(movie.backdrop, movie.title, "backdrop", poster);

  return (
    <MovieCardLink
      movie={movie}
      className="group relative grid min-h-[176px] grid-cols-[92px_1fr] overflow-hidden rounded-lg border border-border/70 bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-lg sm:grid-cols-[118px_1fr]"
    >
      <img
        src={backdrop}
        alt=""
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover opacity-80 transition-transform duration-500 group-hover:scale-105"
        onError={(event) => {
          if (event.currentTarget.src !== poster) {
            event.currentTarget.src = poster;
            return;
          }
          event.currentTarget.src = movieImageFallback(movie.title, "backdrop");
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-background/92 via-background/76 to-background/12 dark:from-card/94 dark:via-card/72 dark:to-card/18" />
      <div className="absolute inset-0 bg-gradient-to-t from-background/30 via-transparent to-transparent dark:from-background/55" />

      <div className="relative z-10 flex items-center p-3 sm:p-5">
        <img
          src={poster}
          alt={movie.title}
          loading="lazy"
          className="h-28 w-20 rounded-md object-cover shadow-xl shadow-black/25 ring-1 ring-white/25 sm:h-32 sm:w-24"
          onError={(event) => {
            event.currentTarget.src = movieImageFallback(movie.title, "poster");
          }}
        />
      </div>
      <div className="relative z-10 flex min-w-0 flex-col justify-center py-4 pl-0 pr-4 sm:p-5 sm:pl-0">
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
    </MovieCardLink>
  );
}

function MiniMovieTile({ movie, badge }) {
  return (
    <MovieCardLink movie={movie} className="group block">
      <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-muted">
        <img
          src={normalizeMovieImageUrl(movie.backdrop || movie.poster, movie.title, "backdrop")}
          alt={movie.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(event) => {
            event.currentTarget.src = movieImageFallback(movie.title, "backdrop");
          }}
        />
        <span className="absolute left-2 top-2 rounded-md bg-primary px-2 py-1 text-[10px] font-bold text-primary-foreground">
          {badge}
        </span>
      </div>
      <p className="mt-2 line-clamp-2 text-xs font-bold leading-4">{movie.title}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {displayMovieRating(movie, "premiere")} - {movie.duration} - {movie.certificate}
      </p>
    </MovieCardLink>
  );
}

function isComingSoonMovie(movie) {
  const id = String(movie?.id ?? movie?.movieId ?? "");
  return (
    movie?.listingType === "coming-soon" ||
    movie?.releaseStatus === "coming-soon" ||
    id.startsWith("coming-soon-")
  );
}

function isHeroMovieAllowed(movie) {
  return !excludedHeroMovieIds.has(String(movie?.id ?? ""));
}

function buildRecommendedMovies(list) {
  return [...list].sort((left, right) => {
    const ratingDelta = Number(right.rating || 0) - Number(left.rating || 0);
    if (ratingDelta) return ratingDelta;
    return (
      parseVoteCount(right.votes ?? right.votesText) - parseVoteCount(left.votes ?? left.votesText)
    );
  });
}

function getCarouselPageItems(list, page, pageSize) {
  if (list.length <= pageSize) return list;
  const start = (page * pageSize) % list.length;
  return Array.from({ length: pageSize }, (_, index) => list[(start + index) % list.length]);
}

function getRecommendedDragTransform(drag) {
  const width = drag.width || 1;
  if (drag.direction === "next") {
    const x = drag.isSettling
      ? drag.settleTo === "commit"
        ? -width
        : 0
      : clampNumber(drag.deltaX, -width, 0);
    return `translateX(${x}px)`;
  }

  const x = drag.isSettling
    ? drag.settleTo === "commit"
      ? 0
      : -width
    : -width + clampNumber(drag.deltaX, 0, width);
  return `translateX(${x}px)`;
}

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
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

function displayMovieRating(movie) {
  return movie.rating || (isComingSoonMovie(movie) ? "Soon" : "New");
}

function buildCityMovieCatalog(catalog, selectedCity, cinemaCatalog) {
  const cityKey = normalizeHomeText(selectedCity);
  const localTheaters = cinemaCatalog.filter(
    (theater) => normalizeHomeText(theater.city) === cityKey,
  );
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

function buildHomeSearchEntries({ cinemaCatalog, comingSoonCatalog, movieCatalog }) {
  const movieTitleById = new Map(
    [...movieCatalog, ...comingSoonCatalog]
      .map((movie) => [String(movie.id ?? movie.movieId ?? ""), movie.title])
      .filter(([id, title]) => id && title),
  );

  return [
    ...movieCatalog.map((movie) => buildMovieSearchEntry(movie, "movie")),
    ...comingSoonCatalog.map((movie) => buildMovieSearchEntry(movie, "coming-soon")),
    ...cinemaCatalog.map((cinema) => buildCinemaSearchEntry(cinema, movieTitleById)),
  ];
}

function buildMovieSearchEntry(movie, type) {
  const entryId = movie.movieId || movie.id || movie.title;
  return {
    id: `${type}:${entryId}`,
    item: movie,
    title: movie.title,
    type,
    searchText: joinSearchFields(
      movie.title,
      movie.movie,
      movie.description,
      movie.duration,
      movie.certificate,
      movie.releaseDate,
      movie.releaseAt,
      movie.category,
      movie.votes,
      movie.votesText,
      getMovieGenres(movie),
      getMovieLanguages(movie),
      getMovieFormats(movie),
      getMovieCastSearchFields(movie),
      movie.cities,
      movie.theaters,
    ),
  };
}

function buildCinemaSearchEntry(cinema, movieTitleById) {
  const movieIds = splitList(cinema.movieIds);
  const movieTitles = movieIds.map((movieId) => movieTitleById.get(movieId)).filter(Boolean);

  return {
    id: `cinema:${cinema.id}`,
    item: cinema,
    title: cinema.name,
    type: "cinema",
    searchText: joinSearchFields(
      cinema.name,
      cinema.city,
      cinema.area,
      cinema.address,
      cinema.distance,
      cinema.logoText,
      cinema.features,
      cinema.amenities,
      movieIds,
      movieTitles,
    ),
  };
}

function getMovieCastSearchFields(movie) {
  if (!Array.isArray(movie.cast)) return [];
  return movie.cast.flatMap((member) => {
    if (typeof member === "string") return member;
    return [member.name, member.role, member.character];
  });
}

function normalizeHomeComingSoonMovie(movie) {
  const normalized = normalizeMovieMedia(movie);
  const bundled =
    bundledComingSoonById.get(normalizeHomeText(normalized.id)) ||
    bundledComingSoonById.get(normalizeHomeText(normalized.movieId)) ||
    bundledComingSoonById.get(normalizeHomeText(normalized.title));
  return {
    ...normalized,
    poster: shouldUseBundledImage(normalized.poster, bundled?.poster)
      ? bundled.poster
      : normalized.poster,
    backdrop: shouldUseBundledImage(normalized.backdrop, bundled?.backdrop)
      ? bundled.backdrop
      : normalized.backdrop,
  };
}

function shouldUseBundledImage(remoteImage, bundledImage) {
  return Boolean(
    bundledImage &&
    !isFallbackMovieArtwork(bundledImage) &&
    (!remoteImage || isFallbackMovieArtwork(remoteImage)),
  );
}

function CinemaCard({ cinema, image }) {
  const featureBadges = splitList(cinema.features).slice(0, 2);
  return (
    <Link
      to={"/cinemas/" + cinema.id}
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
    image: theater.coverImage || "",
  }));
}

function CinemaSearchResult({ cinema }) {
  const amenities = splitList(cinema.amenities).slice(0, 4);
  const movieCount = splitList(cinema.movieIds).length || fallbackMovies.length;
  return (
    <Link
      to={"/cinemas/" + cinema.id}
      className="group grid gap-3 rounded-lg border border-border/60 bg-background/65 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg sm:grid-cols-[56px_1fr_auto]"
    >
      {cinema.coverImage ? (
        <img
          src={cinema.coverImage}
          alt={cinema.name}
          className="h-14 w-14 rounded-lg border border-border/60 object-cover"
        />
      ) : (
        <div className="grid h-14 w-14 place-items-center rounded-lg border border-primary/20 bg-primary/10 text-sm font-extrabold text-primary">
          {cinema.logoText || initials(cinema.name)}
        </div>
      )}
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

function formatComingSoonPanelDate(movie, index) {
  const rawDate = movie.releaseAt || movie.date || movie.releaseDate;
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(String(rawDate || ""))
    ? new Date(`${rawDate}T00:00:00`)
    : new Date(rawDate);
  const date = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  if (Number.isNaN(parsed.getTime())) date.setDate(date.getDate() + 24 + index * 7);
  return {
    day: String(date.getDate()).padStart(2, "0"),
    month: date.toLocaleDateString("en-IN", { month: "short" }).toUpperCase(),
  };
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

function toDomId(value) {
  return normalizeHomeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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

export { Home };
