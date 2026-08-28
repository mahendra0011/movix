import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  getMovieCredits,
  getMovieDetails,
  getNowPlaying,
  getPopularMovies,
  getTrending,
  getUpcomingMovies,
  isConfigured,
  searchMovies,
} from "../services/tmdbService.js";

const router = Router();

router.use(requireAuth, requireRole("admin", "theater-owner"));

router.get("/status", (_request, response) => {
  response.json({ configured: isConfigured() });
});

router.get(
  "/search",
  asyncHandler(async (request, response) => {
    if (!isConfigured()) {
      response.status(503).json({ error: "TMDB is not configured." });
      return;
    }
    const query = String(request.query.q || "").trim();
    if (!query) {
      response.status(400).json({ error: "Search query is required." });
      return;
    }
    const page = Math.max(1, Number(request.query.page) || 1);
    const data = await searchMovies(query, { page });
    response.json(data);
  }),
);

router.get(
  "/popular",
  asyncHandler(async (request, response) => {
    if (!isConfigured()) {
      response.status(503).json({ error: "TMDB is not configured." });
      return;
    }
    const page = Math.max(1, Number(request.query.page) || 1);
    const data = await getPopularMovies({ page });
    response.json(data);
  }),
);

router.get(
  "/now-playing",
  asyncHandler(async (request, response) => {
    if (!isConfigured()) {
      response.status(503).json({ error: "TMDB is not configured." });
      return;
    }
    const page = Math.max(1, Number(request.query.page) || 1);
    const data = await getNowPlaying({ page });
    response.json(data);
  }),
);

router.get(
  "/upcoming",
  asyncHandler(async (request, response) => {
    if (!isConfigured()) {
      response.status(503).json({ error: "TMDB is not configured." });
      return;
    }
    const page = Math.max(1, Number(request.query.page) || 1);
    const data = await getUpcomingMovies({ page });
    response.json(data);
  }),
);

router.get(
  "/trending",
  asyncHandler(async (request, response) => {
    if (!isConfigured()) {
      response.status(503).json({ error: "TMDB is not configured." });
      return;
    }
    const page = Math.max(1, Number(request.query.page) || 1);
    const timeWindow = request.query.timeWindow === "day" ? "day" : "week";
    const data = await getTrending({ timeWindow, page });
    response.json(data);
  }),
);

router.get(
  "/:id",
  asyncHandler(async (request, response) => {
    if (!isConfigured()) {
      response.status(503).json({ error: "TMDB is not configured." });
      return;
    }
    const id = Number(request.params.id);
    if (!Number.isFinite(id)) {
      response.status(400).json({ error: "Valid movie ID is required." });
      return;
    }
    const data = await getMovieDetails(id);
    response.json(data);
  }),
);

router.get(
  "/:id/credits",
  asyncHandler(async (request, response) => {
    if (!isConfigured()) {
      response.status(503).json({ error: "TMDB is not configured." });
      return;
    }
    const id = Number(request.params.id);
    if (!Number.isFinite(id)) {
      response.status(400).json({ error: "Valid movie ID is required." });
      return;
    }
    const data = await getMovieCredits(id);
    response.json(data);
  }),
);

export { router as tmdbRoutes };
