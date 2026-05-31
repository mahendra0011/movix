import dotenv from "dotenv";
import dns from "node:dns";
import mongoose from "mongoose";
import { Movie } from "../server/models/Movie.js";
import { Show } from "../server/models/Show.js";
import {
  ensureCloudinaryImageUrl,
  isCloudinaryImageUrl,
} from "../server/services/cloudinaryService.js";
import { movies as catalogMovies } from "../src/features/movies/data/movieCatalog.js";
import {
  isGeneratedImageUrl,
  normalizeCastImageUrl,
} from "../src/features/movies/services/movieMedia.js";

dotenv.config();

const MAX_CAST_COUNT = 6;
const IMAGE_TIMEOUT_MS = 10000;
const FETCH_RETRY_COUNT = 3;
const FETCH_RETRY_DELAY_MS = 900;
const CLOUDINARY_EXTENSIONS = ["jpg", "png", "jpeg", "webp"];
const USER_AGENT = "movix-live-cast-enrichment/1.0";

if (String(process.env.MONGODB_URI || "").startsWith("mongodb+srv://")) {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
}

const VERIFIED_CAST_BY_ID = {
  "anaganaga-oka-raju": ["Naveen Polishetty", "Meenakshi Chaudhary"],
  "bhartha-mahasayulaku-wignyapthi": ["Ravi Teja", "Ashika Ranganath"],
  "mana-shankara-vara-prasad-garu": ["Chiranjeevi", "Nayanthara"],
  "chand-mera-dil": ["Lakshya", "Ananya Panday"],
  "ek-din": ["Sai Pallavi", "Junaid Khan"],
  "bihu-attack": ["Dev Menaria", "Daisy Shah", "Amiee Misobbah"],
  "hot-spot-2-much": [
    "Priya Bhavani Shankar",
    "M. S. Bhaskar",
    "Thambi Ramaiah",
    "Rakshan",
    "Ashwin Kumar",
    "Bhavani Sre",
  ],
  "azad-bharath": [
    "Shreyas Talpade",
    "Roopa Iyer",
    "Suresh Oberoi",
    "Subhash Chandra",
    "Priyanshu Chatterjee",
  ],
  lockdown: ["Anupama Parameswaran", "Charle", "Nirosha", "Priya Venkat", "Livingston", "Abhirami"],
  "happy-patel-khatarnak-jasoos": ["Vir Das", "Mona Singh", "Sharib Hashmi", "Mithila Palkar"],
  honey: ["Naveen Chandra", "Divya Pillai", "Divi Vadthya", "Raja Ravindra"],
  "paro-pinaki-ki-kahani": ["Eshita Singh", "Sanjay Bishnoi"],
  anantha: [
    "Jagapathi Babu",
    "Suhasini Maniratnam",
    "Y. G. Mahendran",
    "Mohan Raman",
    "Nizhalgal Ravi",
  ],
  kennedy: ["Rahul Bhat", "Sunny Leone", "Abhilash Thapliyal"],
  "draupathi-2": ["Richard Rishi", "Rakshana Induchoodan", "Natarajan Subramaniam"],
  "raja-shivaji": ["Salman Khan", "Sanjay Dutt"],
  "gandhi-talks": ["Vijay Sethupathi", "Arvind Swamy", "Aditi Rao Hydari"],
  subedaar: ["Anil Kapoor", "Radhika Madan"],
  "vaa-vaathiyaar": [
    "Karthi",
    "Krithi Shetty",
    "Sathyaraj",
    "Rajkiran",
    "Karunakaran",
    "Anandaraj",
  ],
  "o-romeo": [
    "Shahid Kapoor",
    "Triptii Dimri",
    "Tamannaah Bhatia",
    "Nana Patekar",
    "Avinash Tiwary",
    "Vikrant Massey",
  ],
  parasakthi: [
    "Sivakarthikeyan",
    "Ravi Mohan",
    "Atharvaa",
    "Sreeleela",
    "Basil Joseph",
    "Guru Somasundaram",
  ],
  "do-deewane-seher-mein": ["Siddhant Chaturvedi", "Mrunal Thakur"],
  purushaha: ["Sapthagiri"],
  assi: ["Mohd. Zeeshan Ayyub"],
  "ugly-story": ["Avika Gor", "Nandu Vijay Krishna"],
  "vadh-2": ["Sanjay Mishra", "Neena Gupta"],
  euphoria: ["Saandip", "Mohammad Anas"],
  ikkis: [
    "Agastya Nanda",
    "Dharmendra",
    "Jaideep Ahlawat",
    "Deepak Dobriyal",
    "Sikandar Kher",
    "Rahul Dev",
  ],
  mrithyunjay: ["Sree Vishnu", "Reba Monica John"],
  magellan: [
    "Gael Garcia Bernal",
    "Rafael Morais",
    "Brontis Jodorowsky",
    "Ronnie Lazaro",
    "Hazel Orencio",
  ],
  "couple-friendly": ["Santosh Sobhan", "Manasa Varanasi"],
  "dead-man-s-wire": [
    "Bill Skarsgard",
    "Dacre Montgomery",
    "Cary Elwes",
    "Myha'la",
    "Colman Domingo",
    "Al Pacino",
  ],
  raakaasaa: ["Nayan Sarika", "Sangeeth Shobhan"],
  "the-rip": [
    "Matt Damon",
    "Ben Affleck",
    "Steven Yeun",
    "Teyana Taylor",
    "Sasha Calle",
    "Catalina Sandino Moreno",
  ],
  "gaaya-padda-simham": ["Tharun Bhascker Dhaassyam", "Faria Abdullah"],
  "28-years-later-the-bone-temple": [
    "Jack O'Connell",
    "Alfie Williams",
    "Ralph Fiennes",
    "Aaron Taylor-Johnson",
    "Cillian Murphy",
    "Erin Kellyman",
  ],
  "hey-balwanth": ["Suhas", "Shivani Nagaram"],
  "the-sheep-detectives": [
    "Hugh Jackman",
    "Brett Goldstein",
    "Emma Thompson",
    "Julia Louis-Dreyfus",
    "Nicholas Braun",
    "Nicholas Galitzine",
  ],
  devagudi: ["Abhinav Shaurya", "Anusri"],
  obsession: ["Michael Johnston", "Inde Navarrette", "Andy Richter", "Jeff Barker"],
  cheekatilo: ["Sobhita Dhulipala", "Vishwadev Rachakonda"],
  "remarkably-bright-creatures": [
    "Sally Field",
    "Lewis Pullman",
    "Joan Chen",
    "Kathy Baker",
    "Beth Grant",
    "Sofia Black-D'Elia",
  ],
  "nari-nari-naduma-murari": ["Sharwanand", "Samyuktha", "Sakshi Vaidya"],
  "i-love-boosters": [
    "Keke Palmer",
    "LaKeith Stanfield",
    "Naomi Ackie",
    "Taylour Paige",
    "Poppy Liu",
    "Eiza Gonzalez",
  ],
};

