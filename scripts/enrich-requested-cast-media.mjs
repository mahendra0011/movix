import dotenv from "dotenv";
import dns from "node:dns";
import { access, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { requestedComingSoonMovieSeeds } from "../src/features/movies/data/requestedUpcomingMovieSeeds.js";
import { realMovieMedia } from "../src/features/movies/data/realMovieMedia.generated.js";

dotenv.config();

const { ensureCloudinaryImageUrl } = await import("../server/services/cloudinaryService.js");

const OUTPUT_FILE = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../src/features/movies/data/requestedCastMedia.generated.js",
);
const USER_AGENT = "movix-requested-cast-enrichment/1.0";
const IMAGE_TIMEOUT_MS = 15000;
const CLOUDINARY_EXTENSIONS = ["jpg", "png", "jpeg", "webp"];
const PERSON_CONCURRENCY = 5;
const ENABLE_SEARCH_FALLBACK = process.env.CAST_IMAGE_SEARCH_FALLBACK !== "0";

const PERSON_TITLE_OVERRIDES = {
  "50 Cent": ["50 Cent"],
  Ali: ["Ali Basha", "Ali (actor, born 1968)"],
  Brahmanandam: ["Brahmanandam"],
  "Catherine Laga'aia": ["Catherine Lagaʻaia"],
  "Chloë Grace Moretz": ["Chloe Grace Moretz", "Chloë Grace Moretz"],
  "Dustin Demri-Burns": ["Dustin Demri-Burns"],
  Divyenndu: ["Divyendu Sharma", "Divyenndu"],
  "Govardhan Asrani": ["Asrani"],
  "Ismaël Cruz Córdova": ["Ismael Cruz Cordova", "Ismaël Cruz Córdova"],
  "Jisshu Sengupta": ["Jisshu Sengupta"],
  "Kelsey Chow": ["Kelsey Asbille", "Kelsey Chow"],
  Kishore: ["Kishore (actor)"],
  Mahendran: ["Mahendran (actor)"],
  "Michael Peña": ["Michael Pena", "Michael Peña"],
  "Mckenna Grace": ["Mckenna Grace"],
  "Mirnaa Menon": ["Mirnaa Menon"],
  "Nikhil Siddharth": ["Nikhil Siddhartha", "Nikhil Siddharth"],
  "P.J. Byrne": ["P. J. Byrne", "P.J. Byrne"],
  "Posani Krishna": ["Posani Krishna Murali", "Posani Krishna"],
  "Sai Kumar": ["Sai Kumar (actor)", "P. Sai Kumar"],
  Samuthirakani: ["Samuthirakani"],
  "SJ Suryah": ["S. J. Suryah", "SJ Suryah"],
  Shrikant: ["Srikanth (actor, born 1979)", "Srikanth (Telugu actor)", "Srikanth"],
  "Sandra Hüller": ["Sandra Huller", "Sandra Hüller"],
  Sunil: ["Sunil (actor)", "Sunil Varma"],
  Symone: ["Symone (drag queen)", "Symone"],
  "Tom Blyth": ["Tom Blyth"],
  "Ty Simpkins": ["Ty Simpkins"],
  "Vennela Kishore": ["Vennela Kishore"],
  "Vishal Jethwa": ["Vishal Jethwa"],
  "Zoë Kravitz": ["Zoe Kravitz", "Zoë Kravitz"],
};

