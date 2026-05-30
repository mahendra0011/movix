import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import mongoose from "mongoose";
import dns from "node:dns";
import { Movie } from "../server/models/Movie.js";
import { Show } from "../server/models/Show.js";
import { Theater } from "../server/models/Theater.js";
import { User } from "../server/models/User.js";
import {
  comingSoonMovies,
  theaters as catalogTheaters,
} from "../src/features/movies/data/movieCatalog.js";
import {
  castAvatarFallback,
  normalizeCastImageUrl,
  normalizeMovieImageUrl,
} from "../src/features/movies/services/movieMedia.js";

dotenv.config();

const TARGET_CAST_COUNT = 6;
const SHOWS_PER_MOVIE = 3;
const THEATER_POOL_SIZE = 24;
const DEFAULT_RELEASE_OFFSET_DAYS = 14;

if (String(process.env.MONGODB_URI || "").startsWith("mongodb+srv://")) {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
}

const castPools = {
  Hindi: [
    "Deepika Padukone",
    "Amitabh Bachchan",
    "Kiara Advani",
    "Rajkummar Rao",
    "Nawazuddin Siddiqui",
    "Triptii Dimri",
  ],
  Telugu: [
    "Rana Daggubati",
    "Nayanthara",
    "Vijay Deverakonda",
    "Rashmika Mandanna",
    "Samantha Ruth Prabhu",
    "Adivi Sesh",
  ],
  Tamil: [
    "Vijay Sethupathi",
    "Nayanthara",
    "Trisha Krishnan",
    "Karthi",
    "Sivakarthikeyan",
    "Prakash Raj",
  ],
  Kannada: [
    "Rishab Shetty",
    "Sudeep",
    "Rakshit Shetty",
    "Rukmini Vasanth",
    "Kishore",
    "Prakash Raj",
  ],
  Malayalam: [
    "Prithviraj Sukumaran",
    "Fahadh Faasil",
    "Tovino Thomas",
    "Manju Warrier",
    "Parvathy Thiruvothu",
    "Soubin Shahir",
  ],
  English: [
    "Chris Pratt",
    "Florence Pugh",
    "Anya Taylor-Joy",
    "John Boyega",
    "Rebecca Ferguson",
    "Oscar Isaac",
  ],
  Japanese: [
    "Ryunosuke Kamiki",
    "Minami Hamabe",
    "Sakura Ando",
    "Kuranosuke Sasaki",
    "Munetaka Aoki",
    "Hidetaka Yoshioka",
  ],
};

const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  throw new Error("MONGODB_URI is required to seed coming-soon movies.");
}

await mongoose.connect(mongoUri, {
  dbName: process.env.MONGODB_DB || "movix",
  serverSelectionTimeoutMS: 15000,
});

const owner = await ensureAdminOwner();
const actorAvatars = await loadExistingActorAvatars();
const theaterPool = catalogTheaters.slice(0, THEATER_POOL_SIZE);

await ensureTheaters(theaterPool, owner._id);

const operations = comingSoonMovies.flatMap((movie, movieIndex) => {
  const releaseAt = normalizeDateInput(movie.releaseAt || movie.date, movieIndex);
  const cast = buildCast(movie, actorAvatars);
  const poster = normalizeMovieImageUrl(movie.poster, movie.title, "poster");
  const backdrop = normalizeMovieImageUrl(
    movie.backdrop || movie.poster,
    movie.title,
    "backdrop",
    poster,
  );
  const theaters = rotateList(theaterPool, movieIndex).slice(0, SHOWS_PER_MOVIE);

  return theaters.map((theater, theaterIndex) => {
    const id = `coming-soon-${movie.id}-${theater.id}-${theaterIndex + 1}`;
    const screenId = `${theater.id}-coming-soon`;
    return {
      updateOne: {
        filter: { id },
        update: {
          $set: {
            id,
            ownerId: owner._id,
            movieId: movie.id,
            movie: movie.title,
            poster,
            backdrop,
            duration: movie.duration || "",
            genres: movie.genres ?? [],
            releaseDate: movie.releaseDate || formatReleaseDate(releaseAt),
            description: movie.description || "",
            cast,
            theaterId: theater.id,
            theater: theater.name,
            screenId,
            screen: "Coming Soon",
            date: releaseAt,
            time: "TBA",
            startTime: "TBA",
            endTime: "TBA",
            price: {
              platinum: 180,
              silver: 220,
              gold: 260,
              vip: 420,
            },
            language: movie.language || "English",
            format: movie.format?.[0] || movie.formats?.[0] || "2D",
            certificate: movie.certificate || "UA",
            status: "Coming soon",
            cancellable: false,
            listingType: "coming-soon",
            seats: 0,
            seatLayout: {},
            bookingOpensAt: "",
            trailerUrl: movie.trailerUrl || "",
            notes: "Seeded coming-soon listing with cast images saved in MongoDB.",
          },
        },
        upsert: true,
      },
    };
  });
});

