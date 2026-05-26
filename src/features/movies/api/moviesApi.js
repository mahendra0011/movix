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

export { fetchMovie, fetchMovies };
