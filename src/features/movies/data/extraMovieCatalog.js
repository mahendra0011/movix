import { castAvatarFallback, movieImageFallback } from "../services/movieMedia.js";

const TARGET_CAST_COUNT = 7;

const castPools = {
  Hindi: [
    "Deepika Padukone",
    "Amitabh Bachchan",
    "Kiara Advani",
    "Rajkummar Rao",
    "Nawazuddin Siddiqui",
    "Triptii Dimri",
    "R Madhavan",
    "Tabu",
    "Jaideep Ahlawat",
  ],
  Telugu: [
    "Rana Daggubati",
    "Nayanthara",
    "Vijay Deverakonda",
    "Rashmika Mandanna",
    "Samantha Ruth Prabhu",
    "Brahmanandam",
    "Adivi Sesh",
    "Sreeleela",
    "Nassar",
  ],
  Tamil: [
    "Vijay Sethupathi",
    "Nayanthara",
    "Trisha Krishnan",
    "Karthi",
    "Sivakarthikeyan",
    "Aishwarya Rajesh",
    "Prakash Raj",
    "Dhanush",
    "Anirudh Ravichander",
  ],
  English: [
    "Chris Pratt",
    "Florence Pugh",
    "Anya Taylor-Joy",
    "John Boyega",
    "Rebecca Ferguson",
    "Oscar Isaac",
    "Vanessa Kirby",
    "Dev Patel",
    "Jenna Ortega",
  ],
};