const ACTOR_PAGE_ALIASES = {
  "agastya nanda": ["Agastya Nanda"],
  "alvaro morte": ["\u00c1lvaro Morte"],
  balakrishna: ["Nandamuri Balakrishna"],
  karunakaran: ["Karunakaran (actor)"],
  naresh: ["Naresh (actor)", "Vijaya Naresh"],
  nasser: ["Nassar (actor)"],
  "niccolo senni": ["Niccol\u00f2 Senni"],
  "prajakt koli": ["Prajakta Koli"],
  rajkiran: ["Rajkiran (actor)"],
  "rajendra prasad": ["Rajendra Prasad (actor)"],
  ramya: ["Ramya (actress)"],
  "ravi shankar": ["P. Ravi Shankar"],
  "ravi varma": ["Ravi Varma (actor)"],
  "redin kingsley": ["Redin Kingsley"],
  rohini: ["Rohini (actress)"],
  satya: ["Satya Akkala", "Sathya (actor)"],
  satyadev: ["Satyadev Kancharana"],
  simran: ["Simran (actress)"],
  srikanth: ["Srikanth (actor, born 1968)"],
  vikram: ["Vikram (actor)"],
};

const ACTOR_IMDB_SEARCH_ALIASES = {
  naresh: ["V.K. Naresh"],
  "ravi varma": ["Ravi Varma actor"],
};

