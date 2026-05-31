import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Bell,
  CalendarClock,
  CalendarDays,
  Check,
  Clock,
  Film,
  Languages,
  Play,
  Share2,
  Sparkles,
  Ticket,
  Users,
} from "lucide-react";
import { CastShowcase } from "@/features/movies/components/CastShowcase";
import { comingSoonMovies as fallbackMovies } from "@/features/movies/data/movieCatalog";
import {
  castAvatarFallback,
  isGeneratedImageUrl,
  movieImageFallback,
  normalizeMovieImageUrl,
  normalizeMovieMedia,
} from "@/features/movies/services/movieMedia";
import { Button } from "@/shared/components/ui/button";
import { readPreferredCity } from "@/shared/services/cityPreference";
import { requestJson } from "@/shared/services/httpClient";

const bundledComingSoonById = new Map(
  fallbackMovies
    .map(normalizeMovieMedia)
    .flatMap((movie) =>
      [movie.id, movie.movieId, movie.title, `coming-soon-${movie.id}`]
        .filter(Boolean)
        .map((key) => [normalizeLookupKey(key), movie]),
    ),
);

const Route = createFileRoute("/coming-soon_/$id")({
  loader: async ({ params }) => {
    const movie = await fetchComingSoonMovie(params.id, readPreferredCity());
    if (!movie) throw notFound();
    return { movie };
  },
  component: ComingSoonDetailPage,
});

