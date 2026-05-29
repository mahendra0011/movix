import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, Film, Heart, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { movies as fallbackMovies } from "@/features/movies/data/movieCatalog";
import { Button } from "@/shared/components/ui/button";

const SHORTLIST_STORAGE_KEY = "movix-shortlist";

const Route = createFileRoute("/wishlist")({
  component: WishlistPage,
});

function WishlistPage() {
  const [items, setItems] = useState(readWishlist);
  const recommended = useMemo(
    () => fallbackMovies.filter((movie) => !items.some((item) => item.id === movie.id)).slice(0, 4),
    [items],
  );

  useEffect(() => {
    const syncWishlist = () => setItems(readWishlist());
    window.addEventListener("storage", syncWishlist);
    window.addEventListener("focus", syncWishlist);
    return () => {
      window.removeEventListener("storage", syncWishlist);
      window.removeEventListener("focus", syncWishlist);
    };
  }, []);

  const removeItem = (id) => {
    const nextItems = items.filter((item) => item.id !== id);
    setItems(nextItems);
    writeWishlist(nextItems);
  };

  return (
    <main className="bg-[radial-gradient(circle_at_top_left,color-mix(in_oklch,var(--primary)_10%,transparent),transparent_32%),linear-gradient(180deg,color-mix(in_oklch,var(--secondary)_42%,transparent),var(--background)_430px)] pb-12 dark:bg-[radial-gradient(circle_at_top_left,color-mix(in_oklch,var(--primary)_16%,transparent),transparent_32%),linear-gradient(180deg,color-mix(in_oklch,var(--card)_76%,transparent),var(--background)_520px)]">
      <section className="border-b border-border/60">
        <div className="mx-auto max-w-[1560px] px-4 py-10 sm:px-5 lg:px-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">
            <Heart className="h-3.5 w-3.5 fill-primary" />
            Your saved picks
          </span>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">Wishlist</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Movies saved with the Watchlist button appear here, ready for booking later.
              </p>
            </div>
            <Button asChild className="gap-2 rounded-full">
              <Link to="/movies/" search={{}}>
                <Search className="h-4 w-4" />
                Browse movies
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-7 max-w-[1560px] px-4 sm:px-5 lg:px-6">
        {items.length ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => (
              <WishlistCard key={item.id} item={item} onRemove={() => removeItem(item.id)} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border/70 bg-card/75 p-10 text-center shadow-sm">
            <Heart className="mx-auto h-9 w-9 text-primary" />
            <h2 className="mt-4 text-xl font-bold">Wishlist empty hai</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Movie detail page par Watchlist dabao, phir saved movie yahan show hogi.
            </p>
            <Button asChild className="mt-5 rounded-full">
              <Link to="/movies/" search={{}}>
                <Film className="h-4 w-4" />
                Go to movies
              </Link>
            </Button>
          </div>
        )}
      </section>

      <section className="mx-auto mt-8 max-w-[1560px] px-4 sm:px-5 lg:px-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight">More movies to save</h2>
            <p className="text-xs text-muted-foreground">Quick picks from the current catalog</p>
          </div>
          <Link to="/movies/" search={{}} className="text-sm font-semibold text-primary">
            View all
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {recommended.map((movie) => (
            <Link
              key={movie.id}
              to="/movies/$id"
              params={{ id: movie.id }}
              className="group overflow-hidden rounded-lg border border-border/60 bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
            >
              <img
                src={movie.poster}
                alt={movie.title}
                loading="lazy"
                className="aspect-[2/3] w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="p-3">
                <h3 className="line-clamp-2 min-h-10 text-sm font-bold">{movie.title}</h3>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {movie.genres.slice(0, 3).join(" - ")}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

function WishlistCard({ item, onRemove }) {
  return (
    <article className="group overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg">
      <Link to="/movies/$id" params={{ id: item.id }} className="block">
        <div className="relative aspect-[2/3] overflow-hidden bg-muted">
          {item.image ? (
            <img
              src={item.image}
              alt={item.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="grid h-full place-items-center bg-primary/10 text-primary">
              <Film className="h-10 w-10" />
            </div>
          )}
          <span className="absolute left-3 top-3 rounded-full bg-black/65 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur">
            {item.category || "Movie"}
          </span>
        </div>
      </Link>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="line-clamp-2 min-h-11 text-base font-extrabold leading-6">
              {item.title}
            </h3>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {item.venue || "Saved movie"}
            </p>
          </div>
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${item.title}`}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        {item.savedAt ? (
          <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
            <CalendarDays className="h-3.5 w-3.5" />
            Saved {formatSavedDate(item.savedAt)}
          </p>
        ) : null}
        <Button asChild className="mt-4 w-full rounded-full">
          <Link to="/movies/$id" params={{ id: item.id }}>
            Book / view details
          </Link>
        </Button>
      </div>
    </article>
  );
}

function readWishlist() {
  if (typeof window === "undefined") return [];
  try {
    const items = JSON.parse(window.localStorage.getItem(SHORTLIST_STORAGE_KEY) || "[]");
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

function writeWishlist(items) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SHORTLIST_STORAGE_KEY, JSON.stringify(items));
}

function formatSavedDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recently";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

export { Route };
