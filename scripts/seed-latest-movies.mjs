import "dotenv/config";
import dns from "node:dns";
import mongoose from "mongoose";
import { Movie } from "../server/models/Movie.js";
import { Review } from "../server/models/Review.js";
import { Show } from "../server/models/Show.js";
import { Theater } from "../server/models/Theater.js";
import { ensureCloudinaryImageUrl } from "../server/services/cloudinaryService.js";

const mongoUri = cleanEnv(process.env.MONGODB_URI);
const mongoDb = cleanEnv(process.env.MONGODB_DB) || "movix";
const WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php";
const WIKIPEDIA_SUMMARY = "https://en.wikipedia.org/api/rest_v1/page/summary";
const USER_AGENT = "movixLatestMovieSeed/1.0";
const MAX_CAST = 6;
const SHOW_TIMES = ["08:30 PM"];
const FOCUS_CITIES = [
  "Jabalpur",
  "Mumbai",
  "Delhi NCR",
  "Bengaluru",
  "Hyderabad",
  "Chennai",
  "Pune",
  "Kolkata",
  "Ahmedabad",
  "Jaipur",
  "Lucknow",
  "Indore",
];
const idCounts = new Map();
const wikiSearchCache = new Map();
const wikiSummaryCache = new Map();
const personImageCache = new Map();
const USE_WIKI_POSTERS = process.env.LATEST_USE_WIKI_POSTERS === "true";

