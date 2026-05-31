import "dotenv/config";
import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ensureCloudinaryImageUrl,
  isCloudinaryConfigured,
  isCloudinaryImageUrl,
} from "../server/services/cloudinaryService.js";
import { realMovieMedia } from "../src/features/movies/data/realMovieMedia.generated.js";
import { requestedCastAvatars as existingRequestedCastAvatars } from "../src/features/movies/data/requestedCastMedia.generated.js";
import { requestedFutureComingSoonMovieSeeds } from "../src/features/movies/data/requestedFutureMovieSeeds.js";

const OUTPUT_FILE = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../src/features/movies/data/requestedCastMedia.generated.js",
);
const CLOUDINARY_EXTENSIONS = ["jpg", "png", "jpeg", "webp"];
const IMAGE_TIMEOUT_MS = 10000;
const LOOKUP_CONCURRENCY = Number(process.env.CAST_LOOKUP_CONCURRENCY || 2);
const CLOUDINARY_ONLY = process.env.CLOUDINARY_ONLY === "1";
const REWRITE_ONLY = process.env.REWRITE_ONLY === "1";
const USER_AGENT = "movix-requested-future-cast-enrichment/1.0";
const actorAliases = {
  [castKey("Bill Skarsgard")]: "Bill Skarsgard",
  [castKey("Jr. NTR")]: "N. T. Rama Rao Jr.",
  [castKey("Meng'er Zhang")]: "Meng'er Zhang",
  [castKey("R. Madhavan")]: "R Madhavan",
  [castKey("Silambarasan TR")]: "Silambarasan",
  [castKey("Thalapathy Vijay")]: "Vijay (actor)",
};

if (!isCloudinaryConfigured()) {
  throw new Error("Cloudinary is not configured. Add CLOUDINARY_URL or cloud/key/secret vars.");
}

const requestedNames = uniqueNames(
  requestedFutureComingSoonMovieSeeds.flatMap((movie) => movie.cast),
);
const avatarMap = loadExistingAvatarMap();
const stats = {
  reused: 0,
  foundCloudinary: 0,
  uploaded: 0,
  unresolved: [],
};

if (REWRITE_ONLY) {
  await writeGeneratedCastMedia(avatarMap);
  console.log(`Rewrote ${avatarMap.size} requested cast avatar keys.`);
  process.exit(0);
}

console.log(`Resolving ${requestedNames.length} requested future cast avatars...`);

await mapLimit(requestedNames, LOOKUP_CONCURRENCY, async (name, index) => {
  const key = castKey(name);
  if (avatarMap.has(key)) {
    stats.reused += 1;
    return;
  }

  const cloudinaryAvatar = await findCloudinaryRealCastAvatar(name);
  if (cloudinaryAvatar) {
    avatarMap.set(key, cloudinaryAvatar);
    stats.foundCloudinary += 1;
    logProgress(index, name, "cloudinary");
    return;
  }

  if (CLOUDINARY_ONLY) {
    stats.unresolved.push(name);
    logProgress(index, name, "unresolved");
    return;
  }

  const source = await findInternetActorImageUrl(name);
  const uploaded = source ? await uploadActorPhotoSource(name, source) : "";
  if (uploaded) {
    avatarMap.set(key, uploaded);
    stats.uploaded += 1;
    logProgress(index, name, "uploaded");
    return;
  }

  stats.unresolved.push(name);
  logProgress(index, name, "unresolved");
});

await writeGeneratedCastMedia(avatarMap);

console.log(
  JSON.stringify(
    {
      requestedActors: requestedNames.length,
      totalGeneratedAvatars: avatarMap.size,
      reused: stats.reused,
      foundExistingCloudinary: stats.foundCloudinary,
      uploadedFromInternet: stats.uploaded,
      unresolved: stats.unresolved.length,
      unresolvedActors: stats.unresolved,
    },
    null,
    2,
  ),
);

function loadExistingAvatarMap() {
  const map = new Map();

  Object.entries(existingRequestedCastAvatars).forEach(([key, url]) => {
    addAvatar(map, key, url);
  });

  Object.values(realMovieMedia).forEach((media) => {
    Object.entries(media?.cast ?? {}).forEach(([name, url]) => addAvatar(map, name, url));
  });

  return map;
}

function addAvatar(map, name, url) {
  const image = String(url || "").trim();
  if (!image || !isCloudinaryImageUrl(image) || isGeneratedAvatar(image)) return;
  const key = castKey(name);
  if (key && !map.has(key)) map.set(key, image);
}

