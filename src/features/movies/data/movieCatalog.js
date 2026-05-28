import { SEARCHABLE_CITY_OPTIONS } from "../../../shared/services/cityPreference.js";

const tmdb = (path, size = "w780") => `https://image.tmdb.org/t/p/${size}${path}`;
const realImages = {
  interstellar: tmdb("/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg"),
  "interstellar-bd": tmdb("/xJHokMbljvjADYdit5fK5VQsXEG.jpg", "w1280"),
  dune2: tmdb("/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg"),
  "dune2-bd": tmdb("/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg", "w1280"),
  oppen: tmdb("/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg"),
  "oppen-bd": tmdb("/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg", "w1280"),
  spider: tmdb("/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg"),
  "spider-bd": tmdb("/4HodYYKEIsGOdinkGi2Ucz6X9i0.jpg", "w1280"),
  inception: tmdb("/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg"),
  "inception-bd": tmdb("/s3TBrRGB1iav7gFOCNx3H31MoES.jpg", "w1280"),
  batman: tmdb("/74xTEgt7R36Fpooo50r9T25onhq.jpg"),
  "batman-bd": tmdb("/b0PlSFdDwbyK0cf5RxwDpaOJQvQ.jpg", "w1280"),
  barbie: tmdb("/iuFNMS8U5cb6xfzi51Dbkovj7vM.jpg"),
  "barbie-bd": tmdb("/nHf61UzkfFno5X1ofIhugCPus2R.jpg", "w1280"),
  joker: tmdb("/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg"),
  "joker-bd": tmdb("/n6bUvigpRFqSwmPp1m2YADdbRBc.jpg", "w1280"),
};
const img = (seed) => realImages[seed] ?? "";
const movies = [
  {
    id: "interstellar",
    title: "Interstellar",
    poster: img("interstellar"),
    backdrop: img("interstellar-bd", 1600, 800),
    genres: ["Sci-Fi", "Adventure", "Drama"],
    language: "English",
    duration: "2h 49m",
    rating: 9.1,
    votes: "412.3K",
    releaseDate: "07 Nov, 2014",
    description:
      "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival as Earth becomes uninhabitable.",
    cast: [
      { name: "Matthew M.", role: "Cooper", avatar: img("c1", 200, 200) },
      { name: "Anne H.", role: "Brand", avatar: img("c2", 200, 200) },
      { name: "Jessica C.", role: "Murph", avatar: img("c3", 200, 200) },
      { name: "Michael C.", role: "Prof. Brand", avatar: img("c4", 200, 200) },
    ],
    format: ["2D", "IMAX", "4DX"],
    certificate: "UA",
  },
  {
    id: "dune-part-two",
    title: "Dune: Part Two",
    poster: img("dune2"),
    backdrop: img("dune2-bd", 1600, 800),
    genres: ["Sci-Fi", "Action"],
    language: "English",
    duration: "2h 46m",
    rating: 8.7,
    votes: "298.1K",
    releaseDate: "01 Mar, 2024",
    description:
      "Paul Atreides unites with the Fremen to wage war against the conspirators who destroyed his family.",
    cast: [
      { name: "Timothee C.", role: "Paul", avatar: img("d1", 200, 200) },
      { name: "Zendaya", role: "Chani", avatar: img("d2", 200, 200) },
      { name: "Rebecca F.", role: "Jessica", avatar: img("d3", 200, 200) },
    ],
    format: ["2D", "IMAX"],
    certificate: "UA",
  },
  {
    id: "oppenheimer",
    title: "Oppenheimer",
    poster: img("oppen"),
    backdrop: img("oppen-bd", 1600, 800),
    genres: ["Biography", "Drama", "History"],
    language: "English",
    duration: "3h 0m",
    rating: 8.5,
    votes: "521.7K",
    releaseDate: "21 Jul, 2023",
    description:
      "The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb.",
    cast: [
      { name: "Cillian M.", role: "Oppenheimer", avatar: img("o1", 200, 200) },
      { name: "Emily B.", role: "Kitty", avatar: img("o2", 200, 200) },
      { name: "Robert D. Jr.", role: "Strauss", avatar: img("o3", 200, 200) },
    ],
    format: ["2D", "IMAX"],
    certificate: "UA",
  },
  {
    id: "spider-verse",
    title: "Spider-Man: Across the Spider-Verse",
    poster: img("spider"),
    backdrop: img("spider-bd", 1600, 800),
    genres: ["Animation", "Action", "Adventure"],
    language: "English",
    duration: "2h 20m",
    rating: 8.9,
    votes: "187.4K",
    releaseDate: "02 Jun, 2023",
    description:
      "Miles Morales catapults across the Multiverse, where he encounters a team of Spider-People charged with protecting its existence.",
    cast: [
      { name: "Shameik M.", role: "Miles", avatar: img("s1", 200, 200) },
      { name: "Hailee S.", role: "Gwen", avatar: img("s2", 200, 200) },
    ],
    format: ["2D", "3D"],
    certificate: "U",
  },
  {
    id: "inception",
    title: "Inception",
    poster: img("inception"),
    backdrop: img("inception-bd", 1600, 800),
    genres: ["Sci-Fi", "Thriller"],
    language: "English",
    duration: "2h 28m",
    rating: 8.8,
    votes: "892.0K",
    releaseDate: "16 Jul, 2010",
    description:
      "A thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea.",
    cast: [
      { name: "Leonardo D.", role: "Cobb", avatar: img("i1", 200, 200) },
      { name: "Joseph G.-L.", role: "Arthur", avatar: img("i2", 200, 200) },
    ],
    format: ["2D", "IMAX"],
    certificate: "UA",
  },
  {
    id: "the-batman",
    title: "The Batman",
    poster: img("batman"),
    backdrop: img("batman-bd", 1600, 800),
    genres: ["Action", "Crime", "Drama"],
    language: "English",
    duration: "2h 56m",
    rating: 8.2,
    votes: "603.5K",
    releaseDate: "04 Mar, 2022",
    description:
      "When a sadistic serial killer begins murdering key political figures in Gotham, Batman is forced to investigate the city's hidden corruption.",
    cast: [
      { name: "Robert P.", role: "Batman", avatar: img("b1", 200, 200) },
      { name: "Zoe K.", role: "Selina", avatar: img("b2", 200, 200) },
    ],
    format: ["2D", "IMAX"],
    certificate: "UA",
  },
  {
    id: "barbie",
    title: "Barbie",
    poster: img("barbie"),
    backdrop: img("barbie-bd", 1600, 800),
    genres: ["Comedy", "Fantasy"],
    language: "English",
    duration: "1h 54m",
    rating: 7.4,
    votes: "412.0K",
    releaseDate: "21 Jul, 2023",
    description: "Barbie suffers a crisis that leads her to question her world and her existence.",
    cast: [
      { name: "Margot R.", role: "Barbie", avatar: img("ba1", 200, 200) },
      { name: "Ryan G.", role: "Ken", avatar: img("ba2", 200, 200) },
    ],
    format: ["2D"],
    certificate: "UA",
  },
  {
    id: "joker",
    title: "Joker",
    poster: img("joker"),
    backdrop: img("joker-bd", 1600, 800),
    genres: ["Crime", "Drama", "Thriller"],
    language: "English",
    duration: "2h 2m",
    rating: 8.4,
    votes: "1.1M",
    releaseDate: "04 Oct, 2019",
    description:
      "In Gotham City, mentally troubled comedian Arthur Fleck embarks on a downward spiral that leads to the creation of an iconic villain.",
    cast: [
      { name: "Joaquin P.", role: "Arthur", avatar: img("j1", 200, 200) },
      { name: "Robert D. N.", role: "Murray", avatar: img("j2", 200, 200) },
    ],
    format: ["2D"],
    certificate: "A",
  },
];
const curatedTheaters = [
  {
    id: "pvr-orion",
    name: "PVR INOX: Orion Mall",
    city: "Bengaluru",
    area: "Rajajinagar",
    address: "Orion Mall, Dr Rajkumar Road, Rajajinagar",
    distance: "3.2 km",
    amenities: ["IMAX", "Dolby Atmos", "Parking", "F&B"],
  },
  {
    id: "inox-garuda",
    name: "INOX: Garuda Mall",
    city: "Bengaluru",
    area: "Magrath Road",
    address: "Garuda Mall, Magrath Road",
    distance: "5.6 km",
    amenities: ["Laser projection", "Recliners", "F&B"],
  },
  {
    id: "cinepolis-forum",
    name: "Cinepolis: Forum Shantiniketan",
    city: "Bengaluru",
    area: "Whitefield",
    address: "Forum Shantiniketan Mall, Whitefield",
    distance: "7.1 km",
    amenities: ["Dolby 7.1", "Parking", "Family seats"],
  },
  {
    id: "pvr-vega",
    name: "PVR: Vega City",
    city: "Bengaluru",
    area: "Bannerghatta Road",
    address: "Vega City Mall, Bannerghatta Road",
    distance: "9.4 km",
    amenities: ["Dolby Atmos", "Premium seats", "F&B"],
  },
  {
    id: "pvr-phoenix-mumbai",
    name: "PVR ICON: Phoenix Palladium",
    city: "Mumbai",
    area: "Lower Parel",
    address: "Phoenix Palladium, Senapati Bapat Marg",
    distance: "4.8 km",
    amenities: ["Luxe seats", "Dolby Atmos", "Parking"],
  },
  {
    id: "inox-r-city-mumbai",
    name: "INOX: R City Mall",
    city: "Mumbai",
    area: "Ghatkopar",
    address: "R City Mall, LBS Marg, Ghatkopar West",
    distance: "8.2 km",
    amenities: ["Laser projection", "Food court", "Parking"],
  },
  {
    id: "pvr-select-delhi",
    name: "PVR: Select Citywalk",
    city: "Delhi NCR",
    area: "Saket",
    address: "Select Citywalk Mall, Saket",
    distance: "6.1 km",
    amenities: ["IMAX", "Recliners", "F&B"],
  },
  {
    id: "cinepolis-dlf-delhi",
    name: "Cinepolis: DLF Avenue",
    city: "Delhi NCR",
    area: "Saket",
    address: "DLF Avenue Mall, Saket",
    distance: "6.6 km",
    amenities: ["Dolby 7.1", "Parking", "Cafe"],
  },
  {
    id: "samdareeya-era-jabalpur",
    name: "Samdareeya Era Cinema",
    city: "Jabalpur",
    area: "Napier Town",
    address: "Samdareeya Mall, Civic Centre, Jabalpur",
    distance: "2.4 km",
    amenities: ["Dolby 7.1", "M-Ticket", "Food & Beverage"],
    showPlan: [
      { time: "08:30 PM", format: "Dolby 7.1", status: "ok", cancellable: false },
      { time: "10:55 PM", format: "Dolby 7.1", status: "ok", cancellable: false },
    ],
  },
  {
    id: "pvr-ka-mall-jabalpur",
    name: "PVR: KA Mall",
    city: "Jabalpur",
    area: "Vijay Nagar",
    address: "KA Mall, Vijay Nagar, Jabalpur",
    distance: "5.8 km",
    amenities: ["Recliners", "Parking", "M-Ticket"],
    showPlan: [{ time: "11:25 PM", format: "2D", status: "ok", cancellable: true }],
  },
  {
    id: "movie-magic-sam-jabalpur",
    name: "Movie Magic (SAM)",
    city: "Jabalpur",
    area: "Russel Chowk",
    address: "SAM Complex, Russel Chowk, Jabalpur",
    distance: "3.1 km",
    amenities: ["Laser", "F&B", "Parking"],
    showPlan: [
      { time: "09:21 PM", format: "2D", status: "fast", cancellable: false },
      { time: "09:30 PM", format: "Laser", status: "ok", cancellable: false },
    ],
  },
  {
    id: "sr-cinema-jabalpur",
    name: "SR Cinema",
    city: "Jabalpur",
    area: "Madan Mahal",
    address: "Madan Mahal Road, Jabalpur",
    distance: "4.5 km",
    amenities: ["M-Ticket", "Snacks", "Parking"],
    showPlan: [{ time: "09:15 PM", format: "2D", status: "ok", cancellable: true }],
  },
];
const cinemaBrandTemplates = [
  {
    name: "PVR INOX",
    amenities: ["Laser projection", "Dolby 7.1", "M-Ticket", "F&B"],
    logoText: "PVR",
  },
  {
    name: "MovieMax",
    amenities: ["Recliners", "Dolby Atmos", "Parking", "Food court"],
    logoText: "MX",
  },
  {
    name: "Cinepolis",
    amenities: ["4K projection", "Cafe", "M-Ticket", "Family seats"],
    logoText: "CP",
  },
  {
    name: "Miraj Cinemas",
    amenities: ["Dolby 7.1", "Snacks", "Parking", "Wheelchair access"],
    logoText: "MJ",
  },
  {
    name: "Carnival Cinemas",
    amenities: ["Digital projection", "F&B", "M-Ticket", "Parking"],
    logoText: "CC",
  },
];
const cityShowPlanTemplates = [
  [
    { time: "10:30 AM", format: "2D", status: "ok", cancellable: true, screen: "Screen 1" },
    { time: "01:45 PM", format: "2D", status: "ok", cancellable: true, screen: "Screen 2" },
    { time: "07:15 PM", format: "Dolby 7.1", status: "fast", cancellable: false, screen: "Audi 1" },
    { time: "10:30 PM", format: "2D", status: "ok", cancellable: false, screen: "Screen 3" },
  ],
  [
    { time: "09:45 AM", format: "2D", status: "ok", cancellable: true, screen: "Screen 1" },
    { time: "12:55 PM", format: "3D", status: "ok", cancellable: true, screen: "Screen 2" },
    { time: "04:20 PM", format: "2D", status: "ok", cancellable: true, screen: "Screen 3" },
    { time: "08:40 PM", format: "Laser", status: "fast", cancellable: false, screen: "Audi 2" },
  ],
  [
    { time: "11:10 AM", format: "2D", status: "ok", cancellable: true, screen: "Screen 1" },
    { time: "02:30 PM", format: "IMAX", status: "fast", cancellable: false, screen: "IMAX" },
    { time: "06:05 PM", format: "2D", status: "ok", cancellable: true, screen: "Screen 4" },
    { time: "09:50 PM", format: "4DX", status: "ok", cancellable: false, screen: "4DX" },
  ],
];
const theaters = buildNationalTheaterCatalog(curatedTheaters);
const showTimes = ["10:30 AM", "01:45 PM", "04:30 PM", "07:15 PM", "10:30 PM"];

