import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";

import { movies, showTimes, theaters } from "./seed.js";

dotenv.config();

const app = express();
const port = Number(process.env.API_PORT ?? process.env.PORT ?? 4000);
const mongoUri = process.env.MONGODB_URI;
let mongoReady = false;

const corsOrigin = process.env.CLIENT_ORIGIN ?? "*";
app.use(
  cors({
    origin:
      corsOrigin === "*"
        ? true
        : corsOrigin
            .split(",")
            .map((origin) => origin.trim())
            .filter(Boolean),
    credentials: true,
  }),
);
app.use(express.json());

const castMemberSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    role: { type: String, required: true },
    avatar: { type: String, required: true },
  },
  { _id: false },
);

const movieSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    poster: { type: String, required: true },
    backdrop: { type: String, required: true },
    genres: { type: [String], default: [] },
    language: { type: String, required: true },
    duration: { type: String, required: true },
    rating: { type: Number, required: true },
    votes: { type: String, required: true },
    releaseDate: { type: String, required: true },
    description: { type: String, required: true },
    cast: { type: [castMemberSchema], default: [] },
    format: { type: [String], default: [] },
    certificate: { type: String, required: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

movieSchema.index({ title: "text", genres: "text", language: "text" });

const bookingSchema = new mongoose.Schema(
  {
    ref: { type: String, required: true, unique: true, index: true },
    showId: { type: String, required: true },
    movieId: { type: String, required: true },
    movie: { type: String, required: true },
    theaterId: { type: String, default: "" },
    theater: { type: String, required: true },
    time: { type: String, required: true },
    seats: { type: [String], required: true },
    total: { type: Number, required: true },
    status: { type: String, enum: ["confirmed", "held"], default: "confirmed" },
  },
  { timestamps: true },
);

const Movie = mongoose.models.Movie || mongoose.model("Movie", movieSchema);
const Booking = mongoose.models.Booking || mongoose.model("Booking", bookingSchema);

function createRef() {
  return `BMS${Date.now().toString(36).toUpperCase()}${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;
}

function cleanDocument(document) {
  const value = document?.toObject ? document.toObject() : document;
  if (!value || typeof value !== "object") return value;
  const { _id, __v, ...rest } = value;
  return rest;
}

async function seedMovies() {
  const count = await Movie.estimatedDocumentCount();
  if (count > 0) return;
  await Movie.insertMany(movies);
  console.log(`Seeded ${movies.length} movies into MongoDB.`);
}

async function connectMongo() {
  if (!mongoUri) {
    console.log("MONGODB_URI not set. API is running with in-memory demo data.");
    return;
  }

  try {
    await mongoose.connect(mongoUri, {
      dbName: process.env.MONGODB_DB || undefined,
    });
    mongoReady = true;
    await seedMovies();
    console.log("MongoDB connected.");
  } catch (error) {
    mongoReady = false;
    console.warn("MongoDB connection failed. Falling back to in-memory demo data.");
    console.warn(error);
  }
}

const asyncHandler = (handler) => (request, response, next) =>
  Promise.resolve(handler(request, response, next)).catch(next);

function getMemoryMovies(query = "") {
  const needle = query.trim().toLowerCase();
  if (!needle) return movies;
  return movies.filter((movie) => {
    const haystack = [movie.title, movie.language, ...movie.genres].join(" ").toLowerCase();
    return haystack.includes(needle);
  });
}

app.get("/api/health", (_request, response) => {
  response.json({
    ok: true,
    database: mongoReady ? "mongodb" : "memory",
    service: "BookMyScreen API",
  });
});

app.get(
  "/api/movies",
  asyncHandler(async (request, response) => {
    const query = String(request.query.q ?? "");

    if (!mongoReady) {
      response.json({ movies: getMemoryMovies(query) });
      return;
    }

    const filter = query
      ? {
          $or: [
            { $text: { $search: query } },
            { title: new RegExp(query, "i") },
            { genres: new RegExp(query, "i") },
            { language: new RegExp(query, "i") },
          ],
        }
      : {};

    const docs = await Movie.find(filter).sort({ sortOrder: 1 }).lean();
    response.json({ movies: docs.map(cleanDocument) });
  }),
);

app.get(
  "/api/movies/:id",
  asyncHandler(async (request, response) => {
    const { id } = request.params;
    const movie = mongoReady
      ? cleanDocument(await Movie.findOne({ id }).lean())
      : movies.find((item) => item.id === id);

    if (!movie) {
      response.status(404).json({ error: "Movie not found" });
      return;
    }

    response.json({ movie });
  }),
);

app.get("/api/theaters", (_request, response) => {
  response.json({ theaters, showTimes });
});

app.post(
  "/api/bookings",
  asyncHandler(async (request, response) => {
    const { showId, movieId, movie, theaterId = "", theater, time, seats, total } = request.body;
    const seatList = Array.isArray(seats)
      ? seats.map((seat) => String(seat).trim()).filter(Boolean)
      : [];

    if (!showId || !movieId || !movie || !theater || !time || seatList.length === 0) {
      response
        .status(400)
        .json({ error: "Booking requires a show, movie, theater, time, and seats." });
      return;
    }

    const booking = {
      ref: createRef(),
      showId: String(showId),
      movieId: String(movieId),
      movie: String(movie),
      theaterId: String(theaterId),
      theater: String(theater),
      time: String(time),
      seats: seatList,
      total: Number(total || 0),
      status: "confirmed",
    };

    if (!mongoReady) {
      response.status(201).json({ booking: { ...booking, status: "held" } });
      return;
    }

    const saved = await Booking.create(booking);
    response.status(201).json({ booking: cleanDocument(saved) });
  }),
);

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({ error: "Something went wrong in the API." });
});

await connectMongo();

app.listen(port, () => {
  console.log(`BookMyScreen API running on http://localhost:${port}`);
});
