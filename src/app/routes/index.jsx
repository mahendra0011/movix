import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronRight,
  Play,
  Sparkles,
  Star,
  TrendingUp,
  Ticket,
  MapPin,
  Calendar,
  Gift,
  Smartphone,
  BellRing,
  Quote,
  Flame,
  Clapperboard,
  Search,
  CheckCircle2,
} from "lucide-react";
import { fetchMovies } from "@/features/movies/api/moviesApi";
import { movies as fallbackMovies } from "@/features/movies/data/movieCatalog";
import { MovieCard } from "@/features/movies/components/MovieCard";
import { SpotlightCard } from "@/shared/components/reactbits/SpotlightCard";
import { StaggeredText } from "@/shared/components/reactbits/StaggeredText";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { requestJson } from "@/shared/services/httpClient";
const Route = createFileRoute("/")({
  loader: () => fetchMovies(),
  validateSearch: (search) => ({
    q: typeof search.q === "string" ? search.q : "",
  }),
  component: Home,
});
const genres = ["All", "Action", "Sci-Fi", "Drama", "Comedy", "Animation", "Thriller", "Crime"];
const cinemas = [
  { name: "PVR INOX: Orion Mall", area: "Rajajinagar, Bengaluru", screens: 11, rating: 4.7 },
  { name: "INOX: Garuda Mall", area: "Magrath Road, Bengaluru", screens: 5, rating: 4.5 },
  {
    name: "Cinepolis: Forum Shantiniketan",
    area: "Whitefield, Bengaluru",
    screens: 8,
    rating: 4.6,
  },
  { name: "PVR: Vega City", area: "Bannerghatta Road, Bengaluru", screens: 9, rating: 4.6 },
];
const testimonials = [
  {
    name: "Aarav S.",
    text: "Booking was instant. The seat-locking countdown gave me the perfect nudge to commit.",
    role: "Frequent moviegoer",
  },
  {
    name: "Priya M.",
    text: "Cleanest movie booking UI I've used. Cinematic, dark, beautiful - feels like Netflix for tickets.",
    role: "Film student",
  },
  {
    name: "Rahul K.",
    text: "Loved the QR ticket. Walked in, scanned, popcorn. Done.",
    role: "Casual viewer",
  },
];
const stats = [
  { value: `${fallbackMovies.length}`, label: "Movies live" },
  { value: `${cinemas.length}`, label: "Partner cinemas" },
  { value: "5 min", label: "Seat lock window" },
  { value: "Live", label: "Seat sync" },
];
const promotions = [
  {
    title: "ScreenCare",
    desc: "Round up and support cinema workers",
    c: "from-primary/30 to-primary/5",
    icon: Gift,
    to: "/dashboard",
  },
  {
    title: "Gift Passes",
    desc: "Send cinema credits instantly",
    c: "from-vip/30 to-vip/5",
    icon: Ticket,
    to: "/auth",
  },
  {
    title: "Film Journal",
    desc: "Reviews, stories and release guides",
    c: "from-platinum/30 to-platinum/5",
    icon: Clapperboard,
    to: "/",
  },
];

function trailerSearchUrl(title) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${title} official trailer`)}`;
}