const ACTOR_IMAGE_SOURCE_OVERRIDES = {
  "abhinav shaurya": "https://nettv4u.com/imagine/07-12-2025/abhinav-shaurya.png",
  anusri:
    "https://starzone.ragalahari.com/jan2026/hd/anusri-at-devagudi-trailer-launch/anusri-at-devagudi-trailer-launchthumb.jpg",
  "dev menaria": "https://wikiwiki.in/wp-content/uploads/2021/10/Dev-Menaria-Actor.jpg",
  "divi vadthya": "https://southindianactress.in/wp-content/uploads/2026/01/Divi-Vadthya-10.jpg",
  "eshita singh": "https://in.bmscdn.com/artist/eshita-singh-2039760-1724481633.jpg",
  "junaid khan":
    "https://www.hindustantimes.com/ht-img/img/2024/12/30/1600x900/IMG_8182_1735554925751_1735554934664.jpg",
  livingston: "https://www.filmistreet.com/wp-content/uploads/2015/01/Livingston.jpg",
  "lollu sabha maaran": "https://image.tmdb.org/t/p/w500/uWeSvoMN2rOxHsEj5qENJSTGMDZ.jpg",
  "mohammad anas":
    "https://castyou-website.sgp1.digitaloceanspaces.com/2023/08/Mohammad-Anas03063.jpg",
  "priya venkat": "https://www.gethucinema.com/wp-content/uploads/2024/02/PriyaVenkat-152.jpg",
  "rakshana induchoodan":
    "https://www.gethucinema.com/wp-content/uploads/2024/06/Rakshana-Induchoodan-3-Av6QmH194.jpg",
  "redin kingsley": "https://img.nowrunning.com/content/Artist/2021/redin-94566/banner.jpg",
  "roopa iyer":
    "https://static.toiimg.com/thumb/imgsize-23456,msid-113320992,width-600,resizemode-4/113320992.jpg",
  sananth: "https://movie.webindia123.com/movie/star/actors/regional/tamil/Sananth/Sananth4.jpg",
  "sakshi vaidya": "https://southindianactress.in/wp-content/uploads/2023/08/Sakshi-Vaidya-16.jpg",
  "sangeeth shobhan": "https://www.pinkvilla.com/images/2025-04/1419435820_sangeeth-shobhan-2.jpg",
  "shivani nagaram":
    "https://southindianactress.in/wp-content/uploads/2025/08/Shivani-Nagaram-10.jpg",
  "siddharth nipon goswami":
    "https://eastindiastory.com/wp-content/uploads/2023/02/Siddharth-Nipon-Goswami.jpg",
  "vishwadev rachakonda": "https://nettv4u.com/imagine/26-12-2016/vishwadev-rachakonda.jpg",
};

const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) throw new Error("MONGODB_URI is required to seed live movie cast.");

await mongoose.connect(mongoUri, {
  dbName: process.env.MONGODB_DB || "movix",
  serverSelectionTimeoutMS: 15000,
});

const actorAvatars = await loadExistingActorAvatars();
const stats = {
  cloudinaryReused: 0,
  uploaded: 0,
  unresolved: new Set(),
};
const actorAvatarPromises = new Map();

const movieUpdates = [];
const showUpdates = [];
const missingCastImages = [];

