import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { Movie } from "../models/Movie.js";
import { movies } from "../seed.js";
import { cleanDocument, isMongoReady } from "../services/database.js";
import { getRedisClient } from "../services/redisClient.js";

const router = Router();

function getMemoryMovies(query = "") {
  const needle = query.trim().toLowerCase();
  if (!needle) return movies;
  return movies.filter((movie) => {
    const haystack = [movie.title, movie.language, ...movie.genres].join(" ").toLowerCase();
    return haystack.includes(needle);
  });
}

router.get(
  "/",
  asyncHandler(async (request, response) => {
    const query = String(request.query.q ?? "");
    const genre = String(request.query.genre ?? "");
    const language = String(request.query.language ?? "");
    const cacheKey = `movies:${query}:${genre}:${language}`;
    const redis = getRedisClient();

    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) {
        response.json(JSON.parse(cached));
        return;
      }
    }

    let list;
    if (!isMongoReady()) {
      list = getMemoryMovies(query);
    } else {
      const filter = {};
      if (query) {
        filter.$or = [
          { $text: { $search: query } },
          { title: new RegExp(query, "i") },
          { genres: new RegExp(query, "i") },
          { language: new RegExp(query, "i") },
        ];
      }
      if (genre && genre !== "All") filter.genres = genre;
      if (language && language !== "All") filter.language = language;
      list = (await Movie.find(filter).sort({ sortOrder: 1 }).lean()).map(cleanDocument);
    }

    const payload = { movies: list };
    if (redis) await redis.setEx(cacheKey, 120, JSON.stringify(payload));
    response.json(payload);
  }),
);

router.get(
  "/:id",
  asyncHandler(async (request, response) => {
    const { id } = request.params;
    const movie = isMongoReady()
      ? cleanDocument(await Movie.findOne({ id }).lean())
      : movies.find((item) => item.id === id);

    if (!movie) {
      response.status(404).json({ error: "Movie not found" });
      return;
    }

    response.json({ movie });
  }),
);

router.get(
  "/:id/ai-summary",
  asyncHandler(async (request, response) => {
    const movie = isMongoReady()
      ? cleanDocument(await Movie.findOne({ id: request.params.id }).lean())
      : movies.find((item) => item.id === request.params.id);

    if (!movie) {
      response.status(404).json({ error: "Movie not found" });
      return;
    }

    response.json({
      summary: `${movie.title} is a ${movie.genres.slice(0, 2).join(" and ")} pick with ${movie.language} audio, ${movie.duration} runtime, and a ${movie.rating}/10 audience score. Best for viewers who want ${movie.description.toLowerCase()}`,
    });
  }),
);

export { router as movieRoutes };