const MANUAL_ACTOR_SOURCES = {
  "Ashish Chaudhary":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Ashish_choudhry.jpg/250px-Ashish_choudhry.jpg",
  "Kelsey Chow":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/Kelsey_Asbille_in_2020_01.png/250px-Kelsey_Asbille_in_2020_01.png",
  Mahendran: "https://image.tmdb.org/t/p/w300_and_h450_bestv2/eqv9gaikHJkzrTA78VdWxVcnbyo.jpg",
  "Mark Strong":
    "https://commons.wikimedia.org/wiki/Special:FilePath/Mark_Strong_by_Gage_Skidmore.jpg?width=512",
  "Peter Dinklage":
    "https://commons.wikimedia.org/wiki/Special:FilePath/Peter_Dinklage_by_Gage_Skidmore.jpg?width=512",
  "Randeep Hooda":
    "https://commons.wikimedia.org/wiki/Special:FilePath/Randeep_Hooda_grace_the_Lokmat_Most_Stylish_Awards_2023.jpg?width=512",
  "Riddhi Kumar":
    "https://images.filmibeat.com/192x258/img/popcorn/profile_photos/riddhi-kumar-20180628111634-41301.jpg",
  Shrikant:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Meka_Srikanth_CCL.jpg/250px-Meka_Srikanth_CCL.jpg",
  "Zar Amir Ebrahimi":
    "https://commons.wikimedia.org/wiki/Special:FilePath/Zar_Amir_Ebrahimi_attends_the_%22Le_Pays_d%27Arto%22_photocall.jpg?width=512",
};

if (String(process.env.MONGODB_URI || "").startsWith("mongodb+srv://")) {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
}

const requestedCastAvatars = await loadExistingRequestedCastMedia();
const globalActorAvatars = buildGlobalActorAvatarMap(realMovieMedia);
const requestedNames = uniqueNames(requestedComingSoonMovieSeeds.flatMap((movie) => movie.cast));
const stats = {
  reusedRequested: 0,
  reusedCatalog: 0,
  reusedCloudinary: 0,
  uploadedWikimedia: 0,
  uploadedSearch: 0,
  unresolved: [],
};

console.log(`Resolving ${requestedNames.length} requested cast photos...`);

await mapLimit(requestedNames, PERSON_CONCURRENCY, async (name, index) => {
  const key = castKey(name);
  const existingAvatar = requestedCastAvatars[key];
  if (isUsableCastAvatar(existingAvatar)) {
    stats.reusedRequested += 1;
    return;
  }
  if (existingAvatar) delete requestedCastAvatars[key];

  const resolved = await resolveActorAvatar(name);
  if (isUsableCastAvatar(resolved.avatar)) {
    requestedCastAvatars[key] = resolved.avatar;
    stats[resolved.source] += 1;
  } else {
    stats.unresolved.push(name);
  }

  if ((index + 1) % 25 === 0 || index === requestedNames.length - 1) {
    console.log(`Cast photos ${index + 1}/${requestedNames.length}`);
  }
});

await writeRequestedCastMedia(requestedCastAvatars);

const unresolvedRequestedNames = requestedNames.filter(
  (name) => !isUsableCastAvatar(requestedCastAvatars[castKey(name)]),
);
const coveredRequestedNames = requestedNames.length - unresolvedRequestedNames.length;

console.log(`Requested cast photos ready: ${coveredRequestedNames}/${requestedNames.length}.`);
console.log(
  `Reused requested ${stats.reusedRequested}, catalog ${stats.reusedCatalog}, Cloudinary ${stats.reusedCloudinary}; uploaded Wikimedia ${stats.uploadedWikimedia}, image search ${stats.uploadedSearch}.`,
);
if (unresolvedRequestedNames.length) {
  console.warn(
    `Unresolved cast photos (${unresolvedRequestedNames.length}): ${unresolvedRequestedNames.join(", ")}`,
  );
}

