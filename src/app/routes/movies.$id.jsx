import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import {
  BadgePercent,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Gift,
  Heart,
  Info,
  MessageCircle,
  Moon,
  Play,
  Search,
  Send,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  Sunrise,
  ThumbsUp,
  Ticket,
  Users,
} from "lucide-react";
import {
  createMovieReview,
  fetchMovie,
  fetchMovieReviews,
  fetchMovies,
} from "@/features/movies/api/moviesApi";
import { CastShowcase } from "@/features/movies/components/CastShowcase";
import { movies as catalogMovies, theaters, showTimes } from "@/features/movies/data/movieCatalog";
import { movieImageFallback, normalizeMovieImageUrl } from "@/features/movies/services/movieMedia";
import { buildCatalogTheaterListings } from "@/features/movies/services/showSchedule";
import { CitySelect } from "@/shared/components/location/CitySelect";
import { Button } from "@/shared/components/ui/button";
import { requestJson } from "@/shared/services/httpClient";
import {
  readPreferredCity,
  subscribePreferredCity,
  writePreferredCity,
} from "@/shared/services/cityPreference";

const dateOptions = buildDateOptions();

const detailAboutText =
  "A seemingly perfect marriage in Prayagraj takes an unexpected turn when one decision leads to a chain of misunderstandings, suspicion, and comedic chaos.";

const detailOffers = [
  "YES Private Debit Card Offer",
  "Buy 1 get 1 movie ticket free + 50% off on non movie tickets with Yes Private Credit Card",
  "Enjoy B1G1 Ticket Free!* with Bandhan Bank Legacy Debit Cards",
  "Get up to Rs 1000 off per calendar month with Bandhan Bank credit cards",
  "Get upto INR1000 Off* every month using Apex International Metal Debit Card",
];

const detailCast = [
  "Ayushmann Khurrana",
  "Sara Ali Khan",
  "Wamiqa Gabbi",
  "Rakul Preet Singh",
  "Vijay Raaz",
  "Tigmanshu Dhulia",
];

const reviewTags = [
  ["#GreatActing", 2881],
  ["#Wellmade", 2313],
  ["#SuperDirection", 2107],
  ["#AwesomeStory", 1841],
  ["#Rocking", 1546],
  ["#Blockbuster", 1540],
  ["#WowMusic", 1168],
  ["#Unbelievable", 759],
  ["#Inspiring", 680],
  ["#OneTimeWatch", 504],
];

const topReviews = [
  {
    name: "Hanzala",
    rating: "10/10",
    tags: "#SuperDirection #GreatActing #WowMusic #AwesomeStory #Blockbuster #Rocking #Unbelievable",
    text: "Ayushman, wamiqa, rakul and Sara chemistry ek sth maza hi aagya dekh kr. Romance bhi acha h sbke sth. Movie to badiya h hi aur comedy too.",
    likes: 795,
  },
  {
    name: "Manish",
    rating: "10/10",
    tags: "",
    text: "The film never takes itself seriously for a single moment and that consistency of tone is what makes it work from start to finish.",
    likes: 343,
  },
  {
    name: "Pranav",
    rating: "10/10",
    tags: "",
    text: "Ketan Sodha's background score keeps the comic energy moving even in scenes that could have gone flat. Good comedy scoring is invisible when it works.",
    likes: 199,
  },
  {
    name: "Priyesh",
    rating: "8/10",
    tags: "#GreatActing #WowMusic #AwesomeStory #Rocking #Wellmade",
    text: "A attention grabbing movie throughout. Superb acting by Ayushmann and Sara as well as other actresses.",
    likes: 193,
  },
  {
    name: "Harish",
    rating: "10/10",
    tags: "",
    text: "Sara Ali Khan is looser and funnier here than I've seen her before. She seems genuinely comfortable in the chaos and it shows.",
    likes: 188,
  },
];