const latestMovieSeeds = [
  seed(1, "Project Hail Mary", "Hollywood", "English", ["Sci-Fi", "Adventure"], "Mar 2026", [
    "Ryan Gosling",
  ]),
  seed(
    2,
    "Star Wars: The Mandalorian & Grogu",
    "Hollywood",
    "English",
    ["Sci-Fi", "Action", "Adventure"],
    "May 2026",
    ["Pedro Pascal"],
  ),
  seed(3, "Disclosure Day", "Hollywood", "English", ["Sci-Fi", "Drama"], "Jun 12, 2026", [
    "Emily Blunt",
    "Colin Firth",
  ]),
  seed(
    4,
    "Masters of the Universe",
    "Hollywood",
    "English",
    ["Sci-Fi", "Action", "Adventure"],
    "Jun 5, 2026",
    ["Nicholas Galitzine", "Idris Elba"],
  ),
  seed(
    5,
    "Supergirl: Woman of Tomorrow",
    "Hollywood",
    "English",
    ["Sci-Fi", "Action"],
    "Jul 2026",
    ["Milly Alcock"],
  ),
  seed(6, "Dune: Part Three", "Hollywood", "English", ["Sci-Fi", "Adventure", "Drama"], "2026", [
    "Timothee Chalamet",
    "Zendaya",
  ]),
  seed(7, "The Backrooms", "Hollywood", "English", ["Horror", "Sci-Fi"], "2026", ["Kane Parsons"]),
  seed(8, "The Odyssey", "Hollywood", "English", ["Epic", "Adventure", "Drama"], "Jul 17, 2026", [
    "Matt Damon",
    "Tom Holland",
    "Anne Hathaway",
    "Zendaya",
  ]),
  seed(9, "Greenland 2: Migration", "Hollywood", "English", ["Action", "Thriller"], "Jan 2026", [
    "Gerard Butler",
    "Morena Baccarin",
  ]),
  seed(
    10,
    "Spider-Man: Brand New Day",
    "Hollywood",
    "English",
    ["Action", "Adventure", "Sci-Fi"],
    "Jul 31, 2026",
    ["Tom Holland", "Zendaya"],
  ),
  seed(11, "Clayface", "Hollywood", "English", ["Action", "Horror", "Thriller"], "Sep 11, 2026", [
    "Tom Rhys Harries",
    "Naomi Ackie",
  ]),
  seed(12, "Mortal Kombat II", "Hollywood", "English", ["Action", "Fantasy"], "2026", [
    "Karl Urban",
  ]),
  seed(13, "Street Fighter", "Hollywood", "English", ["Action"], "2026", ["Jason Momoa"]),
  seed(
    14,
    "Tom Clancy's Jack Ryan: Ghost War",
    "Hollywood",
    "English",
    ["Action", "Thriller"],
    "2026",
    ["John Krasinski"],
    { skipWikiPoster: true },
  ),
  seed(
    15,
    "Toy Story 5",
    "Hollywood",
    "English",
    ["Animation", "Adventure", "Comedy"],
    "Jun 19, 2026",
    ["Tim Allen", "Blake Clark"],
  ),
  seed(
    16,
    "Zootopia 2",
    "Hollywood",
    "English",
    ["Animation", "Adventure", "Comedy"],
    "2025/2026",
    ["Ginnifer Goodwin"],
  ),
  seed(
    17,
    "Minions & Monsters",
    "Hollywood",
    "English",
    ["Animation", "Comedy"],
    "2026",
    ["Steve Carell"],
    { skipWikiPoster: true },
  ),
  seed(
    18,
    "The Super Mario Galaxy Movie",
    "Hollywood",
    "English",
    ["Animation", "Adventure", "Comedy"],
    "2026",
    ["Chris Pratt", "Anya Taylor-Joy"],
  ),
  seed(19, "Hoppers", "Hollywood", "English", ["Animation", "Adventure"], "2026", []),
  seed(20, "Moana (Live Action)", "Hollywood", "English", ["Adventure", "Drama"], "Jul 10, 2026", [
    "Dwayne Johnson",
    "Catherine Laga'aia",
  ]),
  seed(21, "Dead Man's Wire", "Hollywood", "English", ["Biography", "Drama"], "Jan 2026", [
    "Al Pacino",
    "Bill Skarsgard",
  ]),
  seed(22, "Magellan", "Hollywood", "English", ["Biography", "History", "Adventure"], "Jan 2026", [
    "Gael Garcia Bernal",
  ]),
  seed(23, "The Devil Wears Prada 2", "Hollywood", "English", ["Drama", "Comedy"], "2026", [
    "Meryl Streep",
    "Anne Hathaway",
  ]),
  seed(24, "Passenger (2026)", "Hollywood", "English", ["Drama", "Sci-Fi"], "May 2026", []),
  seed(25, "Border 2", "Bollywood", "Hindi", ["Action", "Drama"], "Jan 23, 2026", [
    "Sunny Deol",
    "Varun Dhawan",
  ]),
  seed(26, "Dacoit", "Bollywood", "Hindi", ["Action", "Thriller"], "Apr 10, 2026", [
    "Adivi Sesh",
    "Mrunal Thakur",
  ]),
  seed(27, "Alpha (YRF Spy)", "Bollywood", "Hindi", ["Action", "Thriller"], "Released 2026", [
    "Alia Bhatt",
    "Sharvari",
  ]),
  seed(28, "Mardaani 3", "Bollywood", "Hindi", ["Action", "Thriller"], "Jan 2026", [
    "Rani Mukerji",
  ]),
  seed(29, "Bhediya 2", "Bollywood", "Hindi", ["Action", "Horror", "Comedy"], "Aug 14, 2026", [
    "Varun Dhawan",
    "Kriti Sanon",
  ]),
  seed(30, "Tiger 4 (YRF)", "Bollywood", "Hindi", ["Action", "Thriller"], "2026", ["Salman Khan"]),
  seed(31, "Don 3", "Bollywood", "Hindi", ["Action", "Thriller"], "2026", ["Ranveer Singh"]),
  seed(32, "Dhurandhar 2", "Bollywood", "Hindi", ["Action", "Thriller"], "Mar 19, 2026", []),
  seed(33, "Naagzilla", "Bollywood", "Hindi", ["Action", "Horror", "Fantasy"], "Aug 14, 2026", []),
  seed(
    34,
    "Toxic: A Fairy Tale for Grown-Ups",
    "Bollywood",
    "Hindi",
    ["Action", "Drama"],
    "Jun 4, 2026",
    ["Yash", "Kiara Advani"],
  ),
  seed(36, "Cocktail 2", "Bollywood", "Hindi", ["Romance", "Comedy", "Drama"], "Jun 19, 2026", [
    "Shahid Kapoor",
    "Rashmika Mandanna",
    "Kriti Sanon",
  ]),
  seed(37, "Bandar", "Bollywood", "Hindi", ["Crime", "Drama"], "Jun 5, 2026", [
    "Bobby Deol",
    "Sanya Malhotra",
    "Sapna Pabbi",
    "Saba Azad",
  ]),
  seed(38, "Love and War", "Bollywood", "Hindi", ["Drama", "Romance"], "Mar 20, 2026", [
    "Ranbir Kapoor",
    "Alia Bhatt",
    "Vicky Kaushal",
  ]),
  seed(39, "Drishyam 3", "Bollywood", "Hindi", ["Drama", "Thriller"], "Oct 2, 2026", [
    "Ajay Devgn",
    "Tabu",
  ]),
  seed(40, "O'Romeo", "Bollywood", "Hindi", ["Drama", "Romance"], "Feb 2026", [
    "Shahid Kapoor",
    "Triptii Dimri",
    "Tamannaah",
  ]),
  seed(41, "Assi", "Bollywood", "Hindi", ["Drama"], "Feb 20, 2026", ["Taapsee Pannu", "Revathi"]),
  seed(42, "Do Deewane Seher Mein", "Bollywood", "Hindi", ["Drama", "Romance"], "Feb 2026", [
    "Siddhant Chaturvedi",
    "Mrunal Thakur",
  ]),
  seed(43, "Vadh 2", "Bollywood", "Hindi", ["Drama", "Thriller"], "Feb 6, 2026", [
    "Sanjay Mishra",
    "Neena Gupta",
  ]),
  seed(44, "Main Vaapas Aaunga", "Bollywood", "Hindi", ["Drama", "Romance"], "Jun 12, 2026", [
    "Diljit Dosanjh",
    "Sharvari",
    "Naseeruddin Shah",
    "Vedang Raina",
  ]),
  seed(
    45,
    "Hai Jawani Toh Ishq Hona Hai",
    "Bollywood",
    "Hindi",
    ["Comedy", "Romance"],
    "Jun 5, 2026",
    ["Varun Dhawan", "Mrunal Thakur", "Pooja Hegde"],
  ),
  seed(46, "Maa Behen", "Bollywood", "Hindi", ["Comedy", "Crime"], "Jun 4, 2026", [
    "Madhuri Dixit",
    "Triptii Dimri",
    "Dharna Durgaa",
    "Ravi Kishan",
  ]),
  seed(
    47,
    "Governor: The Silent Saviour",
    "Bollywood",
    "Hindi",
    ["Drama", "Thriller"],
    "Jun 12, 2026",
    ["Manoj Bajpayee", "Adah Sharma"],
  ),
  seed(49, "Ramayan (Part 1)", "Bollywood", "Hindi", ["History", "Mythology", "Drama"], "2026", [
    "Ranbir Kapoor",
    "Yash",
    "Sai Pallavi",
  ]),
  seed(50, "Dhamaal 4", "Bollywood", "Hindi", ["Comedy"], "Jul 3, 2026", [
    "Ajay Devgn",
    "Riteish Deshmukh",
  ]),
  seed(51, "Bhooth Bangla", "Bollywood", "Hindi", ["Comedy", "Horror"], "Apr 10, 2026", [
    "Akshay Kumar",
  ]),
  seed(52, "The Raja Saab", "Tollywood", "Telugu", ["Action", "Horror", "Romance"], "Jan 9, 2026", [
    "Prabhas",
    "Nidhhi Agerwal",
    "Sanjay Dutt",
  ]),
  seed(
    53,
    "Bhartha Mahasayulaku Wignyapthi",
    "Tollywood",
    "Telugu",
    ["Action", "Drama"],
    "Jan 13, 2026",
    ["Ravi Teja", "Ashika Ranganath"],
  ),
  seed(54, "Anaganaga Oka Raju", "Tollywood", "Telugu", ["Action", "Comedy"], "Jan 14, 2026", [
    "Naveen Polishetty",
    "Meenakshi Chaudhary",
  ]),
  seed(55, "Hey Balwanth", "Tollywood", "Telugu", ["Action", "Thriller"], "2026", [
    "Nikhil Siddhartha",
  ]),
  seed(56, "Peddi", "Tollywood", "Telugu", ["Action", "Drama"], "Jun 4, 2026", [
    "Ram Charan",
    "Janhvi Kapoor",
  ]),
  seed(57, "NTR-Neel", "Tollywood", "Telugu", ["Action", "Thriller"], "2026", ["Jr NTR"]),
  seed(58, "Spirit", "Tollywood", "Telugu", ["Action", "Thriller"], "2026", ["Prabhas"]),
  seed(59, "Mrithyunjay", "Tollywood", "Telugu", ["Action", "Thriller"], "2026", []),
  seed(60, "Raakaasaa", "Tollywood", "Telugu", ["Action", "Fantasy"], "2026", []),
  seed(61, "Hey Balwanth", "Tollywood", "Telugu", ["Action", "Thriller"], "2026", [
    "Nikhil Siddhartha",
  ]),
  seed(
    62,
    "Don't Trouble The Trouble",
    "Tollywood",
    "Telugu",
    ["Drama", "Fantasy"],
    "Jun 12, 2026",
    ["Fahadh Faasil"],
  ),
  seed(
    63,
    "VISA - Vintara Saradaga",
    "Tollywood",
    "Telugu",
    ["Comedy", "Romance"],
    "Jun 12, 2026",
    ["Ashok Galla", "Sri Gouri Priya Reddy"],
  ),
  seed(64, "Rao Bahadur", "Tollywood", "Telugu", ["Comedy", "Fantasy"], "Jun 5, 2026", [
    "Satya Dev",
    "Vikas Muppala",
  ]),
  seed(65, "Swayambhu", "Tollywood", "Telugu", ["Mythological", "Action"], "2026", [
    "Nikhil Siddhartha",
  ]),
  seed(66, "Purushaha", "Tollywood", "Telugu", ["Action", "Drama"], "May 2026", []),
  seed(
    67,
    "Mana Shankara Vara Prasad Garu",
    "Tollywood",
    "Telugu",
    ["Drama", "Romance"],
    "Jan 12, 2026",
    ["Chiranjeevi", "Nayanthara", "Venkatesh"],
  ),
  seed(68, "Nari Nari Naduma Murari", "Tollywood", "Telugu", ["Drama", "Romance"], "Jan 2026", [
    "Sharwanand",
    "Samyuktha",
  ]),
  seed(69, "Cheekatilo", "Tollywood", "Telugu", ["Drama", "Thriller"], "Jan 23, 2026", [
    "Sobhita Dhulipala",
  ]),
  seed(70, "Euphoria", "Tollywood", "Telugu", ["Romance", "Drama"], "2026", []),
  seed(71, "Couple Friendly", "Tollywood", "Telugu", ["Romance", "Comedy"], "2026", []),
  seed(72, "Ugly Story", "Tollywood", "Telugu", ["Drama", "Thriller"], "May 2026", []),
  seed(
    73,
    "Vrushakarma",
    "Tollywood",
    "Telugu",
    ["Action", "Adventure", "Thriller"],
    "Jun 12, 2026",
    ["Naga Chaitanya", "Meenakshi Chaudhary"],
  ),
  seed(74, "The Paradise", "Tollywood", "Telugu", ["Fantasy", "Drama"], "2026", ["Nani"]),
  seed(75, "Gaaya Padda Simham", "Tollywood", "Telugu", ["Action", "Drama"], "2026", []),
].filter(hasPublicMovieTitle);

