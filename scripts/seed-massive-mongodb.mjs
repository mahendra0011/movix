import "dotenv/config";
import dns from "node:dns";
import mongoose from "mongoose";
import { Booking } from "../server/models/Booking.js";
import { Movie } from "../server/models/Movie.js";
import { Review } from "../server/models/Review.js";
import { Show } from "../server/models/Show.js";
import { Subscriber } from "../server/models/Subscriber.js";
import { Theater } from "../server/models/Theater.js";
import { User } from "../server/models/User.js";
import {
  ensureCloudinaryImageUrl,
  isCloudinaryConfigured,
  isCloudinaryImageUrl,
} from "../server/services/cloudinaryService.js";
import {
  movies as catalogMovies,
  showTimes,
  theaters as catalogTheaters,
} from "../src/features/movies/data/movieCatalog.js";
import { SEARCHABLE_CITY_OPTIONS } from "../src/shared/services/cityPreference.js";

const mongoUri = cleanEnv(process.env.MONGODB_URI);
const mongoDb = cleanEnv(process.env.MONGODB_DB) || "moviex";
const TARGET_MOVIES = Number(process.env.MASSIVE_MOVIE_TARGET || 330);
const TARGET_THEATERS = Number(process.env.MASSIVE_THEATER_TARGET || 4800);
const TARGET_SHOWS = Number(process.env.MASSIVE_SHOW_TARGET || 1_500_000);
const TARGET_USERS = Number(process.env.MASSIVE_USER_TARGET || 1500);
const TARGET_SUBSCRIBERS = Number(process.env.MASSIVE_SUBSCRIBER_TARGET || 500);
const SHOWS_ONLY = process.env.MASSIVE_SHOWS_ONLY === "true";
const MOVIE_BATCH_SIZE = 20;
const WRITE_BATCH_SIZE = 1000;
const SHOW_BATCH_SIZE = 10000;
const USER_AGENT = "BookMyScreenMassiveSeed/1.0 (local data seed)";
const WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php";
const WIKIDATA_SPARQL = "https://query.wikidata.org/sparql";
const HTTP_IMAGE_PATTERN = /^https?:\/\//i;
const uploadCache = new Map();

if (mongoUri.startsWith("mongodb+srv://")) {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
}

const priorityMoviePages = [
  "Interstellar (film)",
  "Dune: Part Two",
  "Oppenheimer (film)",
  "Spider-Man: Across the Spider-Verse",
  "Inception",
  "The Batman (film)",
  "Barbie (film)",
  "Joker (2019 film)",
  "Jawan (film)",
  "Pathaan (film)",
  "Animal (2023 Indian film)",
  "Fighter (2024 film)",
  "Stree 2",
  "12th Fail",
  "Drishyam 2 (2022 film)",
  "Brahmastra: Part One - Shiva",
  "Tumbbad",
  "Andhadhun",
  "RRR",
  "K.G.F: Chapter 2",
  "Kantara (film)",
  "Pushpa: The Rise",
  "Kalki 2898 AD",
  "Vikram (2022 film)",
  "Leo (2023 Indian film)",
  "Maharaja (2024 film)",
  "Manjummel Boys",
  "Aavesham (2024 film)",
  "Premalu",
  "Chhaava",
  "Avatar: The Way of Water",
  "Top Gun: Maverick",
  "Mission: Impossible - Dead Reckoning Part One",
  "John Wick: Chapter 4",
  "Godzilla x Kong: The New Empire",
  "Inside Out 2",
  "Deadpool & Wolverine",
  "Guardians of the Galaxy Vol. 3",
  "The Flash (film)",
  "Wonka (film)",
  "The Marvels",
  "Napoleon (2023 film)",
  "Poor Things (film)",
  "Killers of the Flower Moon (film)",
  "Civil War (film)",
  "Furiosa: A Mad Max Saga",
  "A Quiet Place: Day One",
  "Twisters (2024 film)",
  "Despicable Me 4",
  "Kingdom of the Planet of the Apes",
  "Bad Boys: Ride or Die",
  "Alien: Romulus",
  "Joker: Folie a Deux",
  "Gladiator II",
  "Moana 2",
  "Wicked (2024 film)",
];

const movieCategories = [
  "2026 films",
  "2025 films",
  "2024 films",
  "2023 films",
  "2022 films",
  "2021 films",
  "2020 films",
  "2019 films",
  "2018 films",
  "2025 Indian films",
  "2024 Indian films",
  "2023 Indian films",
  "2024 Hindi-language films",
  "2023 Hindi-language films",
  "2024 Tamil-language films",
  "2024 Telugu-language films",
];

const actorFallbackPages = [
  "Shah Rukh Khan",
  "Deepika Padukone",
  "Ranbir Kapoor",
  "Alia Bhatt",
  "Ayushmann Khurrana",
  "Sara Ali Khan",
  "Vicky Kaushal",
  "Kiara Advani",
  "Rajkummar Rao",
  "Kriti Sanon",
  "Prabhas",
  "Allu Arjun",
  "N. T. Rama Rao Jr.",
  "Ram Charan",
  "Yash (actor)",
  "Rishab Shetty",
  "Vijay Sethupathi",
  "Fahadh Faasil",
  "Mammootty",
  "Mohanlal",
  "Matthew McConaughey",
  "Anne Hathaway",
  "Jessica Chastain",
  "Timothee Chalamet",
  "Zendaya",
  "Rebecca Ferguson",
  "Cillian Murphy",
  "Emily Blunt",
  "Robert Downey Jr.",
  "Margot Robbie",
  "Ryan Gosling",
  "Leonardo DiCaprio",
  "Robert Pattinson",
  "Zoe Kravitz",
  "Joaquin Phoenix",
  "Florence Pugh",
  "Tom Cruise",
  "Keanu Reeves",
  "Chris Pratt",
  "Brie Larson",
];