for (const [index, movie] of catalogMovies.entries()) {
  console.log(`[${index + 1}/${catalogMovies.length}] Resolving cast for ${movie.title}`);
  const { cast, missing } = await buildVerifiedCast(movie, actorAvatars, stats);
  if (missing.length) {
    missingCastImages.push({ movie: movie.title, missing });
    continue;
  }
  movieUpdates.push({
    updateOne: {
      filter: { id: movie.id },
      update: { $set: { cast } },
    },
  });
  showUpdates.push({
    updateMany: {
      filter: { movieId: movie.id, listingType: { $ne: "coming-soon" } },
      update: { $set: { cast } },
    },
  });
}

if (missingCastImages.length) {
  console.error("Missing cast images:");
  missingCastImages.forEach((row) => {
    console.error(`- ${row.movie}: ${row.missing.join(", ")}`);
  });
  throw new Error(
    `${missingCastImages.length} movies have missing exact cast images; database was not updated.`,
  );
}

if (movieUpdates.length) await Movie.bulkWrite(movieUpdates);
if (showUpdates.length) await Show.bulkWrite(showUpdates);

console.log(
  `Seeded ${movieUpdates.length} live movies with up to ${MAX_CAST_COUNT} verified cast members each.`,
);
console.log(
  `Cast image source: reused ${stats.cloudinaryReused} Cloudinary images, uploaded ${stats.uploaded} internet images.`,
);
if (stats.unresolved.size) {
  console.warn(`Actors without uploadable images: ${[...stats.unresolved].join(", ")}`);
}

await mongoose.disconnect();

async function buildVerifiedCast(movie, actorAvatars, stats) {
  const configuredNames = VERIFIED_CAST_BY_ID[movie.id] ?? [];
  const names = uniqueNames(
    configuredNames.length ? configuredNames : (movie.cast ?? []).map((member) => member.name),
  ).slice(0, MAX_CAST_COUNT);
  const rows = [];
  for (const [index, name] of names.entries()) {
    const avatar = await resolveActorAvatar(name, actorAvatars, stats);
    rows.push({
      name,
      role: index === 0 ? "Lead" : "Cast",
      avatar,
    });
  }
  const missing = rows
    .filter(
      (row) => !row.avatar || !isCloudinaryImageUrl(row.avatar) || isGeneratedImageUrl(row.avatar),
    )
    .map((row) => row.name);

  return {
    cast: rows.map((row) => ({
      ...row,
      avatar: normalizeCastImageUrl(row.avatar, row.name),
    })),
    missing,
  };
}

async function resolveActorAvatar(name, actorAvatars, stats) {
  const key = actorKey(name);
  if (actorAvatarPromises.has(key)) return actorAvatarPromises.get(key);

  const promise = resolveActorAvatarUncached(name, actorAvatars, stats);
  actorAvatarPromises.set(key, promise);
  return promise;
}

async function resolveActorAvatarUncached(name, actorAvatars, stats) {
  const key = actorKey(name);
  const existing = actorAvatars.get(key);
  if (existing) {
    stats.cloudinaryReused += 1;
    return existing;
  }

  const cloudinaryAvatar = await findCloudinaryRealCastAvatar(name);
  if (cloudinaryAvatar) {
    actorAvatars.set(key, cloudinaryAvatar);
    stats.cloudinaryReused += 1;
    return cloudinaryAvatar;
  }

  const imageUrl =
    ACTOR_IMAGE_SOURCE_OVERRIDES[key] ||
    (await findWikipediaSummaryImageUrl(name)) ||
    (await findWikimediaActorImageUrl(name)) ||
    (await findImdbSuggestionImageUrl(name)) ||
    (await findCommonsSearchImageUrl(name));
  const uploaded = imageUrl ? await uploadActorPhotoSource(name, imageUrl) : "";
  if (uploaded) {
    actorAvatars.set(key, uploaded);
    stats.uploaded += 1;
    return uploaded;
  }

  stats.unresolved.add(name);
  return "";
}