if (!mongoUri) {
  throw new Error("MONGODB_URI is required to seed latest movies.");
}

if (mongoUri.startsWith("mongodb+srv://")) {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
}

await mongoose.connect(mongoUri, {
  dbName: mongoDb,
  serverSelectionTimeoutMS: 10000,
});

console.log(`Connected to MongoDB database "${mongoose.connection.name}".`);

const movies = await mapLimit(latestMovieSeeds, 2, buildMoviePayload);
await Movie.bulkWrite(
  movies.map((movie) => ({
    updateOne: {
      filter: { id: movie.id },
      update: { $set: movie },
      upsert: true,
    },
  })),
);
console.log(`Upserted ${movies.length} latest movies.`);

await seedLatestReviews(movies);
await linkMoviesToTheaters(movies);
await seedLatestShows(movies);

const counts = {
  movies: await Movie.countDocuments(),
  theaters: await Theater.countDocuments(),
  shows: await Show.countDocuments(),
  reviews: await Review.countDocuments(),
};
console.log("Latest movie seed complete:", counts);
await mongoose.disconnect();

function seed(number, title, industry, language, genres, releaseDate, cast, options = {}) {
  return { number, title, industry, language, genres, releaseDate, cast, ...options };
}

function hasPublicMovieTitle(seedItem) {
  return !/\bfilm$/i.test(String(seedItem?.title ?? "").trim());
}