const theaterBrands = [
  { name: "PVR INOX", logo: "PI", amenities: ["IMAX", "Recliners", "M-Ticket", "F&B"] },
  { name: "Cinepolis", logo: "CP", amenities: ["Dolby Atmos", "Parking", "F&B"] },
  { name: "MovieMax", logo: "MM", amenities: ["Laser", "M-Ticket", "Snacks"] },
  { name: "Miraj Cinemas", logo: "MC", amenities: ["Dolby 7.1", "Parking", "M-Ticket"] },
  { name: "Carnival Cinemas", logo: "CC", amenities: ["Family seats", "F&B", "Parking"] },
  { name: "INOX", logo: "IX", amenities: ["Recliners", "Dolby 7.1", "M-Ticket"] },
  { name: "Rajhans Cinemas", logo: "RC", amenities: ["Laser", "Snacks", "M-Ticket"] },
  { name: "Mukta A2", logo: "MA", amenities: ["2K Projection", "F&B", "Parking"] },
  { name: "Wave Cinemas", logo: "WC", amenities: ["Dolby Atmos", "M-Ticket", "Food Court"] },
  { name: "City Pride", logo: "CP", amenities: ["Premium seats", "Snacks", "Parking"] },
];

const areaNames = [
  "Civil Lines",
  "City Centre",
  "Mall Road",
  "Ring Road",
  "MG Road",
  "Station Road",
  "Vijay Nagar",
  "Model Town",
  "Lake View",
  "Airport Road",
  "Old City",
  "High Street",
  "Riverside",
  "Central Plaza",
  "Nexus Mall",
  "Phoenix Market",
];

const firstNames = [
  "Aarav",
  "Vivaan",
  "Aditya",
  "Vihaan",
  "Arjun",
  "Sai",
  "Reyansh",
  "Ayaan",
  "Krishna",
  "Ishaan",
  "Ananya",
  "Diya",
  "Aadhya",
  "Kavya",
  "Anika",
  "Riya",
  "Sara",
  "Meera",
  "Ira",
  "Tara",
  "Kabir",
  "Rohan",
  "Karan",
  "Nikhil",
  "Manish",
  "Priya",
  "Pooja",
  "Neha",
  "Aditi",
  "Sakshi",
];

const lastNames = [
  "Sharma",
  "Verma",
  "Gupta",
  "Mehta",
  "Patel",
  "Singh",
  "Khan",
  "Jain",
  "Rao",
  "Nair",
  "Reddy",
  "Iyer",
  "Das",
  "Yadav",
  "Mishra",
  "Chauhan",
  "Bansal",
  "Malhotra",
  "Joshi",
  "Kapoor",
];

const reviewTemplates = [
  [
    10,
    ["#GreatActing", "#Blockbuster"],
    "Superb big-screen experience with a strong crowd response.",
  ],
  [
    9,
    ["#Wellmade", "#AwesomeStory"],
    "Clean storytelling, strong performances and worth booking again.",
  ],
  [8, ["#Rocking"], "Good theatrical energy with a few slow patches but still enjoyable."],
];

if (!mongoUri) {
  console.error("MONGODB_URI is missing. Add it to .env before running this script.");
  process.exit(1);
}

if (!isCloudinaryConfigured()) {
  console.error("Cloudinary is not configured. Add CLOUDINARY_URL or cloud/api credentials first.");
  process.exit(1);
}

await mongoose.connect(mongoUri, {
  dbName: mongoDb,
  serverSelectionTimeoutMS: 15000,
  maxPoolSize: 20,
});

console.log(`Connected to MongoDB database "${mongoose.connection.name}".`);

if (SHOWS_ONLY) {
  await runShowsOnly();
  await mongoose.disconnect();
  process.exit(0);
}

await ensureMovieTextIndex();

const movies = await buildMovieInventory();
const movieIds = movies.map((movie) => movie.id);
const theaters = buildTheaterInventory(movieIds);
const users = buildSyntheticUsers(theaters);

await upsertInBatches(
  Movie,
  movies.map((movie, index) => ({
    updateOne: {
      filter: { id: movie.id },
      update: { $set: { ...movie, sortOrder: index + 1 } },
      upsert: true,
    },
  })),
  "movies",
);

await upsertInBatches(
  Theater,
  theaters.map((theater) => ({
    updateOne: {
      filter: { id: theater.id },
      update: { $set: theater },
      upsert: true,
    },
  })),
  "theaters",
);

await upsertInBatches(User, users, "users");
await upsertInBatches(Review, buildReviewOperations(movies), "reviews");
await upsertInBatches(Subscriber, buildSubscriberOperations(), "subscribers");

const deletedBookings = await Booking.deleteMany({});
console.log(
  `Deleted ${deletedBookings.deletedCount} bookings. Booking collection will stay empty.`,
);

await rebuildMassiveShows(theaters, movies);

const counts = {
  movies: await Movie.countDocuments(),
  theaters: await Theater.countDocuments(),
  shows: await Show.countDocuments(),
  reviews: await Review.countDocuments(),
  users: await User.countDocuments(),
  bookings: await Booking.countDocuments(),
  subscribers: await Subscriber.countDocuments(),
};

console.log("Massive MongoDB seed complete:", counts);
await mongoose.disconnect();

async function runShowsOnly() {
  const movies = await Movie.find({}).sort({ sortOrder: 1, title: 1 }).limit(TARGET_MOVIES).lean();
  const theaters = await Theater.find({ approved: true })
    .sort({ city: 1, name: 1 })
    .limit(TARGET_THEATERS)
    .lean();
  if (movies.length < 1 || theaters.length < 1) {
    throw new Error("Movies/theaters are missing. Run the full massive seed before shows-only mode.");
  }

  const deletedBookings = await Booking.deleteMany({});
  console.log(`Deleted ${deletedBookings.deletedCount} bookings. Booking collection will stay empty.`);
  await rebuildMassiveShows(theaters, movies);
  const counts = {
    movies: await Movie.countDocuments(),
    theaters: await Theater.countDocuments(),
    shows: await Show.countDocuments(),
    reviews: await Review.countDocuments(),
    users: await User.countDocuments(),
    bookings: await Booking.countDocuments(),
    subscribers: await Subscriber.countDocuments(),
  };
  console.log("Massive MongoDB shows-only seed complete:", counts);
}

