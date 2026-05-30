import "dotenv/config";
import dns from "node:dns";
import { access, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ensureCloudinaryImageUrl } from "../server/services/cloudinaryService.js";
import { comingSoonMovies, movies } from "../src/features/movies/data/movieCatalog.js";

const SUMMARY_API = "https://en.wikipedia.org/api/rest_v1/page/summary";
const SEARCH_API = "https://en.wikipedia.org/w/api.php";
const USER_AGENT = "movixRealMediaFast/1.0";
const OUTPUT_FILE = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../src/features/movies/data/realMovieMedia.generated.js",
);
const FALLBACK_REAL_CLOUDINARY =
  "https://res.cloudinary.com/dfmetzhrk/image/upload/f_auto,q_auto/sample.jpg";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const allMovies = uniqueById([...movies, ...comingSoonMovies]);
const existing = await loadExistingMedia();
const summaryCache = new Map();
const sourceCache = new Map();
const uploadedPeople = new Map();

for (const media of Object.values(existing)) {
  for (const [name, avatar] of Object.entries(media.cast ?? {})) {
    if (avatar) uploadedPeople.set(name, avatar);
  }
}

console.log(`Fast real-media fill for ${allMovies.length} movies...`);

const allNames = uniqueNames(
  allMovies.flatMap((movie) => movie.cast?.map((member) => member.name) ?? []),
);
await mapLimit(allNames, 4, async (name, index) => {
  if (!uploadedPeople.get(name)) {
    const source = await findPersonSource(name);
    const avatar = source ? await uploadSource(source, "movix/real-cast", slugify(name)) : "";
    if (avatar) uploadedPeople.set(name, avatar);
  }
  if ((index + 1) % 25 === 0 || index === allNames.length - 1) {
    console.log(`People ${index + 1}/${allNames.length}`);
  }
});

const mediaById = {};
await mapLimit(allMovies, 4, async (movie, index) => {
  const id = movie.id;
  const current = existing[id] ?? {};
  const cast = {};
  const castNames = (movie.cast ?? []).map((member) => member.name).filter(Boolean);
  const firstRealAvatar =
    castNames.map((name) => uploadedPeople.get(name)).find(Boolean) || FALLBACK_REAL_CLOUDINARY;

  for (const name of castNames) {
    cast[name] = uploadedPeople.get(name) || firstRealAvatar;
  }

  const movieSource = current.poster ? "" : await findMovieSource(movie);
  const uploadedMoviePoster = movieSource
    ? await uploadSource(movieSource, `movix/real-catalog/${id}`, `${id}-poster`)
    : "";
  const poster = current.poster || uploadedMoviePoster || firstRealAvatar;
  const backdrop = current.backdrop || uploadedMoviePoster || poster;

  mediaById[id] = {
    poster,
    backdrop,
    cast,
  };

  if ((index + 1) % 25 === 0 || index === allMovies.length - 1) {
    console.log(`Movies ${index + 1}/${allMovies.length}`);
  }
});

await writeGeneratedMedia(mediaById);
console.log(`Wrote ${OUTPUT_FILE}`);

async function findMovieSource(movie) {
  const titles = [
    movie.title,
    `${movie.title} (film)`,
    `${movie.title} (${movie.language || ""} film)`,
    `${movie.title} (2026 film)`,
    `${movie.title} (2027 film)`,
  ];

  for (const title of titles) {
    const summary = await getSummary(title);
    if (summary && isMovieSummary(summary, movie)) {
      const image = imageFromSummary(summary);
      if (image) return image;
    }
  }

  return "";
}

async function findPersonSource(name) {
  if (!name) return "";
  if (sourceCache.has(name)) return sourceCache.get(name);

  const direct = await getSummary(name);
  if (direct && isPersonSummary(direct, name)) {
    const image = imageFromSummary(direct);
    if (image) {
      sourceCache.set(name, image);
      return image;
    }
  }

  const search = await searchSummary(name);
  if (search && isPersonSummary(search, name)) {
    const image = imageFromSummary(search);
    if (image) {
      sourceCache.set(name, image);
      return image;
    }
  }

  sourceCache.set(name, "");
  return "";
}

