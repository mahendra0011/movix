import { requestJson } from "@/shared/services/httpClient";
import {
  getMovie as getFallbackMovie,
  movies as fallbackMovies,
} from "@/features/movies/data/movieCatalog";

async function fetchMovies() {
  try {
    const data = await requestJson("/api/movies");
    return data.movies.length > 0 ? data.movies : fallbackMovies;
  } catch {
    return fallbackMovies;
  }
}

async function fetchMovie(id) {
  try {
    const data = await requestJson(`/api/movies/${encodeURIComponent(id)}`);
    return data.movie;
  } catch {
    return getFallbackMovie(id);
  }
}

async function createMovie(input) {
  const data = await requestJson("/api/movies", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.movie;
}

async function deleteMovie(id) {
  const data = await requestJson(`/api/movies/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  return data.movie;
}

export { createMovie, deleteMovie, fetchMovie, fetchMovies };
