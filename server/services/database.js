import mongoose from "mongoose";
import dns from "node:dns";
import bcrypt from "bcryptjs";
import { env } from "../config/env.js";
import { Booking } from "../models/Booking.js";
import { Movie } from "../models/Movie.js";
import { Review } from "../models/Review.js";
import { Show } from "../models/Show.js";
import { Subscriber } from "../models/Subscriber.js";
import { Theater } from "../models/Theater.js";
import { User } from "../models/User.js";
import { buildSeedReviews } from "../data/reviewSeeds.js";
import {
  movies as catalogMovies,
  showTimes as catalogShowTimes,
  theaters as catalogTheaters,
} from "../../src/features/movies/data/movieCatalog.js";

let mongoReady = false;
const collectionModels = [Booking, Movie, Review, Show, Subscriber, Theater, User];
const SHOW_WRITE_BATCH_SIZE = 500;
const SHOW_SEED_MOVIES_PER_THEATER = 12;
const catalogMovieIds = catalogMovies.map((movie) => movie.id);
const catalogMovieIdSet = new Set(catalogMovieIds);
const catalogTheaterIds = catalogTheaters.map((theater) => theater.id);

if (String(env.mongoUri || "").startsWith("mongodb+srv://")) {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
}

function cleanDocument(document) {
  const value = document?.toObject ? document.toObject() : document;
  if (!value || typeof value !== "object") return value;
  const { _id, __v, passwordHash, otpHash, ...rest } = value;
  return {
    ...rest,
    id: rest.id ?? _id?.toString(),
  };
}

async function seedMovies() {
  await Movie.bulkWrite(
    catalogMovies.map((movie, index) => {
      const payload = normalizeMovieSeed(movie, index);
      return {
        updateOne: {
          filter: { id: movie.id },
          update: { $set: payload },
          upsert: true,
        },
      };
    }),
  );
  const removed = await Movie.deleteMany({ id: { $nin: catalogMovieIds } });
  console.log(
    `MongoDB movie catalog synced with ${catalogMovies.length} movies${
      removed.deletedCount ? `; removed ${removed.deletedCount} non-catalog movies` : ""
    }.`,
  );
}

async function seedTheaters() {
  await Theater.bulkWrite(
    catalogTheaters.map((theater, index) => {
      const payload = normalizeTheaterSeed(theater, index);
      return {
        updateOne: {
          filter: { id: theater.id },
          update: { $set: payload },
          upsert: true,
        },
      };
    }),
  );
  console.log(`MongoDB theater catalog ready with ${catalogTheaters.length} theaters.`);
}

async function seedShows() {
  const operations = buildShowSeedOperations(true);
  const seedShowIds = operations.map((operation) => operation.updateOne.filter.id);
  const [removedNonCatalog, removedStaleCatalog] = await Promise.all([
    Show.deleteMany({ movieId: { $nin: catalogMovieIds } }),
    Show.deleteMany({
      id: { $nin: seedShowIds },
      movieId: { $in: catalogMovieIds },
      theaterId: { $in: catalogTheaterIds },
    }),
  ]);

  for (let index = 0; index < operations.length; index += SHOW_WRITE_BATCH_SIZE) {
    await Show.bulkWrite(operations.slice(index, index + SHOW_WRITE_BATCH_SIZE));
  }
  const removedCount = removedNonCatalog.deletedCount + removedStaleCatalog.deletedCount;
  console.log(
    `MongoDB show catalog synced with ${operations.length} shows${
      removedCount ? `; removed ${removedCount} stale/non-catalog shows` : ""
    }.`,
  );
}

async function seedBookings() {
  // Booking history must come from real user actions, not demo seed data.
}

async function seedReviews({ force = false } = {}) {
  const removed = await Review.deleteMany({ movieId: { $nin: catalogMovieIds } });

  const reviews = buildSeedReviews(catalogMovies.map((movie) => movie.id));
  await Review.bulkWrite(
    reviews.map((review) => ({
      updateOne: {
        filter: { movieId: review.movieId, userId: review.userId },
        update: force ? { $set: review } : { $setOnInsert: review },
        upsert: true,
      },
    })),
  );
  console.log(
    `MongoDB review catalog synced with ${reviews.length} reviews${
      removed.deletedCount ? `; removed ${removed.deletedCount} non-catalog reviews` : ""
    }.`,
  );
}