async function findCloudinaryRealCastAvatar(name) {
  const cloudName = getCloudinaryCloudName();
  if (!cloudName) return "";

  const slug = slugify(name);
  for (const extension of CLOUDINARY_EXTENSIONS) {
    const url = `https://res.cloudinary.com/${cloudName}/image/upload/movix/real-cast/${slug}.${extension}`;
    if (await imageExists(url)) return url;
  }

  return "";
}

async function findInternetActorImageUrl(name) {
  for (const candidate of actorSearchCandidates(name)) {
    const summaryImage = await findWikipediaSummaryImageUrl(candidate);
    if (summaryImage) return summaryImage;
  }

  for (const candidate of actorSearchCandidates(name)) {
    const wikidataImage = await findWikimediaActorImageUrl(candidate);
    if (wikidataImage) return wikidataImage;
  }

  return "";
}

function actorSearchCandidates(name) {
  return uniqueValues([
    name,
    name.replace(/\./g, "").replace(/\s+/g, " ").trim(),
    actorAliases[castKey(name)],
    `${name} actor`,
    `${name} actress`,
  ]);
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
    ![
      "actor",
      "actress",
      "film",
      "television",
      "comedian",
      "singer",
      "performer",
      "director",
      "filmmaker",
      "composer",
      "producer",
    ].some((word) => description.includes(word))
  ) {
    return "";
  }
  return image;
}

async function findWikimediaActorImageUrl(name) {
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

async function uploadActorPhotoSource(name, sourceUrl) {
  try {
    const imageDataUrl = await fetchImageAsDataUrl(sourceUrl);
    return await ensureCloudinaryImageUrl(imageDataUrl || sourceUrl, {
      folder: "movix/real-cast",
      publicId: slugify(name),
      tags: ["requested-future-cast"],
    });
  } catch (error) {
    console.warn(`Upload failed for ${name}: ${error.message}`);
    return "";
  }
}

async function fetchImageAsDataUrl(url) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": USER_AGENT },
      });
      if (response.status === 429) {
        await sleep(1200 * (attempt + 1));
        continue;
      }
      if (!response.ok) return "";
      const contentType = response.headers.get("content-type") || "image/jpeg";
      if (!contentType.startsWith("image/")) return "";
      const bytes = Buffer.from(await response.arrayBuffer());
      if (!bytes.length || bytes.length > 9 * 1024 * 1024) return "";
      return `data:${contentType.split(";")[0]};base64,${bytes.toString("base64")}`;
    } catch {
      return "";
    } finally {
      clearTimeout(timeout);
    }
  }
  return "";
}

async function imageExists(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);
  try {
    const response = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT },
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJson(url) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      });
      if (response.status === 429) {
        await sleep(1200 * (attempt + 1));
        continue;
      }
      if (!response.ok) return null;
      return response.json();
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }
  return null;
}

async function writeGeneratedCastMedia(map) {
  const sorted = Object.fromEntries(
    [...map.entries()].sort(([left], [right]) => left.localeCompare(right)),
  );
  const body = `const requestedCastAvatars = ${JSON.stringify(sorted, null, 2)};\n\nfunction getRequestedCastAvatar(name) {\n  return requestedCastAvatars[castKey(name)] || "";\n}\n\nfunction castKey(value) {\n  return String(value || "")\n    .normalize("NFKD")\n    .replace(/[\\u0300-\\u036f]/g, "")\n    .replace(/[^a-z0-9]+/gi, " ")\n    .replace(/\\s+/g, " ")\n    .trim()\n    .toLowerCase();\n}\n\nexport { getRequestedCastAvatar, requestedCastAvatars };\n`;
  await writeFile(OUTPUT_FILE, body, "utf8");
}

function logProgress(index, name, status) {
  console.log(`${String(index + 1).padStart(3, "0")}/${requestedNames.length} ${status}: ${name}`);
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

function uniqueNames(values) {
  const seen = new Set();
  return values
    .map((value) => String(value || "").trim())
    .filter((value) => {
      const key = castKey(value);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function uniqueValues(values) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
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
    text.includes("performer") ||
    text.includes("director") ||
    text.includes("filmmaker") ||
    text.includes("composer") ||
    text.includes("producer")
  );
}

function isGeneratedAvatar(value) {
  return String(value || "").includes("l_text:");
}

function castKey(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function slugify(value) {
  return castKey(value)
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function getCloudinaryCloudName() {
  if (process.env.CLOUDINARY_CLOUD_NAME) return process.env.CLOUDINARY_CLOUD_NAME;
  if (!process.env.CLOUDINARY_URL) return "";
  try {
    return new URL(process.env.CLOUDINARY_URL).hostname;
  } catch {
    return "";
  }
}
