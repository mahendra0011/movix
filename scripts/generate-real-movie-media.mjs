import "dotenv/config";
import dns from "node:dns";
import { access, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ensureCloudinaryImageUrl } from "../server/services/cloudinaryService.js";
import { comingSoonMovies, movies } from "../src/features/movies/data/movieCatalog.js";

const WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php";
const WIKIPEDIA_SUMMARY = "https://en.wikipedia.org/api/rest_v1/page/summary";
const USER_AGENT = "movixRealMediaCatalog/1.0";
const OUTPUT_FILE = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../src/features/movies/data/realMovieMedia.generated.js",
);
const personImageCache = new Map();
const personAvatarCache = new Map();
const pageSummaryCache = new Map();

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const allMovies = uniqueById([...movies, ...comingSoonMovies]);
const mediaById = await loadExistingMedia();
seedPersonAvatarCache(mediaById);

console.log(`Resolving real media for ${allMovies.length} movies...`);

await mapLimit(allMovies, 2, async (movie, index) => {
  const movieId = movie.id;
  const folder = `movix/real-catalog/${movieId}`;
  try {
    const movieImage = await findMovieImage(movie);
    const firstCastAvatar = await getOrUploadPersonAvatar(movie.cast?.[0]?.name);
    const posterSource = movieImage || firstCastAvatar;
    const existing = mediaById[movieId] ?? {};
    const poster =
      existing.poster ||
      (posterSource ? await uploadRealImage(posterSource, folder, `${movieId}-poster`) : "");
    const backdrop =
      existing.backdrop ||
      (posterSource ? await uploadRealImage(posterSource, folder, `${movieId}-backdrop`) : poster);

    const cast = { ...(existing.cast ?? {}) };
    await mapLimit(movie.cast ?? [], 3, async (member, castIndex) => {
      const name = String(member?.name ?? "").trim();
      if (!name || cast[name]) return;
      const avatar = await getOrUploadPersonAvatar(
        name,
        `${folder}/cast`,
        `${movieId}-cast-${castIndex + 1}`,
      );
      if (avatar) cast[name] = avatar;
    });

    mediaById[movieId] = {
      poster: poster || "",
      backdrop: backdrop || poster || "",
      cast,
    };
  } catch (error) {
    console.warn(`Media lookup skipped for ${movie.title}: ${error.message}`);
    mediaById[movieId] = { poster: "", backdrop: "", cast: {} };
  }

  if ((index + 1) % 10 === 0 || index === allMovies.length - 1) {
    console.log(`Resolved ${index + 1}/${allMovies.length}`);
  }
});

await writeGeneratedMedia(mediaById);
console.log(`Wrote ${OUTPUT_FILE}`);

async function findMovieImage(movie) {
  const directTitles = [
    movie.title,
    `${movie.title} (film)`,
    `${movie.title} (${movie.language || ""} film)`,
    `${movie.title} (2026 film)`,
    `${movie.title} (2027 film)`,
  ];
  for (const title of directTitles) {
    const summary = await getWikipediaSummary(title);
    if (!summary) continue;
    if (!isLikelyMovieSummary(summary, movie)) continue;
    const image = summary.originalimage?.source || summary.thumbnail?.source || "";
    if (image) return image;
  }

  const queries = [
    movie.title,
    `${movie.title} film`,
    `${movie.title} ${movie.language || ""} film`,
    `${movie.title} movie poster`,
  ];

  for (const query of queries) {
    const pages = await searchWikipedia(query);
    for (const page of pages) {
      const summary = await getWikipediaSummary(page.title);
      if (!summary) continue;
      if (!isLikelyMovieSummary(summary, movie)) continue;
      const image = summary.thumbnail?.source || summary.originalimage?.source || "";
      if (image) return image;
    }
  }

  return "";
}

async function findPersonImage(name) {
  const cleanName = String(name || "").trim();
  if (!cleanName) return "";
  if (personImageCache.has(cleanName)) return personImageCache.get(cleanName);

  const directSummary = await getWikipediaSummary(cleanName);
  if (directSummary && isLikelyPersonSummary(directSummary, cleanName)) {
    const image = directSummary.thumbnail?.source || directSummary.originalimage?.source || "";
    if (image) {
      personImageCache.set(cleanName, image);
      return image;
    }
  }

  const pages = await searchWikipedia(cleanName);
  for (const page of pages) {
    const summary = await getWikipediaSummary(page.title);
    if (!summary) continue;
    if (!isLikelyPersonSummary(summary, cleanName)) continue;
    const image = summary.thumbnail?.source || summary.originalimage?.source || "";
    if (image) {
      personImageCache.set(cleanName, image);
      return image;
    }
  }

  personImageCache.set(cleanName, "");
  return "";
}

