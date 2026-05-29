import { requestJson } from "@/shared/services/httpClient";
import {
  getMovie as getFallbackMovie,
  movies as fallbackMovies,
} from "@/features/movies/data/movieCatalog";

const PUBLIC_MOVIE_TIMEOUT_MS = 8000;
const SHOULD_FETCH_PUBLIC_MOVIES = true;
let moviesCache = null;
let moviesRequest = null;

function normalizeMovieMedia(movie) {
  if (!movie) return movie;
  return {
    ...movie,
    poster: normalizeImageUrl(movie.poster),
    backdrop: normalizeImageUrl(movie.backdrop),
    cast: (movie.cast ?? []).map((member) => ({
      ...member,
      avatar: normalizeImageUrl(member.avatar),
    })),
  };
}

function normalizeImageUrl(value) {
  const image = String(value || "").trim();
  if (!image.includes("/image/fetch/")) return image;

  try {
    const url = new URL(image);
    const parts = url.pathname.split("/");
    const fetchIndex = parts.findIndex((part) => part === "fetch");
    if (fetchIndex === -1) return image;
    const encodedSource = parts.slice(fetchIndex + 1).findLast((part) => /^https?%3A/i.test(part));
    return encodedSource ? decodeURIComponent(encodedSource) : image;
  } catch {
    return image;
  }
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
      moviesCache =
        data.movies?.length > 0 ? data.movies.map(normalizeMovieMedia) : fallbackMovies;
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
    return normalizeMovieMedia(data.movie) ?? getFallbackMovie(id);
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