async function buildMoviePayload(seedItem, index) {
  const id = uniqueMovieId(seedItem);
  const existing = await Movie.findOne({ id }).select("poster backdrop description cast").lean();
  if (USE_WIKI_POSTERS && existing?.poster && existing?.backdrop && existing?.cast?.length) {
    return {
      id,
      title: seedItem.title,
      poster: existing.poster,
      backdrop: existing.backdrop,
      genres: seedItem.genres,
      language: seedItem.language,
      duration: durationFor(seedItem, index),
      rating: ratingFor(seedItem, index),
      votes: votesFor(seedItem.releaseDate, index),
      releaseDate: seedItem.releaseDate,
      description: existing.description || descriptionFor(seedItem),
      cast: existing.cast,
      format: formatFor(seedItem.genres),
      certificate: certificateFor(seedItem.genres),
      sortOrder: -8000 + seedItem.number,
    };
  }

  const folder = `movix/latest-movies/${id}`;
  const wiki = USE_WIKI_POSTERS && !seedItem.skipWikiPoster ? await findMovieWiki(seedItem) : null;
  const posterSource =
    USE_WIKI_POSTERS && wiki?.image ? wiki.image : posterPlaceholder(seedItem.title);
  const backdropSource =
    USE_WIKI_POSTERS && (wiki?.originalImage || wiki?.image)
      ? wiki.originalImage || wiki.image
      : backdropPlaceholder(seedItem.title);
  const poster = await cacheCloudinaryImage(posterSource, folder, `${id}-poster`);
  const backdrop = await cacheCloudinaryImage(backdropSource, folder, `${id}-backdrop`);
  const castNames = seedItem.cast.length ? seedItem.cast : ["Official Cast"];
  const existingCast = Array.isArray(existing?.cast)
    ? existing.cast.filter((member) => member.avatar)
    : [];
  const cast = existingCast.length
    ? existingCast
    : await mapLimit(castNames.slice(0, MAX_CAST), 2, async (name, castIndex) => {
        const image = name === "Official Cast" ? "" : await findPersonImage(name);
        return {
          name,
          role: name === "Official Cast" ? "Cast" : "Actor",
          avatar: await cacheCloudinaryImage(
            image || avatarPlaceholder(name === "Official Cast" ? seedItem.title : name),
            `${folder}/cast`,
            `${id}-cast-${castIndex + 1}`,
          ),
        };
      });

  return {
    id,
    title: seedItem.title,
    poster,
    backdrop,
    genres: seedItem.genres,
    language: seedItem.language,
    duration: durationFor(seedItem, index),
    rating: ratingFor(seedItem, index),
    votes: votesFor(seedItem.releaseDate, index),
    releaseDate: seedItem.releaseDate,
    description: wiki?.extract || descriptionFor(seedItem),
    cast,
    format: formatFor(seedItem.genres),
    certificate: certificateFor(seedItem.genres),
    sortOrder: -8000 + seedItem.number,
  };
}

