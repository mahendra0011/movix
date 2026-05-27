import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronRight,
  Play,
  Sparkles,
  Star,
  TrendingUp,
  Ticket,
  Calendar,
  Gift,
  Smartphone,
  BellRing,
  Quote,
  Flame,
  Clapperboard,
  Search,
  CheckCircle2,
  Building2,
} from "lucide-react";
import { fetchMovies } from "@/features/movies/api/moviesApi";
import { movies as fallbackMovies } from "@/features/movies/data/movieCatalog";
import { MovieCard } from "@/features/movies/components/MovieCard";
import { SpotlightCard } from "@/shared/components/reactbits/SpotlightCard";
import { StaggeredText } from "@/shared/components/reactbits/StaggeredText";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { requestJson } from "@/shared/services/httpClient";
import {
  readHomeSearchQuery,
  subscribeHomeSearchQuery,
  writeHomeSearchQuery,
} from "@/shared/services/homeSearch";
const Route = createFileRoute("/")({
  loader: () => fetchMovies(),
  component: Home,
});
const cinemas = [
  { name: "PVR INOX: Orion Mall", features: "IMAX, Dolby Atmos", screens: 11, rating: 4.7 },
  { name: "INOX: Garuda Mall", features: "Laser projection, recliners", screens: 5, rating: 4.5 },
  {
    name: "Cinepolis: Forum Shantiniketan",
    features: "VIP lounges, 4K projection",
    screens: 8,
    rating: 4.6,
  },
  { name: "PVR: Vega City", features: "Dolby Atmos, premium seats", screens: 9, rating: 4.6 },
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
  const catalog = loadedMovies.length > 0 ? loadedMovies : fallbackMovies;
  const featured = catalog[0] ?? fallbackMovies[0];
  const [query, setQuery] = useState(readHomeSearchQuery);
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeLanguage, setActiveLanguage] = useState("All");
  const [activeFormat, setActiveFormat] = useState("All");
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterMessage, setNewsletterMessage] = useState("");
  const [newsletterBusy, setNewsletterBusy] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});
  const filteredMovies = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return catalog.filter((movie) => {
      const categoryMatch =
        activeCategory === "All" || movie.genres.some((genre) => genre === activeCategory);
      const languageMatch = activeLanguage === "All" || movie.language === activeLanguage;
      const formatMatch =
        activeFormat === "All" || (movie.format ?? []).some((format) => format === activeFormat);
      const searchable = [
        movie.title,
        movie.language,
        movie.duration,
        movie.certificate,
        movie.description,
        ...movie.genres,
        ...(movie.format ?? []),
        ...(movie.cast ?? []).flatMap((member) => [member.name, member.role]),
      ]
        .join(" ")
        .toLowerCase();
      return (
        categoryMatch && languageMatch && formatMatch && (!needle || searchable.includes(needle))
      );
    });
  }, [activeCategory, activeFormat, activeLanguage, catalog, query]);
  const availableCategories = useMemo(
    () => ["All", ...Array.from(new Set(catalog.flatMap((movie) => movie.genres)))],
    [catalog],
  );
  const availableLanguages = useMemo(
    () => ["All", ...Array.from(new Set(catalog.map((movie) => movie.language).filter(Boolean)))],
    [catalog],
  );
  const availableFormats = useMemo(
    () => ["All", ...Array.from(new Set(catalog.flatMap((movie) => movie.format ?? [])))],
    [catalog],
  );
  const hasActiveFilters =
    activeCategory !== "All" || activeLanguage !== "All" || activeFormat !== "All";
  const shelfMovies = hasActiveFilters ? filteredMovies : catalog;
  const activeSearchQuery = query.trim();
  const rotateShelf = (offset) => [...shelfMovies.slice(offset), ...shelfMovies.slice(0, offset)];
  const trending = expandedSections.recommended ? shelfMovies : shelfMovies.slice(0, 6);
  const recommended = hasActiveFilters
    ? shelfMovies
    : expandedSections.comingSoon
      ? rotateShelf(2)
      : shelfMovies.slice(2, 8);
  const premieres = hasActiveFilters
    ? shelfMovies
    : expandedSections.premieres
      ? rotateShelf(3)
      : shelfMovies.slice(3, 7);

  useEffect(() => subscribeHomeSearchQuery(setQuery), []);

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

  const clearFilters = () => {
    setActiveCategory("All");
    setActiveLanguage("All");
    setActiveFormat("All");
  };

  if (!featured) return null;
  if (activeSearchQuery) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <section className="rounded-lg border border-border/60 bg-card/40 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Search results</h1>
              <p className="text-sm text-muted-foreground">
                {filteredMovies.length} result{filteredMovies.length === 1 ? "" : "s"} for "
                {activeSearchQuery}"
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setQuery("");
                clearFilters();
                writeHomeSearchQuery("");
              }}
            >
              Clear
            </Button>
          </div>

          {filteredMovies.length > 0 ? (
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {filteredMovies.map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-lg border border-border/60 bg-background/60 p-8 text-center">
              <Search className="mx-auto h-8 w-8 text-primary" />
              <h2 className="mt-4 text-xl font-bold">No movies found</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                Try another movie title, category, language, format, cinema, or city.
              </p>
            </div>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="pb-20">
      {/* Hero */}
      <section className="relative">
        <div className="cinema-grid relative h-[460px] overflow-hidden md:h-[560px]">
          <img
            src={featured.backdrop}
            alt={featured.title}
            className="hero-kenburns absolute inset-0 h-full w-full object-cover"
          />
          <div className="hero-sweep absolute inset-0" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
          <div className="relative mx-auto flex h-full max-w-7xl items-end gap-10 px-4 pb-12 md:items-center md:pb-0">
            <div className="hero-content-enter max-w-xl">
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
            <div className="hero-poster-float relative hidden md:block">
              <img
                src={featured.poster}
                alt={featured.title}
                className="relative aspect-[2/3] w-64 rounded-2xl object-cover shadow-2xl ring-1 ring-white/10 transition-transform duration-500 hover:rotate-1 hover:scale-[1.03]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Movie filters */}
      <section className="mx-auto mt-10 max-w-7xl px-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Clapperboard className="h-4 w-4 shrink-0 text-primary" />
            <h3 className="text-xs font-semibold uppercase text-muted-foreground">Movie filters</h3>
            <div className="h-px flex-1 bg-border/60" />
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="shrink-0 text-xs font-medium text-primary hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="mt-4 grid gap-4">
          <FilterChipRow
            label="Category"
            options={availableCategories}
            activeValue={activeCategory}
            onChange={setActiveCategory}
          />
          <FilterChipRow
            label="Language"
            options={availableLanguages}
            activeValue={activeLanguage}
            onChange={setActiveLanguage}
          />
          <FilterChipRow
            label="Format"
            options={availableFormats}
            activeValue={activeFormat}
            onChange={setActiveFormat}
          />
        </div>
      </section>

      {hasActiveFilters && filteredMovies.length === 0 && (
        <section className="mx-auto mt-8 max-w-7xl px-4">
          <div className="rounded-lg border border-border/60 bg-card/40 p-8 text-center">
            <Search className="mx-auto h-8 w-8 text-primary" />
            <h2 className="mt-4 text-xl font-bold">No movies match these filters</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Try a different category, language, or format combination.
            </p>
            <Button type="button" variant="secondary" className="mt-5" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        </section>
      )}

      {/* Trending */}
      <Section
        title="Recommended movies"
        subtitle="Most booked this week"
        icon={<TrendingUp className="h-5 w-5 text-primary" />}
        actionLabel={expandedSections.recommended ? "Show less" : "See all"}
        onAction={() => toggleSection("recommended")}
      >
        <div className="movie-grid-animate grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {trending.map((m) => (
            <MovieCard key={m.id} movie={m} />
          ))}
        </div>
      </Section>

      {/* Promotions */}
      <section className="mx-auto mt-12 max-w-7xl px-4">
        <div className="stagger-grid grid gap-4 md:grid-cols-3">
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
        <div className="stagger-grid grid gap-4 md:grid-cols-2">
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
        subtitle="Curated upcoming picks"
        icon={<Calendar className="h-5 w-5 text-primary" />}
        actionLabel={expandedSections.comingSoon ? "Show less" : "See all"}
        onAction={() => toggleSection("comingSoon")}
      >
        <div className="movie-grid-animate grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {recommended.map((m) => (
            <MovieCard key={m.id} movie={m} />
          ))}
        </div>
      </Section>

      {/* Cinema partners */}
      <Section
        title="Cinema partners"
        subtitle="Premium screens, Dolby Atmos & recliners"
        icon={<Building2 className="h-5 w-5 text-primary" />}
        actionHref={`/movies/${featured.id}#showtimes`}
      >
        <div className="stagger-grid grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cinemas.map((c) => (
            <a key={c.name} href={`/movies/${featured.id}#showtimes`} className="group block">
              <SpotlightCard className="rounded-lg p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{c.name}</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">{c.features}</p>
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

function FilterChipRow({ label, options, activeValue, onChange }) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <p className="w-20 shrink-0 text-xs font-semibold uppercase text-muted-foreground">
          {label}
        </p>
        <div className="h-px flex-1 bg-border/50" />
      </div>
      <div className="mt-2 flex gap-2 overflow-x-auto pb-2">
        {options.map((option) => (
          <button
            key={`${label}-${option}`}
            type="button"
            aria-pressed={activeValue === option}
            onClick={() => onChange(option)}
            className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
              activeValue === option
                ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/30"
                : "border-border/60 text-muted-foreground hover:border-foreground/30 hover:text-foreground"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
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