async function buildMovieInventory() {
  console.log(`Discovering real movie pages for ${TARGET_MOVIES} movies...`);
  const existingMovies = await Movie.find({}).lean();
  const discoveryTarget = TARGET_MOVIES >= 100 ? TARGET_MOVIES + 80 : Math.max(25, TARGET_MOVIES);
  const categoryTitles = await fetchCategoryTitles(
    movieCategories,
    Math.max(TARGET_MOVIES * 8, 400),
  );
  const pageTitles = unique([...priorityMoviePages, ...categoryTitles]).slice(
    0,
    Math.max(TARGET_MOVIES * 10, 450),
  );
  const pageInfo = await fetchMoviePageInfo(pageTitles, discoveryTarget);
  const baseMovies = catalogMovies
    .map((movie) => normalizeCatalogMovie(movie))
    .concat(existingMovies.map((movie) => normalizeCatalogMovie(movie)));
  const actorFallback = await fetchFallbackActors();
  const castByArticle = await fetchCastForMoviePages(pageInfo.map((movie) => movie.wikiTitle));

  const merged = new Map();
  for (const movie of baseMovies) {
    merged.set(movie.id, movie);
  }

  for (const movie of pageInfo) {
    const id = slugify(movie.title);
    if (!id || merged.has(id)) continue;
    merged.set(id, buildMovieFromPage(movie));
    if (merged.size >= TARGET_MOVIES + 20) break;
  }

  let selected = Array.from(merged.values()).slice(0, TARGET_MOVIES);
  selected = selected.map((movie, index) => {
    const titleMatch = pageInfo.find(
      (page) => slugify(page.title) === movie.id || page.title === movie.title,
    );
    const articleUrl = titleMatch ? articleUrlForTitle(titleMatch.wikiTitle) : "";
    const cast = castByArticle.get(articleUrl) || [];
    return {
      ...movie,
      wikiTitle: titleMatch?.wikiTitle || movie.wikiTitle || "",
      cast: withCastImages(cast.length ? cast : movie.cast, actorFallback, index),
    };
  });

  console.log(`Uploading ${selected.length} movie posters and cast images to Cloudinary...`);
  selected = await mapLimit(selected, 1, async (movie, index) => {
    console.log(`Cloudinary movie media start ${index + 1}/${selected.length}: ${movie.id}`);
    const poster = await uploadStable(movie.poster, "bookmyscreen/movies/posters", movie.id);
    const backdropSource = movie.backdrop || movie.poster;
    const backdrop =
      backdropSource === movie.poster
        ? poster
        : await uploadStable(
            backdropSource,
            "bookmyscreen/movies/backdrops",
            `${movie.id}-backdrop`,
          );
    const cast = await mapLimit(movie.cast.slice(0, 4), 1, async (member, castIndex) => ({
      ...member,
      avatar: await uploadAvatarWithFallback(member, actorFallback, movie.id, castIndex),
    }));
    if ((index + 1) % 25 === 0 || index + 1 === selected.length) {
      console.log(`Cloudinary movie media ${index + 1}/${selected.length}`);
    }
    return { ...movie, poster, backdrop, cast };
  });
  assertCloudinaryMovieMedia(selected);

  return selected.map((movie) => {
    const { wikiTitle, ...persisted } = movie;
    return persisted;
  });
}

async function fetchCategoryTitles(categories, maxTitles) {
  const titles = [];
  for (const category of categories) {
    let cmcontinue = "";
    do {
      const params = new URLSearchParams({
        action: "query",
        format: "json",
        list: "categorymembers",
        cmtitle: `Category:${category}`,
        cmnamespace: "0",
        cmlimit: "500",
        origin: "*",
      });
      if (cmcontinue) params.set("cmcontinue", cmcontinue);
      const payload = await fetchJson(`${WIKIPEDIA_API}?${params}`);
      for (const item of payload.query?.categorymembers || []) {
        if (isUsefulMovieTitle(item.title)) titles.push(item.title);
      }
      cmcontinue = payload.continue?.cmcontinue || "";
      await wait(350);
    } while (cmcontinue && titles.length < maxTitles);
    if (titles.length >= maxTitles) break;
  }
  return unique(titles);
}

async function fetchMoviePageInfo(titles, target) {
  const movies = [];
  const seen = new Set();
  for (let index = 0; index < titles.length && movies.length < target; index += MOVIE_BATCH_SIZE) {
    const batch = titles.slice(index, index + MOVIE_BATCH_SIZE);
    const params = new URLSearchParams({
      action: "query",
      format: "json",
      prop: "images|extracts",
      imlimit: "50",
      exintro: "1",
      explaintext: "1",
      redirects: "1",
      titles: batch.join("|"),
      origin: "*",
    });
    const payload = await fetchJson(`${WIKIPEDIA_API}?${params}`);
    const pages = Object.values(payload.query?.pages || {});
    const imageFiles = new Map();

    for (const page of pages) {
      const file = pickPosterFile(page.images || [], page.title);
      if (file) imageFiles.set(page.pageid, file);
    }

    const fileUrls = await fetchImageFileUrls(Array.from(new Set(imageFiles.values())));
    for (const page of pages) {
      const file = imageFiles.get(page.pageid);
      const poster = file ? fileUrls.get(file) : "";
      const title = cleanMovieTitle(page.title);
      if (!poster || !title || seen.has(slugify(title))) continue;
      const extract = cleanDescription(page.extract, title);
      if (!extract) continue;
      seen.add(slugify(title));
      movies.push({
        title,
        wikiTitle: page.title,
        poster,
        backdrop: poster,
        description: extract,
        year: inferYear(page.title, extract),
      });
      if (movies.length >= target) break;
    }
    console.log(`Movie page scan: ${movies.length}/${target}`);
    await wait(1200);
  }

  if (movies.length < TARGET_MOVIES) {
    throw new Error(`Only found ${movies.length} movie pages with poster images.`);
  }
  return movies;
}

