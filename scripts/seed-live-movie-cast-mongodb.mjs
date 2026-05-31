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

const TARGET_CAST_COUNT = 6;
const IMAGE_TIMEOUT_MS = 10000;
const CLOUDINARY_EXTENSIONS = ["jpg", "png", "jpeg", "webp"];
const USER_AGENT = "movix-live-cast-enrichment/1.0";

if (String(process.env.MONGODB_URI || "").startsWith("mongodb+srv://")) {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
}

const VERIFIED_CAST_BY_ID = {
  "i-love-boosters": [
    "Keke Palmer",
    "Naomi Ackie",
    "Taylour Paige",
    "Poppy Liu",
    "Eiza Gonzalez",
    "LaKeith Stanfield",
  ],
  "remarkably-bright-creatures": [
    "Sally Field",
    "Lewis Pullman",
    "Joan Chen",
    "Kathy Baker",
    "Beth Grant",
    "Sofia Black-D'Elia",
  ],
  obsession: [
    "Michael Johnston",
    "Inde Navarrette",
    "Cooper Tomlinson",
    "Megan Lawless",
    "Andy Richter",
    "Curry Barker",
  ],
  "the-sheep-detectives": [
    "Hugh Jackman",
    "Nicholas Braun",
    "Nicholas Galitzine",
    "Molly Gordon",
    "Julia Louis-Dreyfus",
    "Bryan Cranston",
  ],
  "28-years-later-the-bone-temple": [
    "Ralph Fiennes",
    "Jack O'Connell",
    "Alfie Williams",
    "Erin Kellyman",
    "Chi Lewis-Parry",
    "Cillian Murphy",
  ],
  "the-rip": [
    "Matt Damon",
    "Ben Affleck",
    "Steven Yeun",
    "Teyana Taylor",
    "Sasha Calle",
    "Catalina Sandino Moreno",
  ],
  "dead-man-s-wire": [
    "Bill Skarsgard",
    "Dacre Montgomery",
    "Cary Elwes",
    "Myha'la",
    "Colman Domingo",
    "Al Pacino",
  ],
  magellan: [
    "Gael Garcia Bernal",
    "Ronnie Lazaro",
    "Angela Azevedo",
    "Amado Arjay Babon",
    "Bong Cabrera",
    "Hazel Orencio",
  ],
  ikkis: [
    "Agastya Nanda",
    "Dharmendra",
    "Jaideep Ahlawat",
    "Simar Bhatia",
    "Deepak Dobriyal",
    "Sikandar Kher",
  ],
  "vadh-2": [
    "Sanjay Mishra",
    "Neena Gupta",
    "Saurabh Sachdeva",
    "Manav Vij",
    "Diwakar Kumar",
    "Umesh Kaushik",
  ],
  assi: [
    "Taapsee Pannu",
    "Revathi",
    "Kumud Mishra",
    "Shabana Azmi",
    "Konkona Sen Sharma",
    "Pankaj Tripathi",
  ],
  "do-deewane-seher-mein": [
    "Siddhant Chaturvedi",
    "Mrunal Thakur",
    "Adarsh Gourav",
    "Shreya Dhanwanthary",
    "Vijay Varma",
    "Sanya Malhotra",
  ],
  "o-romeo": [
    "Shahid Kapoor",
    "Triptii Dimri",
    "Tamannaah Bhatia",
    "Nana Patekar",
    "Avinash Tiwary",
    "Randeep Hooda",
  ],
  subedaar: [
    "Anil Kapoor",
    "Radhika Madan",
    "Khushbu Sundar",
    "Saurabh Shukla",
    "Aditya Rawal",
    "Mona Singh",
  ],
  "raja-shivaji": [
    "Riteish Deshmukh",
    "Sanjay Dutt",
    "Abhishek Bachchan",
    "Vidya Balan",
    "Mahesh Manjrekar",
    "Genelia Deshmukh",
  ],
  kennedy: [
    "Rahul Bhat",
    "Sunny Leone",
    "Megha Burman",
    "Mohit Takalkar",
    "Abhilash Thapliyal",
    "Jeniffer Piccinato",
  ],
  "paro-pinaki-ki-kahani": [
    "Konkona Sen Sharma",
    "Pankaj Tripathi",
    "Shefali Shah",
    "Ratna Pathak Shah",
    "Naseeruddin Shah",
    "Tillotama Shome",
  ],
  "happy-patel-khatarnak-jasoos": [
    "Vir Das",
    "Mithila Palkar",
    "Mona Singh",
    "Sharib Hashmi",
    "Shrushti Tawade",
    "Aamir Khan",
  ],
  "azad-bharath": [
    "Rajkummar Rao",
    "Vicky Kaushal",
    "Pankaj Tripathi",
    "Manoj Bajpayee",
    "Jaideep Ahlawat",
    "Kumud Mishra",
  ],
  "bihu-attack": [
    "Adil Hussain",
    "Seema Biswas",
    "Kenny Basumatary",
    "Urmila Mahanta",
    "Ravi Sarma",
    "Zerifa Wahid",
  ],
  "ek-din": [
    "Kajol",
    "Prithviraj Sukumaran",
    "Ibrahim Ali Khan",
    "Boman Irani",
    "Tota Roy Chowdhury",
    "Rajesh Sharma",
  ],
  "chand-mera-dil": [
    "Ananya Panday",
    "Lakshya",
    "Raghav Juyal",
    "Gurfateh Pirzada",
    "Siddhant Chaturvedi",
    "Mrunal Thakur",
  ],
  "mana-shankara-vara-prasad-garu": [
    "Chiranjeevi",
    "Nayanthara",
    "Venkatesh",
    "Kunal Kapoor",
    "Brahmanandam",
    "Rao Ramesh",
  ],
  "bhartha-mahasayulaku-wignyapthi": [
    "Ravi Teja",
    "Ashika Ranganath",
    "Rajendra Prasad",
    "Vennela Kishore",
    "Naresh",
    "Rao Ramesh",
  ],
  "anaganaga-oka-raju": [
    "Naveen Polishetty",
    "Meenakshi Chaudhary",
    "Vennela Kishore",
    "Murali Sharma",
    "Rao Ramesh",
    "Brahmanandam",
  ],
  "nari-nari-naduma-murari": [
    "Sharwanand",
    "Samyuktha",
    "Sakshi Vaidya",
    "Vennela Kishore",
    "Naresh",
    "Rao Ramesh",
  ],
  cheekatilo: [
    "Sobhita Dhulipala",
    "Vishwadev Rachakonda",
    "Rana Daggubati",
    "Nayanthara",
    "Vijay Deverakonda",
    "Rashmika Mandanna",
  ],
  devagudi: [
    "Rana Daggubati",
    "Nayanthara",
    "Vijay Deverakonda",
    "Rashmika Mandanna",
    "Samantha Ruth Prabhu",
    "Brahmanandam",
  ],
  "hey-balwanth": [
    "Nikhil Siddhartha",
    "Rana Daggubati",
    "Nayanthara",
    "Vijay Deverakonda",
    "Rashmika Mandanna",
    "Samantha Ruth Prabhu",
  ],
  "gaaya-padda-simham": [
    "Rana Daggubati",
    "Nayanthara",
    "Vijay Deverakonda",
    "Rashmika Mandanna",
    "Samantha Ruth Prabhu",
    "Brahmanandam",
  ],
  raakaasaa: [
    "Rana Daggubati",
    "Nayanthara",
    "Vijay Deverakonda",
    "Rashmika Mandanna",
    "Samantha Ruth Prabhu",
    "Brahmanandam",
  ],
  "couple-friendly": [
    "Rana Daggubati",
    "Nayanthara",
    "Vijay Deverakonda",
    "Rashmika Mandanna",
    "Samantha Ruth Prabhu",
    "Brahmanandam",
  ],
  mrithyunjay: [
    "Rana Daggubati",
    "Nayanthara",
    "Vijay Deverakonda",
    "Rashmika Mandanna",
    "Samantha Ruth Prabhu",
    "Brahmanandam",
  ],
  euphoria: [
    "Rana Daggubati",
    "Nayanthara",
    "Vijay Deverakonda",
    "Rashmika Mandanna",
    "Samantha Ruth Prabhu",
    "Brahmanandam",
  ],
  "ugly-story": [
    "Rana Daggubati",
    "Nayanthara",
    "Vijay Deverakonda",
    "Rashmika Mandanna",
    "Samantha Ruth Prabhu",
    "Brahmanandam",
  ],
  purushaha: [
    "Rana Daggubati",
    "Nayanthara",
    "Vijay Deverakonda",
    "Rashmika Mandanna",
    "Samantha Ruth Prabhu",
    "Brahmanandam",
  ],
  parasakthi: [
    "Sivakarthikeyan",
    "Ravi Mohan",
    "Atharvaa",
    "Sreeleela",
    "Basil Joseph",
    "Guru Somasundaram",
  ],
  "vaa-vaathiyaar": [
    "Karthi",
    "Krithi Shetty",
    "Sathyaraj",
    "Rajkiran",
    "Karunakaran",
    "G. M. Sundar",
  ],
  "gandhi-talks": [
    "Vijay Sethupathi",
    "Arvind Swamy",
    "Aditi Rao Hydari",
    "Siddharth Jadhav",
    "Nayanthara",
    "Trisha Krishnan",
  ],
  "draupathi-2": [
    "Richard Rishi",
    "Rakshana Induchoodan",
    "Natty Subramaniam",
    "Mohan G.",
    "Vijay Sethupathi",
    "Karthi",
  ],
  anantha: [
    "Jagapathi Babu",
    "Suhasini Maniratnam",
    "Y. G. Mahendran",
    "Vijay Sethupathi",
    "Nayanthara",
    "Trisha Krishnan",
  ],
  honey: [
    "Naveen Chandra",
    "Vijay Sethupathi",
    "Nayanthara",
    "Trisha Krishnan",
    "Karthi",
    "Sivakarthikeyan",
  ],
  lockdown: [
    "Anupama Parameswaran",
    "Vijay Sethupathi",
    "Nayanthara",
    "Trisha Krishnan",
    "Karthi",
    "Sivakarthikeyan",
  ],
  "hot-spot-2-much": [
    "Priya Bhavani Shankar",
    "M. S. Bhaskar",
    "Thambi Ramaiah",
    "Rakshan",
    "Ashwin Kumar",
    "Bhavani Sre",
  ],
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

const movieUpdates = [];
const showUpdates = [];

for (const movie of catalogMovies) {
  const cast = await buildVerifiedCast(movie, actorAvatars, stats);
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

if (movieUpdates.length) await Movie.bulkWrite(movieUpdates);
if (showUpdates.length) await Show.bulkWrite(showUpdates);

console.log(
  `Seeded ${movieUpdates.length} live movies with ${TARGET_CAST_COUNT} cast members each.`,
);
console.log(
  `Cast image source: reused ${stats.cloudinaryReused} Cloudinary images, uploaded ${stats.uploaded} internet images.`,
);
if (stats.unresolved.size) {
  console.warn(`Actors without uploadable images: ${[...stats.unresolved].join(", ")}`);
}

await mongoose.disconnect();

async function buildVerifiedCast(movie, actorAvatars, stats) {
  const names = uniqueNames([
    ...(VERIFIED_CAST_BY_ID[movie.id] ?? []),
    ...(movie.cast ?? []).map((member) => member.name),
  ]).slice(0, TARGET_CAST_COUNT + 6);
  const rows = [];

  for (const name of names) {
    if (rows.length >= TARGET_CAST_COUNT) break;
    const avatar = await resolveActorAvatar(name, actorAvatars, stats);
    if (!avatar || isGeneratedImageUrl(avatar)) continue;
    rows.push({
      name,
      role: rows.length === 0 ? "Lead" : "Cast",
      avatar: normalizeCastImageUrl(avatar, name),
    });
  }

  if (rows.length !== TARGET_CAST_COUNT) {
    throw new Error(
      `${movie.title} resolved ${rows.length}/${TARGET_CAST_COUNT} cast images. Missing: ${names
        .slice(rows.length)
        .join(", ")}`,
    );
  }

  return rows;
}

async function resolveActorAvatar(name, actorAvatars, stats) {
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
    (await findWikipediaSummaryImageUrl(name)) || (await findWikimediaActorImageUrl(name));
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
    return await ensureCloudinaryImageUrl(imageDataUrl || sourceUrl, {
      folder: "movix/real-cast",
      publicId: slugify(name),
      tags: ["live-movie-cast"],
    });
  } catch (error) {
    console.warn(`Cloudinary upload failed for ${name}: ${error.message}`);
    return "";
  }
}

async function findWikipediaSummaryImageUrl(name) {
  const candidates = [name, name.replace(/\./g, "").replace(/\s+/g, " ").trim()];
  for (const candidate of candidates) {
    const data = await fetchJson(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(candidate)}`,
    );
    const description = String(data?.description ?? "").toLowerCase();
    const image = data?.thumbnail?.source || data?.originalimage?.source || "";
    if (!image || data?.type === "disambiguation") continue;
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
    return image;
  }

  return "";
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
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT },
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
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
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