async function resolveActorAvatar(name) {
  const key = castKey(name);
  const catalogAvatar = globalActorAvatars.get(key);
  if (catalogAvatar) return { avatar: catalogAvatar, source: "reusedCatalog" };

  const cloudinaryAvatar = await findCloudinaryRealCastAvatar(name);
  if (cloudinaryAvatar) return { avatar: cloudinaryAvatar, source: "reusedCloudinary" };

  const manualSource = MANUAL_ACTOR_SOURCES[name];
  const manualAvatar = manualSource
    ? await uploadActorPhotoSource(name, manualSource, "requested-cast-manual")
    : "";
  if (manualAvatar) return { avatar: manualAvatar, source: "uploadedSearch" };

  const wikimediaSource = await findWikimediaActorImageUrl(name);
  const wikimediaAvatar = wikimediaSource
    ? await uploadActorPhotoSource(name, wikimediaSource, "requested-cast-wikimedia")
    : "";
  if (wikimediaAvatar) return { avatar: wikimediaAvatar, source: "uploadedWikimedia" };

  if (ENABLE_SEARCH_FALLBACK && canUseImageSearchFallback(name)) {
    const searchSource = await findSearchActorImageUrl(name);
    const searchAvatar = searchSource
      ? await uploadActorPhotoSource(name, searchSource, "requested-cast-search")
      : "";
    if (searchAvatar) return { avatar: searchAvatar, source: "uploadedSearch" };
  }

  return { avatar: "", source: "" };
}

async function findCloudinaryRealCastAvatar(name) {
  const cloudName = getCloudinaryCloudName();
  if (!cloudName) return "";

  for (const slug of slugCandidates(name)) {
    for (const extension of CLOUDINARY_EXTENSIONS) {
      const url = `https://res.cloudinary.com/${cloudName}/image/upload/movix/real-cast/${slug}.${extension}`;
      if (await imageExists(url)) return url;
    }
  }

  return "";
}

async function findWikimediaActorImageUrl(name) {
  for (const title of titleCandidates(name)) {
    const summary = await fetchJson(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
    );
    const image = imageFromSummary(summary);
    if (image && isLikelyPersonSummary(summary, name, title)) return image;
  }

  for (const query of titleCandidates(name)) {
    const entityId = await findWikidataPersonEntityId(query);
    if (!entityId) continue;
    const image = await findWikidataEntityImageUrl(entityId);
    if (image) return image;
  }

  return "";
}

async function findWikidataPersonEntityId(query) {
  const searchUrl = new URL("https://www.wikidata.org/w/api.php");
  searchUrl.search = new URLSearchParams({
    action: "wbsearchentities",
    format: "json",
    language: "en",
    type: "item",
    limit: "6",
    search: query,
  }).toString();

  const search = await fetchJson(searchUrl);
  return (search?.search ?? []).find((item) => isLikelyPersonItem(item))?.id || "";
}

async function findWikidataEntityImageUrl(entityId) {
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

async function findSearchActorImageUrl(name) {
  const candidates = [];
  for (const query of imageSearchQueries(name)) {
    const results = await searchDuckDuckGoImages(query);
    candidates.push(...results.map((result) => ({ ...result, query })));
    const best = chooseBestSearchCandidate(name, candidates);
    if (best?.score >= 18) return best.image;
    await sleep(350);
  }

  return chooseBestSearchCandidate(name, candidates)?.image || "";
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
      Referer: "https://duckduckgo.com/",
    });
    return (data?.results ?? []).slice(0, 12).map(normalizeSearchResult).filter(Boolean);
  } catch {
    return [];
  }
}

function normalizeSearchResult(result) {
  const image = String(result?.image || result?.thumbnail || "").trim();
  if (!/^https?:\/\//i.test(image)) return null;
  const width = Number(result?.width || 0);
  const height = Number(result?.height || 0);
  if (width < 120 || height < 120) return null;

  let host = "";
  try {
    host = new URL(image).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }

  return {
    image,
    title: String(result?.title || ""),
    url: String(result?.url || ""),
    width,
    height,
    host,
  };
}

function chooseBestSearchCandidate(name, candidates) {
  return candidates
    .map((candidate) => ({ ...candidate, score: scoreSearchCandidate(name, candidate) }))
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score)[0];
}