function ComingSoonDetailPage() {
  const { movie } = Route.useLoaderData();
  const [notified, setNotified] = useState(false);
  const [message, setMessage] = useState("");
  const castMembers = useMemo(() => getSixCastMembers(movie), [movie]);
  const genres = getMovieGenres(movie);
  const formats = getMovieFormats(movie);
  const languages = getMovieLanguages(movie);
  const releaseDate = movie.releaseDate || formatReleaseDate(movie.releaseAt);
  const trailerUrl = movie.trailerUrl || trailerSearchUrl(movie.title);
  const releaseHighlights = [
    { icon: CalendarDays, label: "Release", value: releaseDate },
    { icon: Clock, label: "Runtime", value: movie.duration || "Runtime TBA" },
    { icon: Languages, label: "Language", value: languages.join(", ") || movie.language },
    { icon: Ticket, label: "Format", value: formats.join(", ") || "2D" },
  ];

  const shareMovie = async () => {
    const url = `${window.location.origin}/coming-soon/${movie.movieId || movie.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: movie.title, text: movie.description, url });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      }
      setMessage("Movie link copied.");
    } catch {
      setMessage("Share cancelled.");
    }
  };

  return (
    <main className="pb-16">
      <section className="relative isolate overflow-hidden border-b border-border/60 bg-background">
        <img
          src={normalizeMovieImageUrl(movie.backdrop || movie.poster, movie.title, "backdrop")}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover opacity-30"
          onError={(event) => {
            event.currentTarget.src = movieImageFallback(movie.title, "backdrop");
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/88 to-background/45" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

        <div className="relative mx-auto grid max-w-[1560px] gap-7 px-4 py-8 sm:px-5 md:grid-cols-[220px_minmax(0,1fr)] md:py-10 lg:grid-cols-[250px_minmax(0,1fr)_320px] lg:items-center lg:px-6">
          <div className="mx-auto w-full max-w-[220px] overflow-hidden rounded-lg border border-border/70 bg-card shadow-xl shadow-black/10 md:mx-0 md:max-w-none">
            <img
              src={normalizeMovieImageUrl(movie.poster, movie.title, "poster")}
              alt={movie.title}
              className="aspect-[2/3] w-full object-cover"
              onError={(event) => {
                event.currentTarget.src = movieImageFallback(movie.title, "poster");
              }}
            />
            <a
              href={trailerUrl}
              target="_blank"
              rel="noreferrer"
              className="flex h-11 items-center justify-center gap-2 border-t border-border/60 bg-card text-sm font-semibold transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              <Play className="h-4 w-4" />
              Trailer
            </a>
          </div>

          <div>
            <Link
              to="/coming-soon"
              className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
              Coming soon
            </Link>
            <span className="inline-flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">
              <CalendarClock className="h-4 w-4" />
              Booking opens soon
            </span>
            <h1 className="mt-3 max-w-4xl text-3xl font-extrabold tracking-tight md:text-5xl">
              {movie.title}
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
              {movie.description || `${movie.title} is scheduled for an upcoming movix release.`}
            </p>

            <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold">
              {genres.slice(0, 4).map((genre) => (
                <span
                  key={genre}
                  className="rounded-md border border-border/60 bg-card px-3 py-1.5"
                >
                  {genre}
                </span>
              ))}
              <span className="rounded-md border border-border/60 bg-card px-3 py-1.5">
                {movie.certificate || "UA"}
              </span>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                size="lg"
                onClick={() => {
                  setNotified((current) => !current);
                  setMessage(notified ? "Reminder removed." : "Reminder set for this release.");
                }}
                className="gap-2"
              >
                {notified ? <Check className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                {notified ? "Reminder set" : "Notify me"}
              </Button>
              <Button size="lg" variant="secondary" className="gap-2" asChild>
                <a href={trailerUrl} target="_blank" rel="noreferrer">
                  <Play className="h-4 w-4" />
                  Watch trailer
                </a>
              </Button>
              <Button size="lg" variant="ghost" className="gap-2" onClick={shareMovie}>
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            </div>
            {message ? (
              <p className="mt-4 rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">
                {message}
              </p>
            ) : null}
          </div>

          <aside className="hidden gap-3 lg:grid">
            {releaseHighlights.map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="rounded-lg border border-border/60 bg-card/95 p-4 shadow-lg shadow-black/5 backdrop-blur"
              >
                <div className="flex items-start gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="mt-1 text-sm font-semibold">{value}</p>
                  </div>
                </div>
              </div>
            ))}
          </aside>
        </div>
      </section>

      <div className="mx-auto mt-10 grid max-w-[1560px] gap-10 px-4 sm:px-5 lg:px-6">
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <div>
            <SectionHeader icon={Film} eyebrow="Story" title="About the movie" />
            <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
              {movie.description || `${movie.title} is part of the upcoming movix slate.`}
            </p>
          </div>
          <ReleasePanel movie={movie} castCount={castMembers.length} />
        </section>

        <CastShowcase castMembers={castMembers} />

        <section className="grid gap-4 md:grid-cols-3">
          <InfoBand
            icon={CalendarClock}
            title="Release window"
            text={`${releaseDate}${movie.monthBucket ? ` - ${movie.monthBucket}` : ""}`}
          />
          <InfoBand
            icon={Sparkles}
            title="Interest"
            text={`${movie.votes || "New"} people tracking this title`}
          />
          <InfoBand
            icon={Users}
            title="Cities"
            text={(movie.cities ?? []).slice(0, 4).join(", ") || "Selected movix cities"}
          />
        </section>

        {movie.theaters?.length ? (
          <section>
            <h2 className="text-xl font-bold tracking-tight">Expected cinemas</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {movie.theaters.slice(0, 10).map((theater) => (
                <span
                  key={theater}
                  className="rounded-md border border-border/60 bg-card px-3 py-2 text-sm font-semibold shadow-sm"
                >
                  {theater}
                </span>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function SectionHeader({ icon: Icon, eyebrow, title }) {
  return (
    <div className="flex items-start gap-3">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase text-muted-foreground">{eyebrow}</p>
        <h2 className="mt-0.5 text-xl font-bold tracking-tight">{title}</h2>
      </div>
    </div>
  );
}

function ReleasePanel({ movie, castCount }) {
  const rows = [
    { icon: CalendarDays, label: "Release date", value: movie.releaseDate || "Coming soon" },
    { icon: Clock, label: "Duration", value: movie.duration || "Runtime TBA" },
    { icon: Languages, label: "Language", value: getMovieLanguages(movie).join(", ") },
    { icon: Users, label: "Cast", value: `${castCount} featured members` },
  ];

  return (
    <aside className="rounded-lg border border-border/60 bg-card p-4 shadow-sm">
      <div className="divide-y divide-border/60">
        {rows.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-sm font-semibold">{value}</p>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

function InfoBand({ icon: Icon, title, text }) {
  return (
    <article className="rounded-lg border border-border/60 bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/12 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p>
        </div>
      </div>
    </article>
  );
}

async function fetchComingSoonMovie(id, city = "") {
  const query = city ? `?city=${encodeURIComponent(city)}` : "";
  try {
    const data = await requestJson(`/api/shows/coming-soon/${encodeURIComponent(id)}${query}`, {
      timeoutMs: 8000,
    });
    if (data.movie) return normalizeComingSoonMovie(data.movie);
  } catch {
    // Static previews use the bundled upcoming catalog.
  }

  const fallbackMovie = findBundledComingSoonMovie({ id });
  return fallbackMovie ? normalizeComingSoonMovie(fallbackMovie) : null;
}

function normalizeComingSoonMovie(movie) {
  const normalized = normalizeMovieMedia(movie);
  const bundled = findBundledComingSoonMovie(normalized);
  const poster =
    isMissingImage(normalized.poster) && bundled?.poster ? bundled.poster : normalized.poster;
  const backdrop =
    isMissingImage(normalized.backdrop) && bundled?.backdrop
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
    id: normalized.id || `coming-soon-${normalized.movieId}`,
    movieId: normalized.movieId || stripComingSoonPrefix(normalized.id),
    title: normalized.title || normalized.movie || "Untitled movie",
    genres: getMovieGenres(normalized),
    languages: getMovieLanguages(normalized),
    formats: getMovieFormats(normalized),
    releaseAt,
    releaseDate,
    monthBucket: normalized.monthBucket || formatReleaseMonth(releaseAt),
    cities: Array.isArray(normalized.cities) ? normalized.cities : toFilterList(normalized.city),
    theaters: Array.isArray(normalized.theaters)
      ? normalized.theaters
      : toFilterList(normalized.theater),
  };
}

function getSixCastMembers(movie) {
  const bundled = findBundledComingSoonMovie(movie);
  const cast = uniqueCast([...(movie.cast ?? []), ...(bundled?.cast ?? [])]);

  return cast
    .filter((member) => member.name)
    .slice(0, 6)
    .map((member, index) => ({
      name: member.name,
      role: member.role || (index === 0 ? "Lead" : "Cast"),
      avatar: member.avatar || castAvatarFallback(member.name),
    }));
}

function uniqueCast(list = []) {
  const seen = new Set();
  return list
    .map((member) => ({
      name: String(member?.name ?? "").trim(),
      role: String(member?.role ?? "Cast").trim() || "Cast",
      avatar: String(member?.avatar ?? "").trim(),
    }))
    .filter((member) => {
      const key = normalizeText(member.name);
      if (!key || seen.has(key)) return false;
      if (!member.avatar || isGeneratedImageUrl(member.avatar)) return false;
      seen.add(key);
      return true;
    });
}

function findBundledComingSoonMovie(movie) {
  return (
    bundledComingSoonById.get(normalizeLookupKey(movie.id)) ||
    bundledComingSoonById.get(normalizeLookupKey(movie.movieId)) ||
    bundledComingSoonById.get(normalizeLookupKey(movie.title))
  );
}

function isMissingImage(value) {
  return !value || String(value).includes("/movix/movie-artwork/");
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

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function normalizeLookupKey(value) {
  return stripComingSoonPrefix(value)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function stripComingSoonPrefix(value) {
  return String(value ?? "").replace(/^coming-soon-/i, "");
}

function normalizeDateInput(value) {
  const raw = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return futureIsoDate(14);
}

function futureIsoDate(offsetDays) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
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

function trailerSearchUrl(title) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${title} official trailer`)}`;
}

export { Route };