const extraReleasedSeeds = [
  seed(
    "I Love Boosters",
    ["Keke Palmer", "Demi Moore"],
    "Hollywood / Comedy",
    ["Comedy"],
    "English",
    "2026-05-22",
  ),
  seed("Remarkably Bright Creatures", [], "Hollywood / Drama", ["Drama"], "English", "2026-05-15"),
  seed(
    "Obsession",
    [],
    "Hollywood / Horror Thriller",
    ["Horror", "Thriller"],
    "English",
    "2026-05-16",
  ),
  seed(
    "The Sheep Detectives",
    [],
    "Hollywood / Comedy Mystery",
    ["Comedy", "Mystery"],
    "English",
    "2026-05-17",
  ),
  seed(
    "28 Years Later: The Bone Temple",
    ["Ralph Fiennes"],
    "Hollywood / Horror",
    ["Horror", "Thriller"],
    "English",
    "2026-01-16",
  ),
  seed(
    "The Rip",
    ["Matt Damon", "Ben Affleck"],
    "Hollywood / Action Drama",
    ["Action", "Drama"],
    "English",
    "2026-01-23",
  ),
  seed(
    "Dead Man's Wire",
    ["Bill Skarsgard", "Al Pacino"],
    "Hollywood / Crime Drama",
    ["Crime", "Drama"],
    "English",
    "2026-01-09",
  ),
  seed(
    "Magellan",
    ["Gael Garcia Bernal"],
    "Hollywood / Biography",
    ["Biography", "Drama"],
    "English",
    "2026-01-30",
  ),
  seed(
    "Ikkis",
    ["Agastya Nanda"],
    "Bollywood / Biographical War",
    ["Biography", "War", "Drama"],
    "Hindi",
    "2026-01-10",
  ),
  seed(
    "Vadh 2",
    ["Sanjay Mishra", "Neena Gupta"],
    "Bollywood / Thriller",
    ["Thriller", "Drama"],
    "Hindi",
    "2026-02-06",
  ),
  seed(
    "Assi",
    ["Taapsee Pannu", "Revathi"],
    "Bollywood / Social Drama",
    ["Drama"],
    "Hindi",
    "2026-02-20",
  ),
  seed(
    "Do Deewane Seher Mein",
    ["Siddhant Chaturvedi", "Mrunal Thakur"],
    "Bollywood / Romance",
    ["Romance", "Drama"],
    "Hindi",
    "2026-02-14",
  ),
  seed(
    "O Romeo",
    ["Shahid Kapoor", "Triptii Dimri"],
    "Bollywood / Romance",
    ["Romance", "Drama"],
    "Hindi",
    "2026-02-21",
  ),
  seed(
    "Subedaar",
    ["Ajay Devgn"],
    "Bollywood / Action Drama",
    ["Action", "Drama"],
    "Hindi",
    "2026-03-13",
  ),
  seed(
    "Raja Shivaji",
    [],
    "Bollywood / Biographical",
    ["Biography", "History", "Drama"],
    "Hindi",
    "2026-03-19",
  ),
  seed("Kennedy", [], "Bollywood / Action Thriller", ["Action", "Thriller"], "Hindi", "2026-04-10"),
  seed("Paro Pinaki Ki Kahani", [], "Bollywood / Drama", ["Drama"], "Hindi", "2026-04-17"),
  seed(
    "Happy Patel Khatarnak Jasoos",
    [],
    "Bollywood / Comedy",
    ["Comedy", "Mystery"],
    "Hindi",
    "2026-05-01",
  ),
  seed("Azad Bharath", [], "Bollywood / Historical", ["History", "Drama"], "Hindi", "2026-05-08"),
  seed("Bihu Attack", [], "Bollywood / Action", ["Action", "Thriller"], "Hindi", "2026-05-15"),
  seed("Ek Din", [], "Bollywood / Drama", ["Drama"], "Hindi", "2026-05-22"),
  seed("Chand Mera Dil", [], "Bollywood / Romance", ["Romance", "Drama"], "Hindi", "2026-05-29"),
  seed(
    "Mana Shankara Vara Prasad Garu",
    ["Chiranjeevi", "Nayanthara", "Venkatesh"],
    "Telugu / Drama",
    ["Drama", "Family"],
    "Telugu",
    "2026-01-12",
  ),
  seed(
    "Bhartha Mahasayulaku Wignyapthi",
    ["Ravi Teja", "Ashika Ranganath"],
    "Telugu / Drama",
    ["Drama", "Comedy"],
    "Telugu",
    "2026-01-13",
  ),
  seed(
    "Anaganaga Oka Raju",
    ["Naveen Polishetty", "Meenakshi Chaudhary"],
    "Telugu / Romance Comedy",
    ["Romance", "Comedy"],
    "Telugu",
    "2026-01-14",
  ),
  seed(
    "Nari Nari Naduma Murari",
    ["Sharwanand", "Samyuktha"],
    "Telugu / Drama",
    ["Drama", "Comedy"],
    "Telugu",
    "2026-01-17",
  ),
  seed(
    "Cheekatilo",
    ["Sobhita Dhulipala", "Vishwadev Rachakonda"],
    "Telugu / Thriller",
    ["Thriller", "Drama"],
    "Telugu",
    "2026-01-23",
  ),
  seed("Devagudi", [], "Telugu / Drama", ["Drama"], "Telugu", "2026-01-30"),
  seed(
    "Hey Balwanth",
    ["Nikhil Siddhartha"],
    "Telugu / Action",
    ["Action", "Drama"],
    "Telugu",
    "2026-02-13",
  ),
  seed(
    "Gaaya Padda Simham",
    [],
    "Telugu / Action Drama",
    ["Action", "Drama"],
    "Telugu",
    "2026-02-20",
  ),
  seed("Raakaasaa", [], "Telugu / Action Fantasy", ["Action", "Fantasy"], "Telugu", "2026-03-13"),
  seed(
    "Couple Friendly",
    [],
    "Telugu / Romance Comedy",
    ["Romance", "Comedy"],
    "Telugu",
    "2026-04-10",
  ),
  seed(
    "Mrithyunjay",
    [],
    "Telugu / Action Thriller",
    ["Action", "Thriller"],
    "Telugu",
    "2026-04-17",
  ),
  seed("Euphoria", [], "Telugu / Romance Drama", ["Romance", "Drama"], "Telugu", "2026-05-08"),
  seed("Ugly Story", [], "Telugu / Drama Thriller", ["Drama", "Thriller"], "Telugu", "2026-05-15"),
  seed("Purushaha", [], "Telugu / Action Drama", ["Action", "Drama"], "Telugu", "2026-05-22"),
  seed(
    "Parasakthi",
    ["Sivakarthikeyan", "Sreeleela"],
    "Tamil / Drama",
    ["Drama"],
    "Tamil",
    "2026-01-10",
  ),
  seed(
    "Vaa Vaathiyaar",
    ["Karthi", "Krithi Shetty"],
    "Tamil / Drama",
    ["Drama", "Comedy"],
    "Tamil",
    "2026-01-14",
  ),
  seed(
    "Gandhi Talks",
    ["Vijay Sethupathi", "Arvind Swamy"],
    "Tamil / Drama",
    ["Drama"],
    "Tamil",
    "2026-01-30",
  ),
  seed(
    "Draupathi 2",
    ["Richard Rishi"],
    "Tamil / Action",
    ["Action", "Drama"],
    "Tamil",
    "2026-01-23",
  ),
  seed(
    "Anantha",
    ["Jagapathi Babu", "Suhasini"],
    "Tamil / Drama",
    ["Drama"],
    "Tamil",
    "2026-01-13",
  ),
  seed(
    "Honey",
    ["Naveen Chandra"],
    "Tamil / Psychological Thriller",
    ["Thriller", "Drama"],
    "Tamil",
    "2026-02-06",
  ),
  seed(
    "Lockdown",
    ["Anupama Parameswaran"],
    "Tamil / Thriller",
    ["Thriller", "Drama"],
    "Tamil",
    "2026-03-06",
  ),
  seed(
    "Hot Spot 2 Much",
    ["Priya Bhavani Shankar"],
    "Tamil / Comedy",
    ["Comedy", "Drama"],
    "Tamil",
    "2026-04-03",
  ),
];

