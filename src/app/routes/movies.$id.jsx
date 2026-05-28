import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  ChevronDown,
  Clock,
  Heart,
  Info,
  Moon,
  Play,
  Search,
  Share2,
  SlidersHorizontal,
  Star,
  Sunrise,
} from "lucide-react";
import { fetchMovie } from "@/features/movies/api/moviesApi";
import { theaters, showTimes } from "@/features/movies/data/movieCatalog";
import { CitySelect } from "@/shared/components/location/CitySelect";
import { Button } from "@/shared/components/ui/button";
import {
  readPreferredCity,
  subscribePreferredCity,
  writePreferredCity,
} from "@/shared/services/cityPreference";

const dateOptions = buildDateOptions();
const ownerWorkspacePrefix = "bms-owner-workspace:";

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

const detailCrew = [
  { name: "Mudassar Aziz", role: "Director" },
  { name: "Bhushan Kumar", role: "Producer" },
  { name: "Renu Ravi Chopra", role: "Producer" },
  { name: "T-Series", role: "Presenter" },
  { name: "B.R. Chopra", role: "Presenter" },
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

const suggestedTitles = ["Chand Mera Dil", "Rajni Ki Baraat", "Bhooth Bangla", "Daadi Ki Shaadi"];

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
  const [ownerWorkspaces, setOwnerWorkspaces] = useState([]);
  const [bookingMode, setBookingMode] = useState(
    () => typeof window !== "undefined" && window.location.hash === "#showtimes",
  );

  useEffect(() => {
    setOwnerWorkspaces(readOwnerWorkspaces());
  }, []);

  useEffect(() => {
    const syncHash = () => setBookingMode(window.location.hash === "#showtimes");
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  const citySuggestions = useMemo(
    () => buildMovieCitySuggestions(ownerWorkspaces),
    [ownerWorkspaces],
  );

  useEffect(() => {
    writePreferredCity(selectedCity);
  }, [selectedCity]);

  useEffect(() => subscribePreferredCity(setSelectedCity), []);

  const selectedDateLabel = useMemo(() => getDateLabel(activeDate), [activeDate]);
  const cinemaListings = useMemo(
    () => buildCinemaListings({ movie, selectedCity, activeDate, ownerWorkspaces }),
    [activeDate, movie, ownerWorkspaces, selectedCity],
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
                <Button
                  size="lg"
                  onClick={() => {
                    setBookingMode(true);
                    window.location.hash = "showtimes";
                  }}
                >
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
        <MovieDetailsContent movie={movie} />
      )}
    </div>
  );
}

