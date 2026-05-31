import { requestJson } from "@/shared/services/httpClient";
import {
  getMovie as getFallbackMovie,
  movies as fallbackMovies,
} from "@/features/movies/data/movieCatalog";
import {
  isFallbackMovieArtwork,
  isGeneratedImageUrl,
  normalizeMovieMedia,
} from "@/features/movies/services/movieMedia";

const PUBLIC_MOVIE_TIMEOUT_MS = 8000;
const SHOULD_FETCH_PUBLIC_MOVIES = true;
let moviesCache = null;
let moviesRequest = null;

function normalizePublicMovies(remoteMovies = []) {
  const byId = new Map(
    fallbackMovies
      .map(normalizeMovieMedia)
      .filter((movie) => movie?.id && movie.listingType !== "coming-soon")
      .map((movie) => [movie.id, movie]),
  );

  remoteMovies.forEach((movie) => {
    const normalized = mergeRemoteMovieWithFallback(movie, movie?.id);
    if (!normalized?.id || normalized.listingType === "coming-soon") return;
    byId.set(normalized.id, normalized);
  });
  return [...byId.values()];
}

function normalizePublicMovie(remoteMovie, id) {
  return mergeRemoteMovieWithFallback(remoteMovie, id);
}

function mergeRemoteMovieWithFallback(remoteMovie, id) {
  const fallbackMovie = getFallbackMovie(id || remoteMovie?.id);
  const fallback = fallbackMovie ? normalizeMovieMedia(fallbackMovie) : null;
  const remote = normalizeMovieMedia(remoteMovie);

  if (!remote?.id || remote.listingType === "coming-soon") {
    return fallback?.listingType !== "coming-soon" ? fallback : null;
  }

  const poster =
    isFallbackMovieArtwork(remote.poster) && fallback?.poster ? fallback.poster : remote.poster;
  const backdrop =
    isFallbackMovieArtwork(remote.backdrop) && fallback?.backdrop
      ? fallback.backdrop
      : remote.backdrop;
  const cast = selectBestCast(remote.cast, fallback?.cast);

  return normalizeMovieMedia({
    ...fallback,
    ...remote,
    poster,
    backdrop,
    cast,
  });
}

function selectBestCast(remoteCast = [], fallbackCast = []) {
  const verifiedRemoteCast = remoteCast.filter(hasRealCastAvatar);
  const verifiedFallbackCast = (fallbackCast ?? []).filter(hasRealCastAvatar);
  if (verifiedRemoteCast.length >= 6) return verifiedRemoteCast.slice(0, 6);
  if (verifiedFallbackCast.length > verifiedRemoteCast.length) {
    return verifiedFallbackCast.slice(0, 6);
  }
  return remoteCast.length ? remoteCast.slice(0, 6) : fallbackCast?.slice(0, 6);
}

function hasRealCastAvatar(member) {
  const avatar = String(member?.avatar ?? "");
  return avatar.startsWith("https://res.cloudinary.com/") && !isGeneratedImageUrl(avatar);
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