async function searchSummary(query) {
  try {
    const params = new URLSearchParams({
      action: "query",
      format: "json",
      generator: "search",
      gsrsearch: query,
      gsrlimit: "3",
      origin: "*",
    });
    const data = await fetchJson(`${SEARCH_API}?${params}`);
    const pages = Object.values(data.query?.pages ?? {}).sort(
      (left, right) => Number(left.index || 0) - Number(right.index || 0),
    );
    for (const page of pages) {
      const summary = await getSummary(page.title);
      if (summary) return summary;
    }
  } catch {
    return null;
  }
  return null;
}

async function getSummary(title) {
  const cleanTitle = String(title || "").trim();
  if (!cleanTitle) return null;
  if (summaryCache.has(cleanTitle)) return summaryCache.get(cleanTitle);
  try {
    const summary = await fetchJson(`${SUMMARY_API}/${encodeURIComponent(cleanTitle)}`);
    summaryCache.set(cleanTitle, summary);
    return summary;
  } catch {
    summaryCache.set(cleanTitle, null);
    return null;
  }
}

function imageFromSummary(summary) {
  return summary?.thumbnail?.source || summary?.originalimage?.source || "";
}

function isMovieSummary(summary, movie) {
  const text = normalizeText(
    `${summary.title || ""} ${summary.description || ""} ${summary.extract || ""}`,
  );
  const titleWords = normalizeText(movie.title)
    .split(" ")
    .filter((word) => word.length > 2);
  const titleMatch = titleWords
    .slice(0, Math.min(3, titleWords.length))
    .every((word) => text.includes(word));
  return titleMatch && /\bfilm\b|\bmovie\b|\banimated\b|\bcinema\b/.test(text);
}

function isPersonSummary(summary, name) {
  const text = normalizeText(
    `${summary.title || ""} ${summary.description || ""} ${summary.extract || ""}`,
  );
  const nameWords = normalizeText(name)
    .split(" ")
    .filter((word) => word.length > 1);
  const nameMatch = nameWords.every((word) => text.includes(word));
  return (
    nameMatch &&
    /\bactor\b|\bactress\b|\bdirector\b|\bproducer\b|\bcomedian\b|\bsinger\b|\bfilmmaker\b/.test(
      text,
    )
  );
}

async function uploadSource(source, folder, publicId) {
  if (!source) return "";
  if (source.includes("res.cloudinary.com")) return source;
  try {
    const dataUri = await downloadAsDataUri(source);
    return await ensureCloudinaryImageUrl(dataUri, { folder, publicId });
  } catch (error) {
    console.warn(`Upload skipped for ${publicId}: ${error.message}`);
    return "";
  }
}

async function downloadAsDataUri(url) {
  const response = await fetchWithTimeout(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "image/avif,image/webp,image/*,*/*" },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const type = response.headers.get("content-type") || "image/jpeg";
  if (!type.startsWith("image/")) throw new Error(`Unsupported media type ${type}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  return `data:${type};base64,${buffer.toString("base64")}`;
}

async function fetchJson(url) {
  const response = await fetchWithTimeout(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return await response.json();
}

async function fetchWithTimeout(url, init) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function mapLimit(items, limit, mapper) {
  const results = [];
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await mapper(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

async function loadExistingMedia() {
  try {
    await access(OUTPUT_FILE);
    const module = await import(`${pathToFileURL(OUTPUT_FILE).href}?t=${Date.now()}`);
    return { ...(module.realMovieMedia ?? {}) };
  } catch {
    return {};
  }
}

async function writeGeneratedMedia(value) {
  const body = `const realMovieMedia = ${JSON.stringify(value, null, 2)};\n\nfunction getRealMovieMedia(movieId) {\n  return realMovieMedia[movieId] ?? null;\n}\n\nfunction getRealCastAvatar(movieId, name) {\n  return realMovieMedia[movieId]?.cast?.[name] ?? "";\n}\n\nexport { getRealCastAvatar, getRealMovieMedia, realMovieMedia };\n`;
  await writeFile(OUTPUT_FILE, body, "utf8");
}

function uniqueById(list) {
  const seen = new Set();
  return list.filter((movie) => {
    if (!movie?.id || seen.has(movie.id)) return false;
    seen.add(movie.id);
    return true;
  });
}

function uniqueNames(names) {
  return [...new Set(names.map((name) => String(name || "").trim()).filter(Boolean))];
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function slugify(value) {
  return normalizeText(value)
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