function uniqueMovieId(seedItem) {
  const base = slugify(seedItem.title);
  const count = idCounts.get(base) || 0;
  idCounts.set(base, count + 1);
  return count ? `${base}-${seedItem.number}` : base;
}

async function findMovieWiki(seedItem) {
  const query = `${seedItem.title.replace(/\([^)]*\)/g, "").trim()} ${seedItem.industry === "Hollywood" ? "film" : "film"} ${seedItem.releaseDate}`;
  const results = await searchWikipedia(query);
  for (const result of results.slice(0, 4)) {
    const summary = await fetchWikipediaSummary(result.title);
    if (!summary) continue;
    const image = summary.thumbnail?.source || summary.originalimage?.source || "";
    const extract = String(summary.extract || "");
    if (image || /film|movie|cinema/i.test(extract)) {
      return {
        title: summary.title,
        extract: extract.slice(0, 380),
        image,
        originalImage: summary.originalimage?.source || image,
      };
    }
  }
  return null;
}

async function findPersonImage(name) {
  if (personImageCache.has(name)) return personImageCache.get(name);
  const results = await searchWikipedia(name);
  for (const result of results.slice(0, 3)) {
    const summary = await fetchWikipediaSummary(result.title);
    const image = summary?.thumbnail?.source || summary?.originalimage?.source || "";
    if (image) {
      personImageCache.set(name, image);
      return image;
    }
  }
  personImageCache.set(name, "");
  return "";
}