async function loadExistingActorAvatars() {
  const avatars = new Map();
  const docs = await Promise.all([
    Movie.find({ "cast.name": { $exists: true } }, { cast: 1 }).lean(),
    Show.find({ "cast.name": { $exists: true } }, { cast: 1 }).lean(),
  ]);

  docs.flat().forEach((doc) => {
    (doc.cast ?? []).forEach((member) => addActorAvatar(avatars, member?.name, member?.avatar));
  });
  catalogMovies.forEach((movie) => {
    (movie.cast ?? []).forEach((member) => addActorAvatar(avatars, member?.name, member?.avatar));
  });

  return avatars;
}

function addActorAvatar(map, name, avatar) {
  const key = actorKey(name);
  const image = String(avatar || "").trim();
  if (!key || !isCloudinaryImageUrl(image) || isGeneratedImageUrl(image)) return;
  if (!map.has(key)) map.set(key, image);
}

async function findCloudinaryRealCastAvatar(name) {
  const cloudName = getCloudinaryCloudName();
  if (!cloudName) return "";

  for (const extension of CLOUDINARY_EXTENSIONS) {
    const url = `https://res.cloudinary.com/${cloudName}/image/upload/movix/real-cast/${slugify(
      name,
    )}.${extension}`;
    if (await imageExists(url)) return url;
  }

  return "";
}

async function uploadActorPhotoSource(name, sourceUrl) {
  try {
    const imageDataUrl = await fetchImageAsDataUrl(sourceUrl);
    if (!imageDataUrl && sourceUrl.includes("upload.wikimedia.org")) return "";
    const uploaded = await ensureCloudinaryImageUrl(imageDataUrl || sourceUrl, {
      folder: "movix/real-cast",
      publicId: slugify(name),
      tags: ["live-movie-cast"],
    });
    return isCloudinaryImageUrl(uploaded) && !isGeneratedImageUrl(uploaded) ? uploaded : "";
  } catch (error) {
    console.warn(`Cloudinary upload failed for ${name}: ${error.message}`);
    return "";
  }
}

async function findWikipediaSummaryImageUrl(name) {
  const candidates = uniqueNames([
    ...(ACTOR_PAGE_ALIASES[actorKey(name)] ?? []),
    name,
    name.replace(/\./g, "").replace(/\s+/g, " ").trim(),
  ]);
  for (const candidate of candidates) {
    const data = await fetchJson(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(candidate)}`,
    );
    const description = String(data?.description ?? "").toLowerCase();
    const image = data?.thumbnail?.source || data?.originalimage?.source || "";
    if (data?.type === "disambiguation") continue;
    const pageImage = image ? "" : await findWikipediaPageImageUrl(candidate);
    const candidateImage = image || pageImage;
    if (!candidateImage) continue;
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
      ].some((word) => description.includes(word))
    ) {
      continue;
    }
    return candidateImage;
  }

  return "";
}

async function findWikipediaPageImageUrl(title) {
  const pageImageUrl = new URL("https://en.wikipedia.org/w/api.php");
  pageImageUrl.search = new URLSearchParams({
    action: "query",
    format: "json",
    prop: "pageimages",
    piprop: "thumbnail|original",
    pithumbsize: "512",
    titles: title,
  }).toString();

  const data = await fetchJson(pageImageUrl);
  const pages = Object.values(data?.query?.pages ?? {});
  return pages[0]?.thumbnail?.source || pages[0]?.original?.source || "";
}

async function findImdbSuggestionImageUrl(name) {
  const queries = uniqueNames([...(ACTOR_IMDB_SEARCH_ALIASES[actorKey(name)] ?? []), name]);

  for (const query of queries) {
    const suggestionKey = slugify(query).replace(/-/g, "_");
    const firstLetter = suggestionKey[0];
    if (!firstLetter) continue;

    const data = await fetchJson(
      `https://v3.sg.media-imdb.com/suggestion/${firstLetter}/${suggestionKey}.json`,
    );
    const rows = Array.isArray(data?.d) ? data.d : [];
    const match = rows.find(
      (row) =>
        row?.i?.imageUrl &&
        (actorKey(row.l) === actorKey(name) || actorKey(row.l) === actorKey(query)),
    );
    if (match?.i?.imageUrl) return resizeImdbImageUrl(match.i.imageUrl);
  }

  return "";
}

