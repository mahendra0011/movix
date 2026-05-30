import "dotenv/config";
import dns from "node:dns";
import { access, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ensureCloudinaryImageUrl } from "../server/services/cloudinaryService.js";
import { comingSoonMovies, movies } from "../src/features/movies/data/movieCatalog.js";

const OUTPUT_FILE = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../src/features/movies/data/realMovieMedia.generated.js",
);
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36";
const SEARCH_DELAY_MS = 450;
const UPLOAD_CONCURRENCY = 2;
const MAX_CANDIDATES = 18;

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const allMovies = uniqueById([...movies, ...comingSoonMovies]);
const existing = await loadExistingMedia();
const targets = allMovies.filter((movie) => {
  const media = existing[movie.id] ?? {};
  return isFallbackMovieArtwork(media.poster) || isFallbackMovieArtwork(media.backdrop);
});

console.log(`Search-media fill for ${targets.length}/${allMovies.length} fallback movies...`);

let changed = 0;
await mapLimit(targets, UPLOAD_CONCURRENCY, async (movie, index) => {
  const media = existing[movie.id] ?? {};
  const source = await findPosterSource(movie);
  if (!source) {
    console.warn(`No poster source found for ${movie.title}`);
    return;
  }

  const uploaded = await uploadSource(
    source.image,
    `movix/real-catalog/${movie.id}`,
    `${movie.id}-poster`,
  );
  if (!uploaded || isCastMediaImage(uploaded)) {
    console.warn(`Upload failed for ${movie.title}: ${source.image}`);
    return;
  }

  existing[movie.id] = {
    ...media,
    poster: asMovieImage(uploaded, "poster"),
    backdrop: asMovieImage(uploaded, "backdrop"),
    cast: media.cast ?? {},
  };
  changed += 1;
  console.log(
    `Filled ${index + 1}/${targets.length}: ${movie.title} -> ${source.width}x${source.height} ${source.host}`,
  );
});

await writeGeneratedMedia(existing);
console.log(`Updated ${changed} movie posters in ${OUTPUT_FILE}`);

async function findPosterSource(movie) {
  const candidates = [];
  for (const query of buildQueries(movie)) {
    const results = await searchDuckDuckGoImages(query);
    candidates.push(...results.map((result) => ({ ...result, query })));
    await sleep(SEARCH_DELAY_MS);
    const best = chooseBestCandidate(movie, candidates);
    if (best?.score >= 20) return best;
  }
  return chooseBestCandidate(movie, candidates);
}

function buildQueries(movie) {
  const cast = (movie.cast ?? [])
    .map((member) => member.name)
    .filter(Boolean)
    .slice(0, 3);
  return uniqueValues([
    `${movie.title} ${cast.slice(0, 2).join(" ")} movie poster`,
    `${movie.title} ${movie.releaseDate || ""} movie poster`,
    `${movie.title} ${movie.language || ""} film poster`,
    `${movie.title} ${movie.category || ""} movie poster`,
    `${movie.title} movie poster`,
  ]);
}

