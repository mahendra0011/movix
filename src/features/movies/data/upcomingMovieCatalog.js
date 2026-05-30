import { castAvatarFallback, movieImageFallback } from "../services/movieMedia.js";
import { extraComingSoonMovieSeeds } from "./extraMovieCatalog.js";

const movieSeeds = [
  m(
    "Ramayana: Part 1",
    ["Ranbir Kapoor", "Sai Pallavi", "Yash"],
    "Bollywood / Mythological Epic",
    ["Mythological", "Epic", "Drama"],
    "Hindi",
    "2026",
  ),
  m(
    "Love & War",
    ["Ranbir Kapoor", "Alia Bhatt", "Vicky Kaushal"],
    "Bollywood / Romance Drama",
    ["Romance", "Drama"],
    "Hindi",
    "2026",
  ),
  m(
    "Border 2",
    ["Sunny Deol", "Varun Dhawan", "Diljit Dosanjh"],
    "Bollywood / War Sequel",
    ["War", "Action", "Drama"],
    "Hindi",
    "2026",
  ),
  m(
    "Spirit",
    ["Prabhas"],
    "South / Pan-India Action",
    ["Action", "Crime", "Drama"],
    "Telugu",
    "2026",
  ),
  m(
    "King",
    ["Shah Rukh Khan", "Suhana Khan"],
    "Bollywood / Action",
    ["Action", "Thriller"],
    "Hindi",
    "2026",
  ),
  m(
    "Toxic",
    ["Yash", "Kareena Kapoor"],
    "South / Pan-India Action",
    ["Action", "Crime"],
    "Kannada",
    "2026",
  ),
  m(
    "Bhooth Bangla",
    ["Akshay Kumar"],
    "Bollywood / Horror Comedy",
    ["Horror", "Comedy"],
    "Hindi",
    "2026",
  ),
  m(
    "Drishyam 3",
    ["Mohanlal", "Ajay Devgn"],
    "Crime Thriller",
    ["Crime", "Thriller", "Drama"],
    "Hindi",
    "2026",
  ),
  m(
    "Bhediya 2",
    ["Varun Dhawan", "Kriti Sanon"],
    "Bollywood / Horror Universe",
    ["Horror", "Comedy"],
    "Hindi",
    "2026",
  ),
  m(
    "Alpha",
    ["Alia Bhatt", "Sharvari Wagh"],
    "YRF Spy Universe",
    ["Action", "Spy", "Thriller"],
    "Hindi",
    "2026",
  ),
  m(
    "The Raja Saab",
    ["Prabhas"],
    "South / Horror Romantic",
    ["Horror", "Romance"],
    "Telugu",
    "2026",
  ),
  m(
    "Vishwambhara",
    ["Chiranjeevi"],
    "Telugu / Socio-Fantasy",
    ["Fantasy", "Action"],
    "Telugu",
    "2026",
  ),
  m("Jailer 2", ["Rajinikanth"], "Tamil / Action Sequel", ["Action", "Thriller"], "Tamil", "2026"),
  m(
    "Lahore 1947",
    ["Sunny Deol", "Preity Zinta"],
    "Bollywood / Period Drama",
    ["Drama", "Period"],
    "Hindi",
    "2026",
  ),
  m(
    "Pati Patni Aur Woh Do",
    ["Ayushmann Khurrana", "Sara Ali Khan"],
    "Bollywood / Comedy",
    ["Comedy", "Romance"],
    "Hindi",
    "2026",
  ),
  m(
    "Mardaani 3",
    ["Rani Mukerji"],
    "Bollywood / Cop Thriller",
    ["Action", "Crime", "Thriller"],
    "Hindi",
    "2026",
  ),
  m(
    "Dhamaal 4",
    ["Riteish Deshmukh", "Arshad Warsi"],
    "Bollywood / Comedy",
    ["Comedy"],
    "Hindi",
    "2026",
  ),
  m(
    "Awarapan 2",
    ["Emraan Hashmi"],
    "Bollywood / Sequel Thriller",
    ["Thriller", "Drama"],
    "Hindi",
    "2026",
  ),
  m(
    "Welcome to the Jungle",
    ["Akshay Kumar", "Sanjay Dutt", "Suniel Shetty"],
    "Bollywood / Ensemble Comedy",
    ["Comedy", "Adventure"],
    "Hindi",
    "2026",
  ),
  m(
    "Mirzapur: The Movie",
    ["Pankaj Tripathi", "Ali Fazal"],
    "Crime Drama",
    ["Crime", "Drama"],
    "Hindi",
    "2026",
  ),
  m(
    "Avengers: Doomsday",
    ["Robert Downey Jr."],
    "Marvel Studios",
    ["Superhero", "Action", "Sci-Fi"],
    "English",
    "2026",
  ),
  m(
    "Spider-Man 4",
    ["Tom Holland", "Zendaya"],
    "Marvel / Sony",
    ["Superhero", "Action"],
    "English",
    "2026",
  ),
  m(
    "The Batman Part II",
    ["Robert Pattinson"],
    "DC / Matt Reeves",
    ["Action", "Crime", "Thriller"],
    "English",
    "2026",
  ),
  m(
    "The Mandalorian & Grogu",
    ["Pedro Pascal"],
    "Star Wars",
    ["Sci-Fi", "Adventure"],
    "English",
    "2026",
  ),
  m(
    "Toy Story 5",
    ["Tom Hanks", "Tim Allen"],
    "Disney / Pixar",
    ["Animation", "Adventure", "Comedy"],
    "English",
    "2026",
  ),
  m(
    "Shrek 5",
    ["Mike Myers", "Eddie Murphy"],
    "DreamWorks",
    ["Animation", "Comedy"],
    "English",
    "2026",
  ),
  m(
    "Moana (Live Action)",
    ["Dwayne Johnson"],
    "Disney",
    ["Musical", "Adventure"],
    "English",
    "2026",
  ),
  m(
    "Supergirl: Woman of Tomorrow",
    ["Milly Alcock"],
    "DC Universe",
    ["Superhero", "Cosmic"],
    "English",
    "2026",
  ),
  m("Mortal Kombat 2", ["Karl Urban"], "Warner Bros.", ["Action", "Fantasy"], "English", "2026"),
  m(
    "Project Hail Mary",
    ["Ryan Gosling"],
    "Hollywood / Sci-Fi",
    ["Sci-Fi", "Adventure"],
    "English",
    "2026",
  ),
  m(
    "The Hunger Games: Sunrise on the Reaping",
    ["Joseph Zada", "Whitney Peak"],
    "Lionsgate",
    ["Dystopian", "Action"],
    "English",
    "2026",
  ),
  m(
    "Insidious: Out of the Further",
    ["Lin Shaye"],
    "Blumhouse",
    ["Horror", "Supernatural"],
    "English",
    "2026",
  ),
  m(
    "Godzilla x Kong: Supernova",
    ["Dan Stevens"],
    "MonsterVerse",
    ["Action", "Kaiju"],
    "English",
    "2027",
  ),
  m(
    "Street Fighter",
    ["Andrew Koji", "Noah Centineo"],
    "Legendary Pictures",
    ["Action", "Game Adaptation"],
    "English",
    "2026",
  ),
  m("Scream 7", ["Neve Campbell"], "Paramount", ["Horror", "Slasher"], "English", "2026"),
  m("Kick 2", ["Salman Khan"], "Bollywood / Action", ["Action", "Thriller"], "Hindi", "2026+"),
  m("Housefull 5", ["Akshay Kumar"], "Bollywood / Ensemble Comedy", ["Comedy"], "Hindi", "2026+"),
  m(
    "Krrish 4",
    ["Hrithik Roshan"],
    "Bollywood / Superhero",
    ["Superhero", "Action"],
    "Hindi",
    "2026+",
  ),
  m(
    "War 2",
    ["Hrithik Roshan", "Jr. NTR"],
    "YRF Spy Universe",
    ["Action", "Spy"],
    "Hindi",
    "2026+",
  ),
  m(
    "Tiger vs Pathaan",
    ["Shah Rukh Khan", "Salman Khan"],
    "YRF Spy Universe",
    ["Action", "Spy"],
    "Hindi",
    "2026+",
  ),
  m("Golmaal 5", ["Ajay Devgn"], "Bollywood / Comedy", ["Comedy"], "Hindi", "2026+"),
  m(
    "Singham Again Follow-up",
    ["Ajay Devgn"],
    "Bollywood / Cop Universe",
    ["Action", "Crime"],
    "Hindi",
    "2026+",
  ),
  m(
    "Chhava 2",
    ["Vicky Kaushal"],
    "Bollywood / Historical",
    ["Historical", "Drama"],
    "Hindi",
    "2026+",
  ),
  m("Jawan 2", ["Shah Rukh Khan"], "Bollywood / Action", ["Action", "Thriller"], "Hindi", "2026+"),
  m("Pathaan 2", ["Shah Rukh Khan"], "Bollywood / Spy Action", ["Action", "Spy"], "Hindi", "2026+"),
  m(
    "Don 3",
    ["Ranveer Singh", "Kiara Advani"],
    "Bollywood / Action Thriller",
    ["Action", "Thriller"],
    "Hindi",
    "2026+",
  ),
  m(
    "Dhoom 4",
    ["Official Cast"],
    "Bollywood / Heist Action",
    ["Action", "Heist"],
    "Hindi",
    "2026+",
  ),
  m(
    "Munna Bhai 3",
    ["Sanjay Dutt"],
    "Bollywood / Comedy Drama",
    ["Comedy", "Drama"],
    "Hindi",
    "2026+",
  ),
  m("Raid 2", ["Ajay Devgn"], "Bollywood / Crime Drama", ["Crime", "Drama"], "Hindi", "2026+"),
  m(
    "Son of Sardaar 2",
    ["Ajay Devgn"],
    "Bollywood / Comedy",
    ["Comedy", "Action"],
    "Hindi",
    "2026+",
  ),
  m(
    "De De Pyaar De 2",
    ["Ajay Devgn", "R. Madhavan"],
    "Bollywood / Romance Comedy",
    ["Comedy", "Romance"],
    "Hindi",
    "2026+",
  ),
  m(
    "Jolly LLB 3",
    ["Akshay Kumar", "Arshad Warsi"],
    "Bollywood / Courtroom Comedy",
    ["Comedy", "Drama"],
    "Hindi",
    "2026+",
  ),
  m(
    "Awara Pagal Deewana 2",
    ["Akshay Kumar"],
    "Bollywood / Comedy Action",
    ["Comedy", "Action"],
    "Hindi",
    "2026+",
  ),
  m(
    "No Entry 2",
    ["Varun Dhawan", "Arjun Kapoor"],
    "Bollywood / Comedy",
    ["Comedy"],
    "Hindi",
    "2026+",
  ),
  m(
    "Fukrey 4",
    ["Pulkit Samrat", "Varun Sharma"],
    "Bollywood / Comedy",
    ["Comedy"],
    "Hindi",
    "2026+",
  ),
  m(
    "Stree 3",
    ["Shraddha Kapoor", "Rajkummar Rao"],
    "Maddock Horror Universe",
    ["Horror", "Comedy"],
    "Hindi",
    "2026+",
  ),
  m(
    "Munjya 2",
    ["Official Cast"],
    "Maddock Horror Universe",
    ["Horror", "Comedy"],
    "Hindi",
    "2026+",
  ),
  m(
    "Vampires of Vijay Nagar",
    ["Ayushmann Khurrana", "Rashmika Mandanna"],
    "Maddock Horror Universe",
    ["Horror", "Comedy"],
    "Hindi",
    "2026+",
  ),
  m("Aashiqui 3", ["Official Cast"], "Bollywood / Romance", ["Romance", "Drama"], "Hindi", "2026+"),
  m(
    "Malang 2",
    ["Official Cast"],
    "Bollywood / Thriller",
    ["Thriller", "Romance"],
    "Hindi",
    "2026+",
  ),
  m(
    "Ek Villain 3",
    ["John Abraham"],
    "Bollywood / Action Thriller",
    ["Action", "Thriller"],
    "Hindi",
    "2026+",
  ),
  m(
    "Sanam Teri Kasam 2",
    ["Harshvardhan Rane"],
    "Bollywood / Romance",
    ["Romance", "Drama"],
    "Hindi",
    "2026+",
  ),
  m(
    "Tu Jhoothi Main Makkaar 2",
    ["Ranbir Kapoor"],
    "Bollywood / Romance Comedy",
    ["Comedy", "Romance"],
    "Hindi",
    "2026+",
  ),
  m(
    "Kabir Singh 2",
    ["Shahid Kapoor"],
    "Bollywood / Drama",
    ["Drama", "Romance"],
    "Hindi",
    "2026+",
  ),
  m("Baby John", ["Varun Dhawan"], "Bollywood / Action", ["Action", "Thriller"], "Hindi", "2026+"),
  m(
    "Pushpa 3: The Rampage",
    ["Allu Arjun"],
    "South / Pan-India",
    ["Action", "Crime"],
    "Telugu",
    "2026+",
  ),
  m(
    "Salaar: Part 2 - Shouryaanga Parvam",
    ["Prabhas"],
    "South / Pan-India",
    ["Action", "Drama"],
    "Telugu",
    "2026+",
  ),
  m(
    "Kalki 2898 AD Part 2",
    ["Prabhas", "Amitabh Bachchan", "Kamal Haasan"],
    "South / Pan-India Sci-Fi",
    ["Sci-Fi", "Action"],
    "Telugu",
    "2026+",
  ),
  m("NTR 31", ["Jr. NTR"], "South / Pan-India Action", ["Action", "Thriller"], "Telugu", "2026+"),
  m(
    "Devara Part 2",
    ["Jr. NTR", "Janhvi Kapoor"],
    "South / Pan-India Action",
    ["Action", "Drama"],
    "Telugu",
    "2026+",
  ),
  m("Leo 2", ["Thalapathy Vijay"], "Tamil / Action", ["Action", "Crime"], "Tamil", "2026+"),
  m("Kaithi 2", ["Karthi"], "Lokesh Cinematic Universe", ["Action", "Crime"], "Tamil", "2026+"),
  m(
    "Vikram 2",
    ["Kamal Haasan"],
    "Lokesh Cinematic Universe",
    ["Action", "Thriller"],
    "Tamil",
    "2026+",
  ),
  m(
    "Rolex Solo Spin-off",
    ["Suriya"],
    "Lokesh Cinematic Universe",
    ["Action", "Crime"],
    "Tamil",
    "2026+",
  ),
  m("Kanguva 2", ["Suriya"], "Tamil / Fantasy Action", ["Fantasy", "Action"], "Tamil", "2026+"),
  m(
    "Kantara: Chapter 1",
    ["Rishab Shetty"],
    "South / Folk Action",
    ["Action", "Mythological"],
    "Kannada",
    "2026+",
  ),
  m(
    "KGF: Chapter 3",
    ["Yash"],
    "South / Pan-India Action",
    ["Action", "Crime"],
    "Kannada",
    "2026+",
  ),
  m(
    "SSMB29",
    ["Mahesh Babu"],
    "SS Rajamouli Globetrotting Action",
    ["Adventure", "Action"],
    "Telugu",
    "2026+",
  ),
  m(
    "Hanuman 2 (Jai Hanuman)",
    ["Official Cast"],
    "Prasanth Varma Cinematic Universe",
    ["Superhero", "Mythological"],
    "Telugu",
    "2026+",
  ),
  m(
    "Mahakali",
    ["Official Cast"],
    "Prasanth Varma Cinematic Universe",
    ["Superhero", "Mythological"],
    "Telugu",
    "2026+",
  ),
  m(
    "Adhira",
    ["Official Cast"],
    "Prasanth Varma Cinematic Universe",
    ["Superhero", "Action"],
    "Telugu",
    "2026+",
  ),
  m("Thug Life", ["Kamal Haasan"], "Tamil / Mani Ratnam", ["Action", "Drama"], "Tamil", "2026+"),
  m(
    "Coolie",
    ["Rajinikanth"],
    "Tamil / Lokesh Kanagaraj",
    ["Action", "Thriller"],
    "Tamil",
    "2026+",
  ),
  m("Vrishabha", ["Mohanlal"], "South / Pan-India", ["Action", "Drama"], "Malayalam", "2026+"),
  m(
    "Empuraan (Lucifer 2)",
    ["Mohanlal", "Prithviraj Sukumaran"],
    "Malayalam / Action Thriller",
    ["Action", "Thriller"],
    "Malayalam",
    "2026+",
  ),
  m(
    "Hari Hara Veera Mallu",
    ["Pawan Kalyan"],
    "Telugu / Period Action",
    ["Action", "Period"],
    "Telugu",
    "2026+",
  ),
  m("OG", ["Pawan Kalyan"], "Telugu / Gangster Action", ["Action", "Crime"], "Telugu", "2026+"),
  m(
    "Ustaad Bhagat Singh",
    ["Pawan Kalyan"],
    "Telugu / Action",
    ["Action", "Drama"],
    "Telugu",
    "2026+",
  ),
  m(
    "Goodachari 2 (G2)",
    ["Adivi Sesh"],
    "Telugu / Spy Thriller",
    ["Spy", "Thriller"],
    "Telugu",
    "2026+",
  ),
  m("HIT 3", ["Nani"], "Telugu / Crime Thriller", ["Crime", "Thriller"], "Telugu", "2026+"),
  m("Dasara 2", ["Nani"], "Telugu / Action Drama", ["Action", "Drama"], "Telugu", "2026+"),
  m(
    "Saripodhaa Sanivaaram Prequel/Sequel",
    ["Nani"],
    "Telugu / Action",
    ["Action", "Drama"],
    "Telugu",
    "2026+",
  ),
  m("Suriya 44", ["Suriya"], "Tamil / Action Drama", ["Action", "Drama"], "Tamil", "2026+"),
  m("Thalapathy 69", ["Thalapathy Vijay"], "Tamil / Action", ["Action", "Drama"], "Tamil", "2026+"),
  m(
    "Viduthalai Part 2",
    ["Vijay Sethupathi", "Soori"],
    "Tamil / Vetri Maaran",
    ["Crime", "Drama"],
    "Tamil",
    "2026+",
  ),
  m(
    "Fast & Furious 11",
    ["Vin Diesel"],
    "Hollywood / Action Finale",
    ["Action", "Adventure"],
    "English",
    "2026+",
  ),
  m(
    "Avatar 4",
    ["Sam Worthington", "Zoe Saldana"],
    "James Cameron Sci-Fi",
    ["Sci-Fi", "Adventure"],
    "English",
    "2026+",
  ),
  m(
    "Constantine 2",
    ["Keanu Reeves"],
    "Hollywood / Supernatural",
    ["Supernatural", "Thriller"],
    "English",
    "2026+",
  ),
  m(
    "John Wick: Chapter 5",
    ["Keanu Reeves"],
    "Lionsgate Action",
    ["Action", "Thriller"],
    "English",
    "2026+",
  ),
  m("Blade", ["Mahershala Ali"], "Marvel Studios", ["Superhero", "Horror"], "English", "2026+"),
  m("Armor Wars", ["Don Cheadle"], "Marvel Studios", ["Superhero", "Action"], "English", "2026+"),
  m("Shang-Chi 2", ["Simu Liu"], "Marvel Studios", ["Superhero", "Action"], "English", "2026+"),
  m(
    "X-Men Live Action Reboot",
    ["Official Cast"],
    "Marvel Studios",
    ["Superhero", "Action"],
    "English",
    "2026+",
  ),
  m(
    "Batman: The Brave and the Bold",
    ["Official Cast"],
    "DC Universe",
    ["Superhero", "Action"],
    "English",
    "2026+",
  ),
  m(
    "Swamp Thing",
    ["Official Cast"],
    "DC Universe Horror",
    ["Horror", "Superhero"],
    "English",
    "2026+",
  ),
  m(
    "The Matrix 5",
    ["Official Cast"],
    "Warner Bros. Sci-Fi",
    ["Sci-Fi", "Action"],
    "English",
    "2026+",
  ),
  m(
    "Dune: Messiah (Dune 3)",
    ["Timothee Chalamet", "Zendaya"],
    "Denis Villeneuve Sci-Fi",
    ["Sci-Fi", "Drama"],
    "English",
    "2026+",
  ),
  m(
    "Mad Max: Wasteland",
    ["Official Cast"],
    "George Miller Action",
    ["Action", "Adventure"],
    "English",
    "2026+",
  ),
  m(
    "Top Gun 3",
    ["Tom Cruise"],
    "Hollywood / Aviation Action",
    ["Action", "Drama"],
    "English",
    "2026+",
  ),
  m(
    "Mission: Impossible 9",
    ["Tom Cruise"],
    "Hollywood / Spy Action",
    ["Action", "Spy"],
    "English",
    "2026+",
  ),
  m(
    "Inception 2",
    ["Official Cast"],
    "Hollywood / Sci-Fi Rumored",
    ["Sci-Fi", "Thriller"],
    "English",
    "2026+",
  ),
  m(
    "Interstellar Prequel Project",
    ["Official Cast"],
    "Hollywood / Sci-Fi Rumored",
    ["Sci-Fi", "Drama"],
    "English",
    "2026+",
  ),
  m(
    "Gladiator III",
    ["Official Cast"],
    "Ridley Scott Period Epic",
    ["Action", "Historical"],
    "English",
    "2026+",
  ),
  m(
    "Godzilla Minus One Sequel",
    ["Official Cast"],
    "Toho Kaiju",
    ["Action", "Kaiju"],
    "Japanese",
    "2026+",
  ),
  m(
    "Pacific Rim Reboot",
    ["Official Cast"],
    "Legendary Sci-Fi",
    ["Sci-Fi", "Action"],
    "English",
    "2026+",
  ),
  ...extraComingSoonMovieSeeds,
];

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
  Kannada: [
    "Rishab Shetty",
    "Rakshit Shetty",
    "Sudeep",
    "Rukmini Vasanth",
    "Prakash Raj",
    "Achyuth Kumar",
    "Sapthami Gowda",
    "Sriimurali",
    "Dhananjaya",
  ],
  Malayalam: [
    "Fahadh Faasil",
    "Prithviraj Sukumaran",
    "Manju Warrier",
    "Tovino Thomas",
    "Dulquer Salmaan",
    "Aparna Balamurali",
    "Soubin Shahir",
    "Parvathy Thiruvothu",
    "Indrajith Sukumaran",
  ],
  Japanese: [
    "Ryunosuke Kamiki",
    "Minami Hamabe",
    "Hidetaka Yoshioka",
    "Sakura Ando",
    "Yuki Yamada",
    "Munetaka Aoki",
    "Kuranosuke Sasaki",
    "Kaho",
    "Masaki Suda",
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

const upcomingMovies = uniqueByTitle(movieSeeds).map(buildMovie);
const upcomingMovieIds = upcomingMovies.map((movie) => movie.id);

function m(title, cast, industry, genres, language, releaseDate, options = {}) {
  return { title, cast, industry, genres, language, releaseDate, ...options };
}

function buildMovie(seed, index) {
  const id = slugify(seed.title);
  return {
    id,
    title: seed.title,
    poster: movieImageFallback(seed.title, "poster"),
    backdrop: movieImageFallback(seed.title, "backdrop"),
    genres: seed.genres,
    language: seed.language,
    duration: runtimeFor(seed, index),
    rating: Number((8.1 + (index % 14) * 0.09).toFixed(1)),
    votes: `${85 + ((index * 17) % 780)}K`,
    releaseAt: seed.releaseAt || "",
    releaseDate: seed.releaseDate,
    listingType: "coming-soon",
    releaseStatus: "coming-soon",
    description: `${seed.title} is part of the 2026+ movix upcoming lineup, positioned as a ${seed.industry} release with ${seed.genres.slice(0, 2).join(" and ").toLowerCase()} appeal.`,
    cast: expandCast(seed).map((name, castIndex) => ({
      name,
      role: castIndex === 0 ? "Lead" : "Cast",
      avatar: castAvatarFallback(name),
    })),
    format: formatsFor(seed),
    certificate: certificateFor(seed),
    sortOrder: index + 1,
  };
}

function expandCast(seed) {
  const pool = castPools[seed.language] ?? castPools.English;
  const names = uniqueNames(seed.cast.filter((name) => normalizeKey(name) !== "official cast"));
  const source = names.length ? names : pool.slice(0, 2);
  return uniqueNames([...source, ...pool]).slice(0, TARGET_CAST_COUNT);
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

function uniqueByTitle(list) {
  const seen = new Set();
  return list.filter((item) => {
    const key = normalizeKey(item.title);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function formatsFor(seed) {
  const genreText = seed.genres.join(" ").toLowerCase();
  if (genreText.includes("animation")) return ["2D", "3D", "IMAX"];
  if (
    genreText.includes("superhero") ||
    genreText.includes("sci-fi") ||
    genreText.includes("kaiju")
  ) {
    return ["2D", "IMAX", "4DX"];
  }
  if (genreText.includes("action")) return ["2D", "IMAX"];
  return ["2D"];
}

function certificateFor(seed) {
  const genreText = seed.genres.join(" ").toLowerCase();
  if (genreText.includes("horror") || genreText.includes("slasher")) return "A";
  if (genreText.includes("crime") || genreText.includes("war")) return "UA";
  return "UA";
}

function runtimeFor(seed, index) {
  if (seed.genres.includes("Animation")) return "1h 52m";
  if (seed.genres.includes("Epic") || seed.genres.includes("Mythological")) return "2h 55m";
  if (seed.genres.includes("Action") || seed.genres.includes("Sci-Fi")) {
    return `${2 + (index % 2)}h ${String(24 + (index % 24)).padStart(2, "0")}m`;
  }
  return `2h ${String(6 + (index % 38)).padStart(2, "0")}m`;
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

export { upcomingMovieIds, upcomingMovies };
