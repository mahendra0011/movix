import "dotenv/config";
import dns from "node:dns";
import mongoose from "mongoose";
import { Movie } from "../server/models/Movie.js";
import { Show } from "../server/models/Show.js";
import {
  ensureCloudinaryImageUrl,
  isCloudinaryConfigured,
  isCloudinaryImageUrl,
} from "../server/services/cloudinaryService.js";

const mongoUri = cleanEnv(process.env.MONGODB_URI);
const mongoDb = cleanEnv(process.env.MONGODB_DB) || "movix";
const CLOUDINARY_FETCH_PATTERN = /\/image\/fetch\//;

if (!mongoUri) {
  console.error("MONGODB_URI is missing.");
  process.exit(1);
}

if (!isCloudinaryConfigured()) {
  console.error("Cloudinary env is missing. Add CLOUDINARY_URL or cloud/key/secret vars.");
  process.exit(1);
}

if (mongoUri.startsWith("mongodb+srv://")) {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
}

await mongoose.connect(mongoUri, {
  dbName: mongoDb,
  serverSelectionTimeoutMS: 10000,
});

const cache = new Map();
let movieUpdates = 0;
let showUpdates = 0;

const movies = await Movie.find({}).sort({ sortOrder: 1 }).lean();
for (const movie of movies) {
  const folder = `movix/movies/${movie.id}`;
  const poster = await uploadCached(movie.poster, {
    folder,
    publicId: `${movie.id}-poster`,
    fallback: posterPlaceholder(movie.title),
  });
  const backdrop = await uploadCached(movie.backdrop, {
    folder,
    publicId: `${movie.id}-backdrop`,
    fallback: backdropPlaceholder(movie.title),
  });
  const cast = [];

  for (const [index, member] of (movie.cast || []).entries()) {
    cast.push({
      ...member,
      avatar: await uploadCached(member.avatar, {
        folder: `${folder}/cast`,
        publicId: `${movie.id}-cast-${index + 1}`,
        fallback: avatarPlaceholder(member.name || movie.title),
      }),
    });
  }

  const movieChanged =
    poster !== movie.poster ||
    backdrop !== movie.backdrop ||
    JSON.stringify(cast) !== JSON.stringify(movie.cast || []);

  if (movieChanged) {
    await Movie.updateOne({ _id: movie._id }, { $set: { poster, backdrop, cast } });
    movieUpdates += 1;
  }

  const showResult = await Show.updateMany(
    { movieId: movie.id },
    { $set: { poster, backdrop, cast } },
  );
  showUpdates += showResult.modifiedCount || 0;
}

const remaining = {
  movies: await Movie.countDocuments({
    $or: [
      { poster: { $not: /res\.cloudinary\.com/ } },
      { backdrop: { $not: /res\.cloudinary\.com/ } },
    ],
  }),
  shows: await Show.countDocuments({
    $or: [
      { poster: { $not: /res\.cloudinary\.com/ } },
      { backdrop: { $not: /res\.cloudinary\.com/ } },
    ],
  }),
};

console.log(
  "Cloudinary migration complete:",
  JSON.stringify(
    {
      movies: movies.length,
      uploadedUniqueImages: cache.size,
      movieUpdates,
      showUpdates,
      remainingNonCloudinaryMedia: remaining,
    },
    null,
    2,
  ),
);

await mongoose.disconnect();

async function uploadCached(value, options) {
  const image = String(value || "").trim();
  if (!image) return uploadFallback(options);
  if (isCloudinaryImageUrl(image) && !isCloudinaryFetchUrl(image)) return image;
  const source = extractCloudinaryFetchSource(image) || image;
  if (cache.has(source)) return cache.get(source);

  try {
    const uploaded = await ensureCloudinaryImageUrl(source, options);
    cache.set(source, uploaded);
    return uploaded;
  } catch (error) {
    console.warn(`Image upload failed for ${options.publicId}: ${error.message}`);
    const fallback = await uploadFallback(options);
    cache.set(source, fallback);
    return fallback;
  }
}

async function uploadFallback(options) {
  const fallback = String(options.fallback || "").trim();
  if (!fallback) return "";
  if (cache.has(fallback)) return cache.get(fallback);
  try {
    const uploaded = await ensureCloudinaryImageUrl(fallback, options);
    cache.set(fallback, uploaded);
    return uploaded;
  } catch (error) {
    console.warn(`Fallback upload failed for ${options.publicId}: ${error.message}`);
    return fallback;
  }
}

function isCloudinaryFetchUrl(value) {
  return CLOUDINARY_FETCH_PATTERN.test(String(value || ""));
}

function extractCloudinaryFetchSource(value) {
  try {
    const url = new URL(String(value || ""));
    const parts = url.pathname.split("/");
    const fetchIndex = parts.findIndex((part) => part === "fetch");
    if (fetchIndex === -1) return "";
    const encoded = parts.slice(fetchIndex + 1).findLast((part) => /^https?%3A/i.test(part));
    return encoded ? decodeURIComponent(encoded) : "";
  } catch {
    return "";
  }
}

function posterPlaceholder(title) {
  return `https://placehold.co/780x1170/0f172a/ffffff/png?text=${encodeURIComponent(title || "Movie")}`;
}

function backdropPlaceholder(title) {
  return `https://placehold.co/1280x720/0f172a/ffffff/png?text=${encodeURIComponent(title || "Movie")}`;
}

function avatarPlaceholder(name) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "Cast")}&background=0f766e&color=fff&size=256&format=png&bold=true`;
}

function cleanEnv(value) {
  return String(value ?? "")
    .trim()
    .replace(/^['"]|['"]$/g, "");
}