async function seedCatalog(options = {}) {
  await seedMovies(options);
  await seedTheaters(options);
  await seedShows(options);
  await seedBookings(options);
  await seedReviews(options);
}

async function ensureDefaultAdminUser() {
  if (!env.adminEmail || !env.adminPassword) return;

  const passwordHash = await bcrypt.hash(env.adminPassword, 10);
  await User.updateOne(
    { email: env.adminEmail },
    {
      $set: {
        name: "Mahendra Admin",
        email: env.adminEmail,
        passwordHash,
        role: "admin",
        verified: true,
        blocked: false,
        status: "Active",
      },
    },
    { upsert: true },
  );
}

async function ensureCollections() {
  const database = mongoose.connection.db;
  const existingCollections = new Set(
    (await database.listCollections({}, { nameOnly: true }).toArray()).map(
      (collection) => collection.name,
    ),
  );

  for (const model of collectionModels) {
    const collectionName = model.collection.name;
    if (!existingCollections.has(collectionName)) {
      await database.createCollection(collectionName);
      existingCollections.add(collectionName);
    }
    if (model !== Show) await model.createIndexes();
  }

  console.log(
    `MongoDB database "${mongoose.connection.name}" collections ready: ${collectionModels
      .map((model) => model.collection.name)
      .join(", ")}.`,
  );
}

async function connectDatabase() {
  if (!env.mongoUri) {
    if (env.isProduction && !env.allowMemoryStore) {
      throw new Error("MONGODB_URI is required in production unless ALLOW_MEMORY_STORE=true.");
    }
    console.log("MONGODB_URI not set. API is running with local in-memory data.");
    return false;
  }

  try {
    await mongoose.connect(env.mongoUri, {
      dbName: env.mongoDb || undefined,
      serverSelectionTimeoutMS: 2500,
    });
    mongoReady = true;
    await ensureCollections();
    await ensureDefaultAdminUser();
    await seedCatalog();
    console.log(`MongoDB connected to database "${mongoose.connection.name}".`);
    return true;
  } catch (error) {
    mongoReady = false;
    if (env.isProduction && !env.allowMemoryStore) {
      throw error;
    }
    console.warn("MongoDB connection failed. Falling back to local in-memory data.");
    console.warn(error);
    return false;
  }
}

function isMongoReady() {
  return mongoReady;
}

function normalizeMovieSeed(movie, index) {
  return {
    ...movie,
    sortOrder: Number(movie.sortOrder || index + 1),
    cast: (movie.cast ?? []).map((member) => ({
      name: member.name || "Cast member",
      role: member.role || "Actor",
      avatar: member.avatar || movie.poster || movie.backdrop,
    })),
  };
}

function normalizeTheaterSeed(theater, index) {
  return {
    id: theater.id,
    name: theater.name,
    city: theater.city || "Jabalpur",
    area: theater.area || "",
    address: theater.address || `${theater.area || theater.city}, ${theater.city}`,
    distance: theater.distance || "",
    amenities: Array.isArray(theater.amenities) ? theater.amenities : splitList(theater.amenities),
    logoText: theater.logoText || initials(theater.name),
    movieIds: Array.isArray(theater.movieIds)
      ? theater.movieIds
      : catalogMovies.map((movie) => movie.id),
    showPlan: normalizeShowPlan(theater.showPlan),
    approved: true,
    screens: buildScreensForTheater(theater, index),
  };
}

