import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import mongoose from "mongoose";
import dns from "node:dns";
import { Movie } from "../server/models/Movie.js";
import { Show } from "../server/models/Show.js";
import { Theater } from "../server/models/Theater.js";
import { User } from "../server/models/User.js";
import { ensureCloudinaryImageUrl } from "../server/services/cloudinaryService.js";
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
const WIKIMEDIA_API_TIMEOUT_MS = 10000;

if (String(process.env.MONGODB_URI || "").startsWith("mongodb+srv://")) {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
}

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

const operations = [];
const uploadedAvatarNames = new Set();
const unresolvedAvatarNames = new Set();

for (const [movieIndex, movie] of comingSoonMovies.entries()) {
  const releaseAt = normalizeDateInput(movie.releaseAt || movie.date, movieIndex);
  const cast = await buildCast(movie, actorAvatars, { uploadedAvatarNames, unresolvedAvatarNames });
  const poster = normalizeMovieImageUrl(movie.poster, movie.title, "poster");
  const backdrop = normalizeMovieImageUrl(
    movie.backdrop || movie.poster,
    movie.title,
    "backdrop",
    poster,
  );
  const theaters = rotateList(theaterPool, movieIndex).slice(0, SHOWS_PER_MOVIE);

  operations.push(
    ...theaters.map((theater, theaterIndex) => {
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
    }),
  );
}

for (let index = 0; index < operations.length; index += 250) {
  await Show.bulkWrite(operations.slice(index, index + 250));
}

console.log(
  `Seeded ${comingSoonMovies.length} coming-soon movies and ${operations.length} listings with verified cast only.`,
);
console.log(
  `Cast image check: uploaded ${uploadedAvatarNames.size} Wikimedia photos to Cloudinary; ${unresolvedAvatarNames.size} actors still use generated fallback.`,
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
  if (isGeneratedAvatar(image)) return;

  const current = map.get(key);
  if (!current) {
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

async function buildCast(movie, actorAvatars, stats) {
  const cast = uniqueCast(movie.cast ?? []);
  const rows = [];

  for (const [index, member] of cast.slice(0, TARGET_CAST_COUNT).entries()) {
    const avatar = await resolveActorAvatar(member, actorAvatars, stats);
    if (!avatar || isGeneratedAvatar(avatar)) continue;

    rows.push({
      name: member.name,
      role: member.role || (index === 0 ? "Lead" : "Cast"),
      avatar: normalizeCastImageUrl(avatar, member.name),
    });
  }

  return rows;
}

async function resolveActorAvatar(member, actorAvatars, stats) {
  const key = actorKey(member.name);
  const existing = actorAvatars.get(key);
  if (existing && !isGeneratedAvatar(existing)) return existing;
  if (member.avatar && !isGeneratedAvatar(member.avatar)) return member.avatar;

  const uploaded = await uploadWikimediaActorPhoto(member.name);
  if (uploaded) {
    actorAvatars.set(key, uploaded);
    stats.uploadedAvatarNames.add(member.name);
    return uploaded;
  }

  stats.unresolvedAvatarNames.add(member.name);
  return "";
}

async function uploadWikimediaActorPhoto(name) {
  const sourceUrl = await findWikimediaActorImageUrl(name);
  if (!sourceUrl) return "";

  try {
    const imageDataUrl = await fetchImageAsDataUrl(sourceUrl);
    return await ensureCloudinaryImageUrl(imageDataUrl || sourceUrl, {
      folder: "movix/real-cast",
      publicId: slugify(name),
      tags: ["coming-soon-cast"],
    });
  } catch (error) {
    console.warn(`Cloudinary upload failed for ${name}: ${error.message}`);
    return "";
  }
}

async function fetchImageAsDataUrl(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WIKIMEDIA_API_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "movix-cast-image-verifier/1.0" },
    });
    if (!response.ok) return "";
    const contentType = response.headers.get("content-type") || "image/jpeg";
    if (!contentType.startsWith("image/")) return "";
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!bytes.length || bytes.length > 5 * 1024 * 1024) return "";
    return `data:${contentType};base64,${bytes.toString("base64")}`;
  } catch {
    return "";
  } finally {
    clearTimeout(timeout);
  }
}

async function findWikimediaActorImageUrl(name) {
  const summaryImage = await findWikipediaSummaryImageUrl(name);
  if (summaryImage) return summaryImage;

  const searchUrl = new URL("https://www.wikidata.org/w/api.php");
  searchUrl.search = new URLSearchParams({
    action: "wbsearchentities",
    format: "json",
    language: "en",
    type: "item",
    limit: "5",
    search: name,
  }).toString();

  const search = await fetchJson(searchUrl);
  const entityId = (search?.search ?? []).find((item) => isLikelyPerson(item))?.id;
  if (!entityId) return "";

  const entity = await fetchJson(
    `https://www.wikidata.org/wiki/Special:EntityData/${entityId}.json`,
  );
  const imageName =
    entity?.entities?.[entityId]?.claims?.P18?.[0]?.mainsnak?.datavalue?.value ?? "";
  if (!imageName) return "";

  return (await findCommonsThumbnailUrl(imageName)) || "";
}

async function findWikipediaSummaryImageUrl(name) {
  const data = await fetchJson(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`,
  );
  const description = String(data?.description ?? "").toLowerCase();
  const image = data?.thumbnail?.source || data?.originalimage?.source || "";
  if (!image || data?.type === "disambiguation") return "";
  if (
    description &&
    !["actor", "actress", "film", "television", "comedian", "singer", "performer", "producer"].some(
      (word) => description.includes(word),
    )
  ) {
    return "";
  }
  return image;
}

async function findCommonsThumbnailUrl(imageName) {
  const imageUrl = new URL("https://commons.wikimedia.org/w/api.php");
  imageUrl.search = new URLSearchParams({
    action: "query",
    format: "json",
    prop: "imageinfo",
    titles: `File:${imageName}`,
    iiprop: "url",
    iiurlwidth: "512",
  }).toString();

  const data = await fetchJson(imageUrl);
  const pages = Object.values(data?.query?.pages ?? {});
  return pages[0]?.imageinfo?.[0]?.thumburl || pages[0]?.imageinfo?.[0]?.url || "";
}

function isLikelyPerson(item) {
  const text = `${item?.label ?? ""} ${item?.description ?? ""}`.toLowerCase();
  return (
    text.includes("actor") ||
    text.includes("actress") ||
    text.includes("film") ||
    text.includes("television") ||
    text.includes("comedian") ||
    text.includes("singer") ||
    text.includes("performer")
  );
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WIKIMEDIA_API_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "movix-cast-image-verifier/1.0",
        Accept: "application/json",
      },
    });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
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

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function initials(value) {
  return String(value || "BM")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}
