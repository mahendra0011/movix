import mongoose from "mongoose";
import { env } from "../config/env.js";
import { movies } from "../seed.js";
import { Movie } from "../models/Movie.js";

let mongoReady = false;

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
    await seedMovies();
    console.log("MongoDB connected.");
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