for (let index = 0; index < operations.length; index += 250) {
  await Show.bulkWrite(operations.slice(index, index + 250));
}

console.log(
  `Seeded ${comingSoonMovies.length} coming-soon movies, ${operations.length} listings, ${TARGET_CAST_COUNT} cast members per movie.`,
);

await mongoose.disconnect();

async function ensureAdminOwner() {
  const email = String(process.env.ADMIN_EMAIL || "admin@movix.local")
    .trim()
    .toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.role !== "admin" || !existing.verified || existing.blocked) {
      existing.role = "admin";
      existing.verified = true;
      existing.blocked = false;
      existing.status = "Active";
      await existing.save();
    }
    return existing;
  }

  const passwordHash = process.env.ADMIN_PASSWORD
    ? await bcrypt.hash(process.env.ADMIN_PASSWORD, 10)
    : "";
  return User.create({
    name: "Mahendra Admin",
    email,
    passwordHash,
    role: "admin",
    verified: true,
    blocked: false,
    status: "Active",
  });
}

async function loadExistingActorAvatars() {
  const avatars = new Map();
  const docs = await Promise.all([
    Movie.find({ "cast.name": { $exists: true } }, { cast: 1 }).lean(),
    Show.find({ "cast.name": { $exists: true } }, { cast: 1 }).lean(),
  ]);

  docs.flat().forEach((doc) => {
    (doc.cast ?? []).forEach((member) => {
      addActorAvatar(avatars, member?.name, member?.avatar);
    });
  });

  comingSoonMovies.forEach((movie) => {
    (movie.cast ?? []).forEach((member) => {
      addActorAvatar(avatars, member?.name, member?.avatar);
    });
  });

  return avatars;
}

function addActorAvatar(map, name, avatar) {
  const key = actorKey(name);
  const image = String(avatar || "").trim();
  if (!key || !image || !image.startsWith("https://res.cloudinary.com/")) return;

  const current = map.get(key);
  if (!current || (isGeneratedAvatar(current) && !isGeneratedAvatar(image))) {
    map.set(key, image);
  }
}

async function ensureTheaters(theaters, ownerId) {
  if (!theaters.length) return;
  await Theater.bulkWrite(
    theaters.map((theater) => ({
      updateOne: {
        filter: { id: theater.id },
        update: {
          $set: {
            id: theater.id,
            name: theater.name,
            city: theater.city || "Jabalpur",
            area: theater.area || "",
            address: theater.address || `${theater.area || theater.city}, ${theater.city}`,
            distance: theater.distance || "",
            amenities: Array.isArray(theater.amenities) ? theater.amenities : [],
            logoText: theater.logoText || initials(theater.name),
            approved: true,
            ownerId,
            screens: [
              {
                id: `${theater.id}-coming-soon`,
                name: "Coming Soon",
                type: "Preview",
                totalSeats: 0,
                occupancy: 0,
                seatLayout: {},
              },
            ],
          },
        },
        upsert: true,
      },
    })),
  );
}

function buildCast(movie, actorAvatars) {
  const pool = castPools[movie.language] ?? castPools.English;
  const cast = uniqueCast([...(movie.cast ?? []), ...pool.map((name) => ({ name, role: "Cast" }))]);

  return cast.slice(0, TARGET_CAST_COUNT).map((member, index) => {
    const avatar =
      actorAvatars.get(actorKey(member.name)) || member.avatar || castAvatarFallback(member.name);
    return {
      name: member.name,
      role: member.role || (index === 0 ? "Lead" : "Cast"),
      avatar: normalizeCastImageUrl(avatar, member.name),
    };
  });
}

function uniqueCast(list) {
  const seen = new Set();
  return list
    .map((member) => ({
      name: String(member?.name ?? member ?? "").trim(),
      role: String(member?.role ?? "Cast").trim() || "Cast",
      avatar: String(member?.avatar ?? "").trim(),
    }))
    .filter((member) => {
      const key = actorKey(member.name);
      if (!key || key === "official cast" || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function normalizeDateInput(value, index = 0) {
  const raw = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return futureIsoDate(DEFAULT_RELEASE_OFFSET_DAYS + index * 4);
}

function futureIsoDate(offsetDays) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function formatReleaseDate(value) {
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function rotateList(list, offset) {
  if (!list.length) return [];
  const normalizedOffset = offset % list.length;
  return [...list.slice(normalizedOffset), ...list.slice(0, normalizedOffset)];
}

function actorKey(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function isGeneratedAvatar(value) {
  return String(value || "").includes("l_text:");
}

function initials(value) {
  return String(value || "BM")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}