async function getOrUploadPersonAvatar(name, folder = "movix/real-cast", publicId = "") {
  const cleanName = String(name || "").trim();
  if (!cleanName) return "";
  if (personAvatarCache.has(cleanName)) return personAvatarCache.get(cleanName);
  const source = await findPersonImage(cleanName);
  const avatar = source
    ? await uploadRealImage(source, folder, publicId || slugify(cleanName))
    : "";
  personAvatarCache.set(cleanName, avatar);
  return avatar;
}

function isLikelyMovieSummary(summary, movie) {
  const text = `${summary.title || ""} ${summary.description || ""} ${summary.extract || ""}`
    .toLowerCase()
    .replace(/[-:]/g, " ");
  const titleKey = normalizeText(movie.title);
  const titleWords = titleKey.split(" ").filter((word) => word.length > 2);
  const titleMatch = titleWords.length
    ? titleWords.slice(0, Math.min(3, titleWords.length)).every((word) => text.includes(word))
    : text.includes(titleKey);
  const movieMatch = /\bfilm\b|\bmovie\b|\bcinema\b|\banimated\b|\btelevision\b/.test(text);
  return titleMatch && movieMatch;
}

function isLikelyPersonSummary(summary, name) {
  const text = `${summary.title || ""} ${summary.description || ""} ${summary.extract || ""}`
    .toLowerCase()
    .replace(/[-:]/g, " ");
  const nameWords = normalizeText(name)
    .split(" ")
    .filter((word) => word.length > 1);
  const nameMatch = nameWords.length ? nameWords.every((word) => text.includes(word)) : false;
  const personMatch =
    /\bactor\b|\bactress\b|\bfilm\b|\bdirector\b|\bcomedian\b|\bproducer\b|\bsinger\b/.test(text);
  return nameMatch && personMatch;
}

async function searchWikipedia(query) {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    generator: "search",
    gsrsearch: query,
    gsrlimit: "5",
    prop: "pageimages|description",
    piprop: "thumbnail|original",
    pilicense: "any",
    origin: "*",
  });
  try {
    const payload = await fetchJson(`${WIKIPEDIA_API}?${params}`);
    return Object.values(payload.query?.pages ?? {}).sort((left, right) => {
      return Number(left.index || 0) - Number(right.index || 0);
    });
  } catch (error) {
    console.warn(`Wikipedia search skipped for "${query}": ${error.message}`);
    return [];
  }
}

async function getWikipediaSummary(title) {
  if (!title) return null;
  if (pageSummaryCache.has(title)) return pageSummaryCache.get(title);
  try {
    const summary = await fetchJson(`${WIKIPEDIA_SUMMARY}/${encodeURIComponent(title)}`);
    pageSummaryCache.set(title, summary);
    return summary;
  } catch {
    pageSummaryCache.set(title, null);
    return null;
  }
}

async function uploadRealImage(source, folder, publicId) {
  if (!source) return "";
  if (String(source).includes("res.cloudinary.com")) return source;
  try {
    const dataUri = await downloadImageAsDataUri(source);
    return await ensureCloudinaryImageUrl(dataUri || source, { folder, publicId });
  } catch (error) {
    console.warn(`Cloudinary upload skipped for ${publicId}: ${error.message}`);
    return "";
  }
}

async function downloadImageAsDataUri(url) {
  const response = await fetchWithRetry(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "image/avif,image/webp,image/*,*/*" },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const contentType = response.headers.get("content-type") || "image/jpeg";
  if (!contentType.startsWith("image/")) throw new Error(`Unsupported media type ${contentType}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  return `data:${contentType};base64,${buffer.toString("base64")}`;
}

async function fetchJson(url, attempts = 3) {
  const response = await fetchWithRetry(
    url,
    {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    },
    attempts,
  );
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return await response.json();
}

async function fetchWithRetry(url, init = {}, attempts = 3) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    });
    if ((response.status === 429 || response.status >= 500) && attempts > 1) {
      await sleep((4 - attempts) * 1500 + 1500);
      return fetchWithRetry(url, init, attempts - 1);
    }
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
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

function seedPersonAvatarCache(value) {
  Object.values(value).forEach((movieMedia) => {
    Object.entries(movieMedia.cast ?? {}).forEach(([name, avatar]) => {
      if (avatar) personAvatarCache.set(name, avatar);
    });
  });
}

function slugify(value) {
  return normalizeText(value)
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