async function searchWikipedia(query) {
  if (wikiSearchCache.has(query)) return wikiSearchCache.get(query);
  const url = new URL(WIKIPEDIA_API);
  url.searchParams.set("action", "query");
  url.searchParams.set("format", "json");
  url.searchParams.set("origin", "*");
  url.searchParams.set("list", "search");
  url.searchParams.set("srlimit", "5");
  url.searchParams.set("srsearch", query);
  try {
    const data = await fetchJson(url.toString());
    const results = data?.query?.search || [];
    wikiSearchCache.set(query, results);
    return results;
  } catch (error) {
    console.warn(`Wikipedia search skipped for "${query}": ${error.message}`);
    wikiSearchCache.set(query, []);
    return [];
  }
}

async function fetchWikipediaSummary(title) {
  if (wikiSummaryCache.has(title)) return wikiSummaryCache.get(title);
  try {
    const summary = await fetchJson(`${WIKIPEDIA_SUMMARY}/${encodeURIComponent(title)}`);
    wikiSummaryCache.set(title, summary);
    return summary;
  } catch (error) {
    console.warn(`Wikipedia summary skipped for "${title}": ${error.message}`);
    wikiSummaryCache.set(title, null);
    return null;
  }
}

async function cacheCloudinaryImage(source, folder, publicId) {
  try {
    return await ensureCloudinaryImageUrl(source, { folder, publicId });
  } catch (error) {
    const fallback = cloudinaryFetchUrl(source);
    if (fallback) return fallback;
    console.warn(`Image cache failed for ${publicId}: ${error.message}`);
    return source;
  }
}

