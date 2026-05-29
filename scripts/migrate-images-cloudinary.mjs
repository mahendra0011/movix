import "dotenv/config";
import mongoose from "mongoose";
import { Movie } from "../server/models/Movie.js";
import { Show } from "../server/models/Show.js";
import {
  ensureCloudinaryImageUrl,
  isCloudinaryConfigured,
  isCloudinaryImageUrl,
} from "../server/services/cloudinaryService.js";

const mongoUri = cleanEnv(process.env.MONGODB_URI);
const mongoDb = cleanEnv(process.env.MONGODB_DB) || "moviex";

if (!mongoUri) {
  console.error("MONGODB_URI is missing.");
  process.exit(1);
}

if (!isCloudinaryConfigured()) {
  console.error("Cloudinary env is missing. Add CLOUDINARY_URL or cloud/key/secret vars.");
  process.exit(1);
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
  const folder = `bookmyscreen/movies/${movie.id}`;
  const poster = await uploadCached(movie.poster, {
    folder,
    publicId: `${movie.id}-poster`,
  });
  const backdrop = await uploadCached(movie.backdrop, {
    folder,
    publicId: `${movie.id}-backdrop`,
  });
  const cast = [];

  for (const [index, member] of (movie.cast || []).entries()) {
    cast.push({
      ...member,
      avatar: await uploadCached(member.avatar, {
        folder: `${folder}/cast`,
        publicId: `${movie.id}-cast-${index + 1}`,
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
  if (!image || isCloudinaryImageUrl(image)) return image;
  if (cache.has(image)) return cache.get(image);

  const uploaded = await ensureCloudinaryImageUrl(image, options);
  cache.set(image, uploaded);
  return uploaded;
}

function cleanEnv(value) {
  return String(value ?? "")
    .trim()
    .replace(/^['"]|['"]$/g, "");
}
