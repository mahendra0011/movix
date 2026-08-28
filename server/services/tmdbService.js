import axios from "axios";
import { env } from "../config/env.js";

const TMDB_BASE = "https://api.themoviedb.org/3";
const CACHE_TTL_MS = 30 * 60 * 1000;
const cache = new Map();

function getCached(key) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL_MS) return entry.data;
  cache.delete(key);
  return null;
}

function setCache(key, data) {
  cache.set(key, { data, ts: Date.now() });
  if (cache.size > 200) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
}

function isConfigured() {
  return Boolean(env.tmdbApiKey);
}

async function tmdbGet(path, params = {}) {
  const cacheKey = `${path}?${JSON.stringify(params)}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const { data } = await axios.get(`${TMDB_BASE}${path}`, {
    params: { ...params, api_key: env.tmdbApiKey, language: "en-US" },
    timeout: 10000,
  });

  setCache(cacheKey, data);
  return data;
}

async function searchMovies(query, { page = 1 } = {}) {
  return tmdbGet("/search/movie", { query, page });
}

async function getMovieDetails(movieId) {
  return tmdbGet(`/movie/${movieId}`, {
    append_to_response: "credits,videos,images",
  });
}

async function getPopularMovies({ page = 1, region = "IN" } = {}) {
  return tmdbGet("/movie/popular", { page, region });
}

async function getNowPlaying({ page = 1, region = "IN" } = {}) {
  return tmdbGet("/movie/now_playing", { page, region });
}

async function getUpcomingMovies({ page = 1, region = "IN" } = {}) {
  return tmdbGet("/movie/upcoming", { page, region });
}

async function getMovieCredits(movieId) {
  return tmdbGet(`/movie/${movieId}/credits`);
}

async function getTrending({ timeWindow = "week", page = 1 } = {}) {
  return tmdbGet(`/trending/movie/${timeWindow}`, { page });
}

export {
  getMovieCredits,
  getMovieDetails,
  getNowPlaying,
  getPopularMovies,
  getTrending,
  getUpcomingMovies,
  isConfigured,
  searchMovies,
};