async function fetchImageFileUrls(fileTitles) {
  const urls = new Map();
  for (let index = 0; index < fileTitles.length; index += 25) {
    const params = new URLSearchParams({
      action: "query",
      format: "json",
      prop: "imageinfo",
      iiprop: "url",
      iiurlwidth: "900",
      titles: fileTitles.slice(index, index + 25).join("|"),
      origin: "*",
    });
    const payload = await fetchJson(`${WIKIPEDIA_API}?${params}`);
    for (const page of Object.values(payload.query?.pages || {})) {
      const info = page.imageinfo?.[0];
      if (page.title && (info?.thumburl || info?.url)) {
        urls.set(page.title, info.thumburl || info.url);
      }
    }
    await wait(400);
  }
  return urls;
}

async function fetchCastForMoviePages(wikiTitles) {
  const castByArticle = new Map();
  const articles = unique(wikiTitles.filter(Boolean).map(articleUrlForTitle));
  for (let index = 0; index < articles.length; index += 35) {
    const values = articles
      .slice(index, index + 35)
      .map((article) => `<${article}>`)
      .join(" ");
    const query = `
      SELECT ?article ?castLabel ?castImage WHERE {
        VALUES ?article { ${values} }
        ?article schema:about ?film.
        ?film wdt:P161 ?cast.
        ?cast wdt:P18 ?castImage.
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
      }
      LIMIT 900
    `;
    try {
      const payload = await fetchJson(
        `${WIKIDATA_SPARQL}?format=json&query=${encodeURIComponent(query)}`,
      );
      for (const row of payload.results?.bindings || []) {
        const article = row.article?.value;
        const name = row.castLabel?.value;
        const image = row.castImage?.value;
        if (!article || !name || !image) continue;
        const cast = castByArticle.get(article) || [];
        if (!cast.some((member) => member.name === name)) {
          cast.push({ name, role: "Actor", avatar: image });
        }
        castByArticle.set(article, cast.slice(0, 6));
      }
    } catch (error) {
      console.warn(`Cast lookup failed for batch ${index / 35 + 1}: ${error.message}`);
    }
    console.log(`Cast lookup: ${Math.min(index + 35, articles.length)}/${articles.length}`);
  }
  await resolveCommonsCastImages(castByArticle);
  return castByArticle;
}

async function resolveCommonsCastImages(castByArticle) {
  const fileNames = unique(
    Array.from(castByArticle.values())
      .flat()
      .map((member) => commonsFileName(member.avatar))
      .filter(Boolean),
  );
  const urlByFile = new Map();
  for (let index = 0; index < fileNames.length; index += 50) {
    const files = fileNames.slice(index, index + 50);
    const params = new URLSearchParams({
      action: "query",
      format: "json",
      prop: "imageinfo",
      iiprop: "url",
      iiurlwidth: "500",
      titles: files.map((file) => `File:${file}`).join("|"),
      origin: "*",
    });
    try {
      const payload = await fetchJson(`${WIKIPEDIA_API}?${params}`);
      for (const page of Object.values(payload.query?.pages || {})) {
        const info = page.imageinfo?.[0];
        const title = String(page.title || "").replace(/^File:/i, "");
        if (title && (info?.thumburl || info?.url)) {
          urlByFile.set(title, info.thumburl || info.url);
        }
      }
    } catch (error) {
      console.warn(`Commons cast image lookup failed: ${error.message}`);
    }
    await wait(500);
  }

  for (const cast of castByArticle.values()) {
    for (const member of cast) {
      const fileName = commonsFileName(member.avatar);
      if (fileName && urlByFile.has(fileName)) member.avatar = urlByFile.get(fileName);
    }
  }
}

async function fetchFallbackActors() {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    prop: "pageimages",
    piprop: "thumbnail|original",
    pithumbsize: "500",
    titles: actorFallbackPages.join("|"),
    redirects: "1",
    origin: "*",
  });
  const payload = await fetchJson(`${WIKIPEDIA_API}?${params}`);
  return Object.values(payload.query?.pages || {})
    .map((page) => ({
      name: cleanMovieTitle(page.title),
      role: "Actor",
      avatar: page.thumbnail?.source || page.original?.source || "",
    }))
    .filter((actor) => actor.name && actor.avatar);
}

function buildMovieFromPage(page) {
  const genres = inferGenres(page.description);
  const year = page.year || 2024;
  return {
    id: slugify(page.title),
    title: page.title,
    poster: page.poster,
    backdrop: page.backdrop || page.poster,
    genres,
    language: inferLanguage(page.description),
    duration: durationFor(page.title),
    rating: ratingFor(page.title),
    votes: votesFor(page.title),
    releaseDate: releaseDateFor(year, page.title),
    description: page.description,
    cast: [],
    format: formatFor(genres),
    certificate: certificateFor(genres),
    wikiTitle: page.wikiTitle,
  };
}