function buildShowSeedOperations(force = false) {
  return catalogTheaters.flatMap((theater, theaterIndex) => {
    const plans = normalizeShowPlan(theater.showPlan);
    const effectivePlans = plans.length ? plans : fallbackShowPlan();
    const movieIds = getSeedMovieIdsForTheater(theater, theaterIndex);

    return movieIds.flatMap((movieId) => {
      const movie = catalogMovies.find((item) => item.id === movieId) ?? catalogMovies[0];
      return effectivePlans.map((plan, showIndex) => {
        const screen = plan.screen || "Screen 1";
        const id = `${movie.id}-${theater.id}-${showIndex}`;
        const payload = {
          id,
          movieId: movie.id,
          theaterId: theater.id,
          screenId: `${theater.id}-${slugify(screen) || `screen-${showIndex + 1}`}`,
          screen,
          startTime: plan.time || catalogShowTimes[showIndex % catalogShowTimes.length],
          endTime: "Auto calculated",
          price: showPrice(showIndex, theaterIndex),
          language: movie.language || "English",
          format: plan.format || movie.format?.[0] || "2D",
          status: plan.status || inferShowStatus(showIndex),
          cancellable: plan.cancellable !== false,
        };

        return {
          updateOne: {
            filter: { id },
            update: force ? { $set: payload } : { $setOnInsert: payload },
            upsert: true,
          },
        };
      });
    });
  });
}

function getSeedMovieIdsForTheater(theater, theaterIndex) {
  const listedMovieIds = Array.isArray(theater.movieIds)
    ? theater.movieIds.filter((movieId) => catalogMovieIdSet.has(movieId))
    : [];
  const source = listedMovieIds.length ? listedMovieIds : catalogMovieIds;
  if (source.length <= SHOW_SEED_MOVIES_PER_THEATER) return source;

  const offset = (theaterIndex * 7) % source.length;
  return Array.from(
    { length: SHOW_SEED_MOVIES_PER_THEATER },
    (_, index) => source[(offset + index) % source.length],
  );
}

function normalizeShowPlan(showPlan) {
  if (!Array.isArray(showPlan)) return [];
  return showPlan
    .map((plan, index) => {
      if (typeof plan === "string") return { time: plan, screen: "Screen 1" };
      return {
        time: plan.time || catalogShowTimes[index % catalogShowTimes.length],
        format: plan.format || "2D",
        status: plan.status || inferShowStatus(index),
        cancellable: plan.cancellable !== false,
        screen: plan.screen || "Screen 1",
      };
    })
    .filter((plan) => plan.time);
}

function fallbackShowPlan() {
  return catalogShowTimes.map((time, index) => ({
    time,
    format: index % 2 === 0 ? "2D" : "IMAX",
    status: inferShowStatus(index),
    cancellable: index % 2 === 1,
    screen: "Screen 1",
  }));
}

function buildScreensForTheater(theater, index) {
  const screenNames = [
    ...new Set(
      normalizeShowPlan(theater.showPlan)
        .map((plan) => plan.screen)
        .filter(Boolean),
    ),
  ];
  const names = screenNames.length
    ? screenNames
    : ["Screen 1", index % 2 === 0 ? "Screen 2" : "Audi 1"];

  return names.map((name, screenIndex) => ({
    id: `${theater.id}-${slugify(name) || `screen-${screenIndex + 1}`}`,
    name,
    type: screenIndex === 0 ? "Premium" : "Regular",
    totalSeats: screenIndex === 0 ? 140 : 120,
    occupancy: 0,
    seatLayout: {
      rows: ["A", "B", "C", "D", "E", "F", "G", "H", "J", "K"],
      cols: screenIndex === 0 ? 14 : 12,
    },
  }));
}

function showPrice(showIndex, theaterIndex) {
  const offset = (theaterIndex % 5) * 10;
  return {
    platinum: 180 + offset + showIndex * 10,
    silver: 220 + offset + showIndex * 12,
    gold: 250 + offset + showIndex * 15,
    vip: 400 + offset + showIndex * 20,
  };
}

function inferShowStatus(index) {
  if (index === 4) return "sold";
  if (index === 3) return "fast";
  return "ok";
}

function splitList(value) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function initials(value) {
  return String(value || "BM")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export { cleanDocument, connectDatabase, isMongoReady, seedCatalog };