function scoreSearchCandidate(name, candidate) {
  const text = normalizeText(`${candidate.title} ${candidate.url} ${candidate.image}`);
  const nameWords = normalizeText(name)
    .split(" ")
    .filter((word) => word.length > 1);
  const titleMatches = nameWords.filter((word) => text.includes(word)).length;
  const ratio = candidate.width / candidate.height;
  let score = titleMatches * 5;

  if (nameWords.length && titleMatches === nameWords.length) score += 8;
  if (ratio >= 0.55 && ratio <= 1.35) score += 3;
  if (candidate.width >= 300 && candidate.height >= 300) score += 2;
  if (
    /wikimedia|wikipedia|imdb|m\.media-amazon|themoviedb|tmdb|bollywoodhungama|filmibeat|assets-in\.bmscdn/i.test(
      candidate.host,
    )
  ) {
    score += 5;
  }
  if (/actor|actress|cast|portrait|headshot|celebrity|film|movie|profile/i.test(candidate.title)) {
    score += 3;
  }
  if (
    /logo|poster|wallpaper|height|family|wife|husband|birthday|news|facebook|instagram|pinterest|youtube|ytimg/i.test(
      text,
    )
  ) {
    score -= 6;
  }

  return score;
}

async function uploadActorPhotoSource(name, sourceUrl, tag) {
  let imageDataUrl = "";
  for (let attempt = 0; attempt < 3 && !imageDataUrl; attempt += 1) {
    try {
      imageDataUrl = await fetchImageAsDataUrl(sourceUrl);
    } catch {
      imageDataUrl = "";
    }
    if (!imageDataUrl && attempt < 2) await sleep(900 + attempt * 800);
  }

  try {
    const uploaded = await ensureCloudinaryImageUrl(imageDataUrl || sourceUrl, {
      folder: "movix/real-cast",
      publicId: slugify(name),
      tags: [tag],
    });
    return isUsableCastAvatar(uploaded) ? uploaded : "";
  } catch (error) {
    console.warn(`Cloudinary upload failed for ${name}: ${error.message}`);
    return "";
  }
}

async function fetchImageAsDataUrl(url) {
  const response = await fetchWithTimeout(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "image/jpeg,image/png,image/webp,image/*,*/*" },
  });
  if (!response.ok) return "";
  const contentType = response.headers.get("content-type") || "image/jpeg";
  if (!contentType.startsWith("image/") || contentType.includes("avif")) return "";
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length || bytes.length > 8 * 1024 * 1024) return "";
  return `data:${contentType.split(";")[0]};base64,${bytes.toString("base64")}`;
}