const extraComingSoonMovieSeeds = [
  seed(
    "Scary Movie 6",
    ["Regina Hall", "Anna Faris"],
    "Hollywood / Comedy Horror",
    ["Comedy", "Horror"],
    "English",
    "2026-06-12",
  ),
  seed(
    "Stop! That! Train!",
    ["Sarah Michelle Gellar"],
    "Hollywood / Action Comedy",
    ["Action", "Comedy"],
    "English",
    "2026-06-12",
  ),
  seed(
    "Disclosure Day",
    ["Emily Blunt", "Colin Firth"],
    "Hollywood / Sci-Fi",
    ["Sci-Fi", "Drama"],
    "English",
    "2026-06-12",
  ),
  seed(
    "Jackass: Best and Last",
    ["Johnny Knoxville"],
    "Hollywood / Comedy",
    ["Comedy"],
    "English",
    "2026-06-26",
  ),
  seed(
    "The Death of Robin Hood",
    [],
    "Hollywood / Drama",
    ["Drama", "Adventure"],
    "English",
    "2026-06-20",
  ),
  seed("The Furious", [], "Hollywood / Action", ["Action", "Thriller"], "English", "2026-06-20"),
  seed("Lucky Strike", [], "Hollywood / Thriller", ["Thriller"], "English", "2026-06-27"),
  seed("Girls Like Girls", [], "Hollywood / Drama", ["Drama"], "English", "2026-06-19"),
  seed(
    "The Odyssey",
    ["Matt Damon", "Tom Holland", "Zendaya"],
    "Hollywood / Nolan Epic",
    ["Epic", "Adventure", "Drama"],
    "English",
    "2026-07-17",
  ),
  seed(
    "Enola Holmes 3",
    ["Millie Bobby Brown", "Henry Cavill"],
    "Hollywood / Mystery Adventure",
    ["Mystery", "Adventure"],
    "English",
    "2026-07-01",
  ),
  seed(
    "Young Washington",
    ["Ben Kingsley"],
    "Hollywood / Biography History",
    ["Biography", "History", "Drama"],
    "English",
    "2026-07-03",
  ),
  seed("Evil Dead Burn", [], "Hollywood / Horror", ["Horror", "Thriller"], "English", "2026-07-24"),
  seed("Reading Lolita in Tehran", [], "Hollywood / Drama", ["Drama"], "English", "2026-07-10"),
  seed(
    "The Magic Faraway Tree",
    [],
    "Hollywood / Family",
    ["Family", "Adventure", "Fantasy"],
    "English",
    "2026-08-07",
  ),
  seed(
    "Coyote vs. ACME",
    [],
    "Hollywood / Animation",
    ["Animation", "Comedy"],
    "English",
    "2026-08-21",
  ),
  seed("Mutiny", [], "Hollywood / Action", ["Action", "Thriller"], "English", "2026-08-14"),
  seed(
    "The Dog Stars",
    [],
    "Hollywood / Sci-Fi Drama",
    ["Sci-Fi", "Drama"],
    "English",
    "2026-08-28",
  ),
  seed(
    "Tom and Jerry: Forbidden Compass",
    [],
    "Hollywood / Animation",
    ["Animation", "Adventure", "Comedy"],
    "English",
    "2026-09-04",
  ),
  seed(
    "Practical Magic 2",
    ["Sandra Bullock", "Nicole Kidman"],
    "Hollywood / Fantasy Drama",
    ["Fantasy", "Drama"],
    "English",
    "2026-09-18",
  ),
  seed("Runner", [], "Hollywood / Thriller", ["Thriller"], "English", "2026-09-11"),
  seed(
    "Resident Evil (New)",
    [],
    "Hollywood / Action Horror",
    ["Action", "Horror"],
    "English",
    "2026-09-25",
  ),
  seed("Verity", [], "Hollywood / Thriller", ["Thriller", "Drama"], "English", "2026-10-02"),
  seed("Clayface", [], "DC / Action", ["Superhero", "Action"], "English", "2026-10-09"),
  seed("Wildwood", [], "Hollywood / Adventure", ["Adventure", "Fantasy"], "English", "2026-10-16"),
  seed(
    "The Cat in the Hat",
    [],
    "Hollywood / Animation",
    ["Animation", "Family", "Comedy"],
    "English",
    "2026-11-06",
  ),
  seed("Jimmy", [], "Hollywood / Drama", ["Drama"], "English", "2026-11-13"),
  seed(
    "The Angry Birds Movie 3",
    [],
    "Hollywood / Animation",
    ["Animation", "Comedy"],
    "English",
    "2026-12-11",
  ),
  seed(
    "Jumanji: Open World",
    [],
    "Hollywood / Adventure",
    ["Adventure", "Comedy"],
    "English",
    "2026-12-18",
  ),
  seed(
    "Madhuri Dixit & Tripti Dimri Film",
    ["Madhuri Dixit", "Triptii Dimri"],
    "Bollywood / Drama",
    ["Drama"],
    "Hindi",
    "2026-06-04",
  ),
  seed(
    "Bobby Deol Film",
    ["Bobby Deol"],
    "Bollywood / Action Drama",
    ["Action", "Drama"],
    "Hindi",
    "2026-06-05",
  ),
  seed(
    "Varun Dhawan & Pooja Hegde Film",
    ["Varun Dhawan", "Pooja Hegde"],
    "Bollywood / Romance",
    ["Romance", "Drama"],
    "Hindi",
    "2026-06-05",
  ),
  seed(
    "Diljit Dosanjh & Sharvari Film",
    ["Diljit Dosanjh", "Sharvari Wagh"],
    "Bollywood / Romance",
    ["Romance", "Drama"],
    "Hindi",
    "2026-06-12",
  ),
  seed(
    "Manoj Bajpayee & Adah Sharma Film",
    ["Manoj Bajpayee", "Adah Sharma"],
    "Bollywood / Thriller",
    ["Thriller", "Drama"],
    "Hindi",
    "2026-06-12",
  ),
  seed(
    "Anurag Kashyap Film",
    ["Gagan Ahuja", "Saba Azad"],
    "Bollywood / Crime",
    ["Crime", "Drama"],
    "Hindi",
    "2026-06-20",
  ),
  seed(
    "Shahid Kapoor & Rashmika Mandanna Film",
    ["Shahid Kapoor", "Rashmika Mandanna"],
    "Bollywood / Action",
    ["Action", "Drama"],
    "Hindi",
    "2026-06-19",
  ),
  seed(
    "Naagzilla",
    [],
    "Bollywood / Action Horror Fantasy",
    ["Action", "Horror", "Fantasy"],
    "Hindi",
    "2026-08-14",
  ),
  seed(
    "Peddi",
    ["Ram Charan", "Janhvi Kapoor"],
    "Telugu / Action",
    ["Action", "Drama"],
    "Telugu",
    "2026-06-04",
  ),
  seed(
    "Satya Dev Film",
    ["Satya Dev"],
    "Telugu / Action",
    ["Action", "Drama"],
    "Telugu",
    "2026-06-05",
  ),
  seed(
    "Naga Chaitanya & Meenakshi Chaudhary Film",
    ["Naga Chaitanya", "Meenakshi Chaudhary"],
    "Telugu / Romance",
    ["Romance", "Drama"],
    "Telugu",
    "2026-06-12",
  ),
  seed(
    "Fahadh Faasil Telugu Film",
    ["Fahadh Faasil"],
    "Telugu / Thriller",
    ["Thriller", "Drama"],
    "Telugu",
    "2026-06-12",
  ),
  seed(
    "Ashok Galla Film",
    ["Ashok Galla"],
    "Telugu / Action Romance",
    ["Action", "Romance"],
    "Telugu",
    "2026-06-12",
  ),
  seed(
    "The Paradise",
    ["Nani"],
    "Telugu / Fantasy Drama",
    ["Fantasy", "Drama"],
    "Telugu",
    "2026-10-02",
  ),
  seed(
    "Swayambhu",
    ["Nikhil Siddhartha"],
    "Telugu / Mythological",
    ["Mythological", "Action", "Drama"],
    "Telugu",
    "2026-09-11",
  ),
];

