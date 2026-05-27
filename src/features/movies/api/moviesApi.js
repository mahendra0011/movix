import { requestJson } from "@/shared/services/httpClient";
import {
  getMovie as getFallbackMovie,
  movies as fallbackMovies,
} from "@/features/movies/data/movieCatalog";

const PUBLIC_MOVIE_TIMEOUT_MS = 1800;
let moviesCache = null;
let moviesRequest = null;

async function fetchMovies(options = {}) {
  if (moviesCache) return moviesCache;
  if (moviesRequest) return moviesRequest;

  const timeoutMs = options.timeoutMs ?? PUBLIC_MOVIE_TIMEOUT_MS;
  moviesRequest = requestJson("/api/movies", { timeoutMs })
    .then((data) => {
      moviesCache = data.movies.length > 0 ? data.movies : fallbackMovies;
      return moviesCache;
    })
    .catch(() => fallbackMovies)
    .finally(() => {
      moviesRequest = null;
    });

  return moviesRequest;
}

async function fetchMovie(id, options = {}) {
  const cachedMovie = moviesCache?.find((movie) => movie.id === id);
  if (cachedMovie) return cachedMovie;

  const timeoutMs = options.timeoutMs ?? PUBLIC_MOVIE_TIMEOUT_MS;
  try {
    const data = await requestJson(`/api/movies/${encodeURIComponent(id)}`, { timeoutMs });
    return data.movie ?? getFallbackMovie(id);
  } catch {
    return getFallbackMovie(id);
  }
}

async function createMovie(input) {
  const data = await requestJson("/api/movies", {
    method: "POST",
    body: JSON.stringify(input),
  });
  moviesCache = null;
  return data.movie;
}

async function deleteMovie(id) {
  const data = await requestJson(`/api/movies/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  moviesCache = null;
  return data.movie;
}

export { createMovie, deleteMovie, fetchMovie, fetchMovies };