async function imageExists(url) {
  try {
    const response = await fetchWithTimeout(url, {
      method: "HEAD",
      headers: { "User-Agent": USER_AGENT },
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function fetchJson(url, headers = {}) {
  try {
    const response = await fetchWithTimeout(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json", ...headers },
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function fetchText(url, headers = {}) {
  const response = await fetchWithTimeout(url, {
    headers: { "User-Agent": USER_AGENT, ...headers },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

async function fetchWithTimeout(url, init = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function imageFromSummary(summary) {
  return summary?.thumbnail?.source || summary?.originalimage?.source || "";
}

function isLikelyPersonSummary(summary, name, title) {
  if (!summary || summary?.type === "disambiguation") return false;
  const text = normalizeText(
    `${summary.title || ""} ${summary.description || ""} ${summary.extract || ""}`,
  );
  const nameWords = normalizeText(name)
    .split(" ")
    .filter((word) => word.length > 1);
  const titleWords = normalizeText(title)
    .split(" ")
    .filter((word) => word.length > 1);
  const searchableWords = nameWords.length ? nameWords : titleWords;
  const nameMatch = searchableWords.every((word) => text.includes(word));
  const personMatch =
    /\bactor\b|\bactress\b|\bcomedian\b|\bsinger\b|\bperformer\b|\bdirector\b|\bproducer\b|\bfilmmaker\b|\btelevision\b|\brapper\b|\bmusician\b|\bdrag queen\b|\bmodel\b|\bvoice\b/.test(
      text,
    );
  return nameMatch && personMatch;
}

function isLikelyPersonItem(item) {
  const text = normalizeText(`${item?.label ?? ""} ${item?.description ?? ""}`);
  return /\bactor\b|\bactress\b|\bcomedian\b|\bsinger\b|\bperformer\b|\bdirector\b|\bproducer\b|\bfilmmaker\b|\btelevision\b|\brapper\b|\bmusician\b|\bdrag queen\b|\bmodel\b|\bvoice\b/.test(
    text,
  );
}

function canUseImageSearchFallback(name) {
  const words = normalizeText(name).split(" ").filter(Boolean);
  if (words.length >= 2) return true;
  return ["ali", "nani", "sunil", "symone", "jujubee", "rupaul"].includes(words[0]);
}

function imageSearchQueries(name) {
  return uniqueValues([
    ...titleCandidates(name).flatMap((title) => [
      `${title} actor portrait`,
      `${title} actor headshot`,
    ]),
    `${name} cast photo`,
  ]);
}

function titleCandidates(name) {
  const aliases = PERSON_TITLE_OVERRIDES[name] ?? [];
  const cleanName = String(name || "").trim();
  return uniqueValues([
    cleanName,
    ...aliases,
    cleanName.replace(/\./g, "").replace(/\s+/g, " ").trim(),
    `${cleanName} (actor)`,
    `${cleanName} (actress)`,
    `${cleanName} film actor`,
  ]).filter(Boolean);
}

function slugCandidates(name) {
  return uniqueValues(titleCandidates(name).map(slugify).filter(Boolean));
}

function buildGlobalActorAvatarMap(mediaMap) {
  const actors = new Map();
  for (const media of Object.values(mediaMap ?? {})) {
    for (const [name, avatar] of Object.entries(media?.cast ?? {})) {
      addActorAvatar(actors, name, avatar);
    }
  }
  return actors;
}

function addActorAvatar(map, name, avatar) {
  const image = String(avatar || "").trim();
  if (!isUsableCastAvatar(image)) return;
  const key = castKey(name);
  if (key && !map.has(key)) map.set(key, image);
}

async function loadExistingRequestedCastMedia() {
  try {
    await access(OUTPUT_FILE);
    const module = await import(`${pathToFileURL(OUTPUT_FILE).href}?t=${Date.now()}`);
    return { ...(module.requestedCastAvatars ?? {}) };
  } catch {
    return {};
  }
}

async function writeRequestedCastMedia(value) {
  const ordered = Object.fromEntries(
    Object.entries(value)
      .filter(([, avatar]) => isUsableCastAvatar(avatar))
      .sort(([left], [right]) => left.localeCompare(right)),
  );
  const body = `const requestedCastAvatars = ${JSON.stringify(ordered, null, 2)};\n\nfunction getRequestedCastAvatar(name) {\n  return requestedCastAvatars[castKey(name)] || "";\n}\n\nfunction castKey(value) {\n  return String(value || "")\n    .normalize("NFKD")\n    .replace(/[\\u0300-\\u036f]/g, "")\n    .trim()\n    .toLowerCase();\n}\n\nexport { getRequestedCastAvatar, requestedCastAvatars };\n`;
  await writeFile(OUTPUT_FILE, body, "utf8");
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

function getCloudinaryCloudName() {
  if (process.env.CLOUDINARY_CLOUD_NAME) return process.env.CLOUDINARY_CLOUD_NAME;
  if (!process.env.CLOUDINARY_URL) return "";
  try {
    return new URL(process.env.CLOUDINARY_URL).hostname;
  } catch {
    return "";
  }
}

function uniqueNames(values = []) {
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

function uniqueValues(values = []) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
}

function castKey(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function slugify(value) {
  return normalizeText(value)
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isCloudinaryImage(value) {
  return /^https:\/\/res\.cloudinary\.com\//.test(String(value || ""));
}

function isUsableCastAvatar(value) {
  const image = String(value || "").trim();
  return (
    isCloudinaryImage(image) &&
    !image.startsWith("data:") &&
    !image.includes("l_text:") &&
    !image.includes("/movix/movie-artwork/")
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
