import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { Movie } from "../models/Movie.js";
import { cleanDocument, isMongoReady } from "../services/database.js";
import { movies } from "../../src/features/movies/data/movieCatalog.js";

const router = Router();

function slugify(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function toList(value, fallback = []) {
  const items = Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : String(value ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

  return items.length ? items : fallback;
}

function normalizeMovie(input) {
  const title = String(input.title ?? "").trim();
  if (!title) {
    const error = new Error("Movie title is required.");
    error.status = 400;
    throw error;
  }

  const baseMovie = movies[0];
  const id = slugify(input.id || title);

  return {
    id,
    title,
    poster: input.poster || baseMovie.poster,
    backdrop: input.backdrop || baseMovie.backdrop,
    genres: toList(input.genres, ["Drama"]),
    language: String(input.language ?? "English").trim() || "English",
    duration: String(input.duration ?? "2h 10m").trim() || "2h 10m",
    rating: Number(input.rating) || 8.1,
    votes: String(input.votes ?? "New"),
    releaseDate: String(input.releaseDate ?? "Coming soon"),
    description:
      String(input.description ?? "").trim() ||
      `${title} is ready for publishing after poster, cast and show scheduling review.`,
    cast: Array.isArray(input.cast) ? input.cast : [],
    format: toList(input.format, ["2D"]),
    certificate: String(input.certificate ?? "UA").trim() || "UA",
    sortOrder: Number(input.sortOrder) || Date.now(),
  };
}

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
    response.json(payload);
  }),
);

router.post(
  "/",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (request, response) => {
    const payload = normalizeMovie(request.body);

    if (isMongoReady()) {
      const exists = await Movie.findOne({ id: payload.id }).lean();
      if (exists) {
        response.status(409).json({ error: "Movie already exists." });
        return;
      }

      const movie = await Movie.create(payload);
      response.status(201).json({ movie: cleanDocument(movie) });
      return;
    }

    if (movies.some((movie) => movie.id === payload.id)) {
      response.status(409).json({ error: "Movie already exists." });
      return;
    }

    movies.unshift(payload);
    response.status(201).json({ movie: payload });
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

router.delete(
  "/:id",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (request, response) => {
    const { id } = request.params;

    if (isMongoReady()) {
      const movie = await Movie.findOneAndDelete({ id }).lean();
      if (!movie) {
        response.status(404).json({ error: "Movie not found" });
        return;
      }

      response.json({ ok: true, movie: cleanDocument(movie) });
      return;
    }

    const index = movies.findIndex((movie) => movie.id === id);
    if (index === -1) {
      response.status(404).json({ error: "Movie not found" });
      return;
    }

    const [movie] = movies.splice(index, 1);
    response.json({ ok: true, movie });
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
