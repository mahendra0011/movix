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
const FALLBACK_CAST_CLOUDINARY =
  "https://res.cloudinary.com/dfmetzhrk/image/upload/f_auto,q_auto/sample.jpg";
const MOVIE_FALLBACK_SOURCES = [
  "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1280&q=85",
  "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1280&q=85",
  "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=1280&q=85",
  "https://images.unsplash.com/photo-1505686994434-e3cc5abf1330?auto=format&fit=crop&w=1280&q=85",
  "https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?auto=format&fit=crop&w=1280&q=85",
  "https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=1280&q=85",
  "https://images.unsplash.com/photo-1523207911345-32501502db22?auto=format&fit=crop&w=1280&q=85",
  "https://images.unsplash.com/photo-1585647347483-22b66260dfff?auto=format&fit=crop&w=1280&q=85",
];
const PERSON_TITLE_OVERRIDES = {
  "Thalapathy Vijay": ["Vijay (actor)"],
  "Timothee Chalamet": ["Timothée Chalamet"],
  "Zoe Saldana": ["Zoe Saldaña"],
  Nani: ["Nani (actor)"],
  Soori: ["Soori (actor)"],
  Suhasini: ["Suhasini Maniratnam"],
};

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const allMovies = uniqueById([...movies, ...comingSoonMovies]);
const existing = await loadExistingMedia();
const summaryCache = new Map();
const sourceCache = new Map();
const uploadedPeople = new Map();

for (const media of Object.values(existing)) {
  for (const [name, avatar] of Object.entries(media.cast ?? {})) {
    if (isLikelyPersonAvatar(name, avatar)) uploadedPeople.set(name, avatar);
  }
}

console.log(`Fast real-media fill for ${allMovies.length} movies...`);
const movieFallbackArtwork = await ensureMovieFallbackArtwork();

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

  for (const name of castNames) {
    cast[name] = uploadedPeople.get(name) || "";
  }

  const currentPoster = isReusableMovieImage(current.poster) ? current.poster : "";
  const currentBackdrop = isReusableMovieImage(current.backdrop) ? current.backdrop : "";
  const movieSource = currentPoster && currentBackdrop ? "" : await findMovieSource(movie);
  const uploadedMoviePoster = movieSource
    ? await uploadSource(movieSource, `movix/real-catalog/${id}`, `${id}-poster`)
    : "";
  const fallbackPoster = movieFallbackFor(movie, index, movieFallbackArtwork, "poster");
  const fallbackBackdrop = movieFallbackFor(movie, index, movieFallbackArtwork, "backdrop");
  const poster = currentPoster || asMovieImage(uploadedMoviePoster, "poster") || fallbackPoster;
  const backdrop =
    currentBackdrop || asMovieImage(uploadedMoviePoster, "backdrop") || fallbackBackdrop || poster;

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

  const titles = uniqueNames([
    name,
    ...(PERSON_TITLE_OVERRIDES[name] ?? []),
    `${name} (actor)`,
    `${name} (actress)`,
    `${name} (film actor)`,
  ]);

  for (const title of titles) {
    const direct = await getSummary(title);
    if (direct && (isPersonSummary(direct, name) || isPersonSummary(direct, title))) {
      const image = imageFromSummary(direct);
      if (image) {
        sourceCache.set(name, image);
        return image;
      }
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
      if (summary && isPersonSummary(summary, query)) return summary;
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
    const remoteUpload = await ensureCloudinaryImageUrl(source, { folder, publicId });
    if (isCloudinaryImage(remoteUpload)) return remoteUpload;
  } catch {
    // Some image hosts block Cloudinary remote fetches; fall back to a local download.
  }
  try {
    const dataUri = await downloadAsDataUri(source);
    const uploaded = await ensureCloudinaryImageUrl(dataUri, { folder, publicId });
    return isCloudinaryImage(uploaded) ? uploaded : "";
  } catch (error) {
    console.warn(`Upload skipped for ${publicId}: ${error.message}`);
    return "";
  }
}

async function ensureMovieFallbackArtwork() {
  const uploaded = [];
  for (const [index, source] of MOVIE_FALLBACK_SOURCES.entries()) {
    const url = await uploadSource(source, "movix/movie-artwork", `movie-fallback-${index + 1}`);
    if (url && !isCastMediaImage(url)) uploaded.push(url);
  }
  return uploaded;
}

async function downloadAsDataUri(url) {
  const response = await fetchWithTimeout(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "image/jpeg,image/png,image/webp,image/*,*/*" },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const type = response.headers.get("content-type") || "image/jpeg";
  if (type.includes("image/avif")) throw new Error("AVIF fallback download is not uploadable.");
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
  const body = `const realMovieMedia = ${JSON.stringify(value, null, 2)};\n\nfunction getRealMovieMedia(movieId) {\n  const media = realMovieMedia[movieId] ?? null;\n  if (!media) return null;\n  return {\n    ...media,\n    poster: isReusableMovieImage(media.poster) ? media.poster : "",\n    backdrop: isReusableMovieImage(media.backdrop) ? media.backdrop : "",\n  };\n}\n\nfunction getRealCastAvatar(movieId, name) {\n  return realMovieMedia[movieId]?.cast?.[name] ?? "";\n}\n\nfunction isReusableMovieImage(value) {\n  const image = String(value || "");\n  return isCloudinaryImage(image) && !isCastMediaImage(image) && !image.includes("l_text:") && !image.startsWith("data:");\n}\n\nfunction isCloudinaryImage(value) {\n  return /^https:\\/\\/res\\.cloudinary\\.com\\//.test(String(value || ""));\n}\n\nfunction isCastMediaImage(value) {\n  return /\\/(?:real-cast|cast)\\//.test(String(value || ""));\n}\n\nexport { getRealCastAvatar, getRealMovieMedia, realMovieMedia };\n`;
  await writeFile(OUTPUT_FILE, body, "utf8");
}

function movieFallbackFor(movie, index, artwork, type) {
  if (!artwork.length) return asMovieImage(FALLBACK_CAST_CLOUDINARY, type);
  const hash = hashString(movie.id || movie.title || String(index));
  return asMovieImage(artwork[(hash + index) % artwork.length], type);
}

function asMovieImage(value, type) {
  const image = String(value || "").trim();
  if (!image || isCastMediaImage(image) || !isCloudinaryImage(image) || image.includes("l_text:")) {
    return "";
  }
  const transform =
    type === "backdrop" ? "f_auto,q_auto,w_1280,h_720,c_fill" : "f_auto,q_auto,w_780,h_1170,c_fill";
  return image.replace(
    /\/image\/upload\/(?:f_auto,q_auto,w_\d+,h_\d+,c_fill\/)?/,
    `/image/upload/${transform}/`,
  );
}

function isReusableMovieImage(value) {
  const image = String(value || "");
  return (
    isCloudinaryImage(image) &&
    !isCastMediaImage(image) &&
    !image.includes("l_text:") &&
    !image.startsWith("data:")
  );
}

function isLikelyPersonAvatar(name, value) {
  const image = String(value || "");
  if (!isCloudinaryImage(image)) return false;
  return image.includes(`/real-cast/${slugify(name)}`);
}

function isCloudinaryImage(value) {
  return /^https:\/\/res\.cloudinary\.com\//.test(String(value || ""));
}

function isCastMediaImage(value) {
  return /\/(?:real-cast|cast)\//.test(String(value || ""));
}

function hashString(value) {
  return [...String(value || "")].reduce((hash, char) => hash + char.charCodeAt(0), 0);
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
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
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
