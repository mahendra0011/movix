import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Star, Clock, Calendar, Heart, Share2, Play } from "lucide-react";
import { fetchMovie } from "@/features/movies/api/moviesApi";
import { theaters, showTimes } from "@/features/movies/data/movieCatalog";
import { Button } from "@/shared/components/ui/button";
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
  return (
    <div className="pb-20">
      {/* Hero */}
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
                <Button asChild size="lg">
                  <a href="#showtimes">Book tickets</a>
                </Button>
                <Button size="lg" variant="secondary" className="gap-2">
                  <Play className="h-4 w-4" /> Trailer
                </Button>
                <Button size="lg" variant="ghost" className="gap-2">
                  <Heart className="h-4 w-4" /> Watchlist
                </Button>
                <Button size="lg" variant="ghost" className="gap-2">
                  <Share2 className="h-4 w-4" /> Share
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About */}
      <section className="mx-auto mt-12 max-w-7xl px-4">
        <h2 className="text-xl font-bold">About the movie</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          {movie.description}
        </p>
      </section>

      {/* Cast */}
      <section className="mx-auto mt-10 max-w-7xl px-4">
        <h2 className="text-xl font-bold">Cast</h2>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
          {movie.cast.map((c) => (
            <div key={c.name} className="text-center">
              <div className="mx-auto grid h-20 w-20 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-primary/25 to-accent/25 ring-1 ring-border/60">
                {c.avatar ? (
                  <img src={c.avatar} alt={c.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-foreground">{initials(c.name)}</span>
                )}
              </div>
              <p className="mt-2 text-sm font-medium">{c.name}</p>
              <p className="text-xs text-muted-foreground">as {c.role}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Showtimes */}
      <section id="showtimes" className="mx-auto mt-12 max-w-7xl px-4">
        <div className="flex items-end justify-between">
          <h2 className="text-xl font-bold">Select a show</h2>
          <div className="hidden gap-2 md:flex">
            {["Today", "Tomorrow", "Thu 28", "Fri 29"].map((d, i) => (
              <button
                key={d}
                className={`rounded-lg border px-4 py-2 text-xs font-medium ${i === 0 ? "border-primary bg-primary text-primary-foreground" : "border-border/60"}`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {theaters.map((t) => (
            <div
              key={t.id}
              className="rounded-xl border border-border/60 bg-card/60 p-5 backdrop-blur transition-colors hover:border-border"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{t.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {t.area} - {t.distance}
                  </p>
                </div>
                <div className="flex gap-3 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" /> Available
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-amber-500" /> Filling fast
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-rose-500" /> Sold out
                  </span>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {showTimes.map((s, i) => {
                  const status = i === 4 ? "sold" : i === 3 ? "fast" : "ok";
                  const cls =
                    status === "sold"
                      ? "border-border/60 text-muted-foreground line-through cursor-not-allowed"
                      : status === "fast"
                        ? "border-amber-500/60 text-amber-400 hover:bg-amber-500/10"
                        : "border-emerald-500/60 text-emerald-400 hover:bg-emerald-500/10";
                  return status === "sold" ? (
                    <span
                      key={s}
                      className={`rounded-md border px-3 py-1.5 text-xs font-medium ${cls}`}
                    >
                      {s}
                    </span>
                  ) : (
                    <Link
                      key={s}
                      to="/book/$showId"
                      params={{ showId: `${movie.id}-${t.id}-${i}` }}
                      search={{
                        time: s,
                        theater: t.name,
                        movie: movie.title,
                        movieId: movie.id,
                        theaterId: t.id,
                      }}
                      className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${cls}`}
                    >
                      {s}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
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

export { Route };