function MovieDetailsContent({ movie }) {
  return (
    <div className="mx-auto mt-12 grid max-w-7xl gap-10 px-4">
      <section>
        <h2 className="text-xl font-bold">About the movie</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          {detailAboutText}
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold">Top offers for you</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {detailOffers.map((offer) => (
            <div key={offer} className="rounded-lg border border-border/60 bg-card p-4">
              <div className="flex items-start gap-3">
                <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                  offer
                </span>
                <div>
                  <p className="text-sm font-semibold">{offer}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Tap to view details</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold">Cast</h2>
        <div className="mt-4 grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-6">
          {detailCast.map((name) => (
            <ProfileBubble key={name} name={name} role="Actor" />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold">Crew</h2>
        <div className="mt-4 grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-5">
          {detailCrew.map((person) => (
            <ProfileBubble
              key={`${person.name}-${person.role}`}
              name={person.name}
              role={person.role}
            />
          ))}
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">Top reviews</h2>
            <p className="mt-1 text-sm text-muted-foreground">8K reviews</p>
            <p className="text-sm text-muted-foreground">Summary of 8K reviews.</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {reviewTags.map(([tag, count]) => (
            <span
              key={tag}
              className="rounded-full border border-border/60 bg-card px-3 py-1.5 text-xs font-medium"
            >
              {tag} <span className="text-muted-foreground">{count}</span>
            </span>
          ))}
        </div>

        <div className="mt-5 grid gap-3">
          {topReviews.map((review) => (
            <article key={review.name} className="rounded-lg border border-border/60 bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  {review.tags && (
                    <p className="mb-2 text-xs font-medium text-primary">{review.tags}</p>
                  )}
                  <p className="font-semibold">{review.name}</p>
                  <p className="text-xs text-muted-foreground">Booked on</p>
                </div>
                <span className="rounded-md bg-primary/10 px-2 py-1 text-sm font-bold text-primary">
                  {review.rating}
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{review.text}</p>
              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <span>{review.likes}</span>
                <span>12 Days ago</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold">Critic reviews</h2>
          <button type="button" className="text-sm font-medium text-primary hover:underline">
            See all
          </button>
        </div>
        <article className="rounded-lg border border-border/60 bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Pati Patni Aur Woh Do</p>
              <p className="mt-1 text-xs text-muted-foreground">News 18</p>
            </div>
            <span className="rounded-md bg-primary/10 px-2 py-1 text-sm font-bold text-primary">
              7/10
            </span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            It works best when you surrender to its logic-defying energy and go along for the ride.
          </p>
        </article>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold">You might also like</h2>
          <button type="button" className="text-sm font-medium text-primary hover:underline">
            View All
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {suggestedTitles.map((title) => (
            <div key={title} className="overflow-hidden rounded-lg border border-border/60 bg-card">
              <div className="grid aspect-[2/3] place-items-center bg-muted">
                {movie.poster ? (
                  <img
                    src={movie.poster}
                    alt={title}
                    className="h-full w-full object-cover opacity-80"
                  />
                ) : (
                  <span className="text-lg font-bold text-primary">{initials(title)}</span>
                )}
              </div>
              <p className="p-3 text-sm font-semibold">{title}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ProfileBubble({ name, role }) {
  return (
    <div className="text-center">
      <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-primary/25 to-accent/25 ring-1 ring-border/60">
        <span className="text-sm font-bold text-foreground">{initials(name)}</span>
      </div>
      <p className="mt-2 text-sm font-medium">{name}</p>
      <p className="text-xs text-muted-foreground">{role}</p>
    </div>
  );
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
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 lg:flex-row lg:items-end lg:justify-between">
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
        <div className="mx-auto grid max-w-7xl gap-4 px-4 md:grid-cols-[minmax(0,1fr)_auto]">
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

      <div className="mx-auto max-w-7xl px-4 py-4">
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Moon className="h-4 w-4" /> Late night shows
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Sunrise className="h-4 w-4" /> Early morning shows
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
              <h3 className="mt-3 font-semibold">No matching shows in {selectedCity}</h3>
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

function buildCinemaListings({ movie, selectedCity, activeDate, ownerWorkspaces }) {
  const city = selectedCity || "Bengaluru";
  const staticListings = theaters
    .filter((theater) => sameCity(theater.city, city) && theaterHasMovie(theater, movie.id))
    .map((theater) => {
      const plans =
        theater.showPlan ??
        showTimes.map((time, index) => ({ time, status: inferShowStatus(index) }));
      return {
        id: theater.id,
        name: theater.name,
        city: theater.city,
        area: theater.area,
        address: theater.address,
        distance: theater.distance,
        amenities: splitAmenities(theater.amenities),
        logoText: theater.logoText,
        isOwner: false,
        shows: plans.map((plan, index) => buildStaticShow(movie, theater, plan, index)),
      };
    });

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
        logoText: initials(profile.name),
        isOwner: true,
        shows,
      };
    })
    .filter(Boolean);

  return [...ownerListings, ...staticListings].filter((cinema) => cinema.shows.length > 0);
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

function buildStaticShow(movie, theater, plan, index) {
  const time = typeof plan === "string" ? plan : plan.time;
  const format = typeof plan === "string" ? undefined : plan.format;
  const status =
    typeof plan === "string" ? inferShowStatus(index) : plan.status || inferShowStatus(index);
  return {
    id: `${movie.id}-${theater.id}-${index}`,
    label: time,
    screen: typeof plan === "string" ? "Screen 3" : plan.screen || "Screen 3",
    status,
    format: format || (index % 2 === 0 ? movie.format[0] || "2D" : "2D"),
    language: movie.language,
    cancellable: typeof plan === "string" ? index % 2 === 1 : Boolean(plan.cancellable),
    price: {
      platinum: 180 + index * 10,
      silver: 220 + index * 12,
      gold: 250 + index * 15,
      vip: 400 + index * 20,
    },
  };
}

function formatOwnerShow(show) {
  const gold = Number(show.pricing?.gold || show.price || 250);
  const silver = Number(show.pricing?.silver || gold);
  const platinum = Number(show.pricing?.platinum || gold);
  const vip = Number(show.pricing?.vip || platinum);

  return {
    id: show.id,
    label: show.startTime ? formatTimeLabel(show.startTime) : show.time || "Showtime",
    screen: show.screen || "Screen 1",
    status: normalizeShowStatus(show.status),
    format: show.format || "2D",
    language: show.language || "English",
    cancellable: show.cancellable !== false,
    price: { platinum, silver, gold, vip },
    seatLayout: show.seatLayout,
  };
}

function inferShowStatus(index) {
  if (index === 4) return "sold";
  if (index === 3) return "fast";
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

function buildMovieCitySuggestions(ownerWorkspaces) {
  const cities = theaters.map((theater) => theater.city).filter(Boolean);
  ownerWorkspaces.forEach((workspace) => {
    if (workspace.cinemaProfile?.city) cities.push(workspace.cinemaProfile.city);
  });

  return cities;
}

function theaterHasMovie(theater, movieId) {
  return !Array.isArray(theater.movieIds) || theater.movieIds.includes(movieId);
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
