import { requestJson } from "@/shared/services/httpClient";
import {
  getMovie as getFallbackMovie,
  movies as fallbackMovies,
} from "@/features/movies/data/movieCatalog";
import { normalizeMovieMedia } from "@/features/movies/services/movieMedia";

const PUBLIC_MOVIE_TIMEOUT_MS = 8000;
const SHOULD_FETCH_PUBLIC_MOVIES = true;
const allowedMovieIds = new Set(fallbackMovies.map((movie) => movie.id));
let moviesCache = null;
let moviesRequest = null;

function scopeMoviesToCatalog(remoteMovies = []) {
  const remoteById = new Map(
    remoteMovies
      .map(normalizeMovieMedia)
      .filter((movie) => movie?.id && allowedMovieIds.has(movie.id))
      .map((movie) => [movie.id, movie]),
  );

  return fallbackMovies.map((fallbackMovie) =>
    normalizeMovieMedia({
      ...fallbackMovie,
      ...(remoteById.get(fallbackMovie.id) ?? {}),
    }),
  );
}

function scopeMovieToCatalog(remoteMovie, id) {
  const fallbackMovie = getFallbackMovie(id);
  if (!fallbackMovie) return null;
  const normalizedRemote = normalizeMovieMedia(remoteMovie);
  if (!normalizedRemote?.id || !allowedMovieIds.has(normalizedRemote.id)) {
    return normalizeMovieMedia(fallbackMovie);
  }
  return normalizeMovieMedia({ ...fallbackMovie, ...normalizedRemote });
}

async function fetchMovies(options = {}) {
  if (moviesCache) return moviesCache;
  if (moviesRequest) return moviesRequest;
  if (!SHOULD_FETCH_PUBLIC_MOVIES && !options.force) {
    moviesCache = fallbackMovies;
    return moviesCache;
  }

  const timeoutMs = options.timeoutMs ?? PUBLIC_MOVIE_TIMEOUT_MS;
  moviesRequest = requestJson("/api/movies", { timeoutMs })
    .then((data) => {
      moviesCache = data.movies?.length > 0 ? scopeMoviesToCatalog(data.movies) : fallbackMovies;
      return moviesCache;
    })
    .catch(() => {
      moviesCache = fallbackMovies;
      return moviesCache;
    })
    .finally(() => {
      moviesRequest = null;
    });

  return moviesRequest;
}

async function fetchMovie(id, options = {}) {
  const cachedMovie = moviesCache?.find((movie) => movie.id === id);
  if (cachedMovie) return cachedMovie;
  if (!allowedMovieIds.has(id)) return null;
  if (!SHOULD_FETCH_PUBLIC_MOVIES && !options.force) return getFallbackMovie(id);

  const timeoutMs = options.timeoutMs ?? PUBLIC_MOVIE_TIMEOUT_MS;
  try {
    const data = await requestJson(`/api/movies/${encodeURIComponent(id)}`, { timeoutMs });
    return scopeMovieToCatalog(data.movie, id);
  } catch {
    return getFallbackMovie(id);
  }
}

async function fetchMovieReviews(id, options = {}) {
  const timeoutMs = options.timeoutMs ?? PUBLIC_MOVIE_TIMEOUT_MS;
  try {
    return await requestJson(`/api/movies/${encodeURIComponent(id)}/reviews`, { timeoutMs });
  } catch {
    return null;
  }
}

async function createMovieReview(id, input) {
  return requestJson(`/api/movies/${encodeURIComponent(id)}/reviews`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

async function createMovie(input) {
  const data = await requestJson("/api/movies", {
    method: "POST",
    body: JSON.stringify(input),
  });
  moviesCache = null;
  return normalizeMovieMedia(data.movie);
}

async function deleteMovie(id) {
  const data = await requestJson(`/api/movies/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  moviesCache = null;
  return data.movie;
}

export { createMovie, createMovieReview, deleteMovie, fetchMovie, fetchMovieReviews, fetchMovies };