const MAX_VISIBLE_REVIEWS = 3;

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
  const [theaterSearch, setTheaterSearch] = useState("");
  const [activeFormat, setActiveFormat] = useState("All");
  const [preferredTime, setPreferredTime] = useState("Any time");
  const [sortBy, setSortBy] = useState("Recommended");
  const [remoteShows, setRemoteShows] = useState([]);
  const [bookingMode, setBookingMode] = useState(
    () => typeof window !== "undefined" && window.location.hash === "#showtimes",
  );
  const [reviewData, setReviewData] = useState(() => buildFallbackReviewData(movie));
  const [recommendations, setRecommendations] = useState(() =>
    buildMovieRecommendations(movie, catalogMovies),
  );
  const reviewSummary = getReviewDisplaySummary(movie, reviewData);
  const pageHighlights = buildDetailHighlights(reviewSummary);

  useEffect(() => {
    const syncHash = () => setBookingMode(window.location.hash === "#showtimes");
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  const citySuggestions = useMemo(() => buildMovieCitySuggestions(remoteShows), [remoteShows]);

  useEffect(() => {
    writePreferredCity(selectedCity);
  }, [selectedCity]);

  useEffect(() => subscribePreferredCity(setSelectedCity), []);

  useEffect(() => {
    setRecommendations(buildMovieRecommendations(movie, catalogMovies));
    let active = true;

    fetchMovies({ timeoutMs: 2500 })
      .then((list) => {
        if (active) setRecommendations(buildMovieRecommendations(movie, list));
      })
      .catch(() => {
        if (active) setRecommendations(buildMovieRecommendations(movie, catalogMovies));
      });

    return () => {
      active = false;
    };
  }, [movie]);

  useEffect(() => {
    setReviewData(buildFallbackReviewData(movie));
    let active = true;

    fetchMovieReviews(movie.id)
      .then((data) => {
        if (active && data) setReviewData(buildReviewData(movie, data));
      })
      .catch(() => {
        if (active) setReviewData(buildFallbackReviewData(movie));
      });

    return () => {
      active = false;
    };
  }, [movie]);

  useEffect(() => {
    let active = true;

    requestJson(
      `/api/shows/${encodeURIComponent(movie.id)}?city=${encodeURIComponent(
        selectedCity,
      )}&date=${encodeURIComponent(activeDate)}`,
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
  }, [activeDate, movie.id, selectedCity]);

  const selectedDateLabel = useMemo(() => getDateLabel(activeDate), [activeDate]);
  const cinemaListings = useMemo(
    () => buildCinemaListings({ movie, selectedCity, remoteShows, activeDate }),
    [activeDate, movie, remoteShows, selectedCity],
  );
  const formatOptions = useMemo(
    () =>
      sortFormatOptions([
        ...movie.format,
        ...cinemaListings.flatMap((cinema) => cinema.shows.map((show) => show.format)),
      ]),
    [cinemaListings, movie.format],
  );
  const visibleCinemaListings = useMemo(
    () =>
      filterCinemaListings({
        listings: cinemaListings,
        query: theaterSearch,
        activeFormat,
        preferredTime,
        sortBy,
      }),
    [activeFormat, cinemaListings, preferredTime, sortBy, theaterSearch],
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
    <div className="bg-muted/30 pb-16">
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <img
          src={normalizeMovieImageUrl(movie.backdrop || movie.poster, movie.title, "backdrop")}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover opacity-55"
          onError={(event) => {
            event.currentTarget.src = movieImageFallback(movie.title, "backdrop");
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/78 to-slate-950/35" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/25 to-transparent" />

        <div className="relative mx-auto max-w-[1560px] px-4 py-8 sm:px-5 md:py-10 lg:px-6">
          <div className="grid gap-6 md:grid-cols-[220px_minmax(0,1fr)] md:gap-8 lg:grid-cols-[230px_minmax(0,1fr)_260px] lg:items-center">
            <div className="mx-auto w-full max-w-[220px] overflow-hidden rounded-lg border border-white/35 bg-white/10 shadow-2xl shadow-black/40 md:mx-0 md:max-w-none">
              <div className="relative">
                <img
                  src={normalizeMovieImageUrl(movie.poster, movie.title, "poster")}
                  alt={movie.title}
                  className="aspect-[2/3] w-full object-cover"
                  onError={(event) => {
                    event.currentTarget.src = movieImageFallback(movie.title, "poster");
                  }}
                />
                <span className="absolute left-2 top-2 rounded-md bg-primary px-2.5 py-1 text-xs font-extrabold text-primary-foreground shadow-lg">
                  In Cinemas Now
                </span>
              </div>
              <a
                href={trailerSearchUrl(movie.title)}
                target="_blank"
                rel="noreferrer"
                className="flex h-11 items-center justify-center gap-2 bg-primary text-sm font-extrabold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Play className="h-4 w-4" /> Watch trailer
              </a>
            </div>

            <div>
              <div className="inline-flex items-center gap-2 text-sm font-extrabold text-amber-300">
                <Star className="h-4 w-4 fill-amber-300 text-amber-300" />
                Prime Original
              </div>
              <h1 className="mt-3 max-w-4xl text-4xl font-extrabold tracking-tight md:text-6xl">
                {movie.title}
              </h1>

              <div className="mt-4 flex flex-wrap items-center gap-4 text-white">
                <div className="inline-flex items-center gap-2">
                  <Star className="h-5 w-5 fill-amber-300 text-amber-300" />
                  <span className="text-lg font-bold">
                    {formatRatingScore(reviewSummary.average || movie.rating)}/10
                  </span>
                </div>
                <span className="text-sm font-semibold text-white/85">{movie.votes} votes</span>
                <span className="hidden h-5 w-px bg-white/40 sm:block" />
                <span className="text-sm font-medium">{reviewSummary.countLabel}</span>
              </div>

              <div className="mt-5 flex flex-wrap gap-2 text-xs">
                {movie.format.map((format) => (
                  <span
                    key={format}
                    className="rounded-full border border-white/35 bg-white/10 px-3 py-1.5 font-bold text-white shadow-sm backdrop-blur"
                  >
                    {format}
                  </span>
                ))}
                <span className="rounded-full border border-white/35 bg-white/10 px-3 py-1.5 font-bold text-white shadow-sm backdrop-blur">
                  {movie.language}
                </span>
                <span className="rounded-full border border-white/35 bg-white/10 px-3 py-1.5 font-bold text-white shadow-sm backdrop-blur">
                  {movie.certificate}
                </span>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-4 text-sm font-medium text-white/90">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4" /> {movie.duration}
                </span>
                <span>{movie.genres.join(", ")}</span>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" /> {movie.releaseDate}
                </span>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <Button
                  size="lg"
                  onClick={() => {
                    setBookingMode(true);
                    window.location.hash = "showtimes";
                  }}
                  className="gap-2 font-extrabold shadow-xl shadow-primary/20"
                >
                  <Ticket className="h-4 w-4" />
                  Book tickets
                </Button>
                {bookingMode && (
                  <Button
                    size="lg"
                    variant="secondary"
                    onClick={() => {
                      setBookingMode(false);
                      window.history.replaceState(null, "", window.location.pathname);
                    }}
                  >
                    Movie details
                  </Button>
                )}
                <Button
                  size="lg"
                  variant="ghost"
                  className="gap-2 border border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                  asChild
                >
                  <a href={trailerSearchUrl(movie.title)} target="_blank" rel="noreferrer">
                    <Play className="h-4 w-4" /> Trailer
                  </a>
                </Button>
                <Button
                  size="lg"
                  variant="ghost"
                  className="gap-2 border border-white/25 bg-black/25 text-white hover:bg-white/20 hover:text-white"
                  onClick={addToWatchlist}
                >
                  <Heart className="h-4 w-4" /> Watchlist
                </Button>
                <Button
                  size="lg"
                  variant="ghost"
                  className="gap-2 border border-white/25 bg-black/25 text-white hover:bg-white/20 hover:text-white"
                  onClick={shareMovie}
                >
                  <Share2 className="h-4 w-4" /> Share
                </Button>
              </div>
              {message && (
                <p className="mt-4 rounded-md border border-primary/30 bg-primary/15 px-3 py-2 text-sm font-medium text-primary-foreground">
                  {message}
                </p>
              )}
            </div>

            <div className="hidden gap-3 lg:grid">
              {pageHighlights.map(({ label, value, icon: Icon }) => (
                <div
                  key={label}
                  className="rounded-lg border border-white/35 bg-slate-950/40 p-4 shadow-xl shadow-black/30 backdrop-blur"
                >
                  <div className="flex items-start gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/20 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-white/75">{label}</p>
                      <p className="mt-1 text-sm font-extrabold text-white">{value}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {bookingMode ? (
        <ShowtimesView
          movie={movie}
          selectedCity={selectedCity}
          citySuggestions={citySuggestions}
          onCityChange={setSelectedCity}
          activeDate={activeDate}
          onDateChange={setActiveDate}
          activeFormat={activeFormat}
          onFormatChange={setActiveFormat}
          formatOptions={formatOptions}
          preferredTime={preferredTime}
          onPreferredTimeChange={setPreferredTime}
          sortBy={sortBy}
          onSortChange={setSortBy}
          theaterSearch={theaterSearch}
          onTheaterSearchChange={setTheaterSearch}
          visibleCinemaListings={visibleCinemaListings}
          selectedDateLabel={selectedDateLabel}
          onBackToDetails={() => {
            setBookingMode(false);
            window.history.replaceState(null, "", window.location.pathname);
          }}
        />
      ) : (
        <MovieDetailsContent
          movie={movie}
          reviewData={reviewData}
          recommendations={recommendations}
          onReviewDataChange={(data) => setReviewData(buildReviewData(movie, data))}
        />
      )}
    </div>
  );
}

function MovieDetailsContent({ movie, reviewData, recommendations, onReviewDataChange }) {
  const reviewSummary = getReviewDisplaySummary(movie, reviewData);
  const reviews = getVisibleReviews(reviewData);
  const castMembers = getMovieCast(movie);

  return (
    <div className="mx-auto grid max-w-[1560px] gap-6 px-4 py-6 sm:px-5 lg:px-6">
      <section className="rounded-lg border border-border/70 bg-card p-5 shadow-xl shadow-foreground/5">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_1.45fr] lg:items-center">
          <div>
            <SectionHeader icon={Info} title="About the movie" />
            <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
              {movie.description || detailAboutText}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {movie.genres.slice(0, 4).map((genre) => (
                <span
                  key={genre}
                  className="rounded-md border border-border/70 bg-background px-4 py-1.5 text-xs font-semibold text-foreground"
                >
                  {genre}
                </span>
              ))}
            </div>
          </div>
          <DetailsStatsPanel movie={movie} summary={reviewSummary} />
        </div>
      </section>

      <OfferSlider />

      <CastShowcase castMembers={castMembers} variant="compact" />

      <section>
        <SectionTitleBar icon={Star} title="Audience reviews" />
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
          <div className="overflow-hidden rounded-lg border border-border/70 bg-card shadow-sm">
            {reviews.length ? (
              reviews.map((review) => <ReviewCard key={review.id || review.name} review={review} />)
            ) : (
              <article className="p-6 text-center">
                <MessageCircle className="mx-auto h-8 w-8 text-primary" />
                <h3 className="mt-3 font-semibold">No audience reviews yet</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  First review publish karte hi yaha live show hoga.
                </p>
              </article>
            )}
            {reviews.length ? (
              <div className="border-t border-border/60 px-4 py-3 text-center">
                <button
                  type="button"
                  className="h-10 rounded-md border border-border/70 bg-background px-12 text-sm font-bold shadow-sm transition-colors hover:border-primary/50 hover:text-primary"
                >
                  See all reviews
                </button>
              </div>
            ) : null}
          </div>

          <ReviewComposer
            movie={movie}
            summary={reviewSummary}
            userReview={reviewData?.userReview}
            onReviewDataChange={onReviewDataChange}
          />
        </div>
      </section>

      {recommendations.length > 0 && (
        <section>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-lime-400/20 text-lime-600">
                <Sparkles className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-extrabold tracking-tight">You might also like</h2>
            </div>
            <Link to="/" className="text-sm font-semibold text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {recommendations.map((recommendedMovie) => (
              <SuggestionCard key={recommendedMovie.id} movie={recommendedMovie} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SectionHeader({ icon: Icon, eyebrow, title }) {
  return (
    <div className="flex items-start gap-3">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase text-muted-foreground">{eyebrow}</p>
        ) : null}
        <h2 className="mt-0.5 text-xl font-extrabold tracking-tight">{title}</h2>
      </div>
    </div>
  );
}

function SectionTitleBar({ title, actionLabel, icon: Icon }) {
  return (
    <div className="flex w-full items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        {Icon ? (
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-amber-300/20 text-amber-500">
            <Icon className="h-5 w-5 fill-current" />
          </div>
        ) : null}
        <h2 className="text-xl font-extrabold tracking-tight">{title}</h2>
      </div>
      {actionLabel && (
        <button type="button" className="text-sm font-semibold text-primary hover:underline">
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function DetailsStatsPanel({ movie, summary }) {
  const stats = [
    {
      icon: Heart,
      label: "Audience Love",
      value: `${formatRatingScore(summary.average || movie.rating)}/10`,
      tone: "bg-emerald-500/12 text-emerald-600",
    },
    {
      icon: MessageCircle,
      label: "Review Volume",
      value: titleCaseCountLabel(summary.countLabel),
      tone: "bg-violet-500/12 text-violet-600",
    },
    {
      icon: BadgePercent,
      label: "Offers Live",
      value: "5 Cards",
      tone: "bg-orange-400/14 text-orange-600",
    },
    {
      icon: Users,
      label: "Popular With",
      value: "Couples & Groups",
      tone: "bg-sky-500/12 text-sky-600",
    },
  ];

  return (
    <aside className="rounded-lg border border-border/70 bg-background p-4 shadow-lg shadow-foreground/5">
      <div className="grid divide-y divide-border/60 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
        {stats.map(({ icon: Icon, label, value, tone }) => (
          <div key={label} className="flex items-center gap-3 px-4 py-3 first:pl-0 last:pr-0">
            <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${tone}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 truncate text-sm font-extrabold">{value}</p>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

function OfferSlider() {
  const sliderRef = useRef(null);
  const slideOffers = (direction) => {
    sliderRef.current?.scrollBy({
      left: direction * 300,
      behavior: "smooth",
    });
  };

  return (
    <section className="min-w-0">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/12 text-primary">
            <Gift className="h-5 w-5" />
          </div>
          <h2 className="text-xl font-extrabold tracking-tight">Top offers for you</h2>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="hidden text-sm font-semibold text-primary sm:block">
            View all
          </button>
          <button
            type="button"
            onClick={() => slideOffers(-1)}
            className="grid h-9 w-9 place-items-center rounded-md border border-border/60 bg-card text-foreground shadow-sm transition-colors hover:border-primary/50 hover:text-primary"
            aria-label="Slide offers left"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => slideOffers(1)}
            className="grid h-9 w-9 place-items-center rounded-md border border-border/60 bg-card text-foreground shadow-sm transition-colors hover:border-primary/50 hover:text-primary"
            aria-label="Slide offers right"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="min-w-0 max-w-full overflow-hidden">
        <div
          ref={sliderRef}
          data-offer-slider="true"
          className="flex w-full min-w-0 snap-x gap-3 overflow-x-auto scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {detailOffers.map((offer, index) => (
            <OfferCard key={offer} offer={offer} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

function OfferCard({ offer, index }) {
  const visuals = [
    { icon: Ticket, tone: "bg-blue-500/12 text-blue-600" },
    { icon: BadgePercent, tone: "bg-pink-500/12 text-pink-600" },
    { icon: Gift, tone: "bg-amber-400/18 text-amber-700" },
    { icon: BadgePercent, tone: "bg-sky-500/12 text-sky-600" },
  ];
  const visual = visuals[index % visuals.length];
  const Icon = visual.icon;

  return (
    <button
      type="button"
      className="group min-h-28 w-[82vw] shrink-0 snap-start rounded-lg border border-border/60 bg-card p-4 text-left shadow-md shadow-foreground/5 transition-colors hover:border-primary/50 hover:bg-primary/5 sm:w-80 lg:w-[22rem] xl:w-[23.5rem]"
    >
      <div className="flex items-center gap-3">
        <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-lg ${visual.tone}`}>
          <Icon className="h-7 w-7" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-extrabold leading-5">{offer}</p>
          <p className="mt-1 text-xs text-muted-foreground group-hover:text-primary">
            Tap to view details
          </p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
      </div>
    </button>
  );
}

function ReviewComposer({ movie, summary, userReview, onReviewDataChange }) {
  const auth = useSelector((state) => state.auth);
  const [rating, setRating] = useState(userReview?.rating || 9);
  const [text, setText] = useState(userReview?.text || "");
  const [selectedTags, setSelectedTags] = useState(userReview?.tags || ["#GreatActing"]);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const isSignedIn = Boolean(auth.token && auth.user);

  useEffect(() => {
    setRating(userReview?.rating || 9);
    setText(userReview?.text || "");
    setSelectedTags(userReview?.tags?.length ? userReview.tags : ["#GreatActing"]);
  }, [userReview]);

  const toggleTag = (tag) => {
    setSelectedTags((current) =>
      current.includes(tag)
        ? current.filter((item) => item !== tag)
        : [...current, tag].slice(0, 5),
    );
  };

  const submitReview = async (event) => {
    event.preventDefault();
    if (!text.trim() || text.trim().length < 10) {
      setStatus({ type: "error", message: "Review me kam se kam 10 characters likho." });
      return;
    }

    setSubmitting(true);
    setStatus({ type: "", message: "" });
    try {
      const data = await createMovieReview(movie.id, {
        rating,
        text,
        tags: selectedTags,
      });
      onReviewDataChange(data);
      setStatus({
        type: "success",
        message: userReview ? "Review update ho gaya." : "Review publish ho gaya.",
      });
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error.response?.data?.error || "Review save nahi ho paya. Thodi der baad try karo.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isSignedIn) {
    return (
      <article className="rounded-lg border border-border/70 bg-card p-5 shadow-xl shadow-foreground/5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-extrabold">Rate this movie</h3>
            <p className="mt-1 text-sm text-muted-foreground">Sign in to publish your review.</p>
          </div>
          <div className="text-right">
            <div className="inline-flex items-center gap-1 text-2xl font-extrabold">
              <Star className="h-6 w-6 fill-amber-400 text-amber-400" />
              {formatRatingScore(summary?.average || movie.rating)}
            </div>
            <p className="text-xs text-muted-foreground">/10</p>
          </div>
        </div>
        <Button asChild className="mt-4 w-full">
          <Link to="/auth">Sign in to review</Link>
        </Button>
      </article>
    );
  }

  return (
    <form
      onSubmit={submitReview}
      className="rounded-lg border border-border/70 bg-card p-5 shadow-xl shadow-foreground/5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold">Rate this movie</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Based on {summary?.countLabel || "audience reviews"}
          </p>
        </div>
        <div className="text-right">
          <div className="inline-flex items-center gap-1 text-2xl font-extrabold">
            <Star className="h-6 w-6 fill-amber-400 text-amber-400" />
            {formatRatingScore(summary?.average || movie.rating)}
          </div>
          <p className="text-xs text-muted-foreground">/10</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-5 gap-1.5">
        {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setRating(value)}
            className={`h-9 rounded-md border text-sm font-semibold transition-colors ${
              rating === value
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border/70 bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"
            }`}
            aria-label={`Rate ${value} out of 10`}
          >
            {value}
          </button>
        ))}
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">Select your rating</p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {reviewTags.slice(0, 6).map(([tag]) => {
          const active = selectedTags.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/70 bg-background text-muted-foreground hover:border-primary/50"
              }`}
            >
              {tag}
            </button>
          );
        })}
      </div>

      <label className="mt-4 block">
        <span className="sr-only">Review text</span>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={4}
          maxLength={1000}
          placeholder="Write your review..."
          className="min-h-28 w-full resize-none rounded-md border border-border/70 bg-background px-3 py-2 text-sm leading-relaxed outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
      </label>

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">{text.length}/1000</span>
        <Button type="submit" disabled={submitting} className="gap-2">
          {submitting ? "Saving..." : userReview ? "Update review" : "Publish review"}
          {!submitting && <Send className="h-4 w-4" />}
        </Button>
      </div>

      {status.message && (
        <p
          className={`mt-3 rounded-md px-3 py-2 text-xs ${
            status.type === "error"
              ? "bg-destructive/10 text-destructive"
              : "bg-primary/10 text-primary"
          }`}
        >
          {status.message}
        </p>
      )}
    </form>
  );
}

function ReviewCard({ review }) {
  const ratingLabel =
    review.ratingLabel || `${formatRatingScore(Number.parseFloat(review.rating) || 0)}/10`;
  const helpfulCount = review.helpfulCount ?? review.likes ?? 0;
  const reviewerName = review.name || review.userName || "Movie fan";
  const starCount = Math.max(1, Math.min(5, Math.round(Number(review.rating || 0) / 2)));

  return (
    <article className="border-b border-border/60 p-4 transition-colors hover:bg-primary/5">
      <div className="grid gap-3 sm:grid-cols-[44px_minmax(0,1fr)_auto]">
        <div className="grid h-11 w-11 place-items-center rounded-full bg-primary/15 text-sm font-extrabold text-primary">
          {initials(reviewerName)}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-extrabold">{reviewerName}</p>
            {review.verifiedBooking !== false && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-primary">
                <ShieldCheck className="h-3.5 w-3.5" />
                Verified
              </span>
            )}
          </div>
          <p className="mt-2 text-sm leading-relaxed text-foreground/85">{review.text}</p>
          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <ThumbsUp className="h-3.5 w-3.5" />
              {helpfulCount}
            </span>
            <span>{formatReviewAge(review.createdAt)}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:flex-col sm:items-end">
          <div className="flex items-center gap-0.5 text-primary">
            {Array.from({ length: 5 }, (_, index) => (
              <Star
                key={index}
                className={`h-4 w-4 ${index < starCount ? "fill-current" : "text-muted-foreground/30"}`}
              />
            ))}
          </div>
          <span className="rounded-md bg-primary/10 px-3 py-1 text-sm font-extrabold text-primary">
            {ratingLabel}
          </span>
        </div>
      </div>
    </article>
  );
}

function SuggestionCard({ movie }) {
  return (
    <Link
      to="/movies/$id"
      params={{ id: movie.id }}
      className="group overflow-hidden rounded-lg border border-border/60 bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
    >
      <div className="relative aspect-[16/9] bg-muted">
        {movie.poster || movie.backdrop ? (
          <img
            src={normalizeMovieImageUrl(movie.backdrop || movie.poster, movie.title, "backdrop")}
            alt={movie.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            onError={(event) => {
              event.currentTarget.src = movieImageFallback(movie.title, "backdrop");
            }}
          />
        ) : (
          <div className="grid h-full place-items-center">
            <span className="text-lg font-bold text-primary">{initials(movie.title)}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
        <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-md bg-background/95 px-2 py-1 text-xs font-bold text-foreground shadow-sm">
          <Star className="h-3.5 w-3.5 fill-primary text-primary" />
          {formatRatingScore(movie.rating)}/10
        </span>
      </div>
      <div className="p-3">
        <p className="truncate text-sm font-extrabold leading-5 text-foreground">{movie.title}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {(movie.genres ?? []).slice(0, 2).join(" - ") || movie.language}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
          <span className="rounded-md border border-border/70 px-2 py-0.5">
            {movie.duration || "Runtime"}
          </span>
          <span className="rounded-md border border-border/70 px-2 py-0.5">
            {movie.certificate || "UA"}
          </span>
        </div>
      </div>
    </Link>
  );
}

function buildMovieRecommendations(movie, list = []) {
  const source = (list.length ? list : catalogMovies).filter(
    (item) => item?.id && item.id !== movie.id,
  );
  const currentGenres = new Set((movie.genres ?? []).map(normalizeText));

  return uniqueMovies(source)
    .map((item) => {
      const genreScore = (item.genres ?? []).filter((genre) =>
        currentGenres.has(normalizeText(genre)),
      ).length;
      const languageScore = normalizeText(item.language) === normalizeText(movie.language) ? 1 : 0;
      return {
        ...item,
        recommendationScore: genreScore * 3 + languageScore + Number(item.rating || 0) / 10,
      };
    })
    .sort((left, right) => {
      if (right.recommendationScore !== left.recommendationScore) {
        return right.recommendationScore - left.recommendationScore;
      }
      return Number(left.sortOrder || 0) - Number(right.sortOrder || 0);
    })
    .slice(0, 4);
}

function uniqueMovies(list) {
  const seen = new Set();
  return list.filter((movie) => {
    if (!movie?.id || seen.has(movie.id)) return false;
    seen.add(movie.id);
    return true;
  });
}

function getMovieCast(movie) {
  const cast = (movie.cast ?? [])
    .map((member) => ({
      name: String(member?.name ?? "").trim(),
      role: String(member?.role ?? "Actor").trim() || "Actor",
      avatar: String(member?.avatar ?? "").trim(),
    }))
    .filter((member) => member.name);

  return cast.length ? cast : detailCast.map((name) => ({ name, role: "Actor", avatar: "" }));
}

function buildDetailHighlights(summary) {
  return [
    {
      label: "Audience score",
      value: `${formatRatingScore(summary.average)}/10`,
      icon: Star,
    },
    { label: "Review volume", value: summary.countLabel, icon: MessageCircle },
    { label: "Offers live", value: "5 cards", icon: BadgePercent },
  ];
}

function buildFallbackReviewData(movie) {
  return {
    source: "fallback",
    reviews: topReviews
      .slice(0, MAX_VISIBLE_REVIEWS)
      .map((review, index) => normalizeReview(review, index, movie.id)),
    topTags: reviewTags.map(([tag, count]) => ({ tag, count })),
    summary: {
      average: Number(movie.rating || 0),
      count: 8000,
      countLabel: "8K reviews",
      topTag: "#GreatActing",
    },
    userReview: null,
  };
}

function buildReviewData(movie, data) {
  if (!data) return buildFallbackReviewData(movie);
  const reviews = (data.reviews ?? [])
    .map((review, index) => normalizeReview(review, index, movie.id))
    .filter((review) => review.text);
  const topTags = getReviewTags(data);
  const rawCount = Number(data.summary?.count ?? reviews.length);
  const average = Number(data.summary?.average || 0);

  return {
    source: "api",
    reviews,
    topTags,
    summary: {
      average: average > 0 ? average : Number(movie.rating || 0),
      count: rawCount,
      countLabel: data.summary?.countLabel || formatReviewCount(rawCount),
      topTag: topTags[0]?.tag || "#GreatActing",
    },
    userReview: data.userReview ? normalizeReview(data.userReview, 0, movie.id) : null,
  };
}

function getReviewDisplaySummary(movie, reviewData) {
  const fallback = buildFallbackReviewData(movie).summary;
  const summary = reviewData?.summary ?? fallback;
  const topTag = summary.topTag || reviewData?.topTags?.[0]?.tag || fallback.topTag;
  const average = Number(summary.average || movie.rating || fallback.average || 0);
  const count = Number(summary.count ?? fallback.count);
  return {
    average,
    count,
    countLabel: summary.countLabel || formatReviewCount(count),
    topTag,
  };
}

function getReviewTags(reviewData) {
  const tags = reviewData?.topTags ?? [];
  const normalized = tags
    .map((item) => {
      if (Array.isArray(item)) return { tag: item[0], count: item[1] };
      return { tag: item.tag, count: item.count };
    })
    .filter((item) => item.tag);

  return normalized.length ? normalized : reviewTags.map(([tag, count]) => ({ tag, count }));
}

function getVisibleReviews(reviewData) {
  return (reviewData?.reviews ?? [])
    .map((review, index) => normalizeReview(review, index, review.movieId))
    .filter((review) => review.text)
    .slice(0, MAX_VISIBLE_REVIEWS);
}

function normalizeReview(review, index = 0, movieId = "") {
  const rating = parseReviewRating(review.rating);
  return {
    id: review.id || `${movieId || review.movieId || "movie"}-review-${index}`,
    movieId: review.movieId || movieId,
    name: review.name || review.userName || "Movie fan",
    userName: review.userName || review.name || "Movie fan",
    userEmail: review.userEmail || "",
    rating,
    ratingLabel: review.ratingLabel || `${formatRatingScore(rating)}/10`,
    tags: normalizeReviewTags(review.tags),
    text: review.text || "",
    helpfulCount: Number(review.helpfulCount ?? review.likes ?? 0),
    verifiedBooking: review.verifiedBooking !== false,
    createdAt: review.createdAt || fallbackReviewDate(index),
    updatedAt: review.updatedAt || review.createdAt || fallbackReviewDate(index),
  };
}

function normalizeReviewTags(tags) {
  if (Array.isArray(tags)) return tags.filter(Boolean);
  return String(tags ?? "")
    .split(/\s+/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function parseReviewRating(value) {
  if (typeof value === "string" && value.includes("/")) {
    return Number.parseFloat(value.split("/")[0]) || 0;
  }
  return Number(value || 0);
}

function fallbackReviewDate(index) {
  const date = new Date();
  date.setDate(date.getDate() - (index + 12));
  return date.toISOString();
}

function formatRatingScore(value) {
  const rating = Number(value || 0);
  if (!Number.isFinite(rating)) return "0";
  return Number.isInteger(rating) ? String(rating) : rating.toFixed(1);
}

function formatReviewCount(count) {
  const value = Number(count || 0);
  if (value >= 1000000) return `${trimCompactNumber(value / 1000000)}M reviews`;
  if (value >= 1000) return `${trimCompactNumber(value / 1000)}K reviews`;
  return `${value} ${value === 1 ? "review" : "reviews"}`;
}

function titleCaseCountLabel(label) {
  return String(label || "0 Reviews").replace(/\breviews?\b/i, (value) =>
    value === "review" ? "Review" : "Reviews",
  );
}

function trimCompactNumber(value) {
  return Number(value.toFixed(1)).toString();
}

function formatReviewAge(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "Recent";
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "1 Day ago";
  if (diffDays < 30) return `${diffDays} Days ago`;
  const diffMonths = Math.max(1, Math.floor(diffDays / 30));
  return diffMonths === 1 ? "1 Month ago" : `${diffMonths} Months ago`;
}

function ShowtimesView({
  movie,
  selectedCity,
  citySuggestions,
  onCityChange,
  activeDate,
  onDateChange,
  activeFormat,
  onFormatChange,
  formatOptions,
  preferredTime,
  onPreferredTimeChange,
  sortBy,
  onSortChange,
  theaterSearch,
  onTheaterSearchChange,
  visibleCinemaListings,
  selectedDateLabel,
  onBackToDetails,
}) {
  return (
    <section id="showtimes" className="mt-12 border-y border-border/60 bg-muted/30">
      <div className="bg-background">
        <div className="mx-auto flex max-w-[1560px] flex-col gap-4 px-4 py-8 sm:px-5 lg:flex-row lg:items-end lg:justify-between lg:px-6">
          <div>
            <button
              type="button"
              onClick={onBackToDetails}
              className="mb-3 text-sm font-medium text-primary hover:underline"
            >
              Back to movie details
            </button>
            <h2 className="text-3xl font-bold tracking-tight">{movie.title}</h2>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="rounded-full border border-border/70 px-2.5 py-1">
                Movie runtime: {movie.duration}
              </span>
              <span className="rounded-full border border-border/70 px-2.5 py-1">
                {movie.certificate}
              </span>
              {movie.genres.slice(0, 3).map((genre) => (
                <span key={genre} className="rounded-full border border-border/70 px-2.5 py-1">
                  {genre}
                </span>
              ))}
            </div>
          </div>

          <CitySelect
            value={selectedCity}
            options={citySuggestions}
            onChange={onCityChange}
            className="w-full lg:w-auto"
            selectClassName="min-w-40 flex-1"
          />
        </div>
      </div>

      <div className="border-y border-border/60 bg-background/95 backdrop-blur">
        <div className="mx-auto grid max-w-[1560px] gap-4 px-4 sm:px-5 md:grid-cols-[minmax(0,1fr)_auto] lg:px-6">
          <div className="flex gap-2 overflow-x-auto py-3">
            {dateOptions.map((date) => (
              <button
                key={date.key}
                type="button"
                onClick={() => onDateChange(date.key)}
                className={`grid min-w-16 place-items-center rounded-lg border px-4 py-2 text-center transition-colors ${
                  activeDate === date.key
                    ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "border-transparent hover:border-border/70 hover:bg-card"
                }`}
              >
                <span className="text-[11px] font-semibold uppercase">{date.weekday}</span>
                <span className="text-xl font-bold leading-none">{date.day}</span>
                <span className="text-[11px] uppercase opacity-80">{date.month}</span>
              </button>
            ))}
          </div>

          <div className="grid gap-2 border-t border-border/60 py-3 md:flex md:border-l md:border-t-0 md:pl-4">
            <FilterSelect
              value={activeFormat}
              onChange={onFormatChange}
              options={formatOptions}
              label={`${movie.language} - ${activeFormat === "All" ? "All formats" : activeFormat}`}
            />
            <FilterSelect
              value={preferredTime}
              onChange={onPreferredTimeChange}
              options={["Any time", "Morning", "Afternoon", "Evening", "Night"]}
              label={preferredTime}
            />
            <FilterSelect
              value={sortBy}
              onChange={onSortChange}
              options={["Recommended", "Cinema A-Z", "Distance"]}
              label={`Sort by ${sortBy}`}
            />
            <label className="flex h-11 min-w-48 items-center gap-2 rounded-md border border-border/60 bg-card px-3 text-sm">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={theaterSearch}
                onChange={(event) => onTheaterSearchChange(event.target.value)}
                placeholder="Search cinema"
                className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
              />
            </label>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1560px] px-4 py-4 sm:px-5 lg:px-6">
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Moon className="h-4 w-4" /> Late night
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Sunrise className="h-4 w-4" /> Early morning
          </span>
          <span className="ml-auto inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Available
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Fast filling
          </span>
        </div>

        <div className="mt-4 overflow-hidden rounded-lg border border-border/60 bg-background shadow-sm">
          {visibleCinemaListings.length > 0 ? (
            visibleCinemaListings.map((cinema) => (
              <CinemaShowCard
                key={cinema.id}
                cinema={cinema}
                movie={movie}
                activeDateLabel={selectedDateLabel}
              />
            ))
          ) : (
            <div className="p-8 text-center">
              <SlidersHorizontal className="mx-auto h-8 w-8 text-primary" />
              <h3 className="mt-3 font-semibold">No matching timings in {selectedCity}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Try another date, format, time, or cinema search.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function CinemaShowCard({ cinema, movie, activeDateLabel }) {
  return (
    <div className="grid gap-5 border-b border-border/60 p-5 last:border-b-0 md:grid-cols-[390px_1fr]">
      <div className="grid grid-cols-[44px_1fr_auto] gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-md border border-border/60 bg-card text-xs font-bold text-primary">
          {cinema.logoText || initials(cinema.name)}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold leading-snug">{cinema.name}</h3>
            <Info className="h-4 w-4 text-muted-foreground" />
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

        <button
          type="button"
          className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-card hover:text-primary"
          aria-label={`Save ${cinema.name}`}
        >
          <Heart className="h-5 w-5" />
        </button>
      </div>

      <div>
        <div className="flex flex-wrap gap-3">
          {cinema.shows.map((show) => {
            const cls = showTimeClass(show.status);
            const content = (
              <>
                <span className="text-sm font-semibold">{show.label}</span>
                <span className="text-[10px] uppercase opacity-70">{show.format}</span>
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
                  silverPrice: show.price.silver,
                  goldPrice: show.price.gold,
                  vipPrice: show.price.vip,
                  seatRows: show.seatLayout?.rowCount,
                  seatCols: show.seatLayout?.seatsPerRow,
                  platinumRows: show.seatLayout?.platinumRows,
                  silverRows: show.seatLayout?.silverRows,
                  vipRows: show.seatLayout?.vipRows,
                  aisleAfter: show.seatLayout?.aisleAfter,
                  blockedSeats: show.seatLayout?.blockedSeats?.join(","),
                }}
                className={`inline-flex flex-col rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${cls}`}
              >
                {content}
              </Link>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {cinema.shows.some((show) => show.cancellable)
            ? "Cancellation available"
            : "Non-cancellable"}
        </p>
      </div>
    </div>
  );
}

function FilterSelect({ value, onChange, options, label }) {
  return (
    <label className="relative">
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full appearance-none rounded-md border border-border/60 bg-card py-2 pl-3 pr-9 text-sm outline-none transition-colors hover:border-primary/50 md:w-auto"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </label>
  );
}

function buildCinemaListings({ movie, selectedCity, remoteShows, activeDate }) {
  const city = selectedCity || "Bengaluru";
  const remoteListings = groupRemoteShows(remoteShows, movie);
  if (remoteListings.length) return remoteListings.filter((cinema) => cinema.shows.length > 0);

  const hasStaticMovie = catalogMovies.some((catalogMovie) => catalogMovie.id === movie.id);
  if (!hasStaticMovie) return [];

  return buildCatalogTheaterListings({
    movie,
    theaters,
    selectedCity: city,
    activeDate,
    showTimes,
  }).filter((cinema) => cinema.shows.length > 0);
}

function groupRemoteShows(remoteShows, movie) {
  const groups = new Map();
  (remoteShows ?? []).forEach((show) => {
    const key = show.theaterId || show.theater || show.id;
    if (!groups.has(key)) {
      groups.set(key, {
        id: show.theaterId || key,
        name: show.theater || "Cinema",
        city: show.city,
        area: show.area,
        address: show.address,
        amenities: splitAmenities(show.amenities),
        logoText: show.logoText || initials(show.theater),
        isOwner: false,
        shows: [],
      });
    }

    groups.get(key).shows.push(formatRemoteShow(show, movie));
  });

  return Array.from(groups.values());
}

function formatRemoteShow(show, movie) {
  const gold = Number(show.price?.gold || 260);
  const platinum = Number(show.price?.platinum || 180);
  const vip = Number(show.price?.vip || 420);
  return {
    id: show.id,
    label: show.startTime || show.time || "Showtime",
    screen: show.screen || "Screen 1",
    status: normalizeShowStatus(show.status),
    format: show.format || movie.format?.[0] || "2D",
    language: show.language || movie.language || "English",
    cancellable: show.cancellable !== false,
    price: {
      platinum,
      silver: Number(show.price?.silver || gold),
      gold,
      vip,
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
    blockedSeats: splitAmenities(layout.blockedSeats),
  };
}

function filterCinemaListings({ listings, query, activeFormat, preferredTime, sortBy }) {
  const needle = normalizeText(query);
  const filtered = listings
    .map((cinema) => {
      const shows = cinema.shows.filter((show) => {
        const formatMatch = activeFormat === "All" || sameCity(show.format, activeFormat);
        const timeMatch =
          preferredTime === "Any time" || timeBucket(show.label) === preferredTime.toLowerCase();
        return formatMatch && timeMatch;
      });
      return { ...cinema, shows };
    })
    .filter((cinema) => {
      if (cinema.shows.length === 0) return false;
      if (!needle) return true;
      const searchable = [
        cinema.name,
        cinema.city,
        cinema.area,
        cinema.address,
        ...cinema.amenities,
        ...cinema.shows.flatMap((show) => [show.label, show.format]),
      ]
        .join(" ")
        .toLowerCase();
      return searchable.includes(needle);
    });

  return filtered.sort((left, right) => {
    if (sortBy === "Cinema A-Z") return left.name.localeCompare(right.name);
    if (sortBy === "Distance") return parseDistance(left.distance) - parseDistance(right.distance);
    return 0;
  });
}

function sortFormatOptions(formats) {
  const values = [...new Set(formats.filter(Boolean))];
  values.sort((left, right) => {
    if (left === "2D") return -1;
    if (right === "2D") return 1;
    return left.localeCompare(right);
  });
  return ["All", ...values];
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

function normalizeShowStatus(status) {
  const value = String(status ?? "").toLowerCase();
  if (value.includes("sold")) return "sold";
  if (value.includes("fast")) return "fast";
  return "ok";
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

function buildMovieCitySuggestions(remoteShows = []) {
  const cities = theaters.map((theater) => theater.city).filter(Boolean);
  remoteShows.forEach((show) => {
    if (show.city) cities.push(show.city);
  });

  return cities;
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

function parseDistance(distance) {
  const value = Number.parseFloat(String(distance ?? ""));
  return Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER;
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
  const key = "movix-shortlist";
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