const extraReleasedMovies = uniqueByTitle(extraReleasedSeeds).map(buildReleasedMovie);

function seed(title, cast, industry, genres, language, releaseAt) {
  return {
    title,
    cast,
    industry,
    genres,
    language,
    releaseAt,
    releaseDate: formatReleaseDate(releaseAt),
  };
}

function buildReleasedMovie(item, index) {
  const cast = expandCast(item).map((name, castIndex) => ({
    name,
    role: castIndex === 0 ? "Lead" : "Cast",
    avatar: castAvatarFallback(name),
  }));

  return {
    id: slugify(item.title),
    title: item.title,
    poster: movieImageFallback(item.title, "poster"),
    backdrop: movieImageFallback(item.title, "backdrop"),
    genres: item.genres,
    language: item.language,
    languages: [item.language],
    duration: runtimeFor(item, index),
    rating: Number((7.7 + (index % 16) * 0.11).toFixed(1)),
    votes: `${24 + ((index * 13) % 320)}K`,
    releaseAt: item.releaseAt,
    releaseDate: item.releaseDate,
    listingType: "live",
    releaseStatus: "released",
    description: `${item.title} is part of the 2026 movix released lineup, listed as a ${item.industry} release with ${item.genres.slice(0, 2).join(" and ").toLowerCase()} appeal.`,
    cast,
    format: formatsFor(item),
    formats: formatsFor(item),
    certificate: certificateFor(item),
    sortOrder: 2000 + index,
  };
}

