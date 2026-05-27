import mongoose from "mongoose";
import { env } from "../config/env.js";
import { Booking } from "../models/Booking.js";
import { movies } from "../seed.js";
import { Movie } from "../models/Movie.js";
import { Show } from "../models/Show.js";
import { Subscriber } from "../models/Subscriber.js";
import { Theater } from "../models/Theater.js";
import { User } from "../models/User.js";

let mongoReady = false;
const collectionModels = [Booking, Movie, Show, Subscriber, Theater, User];

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
  const count = await Movie.estimatedDocumentCount();
  if (count > 0) return;
  await Movie.insertMany(movies);
  console.log(`Seeded ${movies.length} movies into MongoDB.`);
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
    await model.createIndexes();
  }

  console.log(
    `MongoDB database "${mongoose.connection.name}" collections ready: ${collectionModels
      .map((model) => model.collection.name)
      .join(", ")}.`,
  );
}

async function connectDatabase() {
  if (!env.mongoUri) {
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
    await seedMovies();
    console.log(`MongoDB connected to database "${mongoose.connection.name}".`);
    return true;
  } catch (error) {
    mongoReady = false;
    console.warn("MongoDB connection failed. Falling back to local in-memory data.");
    console.warn(error);
    return false;
  }
}

function isMongoReady() {
  return mongoReady;
}

export { cleanDocument, connectDatabase, isMongoReady };