function cloudinaryFetchUrl(source) {
  const cloudName = getCloudinaryCloudName();
  if (!cloudName || !/^https?:\/\//i.test(source)) return "";
  return `https://res.cloudinary.com/${cloudName}/image/fetch/f_auto,q_auto/${encodeURIComponent(source)}`;
}

async function seedLatestReviews(movies) {
  const reviews = movies.flatMap((movie, movieIndex) =>
    [
      ["A clean big-screen pick with strong buzz and smooth pacing.", "#Wellmade", 9],
      ["Cast and scale make this one worth tracking for theatre viewing.", "#GreatActing", 9],
      ["Looks like a proper weekend watch with strong audience pull.", "#AwesomeStory", 8],
    ].map(([text, tag, rating], reviewIndex) => ({
      movieId: movie.id,
      userId: `latest-seed-user-${reviewIndex + 1}`,
      userEmail: `latest-review-${reviewIndex + 1}@movix.local`,
      userName: ["Aarav S.", "Priya M.", "Rahul K."][reviewIndex],
      rating: Math.min(10, rating + (movieIndex % 2)),
      text,
      tags: [tag],
      helpfulCount: 40 + movieIndex * 3 + reviewIndex * 11,
      verifiedBooking: reviewIndex !== 2,
      status: "published",
      source: "seed",
    })),
  );

  await Review.bulkWrite(
    reviews.map((review) => ({
      updateOne: {
        filter: { movieId: review.movieId, userId: review.userId },
        update: { $set: review },
        upsert: true,
      },
    })),
  );
  console.log(`Upserted ${reviews.length} seeded latest movie reviews.`);
}

async function linkMoviesToTheaters(movies) {
  const movieIds = movies.map((movie) => movie.id);
  const targetTheaters = await getTargetTheatersByCity(3, FOCUS_CITIES);
  if (!targetTheaters.length) return;
  await Theater.updateMany(
    { id: { $in: targetTheaters.map((theater) => theater.id) } },
    { $addToSet: { movieIds: { $each: movieIds } } },
  );
  console.log(`Linked latest movies to ${targetTheaters.length} city theaters.`);
}

async function seedLatestShows(movies) {
  await Show.deleteMany({ id: /^latest-/ });
  const theatersByCity = groupByCity(await getTargetTheatersByCity(1, FOCUS_CITIES));
  const theaters = Array.from(theatersByCity.values()).flat();
  if (!theaters.length) return;

  const operations = [];
  for (const [movieIndex, movie] of movies.entries()) {
    for (const theater of theaters) {
      const screen = theater.screens?.[0];
      SHOW_TIMES.forEach((startTime, slotIndex) => {
        const date = showDate(movieIndex + slotIndex);
        operations.push({
          updateOne: {
            filter: { id: `latest-${movie.id}-${theater.id}-${slotIndex}` },
            update: {
              $set: {
                id: `latest-${movie.id}-${theater.id}-${slotIndex}`,
                movieId: movie.id,
                theaterId: theater.id,
                screenId: screen?.id || `${theater.id}-screen-1`,
                screen: screen?.name || "Screen 1",
                date,
                time: startTime,
                startTime,
                endTime: "Auto calculated",
                price: priceFor(movieIndex, slotIndex),
                language: movie.language,
                format: movie.format[slotIndex % movie.format.length] || "2D",
                certificate: movie.certificate,
                status: slotIndex === 2 ? "fast" : "ok",
                cancellable: slotIndex !== 2,
                listingType: "live",
                bookingOpensAt: "Now",
                trailerUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${movie.title} official trailer`)}`,
                notes: "Latest movie seed",
              },
            },
            upsert: true,
          },
        });
      });
    }
  }

  for (let index = 0; index < operations.length; index += 1000) {
    await Show.bulkWrite(operations.slice(index, index + 1000), { ordered: false });
    console.log(
      `Latest shows upserted: ${Math.min(index + 1000, operations.length)}/${operations.length}`,
    );
  }
}

async function getTargetTheatersByCity(limitPerCity, cityNames = []) {
  const citySet = new Set(cityNames.map(normalizeText));
  const theaters = await Theater.find({ approved: true })
    .sort({ city: 1, name: 1 })
    .select("id name city screens")
    .lean();
  return Array.from(groupByCity(theaters).entries())
    .filter(([city]) => !citySet.size || citySet.has(normalizeText(city)))
    .flatMap(([, items]) => items.slice(0, limitPerCity));
}

function groupByCity(theaters) {
  const groups = new Map();
  for (const theater of theaters) {
    const city = theater.city || "Unknown";
    if (!groups.has(city)) groups.set(city, []);
    groups.get(city).push(theater);
  }
  return groups;
}

function descriptionFor(seedItem) {
  const genreText = seedItem.genres.slice(0, 3).join(", ");
  return `${seedItem.title} is a ${seedItem.industry} ${genreText} release listed for ${seedItem.releaseDate}. The movie page includes poster, cast, reviews and city-wise show inventory for booking.`;
}

function formatFor(genres) {
  if (genres.includes("Animation")) return ["2D", "3D", "IMAX"];
  if (genres.includes("Sci-Fi") || genres.includes("Action")) return ["2D", "IMAX", "4DX"];
  return ["2D", "IMAX"];
}

function certificateFor(genres) {
  if (genres.includes("Animation")) return "U";
  if (genres.includes("Horror") || genres.includes("Thriller")) return "UA";
  return "UA";
}

function durationFor(seedItem, index) {
  if (seedItem.genres.includes("Animation")) return `${1 + (index % 2)}h ${44 + (index % 11)}m`;
  if (seedItem.genres.includes("Action")) return `2h ${18 + (index % 28)}m`;
  if (seedItem.genres.includes("Drama")) return `2h ${5 + (index % 32)}m`;
  return `2h ${10 + (index % 30)}m`;
}

function ratingFor(seedItem, index) {
  const base = seedItem.genres.includes("Animation")
    ? 8
    : seedItem.genres.includes("Action")
      ? 8.2
      : 7.8;
  return Number((base + (index % 7) * 0.1).toFixed(1));
}

function votesFor(releaseDate, index) {
  return /released|jan|feb|mar|apr|may/i.test(releaseDate)
    ? `${18 + (index % 45)}.${index % 9}K`
    : "Coming soon";
}

function priceFor(movieIndex, slotIndex) {
  return {
    platinum: 180 + (movieIndex % 4) * 20 + slotIndex * 10,
    silver: 220 + (movieIndex % 5) * 20 + slotIndex * 10,
    gold: 260 + (movieIndex % 6) * 25 + slotIndex * 15,
    vip: 420 + (movieIndex % 7) * 30 + slotIndex * 20,
  };
}

function showDate(offset) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + (offset % 7));
  return date.toISOString().slice(0, 10);
}

function posterPlaceholder(title) {
  return `https://placehold.co/780x1170/0f172a/ffffff/png?text=${encodeURIComponent(title)}`;
}

function backdropPlaceholder(title) {
  return `https://placehold.co/1280x720/0f172a/ffffff/png?text=${encodeURIComponent(title)}`;
}

function avatarPlaceholder(name) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0f766e&color=fff&size=256&format=png&bold=true`;
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
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

function getCloudinaryCloudName() {
  const explicit = cleanEnv(process.env.CLOUDINARY_CLOUD_NAME);
  if (explicit) return explicit;
  const value = cleanEnv(process.env.CLOUDINARY_URL);
  if (!value) return "";
  try {
    return new URL(value).hostname;
  } catch {
    return "";
  }
}

function cleanEnv(value) {
  if (!value) return "";
  return String(value)
    .trim()
    .split(/\\n|\r?\n/)
    .at(0)
    .replace(/^[`'"]+|[`'"]+$/g, "")
    .trim();
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}
