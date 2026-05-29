import { Router } from "express";
import { Theater } from "../models/Theater.js";
import { isMongoReady } from "../services/database.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  movies as catalogMovies,
  showTimes,
  theaters as catalogTheaters,
} from "../../src/features/movies/data/movieCatalog.js";

const router = Router();
const catalogMovieIds = catalogMovies.map((movie) => movie.id);
const catalogMovieIdSet = new Set(catalogMovieIds);

const screens = [
  {
    id: "screen-1",
    name: "Screen 1",
    totalSeats: 140,
    seatLayout: { rows: ["A", "B", "C", "D", "E", "F", "G", "H", "J", "K"], cols: 14 },
  },
  {
    id: "screen-2",
    name: "Screen 2",
    totalSeats: 96,
    seatLayout: { rows: ["A", "B", "C", "D", "E", "F", "G", "H"], cols: 12 },
  },
];

function enrichTheater(theater, index = 0) {
  const sourceScreens =
    Array.isArray(theater.screens) && theater.screens.length
      ? theater.screens
      : screens.map((screen) => ({ ...screen, id: `${theater.id}-${screen.id}` }));

  return {
    ...theater,
    city: theater.city || "Bengaluru",
    address: theater.address || `${theater.area}, ${theater.city || "Bengaluru"}`,
    amenities: Array.isArray(theater.amenities) ? theater.amenities : splitList(theater.amenities),
    approved: theater.approved !== false,
    screens: sourceScreens,
    showPlan: Array.isArray(theater.showPlan) ? theater.showPlan : [],
    movieIds: sanitizeMovieIds(theater.movieIds),
    rating: 4.5 + (index % 4) / 10,
  };
}

function sanitizeMovieIds(value) {
  const movieIds = splitList(value).filter((movieId) => catalogMovieIdSet.has(movieId));
  return movieIds.length ? movieIds : catalogMovieIds;
}

router.get(
  "/",
  asyncHandler(async (request, response) => {
    const city = String(request.query.city ?? "")
      .trim()
      .toLowerCase();
    const source = isMongoReady()
      ? await Theater.find({ approved: true }).sort({ city: 1, name: 1 }).lean()
      : catalogTheaters;
    const list = source
      .map(enrichTheater)
      .filter((theater) => !city || theater.city.toLowerCase() === city);
    response.json({ theaters: list, showTimes });
  }),
);

function splitList(value) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export { enrichTheater, router as theaterRoutes };
