import { Router } from "express";
import { Show } from "../models/Show.js";
import { Theater } from "../models/Theater.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { isMongoReady } from "../services/database.js";
import {
  movies as catalogMovies,
  showTimes,
  theaters as catalogTheaters,
} from "../../src/features/movies/data/movieCatalog.js";
import {
  buildCatalogShow,
  getCatalogTheaterPlans,
  splitCatalogList,
  theaterHasMovie,
} from "../../src/features/movies/services/showSchedule.js";

const router = Router();

function generatedShows(movieId, city = "", activeDate = "") {
  const cityFilter = String(city ?? "")
    .trim()
    .toLowerCase();
  const movie = catalogMovies.find((item) => item.id === movieId) ?? {
    id: movieId,
    format: ["2D"],
    language: "English",
  };
  return catalogTheaters
    .filter(
      (theater) =>
        (!cityFilter || theater.city?.toLowerCase() === cityFilter) &&
        theaterHasMovie(theater, movieId),
    )
    .flatMap((theater) =>
      getCatalogTheaterPlans(theater, showTimes).map((plan, index) =>
        formatGeneratedShow({ movie, theater, plan, index, activeDate }),
      ),
    );
}

function generatedTheaterShows({ theaterId = "", city = "", activeDate = "" } = {}) {
  const cityFilter = String(city ?? "")
    .trim()
    .toLowerCase();
  const theaterFilter = String(theaterId ?? "").trim();
  return catalogTheaters
    .filter(
      (theater) =>
        (!theaterFilter || theater.id === theaterFilter) &&
        (!cityFilter || theater.city?.toLowerCase() === cityFilter),
    )
    .flatMap((theater) => {
      const listedMovieIds = splitCatalogList(theater.movieIds);
      const movieIds = listedMovieIds.length
        ? listedMovieIds
        : catalogMovies.map((movie) => movie.id);
      return movieIds.flatMap((movieId) => {
        const movie = catalogMovies.find((item) => item.id === movieId);
        if (!movie) return [];
        return getCatalogTheaterPlans(theater, showTimes).map((plan, index) =>
          formatGeneratedShow({ movie, theater, plan, index, activeDate }),
        );
      });
    });
}

function formatGeneratedShow({ movie, theater, plan, index, activeDate }) {
  const show = buildCatalogShow({ movie, theater, plan, index, activeDate, showTimes });
  return {
    id: show.id,
    movieId: movie.id,
    movie: movie.title || movie.id,
    poster: movie.poster || "",
    duration: movie.duration || "",
    genres: movie.genres ?? [],
    certificate: movie.certificate || "UA",
    theaterId: theater.id,
    theater: theater.name,
    city: theater.city || "Bengaluru",
    area: theater.area,
    address: theater.address,
    amenities: theater.amenities ?? [],
    logoText: theater.logoText,
    screenId: `${theater.id}-${slugify(show.screen || "screen-1")}`,
    screen: show.screen,
    startTime: show.label,
    endTime: "Auto calculated",
    format: show.format,
    language: show.language,
    price: show.price,
    seatLayout: show.seatLayout,
    status: show.status,
    cancellable: show.cancellable,
  };
}

router.get(
  "/",
  asyncHandler(async (request, response) => {
    const theaterId = String(request.query.theaterId ?? "").trim();
    const city = String(request.query.city ?? "").trim();
    const date = String(request.query.date ?? "").trim();

    if (!isMongoReady()) {
      response.json({ shows: generatedTheaterShows({ theaterId, city, activeDate: date }) });
      return;
    }

    const showFilter = {};
    if (theaterId) showFilter.theaterId = theaterId;

    const shows = await Show.find(showFilter).sort({ movie: 1, startTime: 1 }).lean();
    const visibleShows = shows.filter((show) => isPublicShow(show) && matchesShowDate(show, date));
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

router.get(
  "/:movieId",
  asyncHandler(async (request, response) => {
    if (!isMongoReady()) {
      response.json({
        shows: generatedShows(request.params.movieId, request.query.city, request.query.date),
      });
      return;
    }

    const city = String(request.query.city ?? "").trim();
    const date = String(request.query.date ?? "").trim();
    const shows = await Show.find({ movieId: request.params.movieId })
      .sort({ startTime: 1 })
      .lean();
    const visibleShows = shows.filter((show) => isPublicShow(show) && matchesShowDate(show, date));
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

function matchesShowDate(show, date) {
  if (!date) return true;
  const value = String(show.date || "").trim();
  return !value || value === date;
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

export { generatedShows, generatedTheaterShows, router as showRoutes };