function buildNationalTheaterCatalog(curated) {
  const curatedCityKeys = new Set(curated.map((theater) => normalizeCatalogKey(theater.city)));
  const generated = SEARCHABLE_CITY_OPTIONS.filter(
    (option) => !curatedCityKeys.has(normalizeCatalogKey(option.city)),
  ).map(makeCityTheater);

  return [...curated, ...generated];
}

function makeCityTheater(option, index) {
  const brand = cinemaBrandTemplates[index % cinemaBrandTemplates.length];
  const city = option.city;
  const state = stripTerritorySuffix(option.state);
  const area = getGeneratedArea(city, state);

  return {
    id: `${slugify(brand.name)}-${slugify(city)}`,
    name: `${brand.name}: ${city}`,
    city,
    area,
    address: `${area}, ${city}${state ? `, ${state}` : ""}`,
    distance: `${(2.2 + (index % 9) * 0.6).toFixed(1)} km`,
    amenities: brand.amenities,
    logoText: brand.logoText,
    movieIds: movies.map((movie) => movie.id),
    showPlan: cityShowPlanTemplates[index % cityShowPlanTemplates.length],
  };
}

function getGeneratedArea(city, state) {
  const cleanedState = stripTerritorySuffix(state);
  if (!cleanedState) return `${city} Central`;
  return `${cleanedState.split(" ")[0]} Mall Road`;
}

function stripTerritorySuffix(value) {
  return String(value ?? "")
    .replace(/\s*\([^)]*\)/g, "")
    .trim();
}

function normalizeCatalogKey(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function slugify(value) {
  return normalizeCatalogKey(value)
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getMovie(id) {
  return movies.find((m) => m.id === id);
}
export { getMovie, movies, showTimes, theaters };
