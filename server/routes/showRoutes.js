import { Router } from "express";
import { Show } from "../models/Show.js";
import { Theater } from "../models/Theater.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { isMongoReady } from "../services/database.js";
import {
  showTimes,
  theaters as catalogTheaters,
} from "../../src/features/movies/data/movieCatalog.js";

const router = Router();

function generatedShows(movieId, city = "") {
  const cityFilter = String(city ?? "")
    .trim()
    .toLowerCase();
  return catalogTheaters
    .filter(
      (theater) =>
        (!cityFilter || theater.city?.toLowerCase() === cityFilter) &&
        theaterHasMovie(theater, movieId),
    )
    .flatMap((theater) =>
      getTheaterPlans(theater).map((plan, index) => ({
        id: `${movieId}-${theater.id}-${index}`,
        movieId,
        theaterId: theater.id,
        theater: theater.name,
        city: theater.city || "Bengaluru",
        area: theater.area,
        address: theater.address,
        screenId: `${theater.id}-${slugify(plan.screen || "screen-1")}`,
        screen: plan.screen || "Screen 1",
        startTime: plan.time,
        endTime: "Auto calculated",
        format: plan.format || (index % 2 === 0 ? "IMAX" : "2D"),
        language: "English",
        price: {
          platinum: 180 + index * 10,
          silver: 220 + index * 12,
          gold: 250 + index * 15,
          vip: 400 + index * 20,
        },
        status: plan.status || (index === 4 ? "sold" : index === 3 ? "fast" : "ok"),
        cancellable: plan.cancellable !== false,
      })),
    );
}

router.get(
  "/:movieId",
  asyncHandler(async (request, response) => {
    if (!isMongoReady()) {
      response.json({ shows: generatedShows(request.params.movieId, request.query.city) });
      return;
    }

    const city = String(request.query.city ?? "").trim();
    const shows = await Show.find({ movieId: request.params.movieId })
      .sort({ startTime: 1 })
      .lean();
    const visibleShows = shows.filter(isPublicShow);
    const theaterIds = [...new Set(visibleShows.map((show) => show.theaterId).filter(Boolean))];
    const theaterFilter = { id: { $in: theaterIds }, approved: true };
    if (city) theaterFilter.city = new RegExp(`^${escapeRegExp(city)}$`, "i");

    const theaters = await Theater.find(theaterFilter).lean();
    const theaterById = new Map(theaters.map((theater) => [theater.id, theater]));
    const rows = visibleShows
      .map((show, index) => formatMongoShow(show, theaterById.get(show.theaterId), index))
      .filter(Boolean);

    response.json({ shows: rows });
  }),
);

function formatMongoShow(show, theater, index) {
  if (!theater) return null;
  const screen = theater.screens?.find((item) => item.id === show.screenId);
  return {
    id: show.id,
    movieId: show.movieId,
    theaterId: show.theaterId,
    theater: theater.name,
    city: theater.city,
    area: theater.area,
    address: theater.address,
    amenities: theater.amenities ?? [],
    logoText: theater.logoText,
    screenId: show.screenId,
    screen: show.screen || screen?.name || "Screen 1",
    date: show.date || "",
    startTime: show.startTime,
    endTime: show.endTime,
    time: show.time || show.startTime,
    format: show.format || "2D",
    language: show.language || "English",
    price: {
      platinum: Number(show.price?.platinum || 180 + index * 10),
      silver: Number(show.price?.silver || 220 + index * 12),
      gold: Number(show.price?.gold || 250 + index * 15),
      vip: Number(show.price?.vip || 400 + index * 20),
    },
    seatLayout: show.seatLayout || screen?.seatLayout || {},
    status: show.status || "ok",
    cancellable: show.cancellable !== false,
  };
}

function isPublicShow(show) {
  const status = String(show.status || "").toLowerCase();
  return show.listingType !== "coming-soon" && status !== "draft" && status !== "coming soon";
}

function getTheaterPlans(theater) {
  if (Array.isArray(theater.showPlan) && theater.showPlan.length) return theater.showPlan;
  return showTimes.map((time, index) => ({
    time,
    screen: "Screen 1",
    format: index % 2 === 0 ? "2D" : "IMAX",
    status: index === 4 ? "sold" : index === 3 ? "fast" : "ok",
    cancellable: index % 2 === 1,
  }));
}

function theaterHasMovie(theater, movieId) {
  return (
    !Array.isArray(theater.movieIds) ||
    theater.movieIds.length === 0 ||
    theater.movieIds.includes(movieId)
  );
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export { generatedShows, router as showRoutes };