function normalizeCatalogMovie(movie) {
  return {
    id: movie.id || slugify(movie.title),
    title: movie.title,
    poster: movie.poster,
    backdrop: movie.backdrop || movie.poster,
    genres: toList(movie.genres, ["Drama"]),
    language: movie.language || "English",
    duration: movie.duration || "2h 15m",
    rating: Number(movie.rating || 8),
    votes: String(movie.votes || "100K"),
    releaseDate: movie.releaseDate || "Coming soon",
    description: movie.description || `${movie.title} is listed for movie ticket booking.`,
    cast: toList(movie.cast).map((member) => ({
      name: member.name || "Cast Member",
      role: member.role || "Actor",
      avatar: member.avatar || "",
    })),
    format: toList(movie.format, ["2D"]),
    certificate: movie.certificate || "UA",
  };
}

function buildTheaterInventory(movieIds) {
  const theaters = catalogTheaters.map((theater, index) => enrichTheater(theater, index, movieIds));
  for (let index = theaters.length; index < TARGET_THEATERS; index += 1) {
    const cityOption = SEARCHABLE_CITY_OPTIONS[index % SEARCHABLE_CITY_OPTIONS.length];
    const brand = theaterBrands[index % theaterBrands.length];
    const area = areaNames[index % areaNames.length];
    const city = cityOption.city;
    const state = stripTerritorySuffix(cityOption.state);
    const nameSuffix = Math.floor(index / SEARCHABLE_CITY_OPTIONS.length) + 1;
    theaters.push(
      enrichTheater(
        {
          id: `mass-${slugify(brand.name)}-${slugify(city)}-${nameSuffix}`,
          name: `${brand.name}: ${area}${nameSuffix > 1 ? ` ${nameSuffix}` : ""}`,
          city,
          area,
          address: `${area}, ${city}${state ? `, ${state}` : ""}`,
          distance: `${(1.2 + (index % 12) * 0.55).toFixed(1)} km`,
          amenities: brand.amenities,
          logoText: brand.logo,
          showPlan: buildShowPlan(index),
        },
        index,
        movieIds,
      ),
    );
  }
  return theaters.slice(0, TARGET_THEATERS);
}

function enrichTheater(theater, index, movieIds) {
  const showPlan = normalizeShowPlan(theater.showPlan, index);
  const movieWindow = rotatedSlice(movieIds, index * 7, Math.min(45, movieIds.length));
  return {
    id: theater.id,
    name: theater.name,
    city: theater.city || "Jabalpur",
    area: theater.area || "City Centre",
    address: theater.address || `${theater.area || "City Centre"}, ${theater.city || "Jabalpur"}`,
    distance: theater.distance || `${(2.2 + (index % 8) * 0.5).toFixed(1)} km`,
    amenities: toList(theater.amenities, ["M-Ticket", "F&B", "Parking"]),
    logoText: theater.logoText || initials(theater.name),
    movieIds: movieWindow,
    showPlan,
    contact: `+91 9${String(800000000 + index * 137).slice(0, 9)}`,
    manager: `${initials(theater.name)} Operations`,
    cancellationPolicy:
      index % 4 === 0 ? "Cancellation available till show start" : "Non-cancellable",
    foodMenu: [],
    staff: [],
    refundCases: [],
    scanStats: [],
    approved: true,
    screens: buildScreens(theater, showPlan, index),
  };
}

function buildShowPlan(index) {
  const formats = ["2D", "IMAX", "Dolby 7.1", "Laser", "4DX"];
  return showTimes.map((time, itemIndex) => ({
    time,
    format: formats[(index + itemIndex) % formats.length],
    status: (index + itemIndex) % 6 === 0 ? "fast" : "ok",
    cancellable: (index + itemIndex) % 4 !== 0,
    screen: itemIndex % 2 === 0 ? "Screen 1" : `Audi ${(itemIndex % 3) + 1}`,
  }));
}

function normalizeShowPlan(showPlan, index) {
  const base = Array.isArray(showPlan) && showPlan.length ? showPlan : buildShowPlan(index);
  return base.map((plan, itemIndex) => ({
    time: typeof plan === "string" ? plan : plan.time || showTimes[itemIndex % showTimes.length],
    format: typeof plan === "string" ? "2D" : plan.format || "2D",
    status: typeof plan === "string" ? "ok" : plan.status || "ok",
    cancellable: typeof plan === "string" ? true : plan.cancellable !== false,
    screen: typeof plan === "string" ? "Screen 1" : plan.screen || "Screen 1",
  }));
}

function buildScreens(theater, showPlan, index) {
  const screenNames = unique(showPlan.map((plan) => plan.screen).filter(Boolean));
  return screenNames.map((name, screenIndex) => {
    const cols = screenIndex % 2 === 0 ? 14 : 12;
    const rows = screenIndex % 2 === 0 ? 10 : 9;
    return {
      id: `${theater.id}-${slugify(name)}`,
      name,
      type: screenIndex === 0 ? "Premium" : screenIndex === 1 ? "Luxe" : "Regular",
      totalSeats: rows * cols,
      occupancy: 25 + ((index + screenIndex * 7) % 65),
      seatLayout: {
        rows: buildRows(rows),
        cols,
        rowCount: rows,
        seatsPerRow: cols,
        platinumRows: 2,
        silverRows: 2,
        vipRows: 2,
        aisleAfter: Math.floor(cols / 2),
        blockedSeats: screenIndex % 3 === 0 ? ["A1", "A2"] : [],
      },
    };
  });
}

async function rebuildMassiveShows(theaters, movies) {
  console.log("Removing old generated shows without ownerId...");
  const deleted = await Show.deleteMany({ ownerId: { $exists: false } });
  console.log(`Deleted ${deleted.deletedCount} generated shows.`);
  await dropMassiveShowIndexes();

  let batch = [];
  let inserted = 0;
  for (let index = 0; index < TARGET_SHOWS; index += 1) {
    const theater = theaters[(index * 37) % theaters.length];
    const movie = movies[(index * 17) % movies.length];
    const plan = theater.showPlan[index % theater.showPlan.length];
    const date = showDate(index);
    batch.push({
      id: `s${(index + 1).toString(36)}`,
      movieId: movie.id,
      theaterId: theater.id,
      screenId: "s1",
      date,
      startTime: plan.time,
    });

    if (batch.length >= SHOW_BATCH_SIZE) {
      await Show.collection.insertMany(batch, { ordered: false });
      inserted += batch.length;
      batch = [];
      if (inserted % 100000 === 0) console.log(`Inserted ${inserted}/${TARGET_SHOWS} shows...`);
    }
  }
  if (batch.length) {
    await Show.collection.insertMany(batch, { ordered: false });
    inserted += batch.length;
  }
  console.log(`Inserted ${inserted} shows.`);
}