function expandCast(item) {
  const pool = castPools[item.language] ?? castPools.English;
  const names = uniqueNames(item.cast);
  const source = names.length ? names : pool.slice(0, 2);
  return uniqueNames([...source, ...pool]).slice(0, TARGET_CAST_COUNT);
}

function uniqueByTitle(list) {
  const seen = new Set();
  return list.filter((item) => {
    const key = normalizeKey(item.title);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function uniqueNames(list) {
  const seen = new Set();
  return list.filter((name) => {
    const key = normalizeKey(name);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function formatsFor(item) {
  const genreText = item.genres.join(" ").toLowerCase();
  if (genreText.includes("animation")) return ["2D", "3D", "IMAX"];
  if (
    genreText.includes("superhero") ||
    genreText.includes("sci-fi") ||
    genreText.includes("action")
  ) {
    return ["2D", "IMAX", "4DX"];
  }
  return ["2D", "IMAX"];
}

function certificateFor(item) {
  const genreText = item.genres.join(" ").toLowerCase();
  if (genreText.includes("horror") || genreText.includes("thriller")) return "A";
  if (genreText.includes("war") || genreText.includes("crime")) return "UA";
  return "UA";
}

function runtimeFor(item, index) {
  if (item.genres.includes("Animation")) return "1h 48m";
  if (item.genres.includes("Action") || item.genres.includes("Sci-Fi")) {
    return `${2 + (index % 2)}h ${String(16 + (index % 30)).padStart(2, "0")}m`;
  }
  if (item.genres.includes("Drama")) return `2h ${String(4 + (index % 34)).padStart(2, "0")}m`;
  return `2h ${String(1 + (index % 39)).padStart(2, "0")}m`;
}

function formatReleaseDate(value) {
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function slugify(value) {
  return normalizeKey(value)
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeKey(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

export { extraComingSoonMovieSeeds, extraReleasedMovies };
