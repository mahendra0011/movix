import { requestJson } from "@/shared/services/httpClient";
import {
  getMovie as getFallbackMovie,
  movies as fallbackMovies,
} from "@/features/movies/data/movieCatalog";
import { normalizeMovieMedia } from "@/features/movies/services/movieMedia";

const PUBLIC_MOVIE_TIMEOUT_MS = 8000;
const SHOULD_FETCH_PUBLIC_MOVIES = true;
let moviesCache = null;
let moviesRequest = null;

function normalizePublicMovies(remoteMovies = []) {
  const byId = new Map();
  [...fallbackMovies, ...remoteMovies].map(normalizeMovieMedia).forEach((movie) => {
    if (!movie?.id || movie.listingType === "coming-soon") return;
    byId.set(movie.id, movie);
  });
  return [...byId.values()];
}

function normalizePublicMovie(remoteMovie, id) {
  const fallbackMovie = getFallbackMovie(id);
  const normalizedRemote = normalizeMovieMedia(remoteMovie);
  if (normalizedRemote?.id && normalizedRemote.listingType !== "coming-soon")
    return normalizedRemote;
  if (fallbackMovie?.listingType !== "coming-soon") return normalizeMovieMedia(fallbackMovie);
  return null;
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
      moviesCache = normalizePublicMovies(data.movies ?? []);
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
  if (!SHOULD_FETCH_PUBLIC_MOVIES && !options.force) return getFallbackMovie(id);

  const timeoutMs = options.timeoutMs ?? PUBLIC_MOVIE_TIMEOUT_MS;
  try {
    const data = await requestJson(`/api/movies/${encodeURIComponent(id)}`, { timeoutMs });
    return normalizePublicMovie(data.movie, id);
  } catch {
    return normalizePublicMovie(null, id);
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