async function dropMassiveShowIndexes() {
  const keepIndexes = new Set(["_id_"]);
  const indexes = await Show.collection.indexes();
  for (const index of indexes) {
    if (keepIndexes.has(index.name)) continue;
    try {
      await Show.collection.dropIndex(index.name);
      console.log(`Dropped show index ${index.name} for massive seed storage.`);
    } catch (error) {
      console.warn(`Could not drop show index ${index.name}: ${error.message}`);
    }
  }
}

function buildSyntheticUsers(theaters) {
  const operations = [];
  const customerCount = Math.max(0, TARGET_USERS - Math.min(500, Math.floor(TARGET_USERS * 0.25)));
  for (let index = 0; index < customerCount; index += 1) {
    const first = firstNames[index % firstNames.length];
    const last = lastNames[Math.floor(index / firstNames.length) % lastNames.length];
    const serial = String(index + 1).padStart(5, "0");
    const blocked = index % 47 === 0;
    const user = {
      name: `${first} ${last}`,
      email: `${slugify(first)}.${slugify(last)}.${serial}@bookmyscreen.local`,
      role: "user",
      verified: true,
      blocked,
      status: blocked ? "Blocked" : "Active",
      ownerStatus: "Approved",
    };
    operations.push(userOperation(user));
  }

  const ownerCount = TARGET_USERS - customerCount;
  for (let index = 0; index < ownerCount; index += 1) {
    const theater = theaters[index % theaters.length];
    const first = firstNames[(index * 3) % firstNames.length];
    const last = lastNames[(index * 5) % lastNames.length];
    const serial = String(index + 1).padStart(4, "0");
    operations.push(
      userOperation({
        name: `${first} ${last}`,
        email: `partner.${slugify(theater.city)}.${serial}@bookmyscreen.local`,
        role: "theater-owner",
        verified: true,
        blocked: false,
        status: "Active",
        ownerStatus: "Approved",
        ownerApplication: {
          id: `mass-owner-${theater.id}`,
          theaterName: theater.name,
          companyName: `${theater.name} Cinemas LLP`,
          city: theater.city,
          area: theater.area,
          address: theater.address,
          contact: theater.contact,
          screens: theater.screens.length || 2,
          gstNumber: `GST${String(index + 1).padStart(6, "0")}BMS`,
          documents: "GST, PAN, fire NOC, theatre license",
          message: "Approved synthetic cinema partner account for seed data.",
          submittedAt: new Date(Date.now() - (index + 15) * 86400000),
          reviewedAt: new Date(Date.now() - (index + 4) * 86400000),
          reviewedBy: "massive-seed",
        },
      }),
    );
  }
  return operations;
}

function buildReviewOperations(movies) {
  return movies.flatMap((movie, movieIndex) =>
    reviewTemplates.map(([rating, tags, text], index) => {
      const first = firstNames[(movieIndex + index) % firstNames.length];
      const last = lastNames[(movieIndex * 2 + index) % lastNames.length];
      const review = {
        movieId: movie.id,
        userId: `mass-review-${movie.id}-${index + 1}`,
        userEmail: `${slugify(first)}.${slugify(last)}.${movie.id}@bookmyscreen.local`,
        userName: `${first} ${last}`,
        rating,
        text,
        tags,
        helpfulCount: 40 + ((movieIndex + index) % 260),
        verifiedBooking: false,
        status: "published",
        source: "seed",
      };
      return {
        updateOne: {
          filter: { movieId: review.movieId, userId: review.userId },
          update: { $set: review },
          upsert: true,
        },
      };
    }),
  );
}

function buildSubscriberOperations() {
  return Array.from({ length: TARGET_SUBSCRIBERS }, (_, index) => {
    const first = firstNames[index % firstNames.length];
    const last = lastNames[Math.floor(index / firstNames.length) % lastNames.length];
    const email = `subscriber.${slugify(first)}.${slugify(last)}.${String(index + 1).padStart(4, "0")}@bookmyscreen.local`;
    return {
      updateOne: {
        filter: { email },
        update: { $set: { email, source: index % 2 === 0 ? "homepage" : "launch-alerts" } },
        upsert: true,
      },
    };
  });
}

function userOperation(user) {
  return {
    updateOne: {
      filter: { email: user.email },
      update: { $set: user },
      upsert: true,
    },
  };
}

async function upsertInBatches(model, operations, label) {
  for (let index = 0; index < operations.length; index += WRITE_BATCH_SIZE) {
    await model.bulkWrite(operations.slice(index, index + WRITE_BATCH_SIZE), { ordered: false });
  }
  console.log(`Upserted ${operations.length} ${label}.`);
}