function resizeImdbImageUrl(url) {
  return String(url || "").replace(
    /\._V1_[^.]*\.(jpe?g|png|webp)$/i,
    "._V1_UX512_CR0,0,512,512_AL_.$1",
  );
}

async function findCommonsSearchImageUrl(name) {
  const queries = uniqueNames([
    ...(ACTOR_PAGE_ALIASES[actorKey(name)] ?? []),
    `${name} actor`,
    name,
  ]);

  for (const query of queries) {
    const searchUrl = new URL("https://commons.wikimedia.org/w/api.php");
    searchUrl.search = new URLSearchParams({
      action: "query",
      format: "json",
      generator: "search",
      gsrnamespace: "6",
      gsrlimit: "5",
      gsrsearch: query,
      prop: "imageinfo",
      iiprop: "url",
      iiurlwidth: "512",
    }).toString();

    const data = await fetchJson(searchUrl);
    const pages = Object.values(data?.query?.pages ?? {}).filter(
      (page) => page?.imageinfo?.[0]?.thumburl || page?.imageinfo?.[0]?.url,
    );
    const match = pages.find((page) => isLikelyActorImage(page?.title, name)) ?? pages[0];
    const image = match?.imageinfo?.[0]?.thumburl || match?.imageinfo?.[0]?.url || "";
    if (image) return image;
  }

  return "";
}

function isLikelyActorImage(title, name) {
  const text = actorKey(title);
  const nameParts = actorKey(name)
    .split(/\s+/)
    .filter((part) => part.length > 2);
  return nameParts.some((part) => text.includes(part));
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
    text.includes("director")
  );
}

async function fetchImageAsDataUrl(url) {
  for (let attempt = 0; attempt < FETCH_RETRY_COUNT; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS);
    try {
      await delay(attempt ? FETCH_RETRY_DELAY_MS * attempt : 120);
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": USER_AGENT },
      });
      if (response.status === 429) continue;
      if (!response.ok) return "";
      const contentType = (response.headers.get("content-type") || "image/jpeg")
        .split(",")[0]
        .split(";")[0]
        .trim()
        .toLowerCase();
      if (!contentType.startsWith("image/")) return "";
      const bytes = Buffer.from(await response.arrayBuffer());
      if (!bytes.length || bytes.length > 5 * 1024 * 1024) return "";
      return `data:${contentType};base64,${bytes.toString("base64")}`;
    } catch {
      // Retry transient network/timeouts a few times before giving up.
    } finally {
      clearTimeout(timeout);
    }
  }
  return "";
}

async function imageExists(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
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
  for (let attempt = 0; attempt < FETCH_RETRY_COUNT; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS);
    try {
      await delay(attempt ? FETCH_RETRY_DELAY_MS * attempt : 120);
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      });
      if (response.status === 429) continue;
      if (!response.ok) return null;
      return response.json();
    } catch {
      // Retry transient network/timeouts a few times before giving up.
    } finally {
      clearTimeout(timeout);
    }
  }
  return null;
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function uniqueNames(values = []) {
  const seen = new Set();
  return values
    .map((value) => String(value ?? "").trim())
    .filter((name) => {
      const key = actorKey(name);
      if (!key || key === "official cast" || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function actorKey(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function slugify(value) {
  return actorKey(value)
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