function Home() {
  const loadedMovies = Route.useLoaderData();
  const { q } = Route.useSearch();
  const catalog = loadedMovies.length > 0 ? loadedMovies : fallbackMovies;
  const featured = catalog[0] ?? fallbackMovies[0];
  const [query, setQuery] = useState(q);
  const [activeGenre, setActiveGenre] = useState("All");
  const [activeLanguage, setActiveLanguage] = useState("All");
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterMessage, setNewsletterMessage] = useState("");
  const [newsletterBusy, setNewsletterBusy] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});
  const filteredMovies = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return catalog.filter((movie) => {
      const searchable = [movie.title, movie.language, ...movie.genres].join(" ").toLowerCase();
      const queryMatch = !needle || searchable.includes(needle);
      const genreMatch = activeGenre === "All" || movie.genres.includes(activeGenre);
      const languageMatch = activeLanguage === "All" || movie.language === activeLanguage;
      return queryMatch && genreMatch && languageMatch;
    });
  }, [activeGenre, activeLanguage, catalog, query]);
  const availableLanguages = useMemo(
    () => ["All", ...Array.from(new Set(catalog.map((movie) => movie.language)))],
    [catalog],
  );
  const shelfMovies = filteredMovies.length > 0 ? filteredMovies : catalog;
  const rotateShelf = (offset) => [...shelfMovies.slice(offset), ...shelfMovies.slice(0, offset)];
  const trending = expandedSections.recommended ? shelfMovies : shelfMovies.slice(0, 6);
  const recommended = expandedSections.comingSoon ? rotateShelf(2) : shelfMovies.slice(2, 8);
  const premieres = expandedSections.premieres ? rotateShelf(3) : shelfMovies.slice(3, 7);

  useEffect(() => {
    setQuery(q);
  }, [q]);

  const subscribe = async (event) => {
    event.preventDefault();
    setNewsletterBusy(true);
    setNewsletterMessage("");
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

  const toggleSection = (section) => {
    setExpandedSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  };

  if (!featured) return null;
  return (
    <div className="pb-20">
      {/* Hero */}
      <section className="relative">
        <div className="cinema-grid relative h-[460px] overflow-hidden md:h-[560px]">
          <img
            src={featured.backdrop}
            alt={featured.title}
            className="absolute inset-0 h-full w-full object-cover scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
          <div className="relative mx-auto flex h-full max-w-7xl items-end gap-10 px-4 pb-12 md:items-center md:pb-0">
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/15 px-3 py-1 text-xs font-medium text-primary backdrop-blur">
                <Sparkles className="h-3 w-3" /> Trending #1 this week
              </span>
              <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-6xl">
                <StaggeredText text={featured.title} />
              </h1>
              <div className="mt-3 flex items-center gap-3 text-sm">
                <span className="inline-flex items-center gap-1 rounded-md bg-card/70 px-2 py-1 backdrop-blur">
                  <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                  <span className="font-semibold">{featured.rating}</span>
                  <span className="text-muted-foreground">/10</span>
                </span>
                <span className="text-muted-foreground">{featured.votes} votes</span>
                <span className="hidden text-muted-foreground md:inline">
                  - {featured.certificate}
                </span>
              </div>
              <p className="mt-4 text-sm text-muted-foreground md:text-base">
                {featured.description}
              </p>
              <form
                onSubmit={(event) => event.preventDefault()}
                className="mt-6 flex max-w-xl items-center gap-2 rounded-lg border border-border/70 bg-background/65 p-2 shadow-2xl shadow-black/20 backdrop-blur"
              >
                <Search className="ml-2 h-5 w-5 shrink-0 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search movies by title, genre or language"
                  className="h-11 border-0 bg-transparent shadow-none focus-visible:ring-0"
                />
              </form>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                {featured.genres.map((g) => (
                  <span
                    key={g}
                    className="rounded-full border border-border/60 bg-background/40 px-2.5 py-1 backdrop-blur"
                  >
                    {g}
                  </span>
                ))}
                <span className="rounded-full border border-border/60 bg-background/40 px-2.5 py-1 backdrop-blur">
                  {featured.duration}
                </span>
              </div>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button asChild size="lg" className="gap-2 shadow-lg shadow-primary/30">
                  <Link to="/movies/$id" params={{ id: featured.id }}>
                    <Ticket className="h-4 w-4" /> Book tickets
                  </Link>
                </Button>
                <Button size="lg" variant="secondary" className="gap-2 backdrop-blur" asChild>
                  <a href={trailerSearchUrl(featured.title)} target="_blank" rel="noreferrer">
                    <Play className="h-4 w-4" /> Watch trailer
                  </a>
                </Button>
              </div>
            </div>

            {/* Floating poster */}
            <div className="relative hidden md:block">
              <img
                src={featured.poster}
                alt={featured.title}
                className="relative aspect-[2/3] w-64 rounded-2xl object-cover shadow-2xl ring-1 ring-white/10"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Quick stats strip */}
      <section className="mx-auto mt-8 max-w-7xl px-4">
        <SpotlightCard className="grid grid-cols-2 gap-3 rounded-lg p-5 backdrop-blur md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="bg-gradient-to-r from-primary to-vip bg-clip-text text-2xl font-bold text-transparent md:text-3xl">
                {s.value}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </SpotlightCard>
      </section>

      {/* Filters */}
      <section className="mx-auto mt-10 max-w-7xl px-4">
        <div className="flex items-center gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Genre
          </h3>
          <div className="h-px flex-1 bg-border/60" />
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
          {genres.map((g) => (
            <button
              key={g}
              onClick={() => setActiveGenre(g)}
              className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-medium transition-all ${activeGenre === g ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/30" : "border-border/60 text-muted-foreground hover:border-foreground/30 hover:text-foreground"}`}
            >
              {g}
            </button>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Language
          </h3>
          <div className="h-px flex-1 bg-border/60" />
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
          {availableLanguages.map((l) => (
            <button
              key={l}
              onClick={() => setActiveLanguage(l)}
              className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${activeLanguage === l ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/30" : "border-border/60 text-muted-foreground hover:border-foreground/30 hover:text-foreground"}`}
            >
              {l}
            </button>
          ))}
        </div>
      </section>

      {/* Trending */}
      <Section
        title="Recommended movies"
        subtitle="Most booked this week"
        icon={<TrendingUp className="h-5 w-5 text-primary" />}
        actionLabel={expandedSections.recommended ? "Show less" : "See all"}
        onAction={() => toggleSection("recommended")}
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {trending.map((m) => (
            <MovieCard key={m.id} movie={m} />
          ))}
        </div>
      </Section>

      {/* Promotions */}
      <section className="mx-auto mt-12 max-w-7xl px-4">
        <div className="grid gap-4 md:grid-cols-3">
          {promotions.map((p) => (
            <Link key={p.title} to={p.to} className="group block">
              <SpotlightCard
                className={`rounded-lg bg-gradient-to-br ${p.c} p-6 transition-all hover:-translate-y-0.5 hover:border-foreground/20`}
              >
                <p.icon className="h-8 w-8 text-foreground/90" />
                <h3 className="mt-4 text-lg font-semibold">{p.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary">
                  Explore
                  <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </span>
              </SpotlightCard>
            </Link>
          ))}
        </div>
      </section>

      {/* Premiere of the week - wide cards */}
      <Section
        title="Premieres of the week"
        subtitle="Brand new films, only in theatres"
        icon={<Flame className="h-5 w-5 text-primary" />}
        actionLabel={expandedSections.premieres ? "Show less" : "See all"}
        onAction={() => toggleSection("premieres")}
      >
        <div className="grid gap-4 md:grid-cols-2">
          {premieres.map((m) => (
            <Link
              key={m.id}
              to="/movies/$id"
              params={{ id: m.id }}
              className="group relative h-44 overflow-hidden rounded-2xl border border-border/60"
            >
              <img
                src={m.backdrop}
                alt={m.title}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent" />
              <div className="relative flex h-full items-center gap-4 p-5">
                <img
                  src={m.poster}
                  alt={m.title}
                  className="h-32 w-22 rounded-lg object-cover shadow-xl"
                />
                <div className="min-w-0">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                    <Flame className="h-3 w-3" /> Premiere
                  </span>
                  <h3 className="mt-2 truncate text-lg font-bold">{m.title}</h3>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{m.description}</p>
                  <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <Star className="h-3 w-3 fill-primary text-primary" /> {m.rating} - {m.duration}{" "}
                    - {m.certificate}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </Section>

      {/* Coming soon */}
      <Section
        title="Coming soon"
        subtitle="Premieres near you"
        icon={<Calendar className="h-5 w-5 text-primary" />}
        actionLabel={expandedSections.comingSoon ? "Show less" : "See all"}
        onAction={() => toggleSection("comingSoon")}
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {recommended.map((m) => (
            <MovieCard key={m.id} movie={m} />
          ))}
        </div>
      </Section>

      {/* Cinemas near you */}
      <Section
        title="Top cinemas near you"
        subtitle="Premium screens, Dolby Atmos & recliners"
        icon={<MapPin className="h-5 w-5 text-primary" />}
        actionHref={`/movies/${featured.id}#showtimes`}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cinemas.map((c) => (
            <a key={c.name} href={`/movies/${featured.id}#showtimes`} className="group block">
              <SpotlightCard className="rounded-lg p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{c.name}</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">{c.area}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-md bg-primary/15 px-2 py-1 text-xs font-semibold text-primary">
                    <Star className="h-3 w-3 fill-primary text-primary" />
                    {c.rating}
                  </span>
                </div>
                <div className="mt-5 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{c.screens} screens - Dolby</span>
                  <span className="inline-flex items-center gap-1 text-primary">
                    Showtimes <ChevronRight className="h-3 w-3" />
                  </span>
                </div>
              </SpotlightCard>
            </a>
          ))}
        </div>
      </Section>

      {/* Testimonials */}
      <Section
        title="Loved by movie lovers"
        subtitle="What our users say"
        icon={<Quote className="h-5 w-5 text-primary" />}
      >
        <div className="grid gap-4 md:grid-cols-3">
          {testimonials.map((t) => (
            <SpotlightCard key={t.name} className="rounded-lg p-6">
              <Quote className="h-6 w-6 text-primary/60" />
              <p className="mt-3 text-sm leading-relaxed text-foreground/90">"{t.text}"</p>
              <div className="mt-5 flex items-center gap-3 border-t border-border/60 pt-4">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-primary to-vip text-sm font-bold text-primary-foreground">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-[11px] text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </SpotlightCard>
          ))}
        </div>
      </Section>

      {/* App download CTA */}
      <section className="mx-auto mt-16 max-w-7xl px-4">
        <SpotlightCard className="rounded-lg bg-gradient-to-br from-primary/20 via-card to-accent/20 p-8 md:p-12">
          <div className="relative grid items-center gap-8 md:grid-cols-2">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 px-3 py-1 text-xs font-medium text-primary">
                <Smartphone className="h-3 w-3" /> Mobile alerts
              </span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
                Never miss a seat.
                <br />
                Get launch alerts.
              </h2>
              <p className="mt-3 max-w-md text-sm text-muted-foreground">
                Save your email once and receive new-release alerts, booking reminders and exclusive
                early access updates from the notifications service.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button size="lg" className="gap-2" asChild>
                  <a href="#newsletter">
                    <BellRing className="h-4 w-4" /> Notify me
                  </a>
                </Button>
                <Button size="lg" variant="secondary" className="gap-2" asChild>
                  <Link to="/movies/$id" params={{ id: featured.id }}>
                    <Ticket className="h-4 w-4" /> Book now
                  </Link>
                </Button>
              </div>
            </div>
            <div className="hidden justify-end md:flex">
              <div className="relative">
                <div className="relative grid h-56 w-32 place-items-center rounded-[2rem] border-4 border-foreground/10 bg-background shadow-2xl">
                  <Ticket className="h-12 w-12 text-primary" />
                </div>
              </div>
            </div>
          </div>
        </SpotlightCard>
      </section>

      {/* Newsletter */}
      <section id="newsletter" className="mx-auto mt-12 max-w-3xl px-4 text-center">
        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Never miss a premiere</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Get weekly updates on new releases and exclusive member-only previews.
        </p>
        <form onSubmit={subscribe} className="mx-auto mt-5 flex max-w-md gap-2">
          <Input
            type="email"
            value={newsletterEmail}
            onChange={(event) => setNewsletterEmail(event.target.value)}
            placeholder="you@example.com"
            className="h-11 border-border/60 bg-card/60"
          />
          <Button size="lg" className="shrink-0 gap-2" disabled={newsletterBusy}>
            {newsletterMessage ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <BellRing className="h-4 w-4" />
            )}
            {newsletterBusy ? "Saving..." : "Subscribe"}
          </Button>
        </form>
        {newsletterMessage && <p className="mt-3 text-sm text-primary">{newsletterMessage}</p>}
      </section>
    </div>
  );
}
function Section({
  title,
  subtitle,
  icon,
  children,
  actionTo,
  actionHref,
  actionLabel = "See all",
  onAction,
}) {
  return (
    <section className="mx-auto mt-14 max-w-7xl px-4">
      <div className="mb-5 flex items-end justify-between">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/15">{icon}</div>
          )}
          <div>
            <h2 className="text-xl font-bold tracking-tight md:text-2xl">{title}</h2>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {onAction && (
          <button
            type="button"
            onClick={onAction}
            className="inline-flex shrink-0 items-center gap-1 text-sm text-primary hover:underline"
          >
            {actionLabel} <ChevronRight className="h-4 w-4" />
          </button>
        )}
        {!onAction && actionTo && (
          <Link
            to={actionTo}
            className="inline-flex shrink-0 items-center gap-1 text-sm text-primary hover:underline"
          >
            {actionLabel} <ChevronRight className="h-4 w-4" />
          </Link>
        )}
        {!onAction && actionHref && (
          <a
            href={actionHref}
            className="inline-flex shrink-0 items-center gap-1 text-sm text-primary hover:underline"
          >
            {actionLabel} <ChevronRight className="h-4 w-4" />
          </a>
        )}
      </div>
      {children}
    </section>
  );
}
export { Route };