async function uploadStable(url, folder, publicId, options = {}) {
  if (!url || isCloudinaryImageUrl(url)) return url || "";
  if (HTTP_IMAGE_PATTERN.test(url) && process.env.MASSIVE_UPLOAD_REMOTE_IMAGES !== "true") {
    return cloudinaryFetchUrl(url);
  }
  const cacheKey = `${folder}:${url}`;
  if (uploadCache.has(cacheKey)) return uploadCache.get(cacheKey);

  const promise = (async () => {
    const retryDelays = [0, 30000, 60000, 120000].slice(0, options.maxAttempts || 1);
    let lastError;
    for (let attempt = 0; attempt < retryDelays.length; attempt += 1) {
      if (retryDelays[attempt]) await wait(retryDelays[attempt]);
      try {
        const uploaded = await withTimeout(
          ensureCloudinaryImageUrl(url, {
            folder,
            publicId,
            tags: ["massive-seed"],
          }),
          70000,
          `Timed out uploading ${publicId}.`,
        );
        await wait(250);
        return uploaded;
      } catch (error) {
        lastError = error;
        console.warn(
          `Cloudinary upload retry ${attempt + 1}/${retryDelays.length} failed for ${publicId}: ${error.message}`,
        );
      }
    }
    if (HTTP_IMAGE_PATTERN.test(url)) {
      console.warn(`Using Cloudinary fetch URL for ${publicId}: ${lastError?.message}`);
      return cloudinaryFetchUrl(url);
    }
    throw new Error(`Cloudinary upload failed for ${publicId}: ${lastError?.message}`);
  })();

  uploadCache.set(cacheKey, promise);
  try {
    const uploaded = await promise;
    uploadCache.set(cacheKey, uploaded);
    return uploaded;
  } catch (error) {
    uploadCache.delete(cacheKey);
    throw error;
  }
}

async function uploadAvatarWithFallback(member, fallbackActors, movieId, castIndex) {
  const primaryId = `${movieId}-${slugify(member.name) || castIndex + 1}`;
  try {
    return await uploadStable(member.avatar, "bookmyscreen/cast", primaryId, { maxAttempts: 2 });
  } catch (error) {
    console.warn(`Using fallback avatar for ${primaryId}: ${error.message}`);
  }

  for (let offset = 0; offset < fallbackActors.length; offset += 1) {
    const fallback = fallbackActors[(castIndex + offset) % fallbackActors.length];
    if (!fallback?.avatar || fallback.name === member.name) continue;
    try {
      return await uploadStable(
        fallback.avatar,
        "bookmyscreen/cast",
        `${primaryId}-fallback-${slugify(fallback.name)}`,
        { maxAttempts: 2 },
      );
    } catch (error) {
      console.warn(`Fallback avatar failed for ${primaryId}: ${error.message}`);
    }
  }

  return uploadStable(tinyPngDataUri(), "bookmyscreen/cast", `${primaryId}-fallback`, {
    maxAttempts: 1,
  });
}

function assertCloudinaryMovieMedia(movies) {
  const failures = [];
  for (const movie of movies) {
    if (!isCloudinaryImageUrl(movie.poster)) failures.push(`${movie.id}:poster`);
    if (!isCloudinaryImageUrl(movie.backdrop)) failures.push(`${movie.id}:backdrop`);
    for (const member of movie.cast || []) {
      if (!isCloudinaryImageUrl(member.avatar)) {
        failures.push(`${movie.id}:cast:${member.name}`);
      }
    }
  }
  if (failures.length) {
    throw new Error(
      `Movie media still has non-Cloudinary URLs: ${failures.slice(0, 12).join(", ")}`,
    );
  }
}

async function fetchJson(url) {
  const retryDelays = [0, 2500, 8000, 20000, 60000, 120000];
  let lastResponse;
  let lastError;
  for (const delay of retryDelays) {
    if (delay) await wait(delay);
    try {
      lastResponse = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": USER_AGENT,
        },
      });
    } catch (error) {
      lastError = error;
      continue;
    }
    if (lastResponse.ok) return lastResponse.json();
    if (![408, 425, 429, 500, 502, 503, 504].includes(lastResponse.status)) break;
  }
  if (lastResponse) {
    throw new Error(`Fetch failed ${lastResponse.status} ${lastResponse.statusText}`);
  }
  throw new Error(`Fetch failed: ${lastError?.message || "network error"}`);
}

async function mapLimit(items, limit, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIndex < items.length) {
      const current = nextIndex;
      nextIndex += 1;
      results[current] = await mapper(items[current], current);
    }
  });
  await Promise.all(workers);
  return results;
}

function pickPosterFile(images, title) {
  const usable = images
    .map((image) => image.title)
    .filter((file) => file && !/\.(svg|ogg|webm)$/i.test(file))
    .filter((file) => !/flag|icon|logo|star|edit|question|commons-logo/i.test(file));
  const normalizedTitle = cleanMovieTitle(title)
    .toLowerCase()
    .replace(/^the\s+/, "");
  return (
    usable.find((file) => /poster|theatrical|release|cover/i.test(file)) ||
    usable.find((file) => file.toLowerCase().includes(normalizedTitle.slice(0, 12))) ||
    ""
  );
}

function withCastImages(cast, fallbackActors, seed) {
  const prepared = toList(cast)
    .map((member) => ({
      name: cleanMovieTitle(member.name || ""),
      role: member.role || "Actor",
      avatar: member.avatar || "",
    }))
    .filter((member) => member.name && member.avatar);

  let cursor = seed * 3;
  while (prepared.length < 4 && fallbackActors.length) {
    const actor = fallbackActors[cursor % fallbackActors.length];
    if (!prepared.some((member) => member.name === actor.name)) {
      prepared.push(actor);
    }
    cursor += 1;
  }
  return prepared.slice(0, 4);
}

function inferGenres(description) {
  const text = String(description || "").toLowerCase();
  const genres = [];
  if (/space|future|scientist|technology|alien|planet|robot/.test(text)) genres.push("Sci-Fi");
  if (/murder|crime|detective|police|gang|killer/.test(text)) genres.push("Crime");
  if (/war|soldier|army|battle|mission|spy/.test(text)) genres.push("Action");
  if (/love|romance|relationship|marriage/.test(text)) genres.push("Romance");
  if (/comic|comedy|funny|satire/.test(text)) genres.push("Comedy");
  if (/horror|ghost|supernatural|terror/.test(text)) genres.push("Horror");
  if (/animated|animation/.test(text)) genres.push("Animation");
  if (/documentary/.test(text)) genres.push("Documentary");
  if (/biographical|biography|life of/.test(text)) genres.push("Biography");
  if (!genres.length) genres.push("Drama");
  return unique(genres).slice(0, 3);
}

