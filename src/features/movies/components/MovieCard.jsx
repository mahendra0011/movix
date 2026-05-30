import { Link } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { movieImageFallback, normalizeMovieImageUrl } from "@/features/movies/services/movieMedia";

function MovieCard({ movie }) {
  const poster = normalizeMovieImageUrl(movie.poster, movie.title, "poster");

  return (
    <Link to="/movies/$id" params={{ id: movie.id }} className="group block w-full">
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-muted shadow-xl shadow-black/20 ring-1 ring-border/50 transition-all duration-300 group-hover:-translate-y-1 group-hover:ring-primary/40">
        <img
          src={poster}
          alt={movie.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(event) => {
            event.currentTarget.src = movieImageFallback(movie.title, "poster");
          }}
        />
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-3 py-2 text-xs font-medium text-white">
          <Star className="h-3.5 w-3.5 fill-primary text-primary" />
          <span>{movie.rating}/10</span>
          <span className="text-white/60">- {movie.votes} votes</span>
        </div>
      </div>
      <div className="mt-2.5">
        <h3 className="line-clamp-1 text-sm font-semibold">{movie.title}</h3>
        <p className="line-clamp-1 text-xs text-muted-foreground">{movie.genres.join(" / ")}</p>
      </div>
    </Link>
  );
}
export { MovieCard };