async function searchDuckDuckGoImages(query) {
  try {
    const landing = await fetchText(
      `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`,
    );
    const vqd = landing.match(/vqd=['"]([^'"]+)/)?.[1];
    if (!vqd) return [];

    const params = new URLSearchParams({
      l: "us-en",
      o: "json",
      q: query,
      vqd,
      f: ",,,",
      p: "1",
    });
    const data = await fetchJson(`https://duckduckgo.com/i.js?${params}`, {
      referer: "https://duckduckgo.com/",
    });
    return (data.results ?? [])
      .slice(0, MAX_CANDIDATES)
      .map((result) => normalizeSearchResult(result))
      .filter(Boolean);
  } catch (error) {
    console.warn(`Search skipped for "${query}": ${error.message}`);
    return [];
  }
}

function normalizeSearchResult(result) {
  const image = String(result.image || result.thumbnail || "").trim();
  if (!/^https?:\/\//i.test(image)) return null;
  const width = Number(result.width || 0);
  const height = Number(result.height || 0);
  if (width < 180 || height < 240) return null;
  let host = "";
  try {
    host = new URL(image).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
  return {
    image,
    thumbnail: String(result.thumbnail || "").trim(),
    title: String(result.title || ""),
    url: String(result.url || ""),
    width,
    height,
    host,
  };
}

function chooseBestCandidate(movie, candidates) {
  const scored = candidates
    .map((candidate) => ({ ...candidate, score: scoreCandidate(movie, candidate) }))
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score);
  return scored[0] ?? null;
}

function scoreCandidate(movie, candidate) {
  const text = normalizeText(`${candidate.title} ${candidate.url} ${candidate.image}`);
  const titleWords = normalizeText(movie.title)
    .split(" ")
    .filter((word) => word.length > 2);
  const castWords = (movie.cast ?? []).slice(0, 3).flatMap((member) =>
    normalizeText(member.name)
      .split(" ")
      .filter((word) => word.length > 2),
  );
  const ratio = candidate.width / candidate.height;
  let score = 0;

  const titleMatches = titleWords.filter((word) => text.includes(word)).length;
  score += titleMatches * 4;
  if (titleWords.length && titleMatches === titleWords.length) score += 8;
  score += castWords.filter((word) => text.includes(word)).length * 2;

  if (ratio >= 0.55 && ratio <= 0.82) score += 10;
  else if (ratio >= 0.45 && ratio <= 1.0) score += 6;
  else if (ratio > 1.0 && ratio <= 1.9) score += 1;
  else score -= 7;

  if (candidate.height >= 900) score += 4;
  if (candidate.width >= 700) score += 2;

  if (
    /m\.media-amazon\.com|assets-in\.bmscdn\.com|bollywoodhungama|gadgets360|ragalahari|filmyfocus|imdb|flixster|static\.toho|marvel|dc\.com|disney|lionsgate|universalpictures|warnerbros/i.test(
      candidate.image,
    )
  ) {
    score += 7;
  }
  if (/poster|first look|movie|film|release|teaser/i.test(candidate.title)) score += 4;
  if (
    /youtube\.com|ytimg\.com|maxresdefault|pinterest|facebook|instagram|wallpaper/i.test(
      candidate.image,
    )
  ) {
    score -= 5;
  }
  if (/actor|actress|birthday|biography|profile|photo gallery/i.test(candidate.title)) score -= 12;
  if (/(?:\/|%2F)(?:cast|real-cast)(?:\/|%2F)/i.test(candidate.image)) score -= 30;

  return score;
}

async function uploadSource(source, folder, publicId) {
  if (!source) return "";
  try {
    const remoteUpload = await ensureCloudinaryImageUrl(source, { folder, publicId });
    if (isCloudinaryImage(remoteUpload)) return remoteUpload;
  } catch {
    // Some providers block Cloudinary remote fetches; retry through a data URI.
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

async function downloadAsDataUri(url) {
  const response = await fetch(url, { headers: { "user-agent": USER_AGENT } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const type = response.headers.get("content-type") || "image/jpeg";
  if (!/^image\/(?:jpe?g|png|webp)/i.test(type)) throw new Error(`Unsupported image type ${type}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > 9_000_000) throw new Error("Image is too large to upload.");
  return `data:${type.split(";")[0]};base64,${bytes.toString("base64")}`;
}

async function fetchText(url, headers = {}) {
  const response = await fetch(url, {
    headers: { "user-agent": USER_AGENT, ...headers },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

async function fetchJson(url, headers = {}) {
  return JSON.parse(await fetchText(url, headers));
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
  const body = `const realMovieMedia = ${JSON.stringify(value, null, 2)};\n\nfunction getRealMovieMedia(movieId) {\n  const media = realMovieMedia[movieId] ?? null;\n  if (!media) return null;\n  return {\n    ...media,\n    poster: isReusableMovieImage(media.poster) ? media.poster : "",\n    backdrop: isReusableMovieImage(media.backdrop) ? media.backdrop : "",\n  };\n}\n\nfunction getRealCastAvatar(movieId, name) {\n  return realMovieMedia[movieId]?.cast?.[name] ?? "";\n}\n\nfunction isReusableMovieImage(value) {\n  const image = String(value || "");\n  return (\n    isCloudinaryImage(image) &&\n    !isCastMediaImage(image) &&\n    !isFallbackMovieArtwork(image) &&\n    !image.includes("l_text:") &&\n    !image.startsWith("data:")\n  );\n}\n\nfunction isCloudinaryImage(value) {\n  return /^https:\\/\\/res\\.cloudinary\\.com\\//.test(String(value || ""));\n}\n\nfunction isCastMediaImage(value) {\n  return /\\/(?:real-cast|cast)\\//.test(String(value || ""));\n}\n\nfunction isFallbackMovieArtwork(value) {\n  return String(value || "").includes("/movix/movie-artwork/");\n}\n\nexport { getRealCastAvatar, getRealMovieMedia, realMovieMedia };\n`;
  await writeFile(OUTPUT_FILE, body, "utf8");
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

function isFallbackMovieArtwork(value) {
  return String(value || "").includes("/movix/movie-artwork/");
}

function isCloudinaryImage(value) {
  return /^https:\/\/res\.cloudinary\.com\//.test(String(value || ""));
}

function isCastMediaImage(value) {
  return /\/(?:real-cast|cast)\//.test(String(value || ""));
}

async function mapLimit(items, limit, worker) {
  const results = [];
  let index = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const currentIndex = index;
      index += 1;
      results[currentIndex] = await worker(items[currentIndex], currentIndex);
    }
  });
  await Promise.all(workers);
  return results;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function uniqueById(list) {
  const seen = new Set();
  return list.filter((movie) => {
    if (!movie?.id || seen.has(movie.id)) return false;
    seen.add(movie.id);
    return true;
  });
}

function uniqueValues(values) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
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