function inferLanguage(description) {
  const text = String(description || "").toLowerCase();
  if (/hindi-language|bollywood|indian hindi/.test(text)) return "Hindi";
  if (/tamil-language/.test(text)) return "Tamil";
  if (/telugu-language/.test(text)) return "Telugu";
  if (/malayalam-language/.test(text)) return "Malayalam";
  if (/kannada-language/.test(text)) return "Kannada";
  if (/japanese-language/.test(text)) return "Japanese";
  if (/korean-language/.test(text)) return "Korean";
  return "English";
}

function durationFor(title) {
  const value = hashNumber(title, 64);
  const minutes = 96 + value;
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
}

function ratingFor(title) {
  return Number((7.1 + hashNumber(title, 23) / 10).toFixed(1));
}

function votesFor(title) {
  const votes = 25 + hashNumber(title, 870);
  return `${votes.toFixed(1)}K`;
}

function releaseDateFor(year, title) {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const day = 1 + hashNumber(title, 27);
  const month = months[hashNumber(`${title}-month`, 12)];
  return `${String(day).padStart(2, "0")} ${month}, ${year}`;
}

function formatFor(genres) {
  const formats = ["2D"];
  if (genres.some((genre) => ["Action", "Sci-Fi", "Adventure"].includes(genre)))
    formats.push("IMAX");
  if (genres.includes("Animation")) formats.push("3D");
  return formats;
}

function certificateFor(genres) {
  if (genres.some((genre) => ["Horror", "Crime"].includes(genre))) return "A";
  if (genres.includes("Animation")) return "U";
  return "UA";
}

function showDate(index) {
  const date = new Date();
  date.setDate(date.getDate() + (index % 14));
  return date.toISOString().slice(0, 10);
}

function articleUrlForTitle(title) {
  return `https://en.wikipedia.org/wiki/${encodeURI(String(title).replace(/ /g, "_"))}`;
}

function commonsFileName(url) {
  try {
    const parsed = new URL(String(url || ""));
    const fileName = decodeURIComponent(parsed.pathname.split("/").pop() || "");
    return fileName.replace(/^File:/i, "");
  } catch {
    return "";
  }
}

function cleanDescription(extract, title) {
  const text = String(extract || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text || /^may refer to/i.test(text)) return "";
  const sentence = text
    .split(/(?<=[.!?])\s+/)
    .slice(0, 2)
    .join(" ");
  return sentence || `${cleanMovieTitle(title)} is listed for movie ticket booking.`;
}

function cleanMovieTitle(value) {
  return String(value || "")
    .replace(/\s+\((?:\d{4}\s+)?film\)$/i, "")
    .replace(
      /\s+\((?:Indian|American|British|Tamil|Telugu|Hindi|Malayalam|Kannada|animated|documentary|upcoming)\s+film\)$/i,
      "",
    )
    .replace(/\s+\(actor\)$/i, "")
    .trim();
}

function inferYear(title, extract) {
  const match = `${title} ${extract}`.match(/\b(19|20)\d{2}\b/);
  return match ? Number(match[0]) : 2024;
}

function isUsefulMovieTitle(title) {
  return (
    title &&
    !/^List of/i.test(title) &&
    !/^Outline of/i.test(title) &&
    !/^Template:/i.test(title) &&
    !/\bawards?\b/i.test(title)
  );
}

function buildRows(count) {
  return Array.from({ length: count }, (_, index) => String.fromCharCode(65 + index));
}

function rotatedSlice(items, start, length) {
  if (!items.length) return [];
  return Array.from({ length }, (_, index) => items[(start + index) % items.length]);
}

function toList(value, fallback = []) {
  return Array.isArray(value) && value.length ? value : fallback;
}

function initials(value) {
  return String(value || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function stripTerritorySuffix(value) {
  return String(value ?? "")
    .replace(/\s*\([^)]*\)/g, "")
    .trim();
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function hashNumber(value, modulo) {
  let hash = 0;
  for (const char of String(value || "")) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash % modulo;
}

function cleanEnv(value) {
  return String(value || "")
    .trim()
    .replace(/^['"]|['"]$/g, "");
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function tinyPngDataUri() {
  return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";
}

function cloudinaryFetchUrl(sourceUrl) {
  return `https://res.cloudinary.com/${cloudinaryCloudName()}/image/fetch/f_auto,q_auto/${encodeURIComponent(sourceUrl)}`;
}

function cloudinaryCloudName() {
  const direct = cleanEnv(process.env.CLOUDINARY_CLOUD_NAME);
  if (direct) return direct;
  const cloudinaryUrl = cleanEnv(process.env.CLOUDINARY_URL);
  try {
    const parsed = new URL(cloudinaryUrl);
    if (parsed.protocol === "cloudinary:" && parsed.hostname) return parsed.hostname;
  } catch {
    // Fall through to the public cloud configured for this project.
  }
  return "dfmetzhrk";
}

function withTimeout(promise, timeoutMs, message) {
  let timeout;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
    }),
  ]).finally(() => clearTimeout(timeout));
}

async function ensureMovieTextIndex() {
  try {
    await Movie.collection.dropIndex("movie_text_search");
  } catch (error) {
    if (error?.codeName !== "IndexNotFound") {
      console.warn(`Could not drop existing movie text index: ${error.message}`);
    }
  }
  await Movie.collection.createIndex(
    { title: "text", genres: "text", language: "text" },
    {
      name: "movie_text_search",
      default_language: "none",
      language_override: "textLanguage",
    },
  );
}
