import { SEARCHABLE_CITY_OPTIONS } from "../../../shared/services/cityPreference.js";
import { upcomingMovies as comingSoonMovies } from "./upcomingMovieCatalog.js";

const movies = [];

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
  return movies.find((m) => m.id === id) ?? comingSoonMovies.find((m) => m.id === id);
}
export { comingSoonMovies, getMovie, movies, showTimes, theaters };
