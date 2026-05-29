import "dotenv/config";
import mongoose from "mongoose";
import { Booking } from "../server/models/Booking.js";
import { Movie } from "../server/models/Movie.js";
import { Review } from "../server/models/Review.js";
import { Show } from "../server/models/Show.js";
import { Subscriber } from "../server/models/Subscriber.js";
import { Theater } from "../server/models/Theater.js";
import { User } from "../server/models/User.js";
import {
  movies as catalogMovies,
  showTimes,
  theaters as catalogTheaters,
} from "../src/features/movies/data/movieCatalog.js";

const mongoUri = cleanEnv(process.env.MONGODB_URI);
const mongoDb = cleanEnv(process.env.MONGODB_DB) || "moviex";
const WRITE_BATCH_SIZE = 750;

const movieArtwork = {
  jawan: {
    poster: "https://upload.wikimedia.org/wikipedia/en/3/39/Jawan_film_poster.jpg",
    backdrop: "https://upload.wikimedia.org/wikipedia/en/3/39/Jawan_film_poster.jpg",
  },
  pathaan: {
    poster: "https://upload.wikimedia.org/wikipedia/en/c/c3/Pathaan_film_poster.jpg",
    backdrop: "https://upload.wikimedia.org/wikipedia/en/c/c3/Pathaan_film_poster.jpg",
  },
  animal: {
    poster: "https://upload.wikimedia.org/wikipedia/en/9/90/Animal_%282023_film%29_poster.jpg",
    backdrop: "https://upload.wikimedia.org/wikipedia/en/9/90/Animal_%282023_film%29_poster.jpg",
  },
  fighter: {
    poster: "https://upload.wikimedia.org/wikipedia/en/d/df/Fighter_film_teaser.jpg",
    backdrop: "https://upload.wikimedia.org/wikipedia/en/d/df/Fighter_film_teaser.jpg",
  },
  "stree-2": {
    poster: "https://upload.wikimedia.org/wikipedia/en/a/a1/Stree_2.jpg",
    backdrop: "https://upload.wikimedia.org/wikipedia/en/a/a1/Stree_2.jpg",
  },
  "12th-fail": {
    poster: "https://upload.wikimedia.org/wikipedia/en/f/f2/12th_Fail_poster.jpeg",
    backdrop: "https://upload.wikimedia.org/wikipedia/en/f/f2/12th_Fail_poster.jpeg",
  },
  "drishyam-2": {
    poster: "https://upload.wikimedia.org/wikipedia/en/3/3f/Drishyam_2.jpg",
    backdrop: "https://upload.wikimedia.org/wikipedia/en/3/3f/Drishyam_2.jpg",
  },
  brahmastra: {
    poster: "https://upload.wikimedia.org/wikipedia/en/e/ea/Brahmastra_Part_One_Shiva.jpg",
    backdrop: "https://upload.wikimedia.org/wikipedia/en/e/ea/Brahmastra_Part_One_Shiva.jpg",
  },
  tumbbad: {
    poster: "https://upload.wikimedia.org/wikipedia/en/4/41/Tumbbad_poster.jpg",
    backdrop: "https://upload.wikimedia.org/wikipedia/en/4/41/Tumbbad_poster.jpg",
  },
  andhadhun: {
    poster: "https://upload.wikimedia.org/wikipedia/en/4/47/Andhadhun_poster.jpg",
    backdrop: "https://upload.wikimedia.org/wikipedia/en/4/47/Andhadhun_poster.jpg",
  },
  rrr: {
    poster: "https://upload.wikimedia.org/wikipedia/en/d/d7/RRR_Poster.jpg",
    backdrop: "https://upload.wikimedia.org/wikipedia/en/d/d7/RRR_Poster.jpg",
  },
  "kgf-chapter-2": {
    poster: "https://upload.wikimedia.org/wikipedia/en/d/d0/K.G.F_Chapter_2.jpg",
    backdrop: "https://upload.wikimedia.org/wikipedia/en/d/d0/K.G.F_Chapter_2.jpg",
  },
  kantara: {
    poster: "https://upload.wikimedia.org/wikipedia/en/8/84/Kantara_poster.jpeg",
    backdrop: "https://upload.wikimedia.org/wikipedia/en/8/84/Kantara_poster.jpeg",
  },
  pushpa: {
    poster: "https://upload.wikimedia.org/wikipedia/en/7/75/Pushpa_-_The_Rise_%282021_film%29.jpg",
    backdrop:
      "https://upload.wikimedia.org/wikipedia/en/7/75/Pushpa_-_The_Rise_%282021_film%29.jpg",
  },
  "kalki-2898-ad": {
    poster: "https://upload.wikimedia.org/wikipedia/en/4/4c/Kalki_2898_AD.jpg",
    backdrop: "https://upload.wikimedia.org/wikipedia/en/4/4c/Kalki_2898_AD.jpg",
  },
  vikram: {
    poster: "https://upload.wikimedia.org/wikipedia/en/9/93/Vikram_2022_poster.jpg",
    backdrop: "https://upload.wikimedia.org/wikipedia/en/9/93/Vikram_2022_poster.jpg",
  },
  leo: {
    poster: "https://upload.wikimedia.org/wikipedia/en/7/75/Leo_%282023_Indian_film%29.jpg",
    backdrop: "https://upload.wikimedia.org/wikipedia/en/7/75/Leo_%282023_Indian_film%29.jpg",
  },
  maharaja: {
    poster: "https://upload.wikimedia.org/wikipedia/en/8/82/Maharaja_2024_film_poster.jpg",
    backdrop: "https://upload.wikimedia.org/wikipedia/en/8/82/Maharaja_2024_film_poster.jpg",
  },
  "manjummel-boys": {
    poster: "https://upload.wikimedia.org/wikipedia/en/9/99/Manjummel_Boys_poster.jpg",
    backdrop: "https://upload.wikimedia.org/wikipedia/en/9/99/Manjummel_Boys_poster.jpg",
  },
  aavesham: {
    poster: "https://upload.wikimedia.org/wikipedia/en/d/d1/Aavesham.jpg",
    backdrop: "https://upload.wikimedia.org/wikipedia/en/d/d1/Aavesham.jpg",
  },
  premalu: {
    poster: "https://upload.wikimedia.org/wikipedia/en/c/c5/Premalu_film_poster.jpg",
    backdrop: "https://upload.wikimedia.org/wikipedia/en/c/c5/Premalu_film_poster.jpg",
  },
  chhaava: {
    poster: "https://upload.wikimedia.org/wikipedia/en/7/75/Chhaava_film_poster.jpg",
    backdrop: "https://upload.wikimedia.org/wikipedia/en/7/75/Chhaava_film_poster.jpg",
  },
  "sitaare-zameen-par": {
    poster: "https://upload.wikimedia.org/wikipedia/en/4/44/Sitaare_Zameen_Par_poster.jpg",
    backdrop: "https://upload.wikimedia.org/wikipedia/en/4/44/Sitaare_Zameen_Par_poster.jpg",
  },
  "war-2": {
    poster: "https://upload.wikimedia.org/wikipedia/en/f/f5/War_2_official_poster.jpg",
    backdrop: "https://upload.wikimedia.org/wikipedia/en/f/f5/War_2_official_poster.jpg",
  },
  "avatar-the-way-of-water": {
    poster: "https://upload.wikimedia.org/wikipedia/en/5/54/Avatar_The_Way_of_Water_poster.jpg",
    backdrop: "https://upload.wikimedia.org/wikipedia/en/5/54/Avatar_The_Way_of_Water_poster.jpg",
  },
  "top-gun-maverick": {
    poster: "https://upload.wikimedia.org/wikipedia/en/1/13/Top_Gun_Maverick_Poster.jpg",
    backdrop: "https://upload.wikimedia.org/wikipedia/en/1/13/Top_Gun_Maverick_Poster.jpg",
  },
  "mission-impossible-dead-reckoning": {
    poster:
      "https://upload.wikimedia.org/wikipedia/en/e/ed/Mission-_Impossible_%E2%80%93_Dead_Reckoning_Part_One_poster.jpg",
    backdrop:
      "https://upload.wikimedia.org/wikipedia/en/e/ed/Mission-_Impossible_%E2%80%93_Dead_Reckoning_Part_One_poster.jpg",
  },
  "john-wick-4": {
    poster:
      "https://upload.wikimedia.org/wikipedia/en/d/d0/John_Wick_-_Chapter_4_promotional_poster.jpg",
    backdrop:
      "https://upload.wikimedia.org/wikipedia/en/d/d0/John_Wick_-_Chapter_4_promotional_poster.jpg",
  },
  "godzilla-x-kong": {
    poster:
      "https://upload.wikimedia.org/wikipedia/en/b/be/Godzilla_x_kong_the_new_empire_poster.jpg",
    backdrop:
      "https://upload.wikimedia.org/wikipedia/en/b/be/Godzilla_x_kong_the_new_empire_poster.jpg",
  },
  "inside-out-2": {
    poster: "https://upload.wikimedia.org/wikipedia/en/f/f7/Inside_Out_2_poster.jpg",
    backdrop: "https://upload.wikimedia.org/wikipedia/en/f/f7/Inside_Out_2_poster.jpg",
  },
  "deadpool-wolverine": {
    poster: "https://upload.wikimedia.org/wikipedia/en/4/4c/Deadpool_%26_Wolverine_poster.jpg",
    backdrop: "https://upload.wikimedia.org/wikipedia/en/4/4c/Deadpool_%26_Wolverine_poster.jpg",
  },
  "guardians-vol-3": {
    poster:
      "https://upload.wikimedia.org/wikipedia/en/7/74/Guardians_of_the_Galaxy_Vol._3_poster.jpg",
    backdrop:
      "https://upload.wikimedia.org/wikipedia/en/7/74/Guardians_of_the_Galaxy_Vol._3_poster.jpg",
  },
  "the-flash": {
    poster: "https://upload.wikimedia.org/wikipedia/en/e/ed/The_Flash_%28film%29_poster.jpg",
    backdrop: "https://upload.wikimedia.org/wikipedia/en/e/ed/The_Flash_%28film%29_poster.jpg",
  },
  wonka: {
    poster: "https://upload.wikimedia.org/wikipedia/en/9/90/Wonka_2023_film_poster.jpg",
    backdrop: "https://upload.wikimedia.org/wikipedia/en/9/90/Wonka_2023_film_poster.jpg",
  },
  "the-marvels": {
    poster: "https://upload.wikimedia.org/wikipedia/en/7/7a/The_Marvels_poster.jpg",
    backdrop: "https://upload.wikimedia.org/wikipedia/en/7/7a/The_Marvels_poster.jpg",
  },
  napoleon: {
    poster: "https://upload.wikimedia.org/wikipedia/en/2/2e/Napoleon_Film_poster.jpg",
    backdrop: "https://upload.wikimedia.org/wikipedia/en/2/2e/Napoleon_Film_poster.jpg",
  },
  "poor-things": {
    poster: "https://upload.wikimedia.org/wikipedia/en/f/f3/Poor_Things_poster.jpg",
    backdrop: "https://upload.wikimedia.org/wikipedia/en/f/f3/Poor_Things_poster.jpg",
  },
  "killers-of-the-flower-moon": {
    poster:
      "https://upload.wikimedia.org/wikipedia/en/8/88/Killers_of_the_Flower_Moon_film_poster.jpg",
    backdrop:
      "https://upload.wikimedia.org/wikipedia/en/8/88/Killers_of_the_Flower_Moon_film_poster.jpg",
  },
  "civil-war": {
    poster: "https://upload.wikimedia.org/wikipedia/en/0/0d/Civil_War_2024_film_poster.jpeg",
    backdrop: "https://upload.wikimedia.org/wikipedia/en/0/0d/Civil_War_2024_film_poster.jpeg",
  },
  furiosa: {
    poster: "https://upload.wikimedia.org/wikipedia/en/3/34/Furiosa_A_Mad_Max_Saga.jpg",
    backdrop: "https://upload.wikimedia.org/wikipedia/en/3/34/Furiosa_A_Mad_Max_Saga.jpg",
  },
  "a-quiet-place-day-one": {
    poster:
      "https://upload.wikimedia.org/wikipedia/en/e/e7/A_Quiet_Place_Day_One_%282024%29_poster.jpg",
    backdrop:
      "https://upload.wikimedia.org/wikipedia/en/e/e7/A_Quiet_Place_Day_One_%282024%29_poster.jpg",
  },
  twisters: {
    poster:
      "https://upload.wikimedia.org/wikipedia/en/2/24/Twisters_Official_US_Theatrical_Poster.jpg",
    backdrop:
      "https://upload.wikimedia.org/wikipedia/en/2/24/Twisters_Official_US_Theatrical_Poster.jpg",
  },
  "despicable-me-4": {
    poster:
      "https://upload.wikimedia.org/wikipedia/en/e/ed/Despicable_Me_4_Theatrical_Release_Poster.jpeg",
    backdrop:
      "https://upload.wikimedia.org/wikipedia/en/e/ed/Despicable_Me_4_Theatrical_Release_Poster.jpeg",
  },
  "kingdom-of-the-planet-of-the-apes": {
    poster:
      "https://upload.wikimedia.org/wikipedia/en/c/cf/Kingdom_of_the_Planet_of_the_Apes_poster.jpg",
    backdrop:
      "https://upload.wikimedia.org/wikipedia/en/c/cf/Kingdom_of_the_Planet_of_the_Apes_poster.jpg",
  },
  "bad-boys-ride-or-die": {
    poster:
      "https://upload.wikimedia.org/wikipedia/en/8/8b/Bad_Boys_Ride_or_Die_%282024%29_poster.jpg",
    backdrop:
      "https://upload.wikimedia.org/wikipedia/en/8/8b/Bad_Boys_Ride_or_Die_%282024%29_poster.jpg",
  },
  "alien-romulus": {
    poster: "https://upload.wikimedia.org/wikipedia/en/c/cb/Alien_Romulus_2024_%28poster%29.jpg",
    backdrop: "https://upload.wikimedia.org/wikipedia/en/c/cb/Alien_Romulus_2024_%28poster%29.jpg",
  },
  "joker-folie-a-deux": {
    poster: "https://upload.wikimedia.org/wikipedia/en/e/e8/Joker_-_Folie_%C3%A0_Deux_poster.jpg",
    backdrop: "https://upload.wikimedia.org/wikipedia/en/e/e8/Joker_-_Folie_%C3%A0_Deux_poster.jpg",
  },
  "gladiator-2": {
    poster: "https://upload.wikimedia.org/wikipedia/en/0/04/Gladiator_II_%282024%29_poster.jpg",
    backdrop: "https://upload.wikimedia.org/wikipedia/en/0/04/Gladiator_II_%282024%29_poster.jpg",
  },
  "moana-2": {
    poster: "https://upload.wikimedia.org/wikipedia/en/7/73/Moana_2_poster.jpg",
    backdrop: "https://upload.wikimedia.org/wikipedia/en/7/73/Moana_2_poster.jpg",
  },
  wicked: {
    poster: "https://upload.wikimedia.org/wikipedia/en/3/3c/Wicked_%282024_film%29_poster.png",
    backdrop: "https://upload.wikimedia.org/wikipedia/en/3/3c/Wicked_%282024_film%29_poster.png",
  },
};

const extraMovies = [
  movieSeed(
    "jawan",
    "Jawan",
    ["Action", "Thriller"],
    "Hindi",
    "2h 49m",
    8.2,
    "612.4K",
    "07 Sep, 2023",
    "A prison warden and his team fight corruption through a string of high-stakes missions.",
    ["2D", "IMAX"],
  ),
  movieSeed(
    "pathaan",
    "Pathaan",
    ["Action", "Adventure", "Thriller"],
    "Hindi",
    "2h 26m",
    7.8,
    "498.2K",
    "25 Jan, 2023",
    "An exiled agent returns to stop a global threat before it reaches Indian soil.",
    ["2D", "IMAX", "4DX"],
  ),
  movieSeed(
    "animal",
    "Animal",
    ["Action", "Crime", "Drama"],
    "Hindi",
    "3h 21m",
    7.4,
    "433.8K",
    "01 Dec, 2023",
    "A volatile family bond explodes into a violent chain of loyalty, power and revenge.",
    ["2D"],
  ),
  movieSeed(
    "fighter",
    "Fighter",
    ["Action", "Drama"],
    "Hindi",
    "2h 46m",
    7.1,
    "198.6K",
    "25 Jan, 2024",
    "Elite pilots face a dangerous mission that tests courage, friendship and sacrifice.",
    ["2D", "IMAX"],
  ),
  movieSeed(
    "stree-2",
    "Stree 2",
    ["Comedy", "Horror"],
    "Hindi",
    "2h 29m",
    8.1,
    "268.5K",
    "15 Aug, 2024",
    "A small town faces a new supernatural scare with humour, mystery and chaos.",
    ["2D"],
  ),
  movieSeed(
    "12th-fail",
    "12th Fail",
    ["Biography", "Drama"],
    "Hindi",
    "2h 26m",
    9.0,
    "321.9K",
    "27 Oct, 2023",
    "A determined student rebuilds his life around one impossible civil-services dream.",
    ["2D"],
  ),
  movieSeed(
    "drishyam-2",
    "Drishyam 2",
    ["Crime", "Drama", "Thriller"],
    "Hindi",
    "2h 20m",
    8.3,
    "285.4K",
    "18 Nov, 2022",
    "A family tries to stay ahead as an old investigation returns with fresh pressure.",
    ["2D"],
  ),
  movieSeed(
    "brahmastra",
    "Brahmastra Part One: Shiva",
    ["Action", "Adventure", "Fantasy"],
    "Hindi",
    "2h 47m",
    6.8,
    "241.7K",
    "09 Sep, 2022",
    "A young man discovers a secret world of ancient powers and a destiny tied to fire.",
    ["2D", "3D", "IMAX"],
  ),
  movieSeed(
    "tumbbad",
    "Tumbbad",
    ["Fantasy", "Horror", "Thriller"],
    "Hindi",
    "1h 53m",
    8.8,
    "156.3K",
    "12 Oct, 2018",
    "A cursed treasure turns greed into a generational nightmare.",
    ["2D"],
  ),
  movieSeed(
    "andhadhun",
    "Andhadhun",
    ["Crime", "Mystery", "Thriller"],
    "Hindi",
    "2h 19m",
    8.5,
    "226.1K",
    "05 Oct, 2018",
    "A pianist's carefully controlled life collapses after he witnesses a murder.",
    ["2D"],
  ),
  movieSeed(
    "rrr",
    "RRR",
    ["Action", "Drama"],
    "Telugu",
    "3h 7m",
    8.7,
    "528.0K",
    "25 Mar, 2022",
    "Two revolutionaries become brothers in arms while fighting an empire.",
    ["2D", "IMAX"],
  ),
  movieSeed(
    "kgf-chapter-2",
    "KGF: Chapter 2",
    ["Action", "Crime", "Drama"],
    "Kannada",
    "2h 48m",
    8.4,
    "478.2K",
    "14 Apr, 2022",
    "Rocky's empire rises while enemies close in from every side.",
    ["2D", "IMAX"],
  ),
  movieSeed(
    "kantara",
    "Kantara",
    ["Action", "Drama", "Mystery"],
    "Kannada",
    "2h 30m",
    8.6,
    "318.7K",
    "30 Sep, 2022",
    "A village conflict awakens ancient beliefs and a fierce guardian spirit.",
    ["2D"],
  ),
  movieSeed(
    "pushpa",
    "Pushpa: The Rise",
    ["Action", "Crime", "Drama"],
    "Telugu",
    "2h 59m",
    7.9,
    "392.5K",
    "17 Dec, 2021",
    "A labourer climbs the red sandalwood smuggling world with swagger and danger.",
    ["2D"],
  ),
  movieSeed(
    "kalki-2898-ad",
    "Kalki 2898 AD",
    ["Action", "Sci-Fi", "Fantasy"],
    "Telugu",
    "3h 1m",
    8.0,
    "354.9K",
    "27 Jun, 2024",
    "In a dystopian future, legends and technology collide around a promised saviour.",
    ["2D", "3D", "IMAX"],
  ),
  movieSeed(
    "vikram",
    "Vikram",
    ["Action", "Thriller"],
    "Tamil",
    "2h 54m",
    8.3,
    "289.1K",
    "03 Jun, 2022",
    "A covert squad goes after a dangerous drug network and its hidden kingpin.",
    ["2D"],
  ),
  movieSeed(
    "leo",
    "Leo",
    ["Action", "Crime", "Thriller"],
    "Tamil",
    "2h 44m",
    7.5,
    "301.4K",
    "19 Oct, 2023",
    "A cafe owner's past catches fire when violent strangers arrive in town.",
    ["2D", "IMAX"],
  ),
  movieSeed(
    "maharaja",
    "Maharaja",
    ["Action", "Drama", "Thriller"],
    "Tamil",
    "2h 21m",
    8.6,
    "172.9K",
    "14 Jun, 2024",
    "A quiet man's missing possession leads to a layered story of grief and justice.",
    ["2D"],
  ),
  movieSeed(
    "manjummel-boys",
    "Manjummel Boys",
    ["Adventure", "Drama", "Thriller"],
    "Malayalam",
    "2h 15m",
    8.7,
    "146.8K",
    "22 Feb, 2024",
    "A friends' trip turns into a desperate rescue inside a dangerous cave system.",
    ["2D"],
  ),
  movieSeed(
    "aavesham",
    "Aavesham",
    ["Action", "Comedy"],
    "Malayalam",
    "2h 38m",
    8.0,
    "132.5K",
    "11 Apr, 2024",
    "College trouble pulls three students into the orbit of an unpredictable local don.",
    ["2D"],
  ),
  movieSeed(
    "premalu",
    "Premalu",
    ["Comedy", "Romance"],
    "Malayalam",
    "2h 36m",
    7.9,
    "118.2K",
    "09 Feb, 2024",
    "A charming romantic comedy follows confused young hearts in a new city.",
    ["2D"],
  ),
  movieSeed(
    "chhaava",
    "Chhaava",
    ["Action", "Drama", "History"],
    "Hindi",
    "2h 41m",
    8.1,
    "96.2K",
    "14 Feb, 2025",
    "A historical warrior drama built around courage, duty and sacrifice.",
    ["2D", "IMAX"],
  ),
  movieSeed(
    "sitaare-zameen-par",
    "Sitaare Zameen Par",
    ["Drama", "Comedy"],
    "Hindi",
    "2h 35m",
    7.7,
    "84.9K",
    "20 Jun, 2025",
    "A coach discovers new ways to learn, lead and care through a spirited team.",
    ["2D"],
  ),
  movieSeed(
    "war-2",
    "War 2",
    ["Action", "Thriller"],
    "Hindi",
    "2h 42m",
    7.9,
    "91.6K",
    "14 Aug, 2025",
    "An elite spy mission turns personal when rivals collide across borders.",
    ["2D", "IMAX", "4DX"],
  ),
  movieSeed(
    "avatar-the-way-of-water",
    "Avatar: The Way of Water",
    ["Adventure", "Sci-Fi", "Fantasy"],
    "English",
    "3h 12m",
    8.0,
    "702.8K",
    "16 Dec, 2022",
    "The Sully family explores ocean clans while a familiar threat returns.",
    ["3D", "IMAX", "4DX"],
  ),
  movieSeed(
    "top-gun-maverick",
    "Top Gun: Maverick",
    ["Action", "Drama"],
    "English",
    "2h 11m",
    8.6,
    "687.4K",
    "27 May, 2022",
    "A veteran pilot trains a new generation for a mission with impossible odds.",
    ["2D", "IMAX", "4DX"],
  ),
  movieSeed(
    "mission-impossible-dead-reckoning",
    "Mission: Impossible - Dead Reckoning",
    ["Action", "Adventure", "Thriller"],
    "English",
    "2h 43m",
    7.9,
    "352.0K",
    "12 Jul, 2023",
    "Ethan Hunt races against a powerful AI threat and old enemies.",
    ["2D", "IMAX"],
  ),
  movieSeed(
    "john-wick-4",
    "John Wick: Chapter 4",
    ["Action", "Crime", "Thriller"],
    "English",
    "2h 49m",
    8.4,
    "514.3K",
    "24 Mar, 2023",
    "John Wick challenges the High Table in a globe-spanning fight for freedom.",
    ["2D", "IMAX"],
  ),
  movieSeed(
    "godzilla-x-kong",
    "Godzilla x Kong: The New Empire",
    ["Action", "Adventure", "Fantasy"],
    "English",
    "1h 55m",
    7.2,
    "208.4K",
    "29 Mar, 2024",
    "Two titans face a hidden threat rising from the depths of the Hollow Earth.",
    ["2D", "3D", "IMAX"],
  ),
  movieSeed(
    "inside-out-2",
    "Inside Out 2",
    ["Animation", "Comedy", "Family"],
    "English",
    "1h 36m",
    8.0,
    "254.8K",
    "14 Jun, 2024",
    "New emotions arrive as Riley enters a complicated teenage chapter.",
    ["2D", "3D"],
  ),
  movieSeed(
    "deadpool-wolverine",
    "Deadpool & Wolverine",
    ["Action", "Comedy", "Sci-Fi"],
    "English",
    "2h 8m",
    8.1,
    "398.2K",
    "26 Jul, 2024",
    "Two chaotic heroes crash through timelines with jokes, claws and carnage.",
    ["2D", "IMAX", "4DX"],
  ),
  movieSeed(
    "guardians-vol-3",
    "Guardians of the Galaxy Vol. 3",
    ["Action", "Adventure", "Comedy"],
    "English",
    "2h 30m",
    8.2,
    "421.5K",
    "05 May, 2023",
    "The Guardians confront Rocket's past while trying to save one of their own.",
    ["2D", "IMAX"],
  ),
  movieSeed(
    "the-flash",
    "The Flash",
    ["Action", "Adventure", "Fantasy"],
    "English",
    "2h 24m",
    6.9,
    "238.9K",
    "16 Jun, 2023",
    "A speedster's attempt to change the past fractures worlds and consequences.",
    ["2D", "IMAX"],
  ),
  movieSeed(
    "wonka",
    "Wonka",
    ["Adventure", "Comedy", "Family"],
    "English",
    "1h 56m",
    7.3,
    "209.7K",
    "15 Dec, 2023",
    "A young chocolatier dreams up a magical business against impossible odds.",
    ["2D"],
  ),
  movieSeed(
    "the-marvels",
    "The Marvels",
    ["Action", "Adventure", "Sci-Fi"],
    "English",
    "1h 45m",
    6.3,
    "156.8K",
    "10 Nov, 2023",
    "Three heroes swap places and team up against a cosmic threat.",
    ["2D", "IMAX"],
  ),
  movieSeed(
    "napoleon",
    "Napoleon",
    ["Action", "Biography", "Drama"],
    "English",
    "2h 38m",
    6.8,
    "183.5K",
    "24 Nov, 2023",
    "A sweeping look at ambition, empire and a ruler's turbulent personal life.",
    ["2D"],
  ),
  movieSeed(
    "poor-things",
    "Poor Things",
    ["Comedy", "Drama", "Sci-Fi"],
    "English",
    "2h 21m",
    8.0,
    "224.1K",
    "08 Dec, 2023",
    "A young woman discovers the world with bold curiosity and strange brilliance.",
    ["2D"],
  ),
  movieSeed(
    "killers-of-the-flower-moon",
    "Killers of the Flower Moon",
    ["Crime", "Drama", "History"],
    "English",
    "3h 26m",
    7.8,
    "291.3K",
    "20 Oct, 2023",
    "A community faces greed and violence during a series of chilling murders.",
    ["2D"],
  ),
  movieSeed(
    "civil-war",
    "Civil War",
    ["Action", "Drama", "Thriller"],
    "English",
    "1h 49m",
    7.4,
    "164.2K",
    "12 Apr, 2024",
    "Journalists cross a divided country while conflict closes in around them.",
    ["2D", "IMAX"],
  ),
  movieSeed(
    "furiosa",
    "Furiosa: A Mad Max Saga",
    ["Action", "Adventure", "Sci-Fi"],
    "English",
    "2h 28m",
    8.0,
    "211.6K",
    "24 May, 2024",
    "A young warrior is forged by the wasteland before becoming a legend.",
    ["2D", "IMAX", "4DX"],
  ),
  movieSeed(
    "a-quiet-place-day-one",
    "A Quiet Place: Day One",
    ["Drama", "Horror", "Sci-Fi"],
    "English",
    "1h 39m",
    7.0,
    "129.8K",
    "28 Jun, 2024",
    "The first day of an alien invasion unfolds through silence and survival.",
    ["2D", "IMAX"],
  ),
  movieSeed(
    "twisters",
    "Twisters",
    ["Action", "Adventure", "Thriller"],
    "English",
    "2h 2m",
    7.1,
    "137.4K",
    "19 Jul, 2024",
    "Storm chasers face a new wave of extreme tornadoes and old risks.",
    ["2D", "4DX"],
  ),
  movieSeed(
    "despicable-me-4",
    "Despicable Me 4",
    ["Animation", "Comedy", "Family"],
    "English",
    "1h 34m",
    6.7,
    "112.1K",
    "03 Jul, 2024",
    "Gru's family faces a new villain while the Minions create fresh chaos.",
    ["2D", "3D"],
  ),
  movieSeed(
    "kingdom-of-the-planet-of-the-apes",
    "Kingdom of the Planet of the Apes",
    ["Action", "Adventure", "Sci-Fi"],
    "English",
    "2h 25m",
    7.5,
    "203.9K",
    "10 May, 2024",
    "Generations after Caesar, a young ape questions power, history and freedom.",
    ["2D", "IMAX"],
  ),
  movieSeed(
    "bad-boys-ride-or-die",
    "Bad Boys: Ride or Die",
    ["Action", "Comedy", "Crime"],
    "English",
    "1h 55m",
    7.0,
    "120.3K",
    "07 Jun, 2024",
    "Two Miami detectives go rogue to clear a name and survive a conspiracy.",
    ["2D"],
  ),
  movieSeed(
    "alien-romulus",
    "Alien: Romulus",
    ["Horror", "Sci-Fi", "Thriller"],
    "English",
    "1h 59m",
    7.3,
    "132.7K",
    "16 Aug, 2024",
    "Young scavengers encounter a deadly organism aboard an abandoned station.",
    ["2D", "IMAX"],
  ),
  movieSeed(
    "joker-folie-a-deux",
    "Joker: Folie a Deux",
    ["Crime", "Drama", "Musical"],
    "English",
    "2h 18m",
    6.9,
    "104.2K",
    "04 Oct, 2024",
    "A broken performer finds a new duet inside a dangerous public spectacle.",
    ["2D", "IMAX"],
  ),
  movieSeed(
    "gladiator-2",
    "Gladiator II",
    ["Action", "Adventure", "Drama"],
    "English",
    "2h 28m",
    7.6,
    "118.9K",
    "22 Nov, 2024",
    "A new fighter enters Rome's arena while the empire wrestles with its past.",
    ["2D", "IMAX"],
  ),
  movieSeed(
    "moana-2",
    "Moana 2",
    ["Animation", "Adventure", "Family"],
    "English",
    "1h 40m",
    7.2,
    "94.7K",
    "27 Nov, 2024",
    "Moana sails toward new islands, ancient calls and a bigger oceanic destiny.",
    ["2D", "3D"],
  ),
  movieSeed(
    "wicked",
    "Wicked",
    ["Fantasy", "Musical", "Romance"],
    "English",
    "2h 40m",
    7.5,
    "101.8K",
    "22 Nov, 2024",
    "Two witches begin a complicated friendship before legends reshape their lives.",
    ["2D", "IMAX"],
  ),
];

const reviewTemplates = [
  [
    "Aarav",
    9,
    ["#GreatActing", "#Wellmade"],
    "Polished experience with strong performances and a really satisfying big-screen rhythm.",
    184,
  ],
  [
    "Priya",
    8,
    ["#AwesomeStory"],
    "The story holds attention and the pacing works well for a theatre watch.",
    142,
  ],
  [
    "Kabir",
    10,
    ["#Blockbuster", "#Rocking"],
    "Crowd energy was fantastic. This is exactly the kind of movie that works in cinemas.",
    231,
  ],
  [
    "Nisha",
    9,
    ["#SuperDirection"],
    "Direction, sound and visual scale made the whole show feel premium.",
    118,
  ],
  [
    "Rohan",
    8,
    ["#OneTimeWatch", "#Wellmade"],
    "Good movie, clean presentation and worth watching with friends.",
    79,
  ],
  [
    "Meera",
    9,
    ["#WowMusic", "#GreatActing"],
    "Music and acting landed beautifully, especially in the emotional scenes.",
    96,
  ],
  [
    "Sameer",
    7,
    ["#Rocking"],
    "Fun theatrical ride with a few slow patches but still enjoyable.",
    66,
  ],
  [
    "Anaya",
    10,
    ["#Blockbuster", "#AwesomeStory"],
    "Loved the atmosphere, screenplay and crowd moments. Full paisa vasool.",
    204,
  ],
];

if (!mongoUri) {
  console.error("MONGODB_URI is missing. Add it to .env before running this script.");
  process.exit(1);
}

await mongoose.connect(mongoUri, {
  dbName: mongoDb,
  serverSelectionTimeoutMS: 10000,
});

console.log(`Connected to MongoDB database "${mongoose.connection.name}".`);

await ensureMovieTextIndex();

const allMovies = mergeMovies(catalogMovies, extraMovies);
const allMovieIds = allMovies.map((movie) => movie.id);
const enrichedTheaters = catalogTheaters.map((theater, index) =>
  enrichTheater(theater, index, allMovieIds),
);
const showOperations = buildShowOperations(enrichedTheaters, allMovies);
const userOperations = buildUserOperations();
const bookingOperations = buildBookingOperations(enrichedTheaters, allMovies);

await upsertInBatches(
  Movie,
  allMovies.map((movie, index) => ({
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
  enrichedTheaters.map((theater) => ({
    updateOne: {
      filter: { id: theater.id },
      update: { $set: theater },
      upsert: true,
    },
  })),
  "theaters",
);

await upsertInBatches(Show, showOperations, "shows");
await upsertInBatches(Review, buildReviewOperations(allMovies), "reviews");
await upsertInBatches(User, userOperations, "users");
await upsertInBatches(Booking, bookingOperations, "bookings");
await upsertInBatches(Subscriber, buildSubscriberOperations(), "subscribers");

const counts = {
  movies: await Movie.countDocuments(),
  theaters: await Theater.countDocuments(),
  shows: await Show.countDocuments(),
  reviews: await Review.countDocuments(),
  users: await User.countDocuments(),
  bookings: await Booking.countDocuments(),
  subscribers: await Subscriber.countDocuments(),
};

console.log("MongoDB seed complete:", counts);
await mongoose.disconnect();

function movieSeed(
  id,
  title,
  genres,
  language,
  duration,
  rating,
  votes,
  releaseDate,
  description,
  format,
) {
  const artwork = movieArtwork[id];
  if (!artwork) {
    throw new Error(`Missing poster/backdrop artwork for ${title} (${id}).`);
  }

  return {
    id,
    title,
    poster: artwork.poster,
    backdrop: artwork.backdrop,
    genres,
    language,
    duration,
    rating,
    votes,
    releaseDate,
    description,
    cast: buildCast(title, id),
    format,
    certificate: genres.includes("Horror") || genres.includes("Crime") ? "A" : "UA",
  };
}

function buildCast(title, id) {
  const firstWord = title.split(/\s+/)[0] || "Movie";
  return [
    { name: `${firstWord} Lead`, role: "Actor", avatar: avatarFor(id, 1) },
    { name: `${firstWord} Star`, role: "Actor", avatar: avatarFor(id, 2) },
    { name: `${firstWord} Maker`, role: "Director", avatar: avatarFor(id, 3) },
    { name: `${firstWord} Producer`, role: "Producer", avatar: avatarFor(id, 4) },
  ];
}

function avatarFor(id, index) {
  return "";
}

function mergeMovies(baseMovies, generatedMovies) {
  const byId = new Map();
  [...baseMovies, ...generatedMovies].forEach((movie) => {
    byId.set(movie.id, normalizeMovie(movie));
  });
  return Array.from(byId.values());
}

function normalizeMovie(movie) {
  return {
    id: movie.id,
    title: movie.title,
    poster: movie.poster,
    backdrop: movie.backdrop,
    genres: toList(movie.genres, ["Drama"]),
    language: movie.language || "Hindi",
    duration: movie.duration || "2h 15m",
    rating: Number(movie.rating || 8),
    votes: String(movie.votes || "50K"),
    releaseDate: movie.releaseDate || "Coming soon",
    description: movie.description || `${movie.title} is now listed for ticket booking.`,
    cast: toList(movie.cast).length
      ? movie.cast.map((member, index) => ({
          name: member.name || `Cast ${index + 1}`,
          role: member.role || "Actor",
          avatar: member.avatar || "",
        }))
      : buildCast(movie.title, movie.id),
    format: toList(movie.format, ["2D"]),
    certificate: movie.certificate || "UA",
  };
}

function enrichTheater(theater, index, movieIds) {
  const showPlan = normalizeShowPlan(theater.showPlan, index);
  return {
    id: theater.id,
    name: theater.name,
    city: theater.city || "Jabalpur",
    area: theater.area || `${theater.city || "City"} Central`,
    address: theater.address || `${theater.area || "Cinema Road"}, ${theater.city || "Jabalpur"}`,
    distance: theater.distance || `${(2.4 + (index % 7) * 0.7).toFixed(1)} km`,
    amenities: toList(theater.amenities, ["M-Ticket", "F&B", "Parking"]),
    logoText: theater.logoText || initials(theater.name),
    movieIds,
    showPlan,
    contact: `+91 9${String(800000000 + index * 137).slice(0, 9)}`,
    manager: `${initials(theater.name)} Operations`,
    cancellationPolicy:
      index % 3 === 0 ? "Cancellation available till show start" : "Non-cancellable",
    foodMenu: buildFoodMenu(index),
    staff: buildStaff(theater, index),
    refundCases: buildRefundCases(theater, index),
    scanStats: buildScanStats(index),
    approved: true,
    screens: buildScreens(theater, showPlan, index),
  };
}

function normalizeShowPlan(showPlan, theaterIndex) {
  const base =
    Array.isArray(showPlan) && showPlan.length
      ? showPlan
      : [
          { time: "09:45 AM", format: "2D", status: "ok", cancellable: true, screen: "Screen 1" },
          { time: "12:55 PM", format: "2D", status: "ok", cancellable: true, screen: "Screen 2" },
          { time: "04:20 PM", format: "IMAX", status: "ok", cancellable: true, screen: "Audi 1" },
          {
            time: "08:40 PM",
            format: "Laser",
            status: "fast",
            cancellable: false,
            screen: "Audi 2",
          },
          {
            time: "10:55 PM",
            format: "Dolby 7.1",
            status: "ok",
            cancellable: false,
            screen: "Screen 3",
          },
        ];

  return base.map((plan, index) => ({
    time: typeof plan === "string" ? plan : plan.time || showTimes[index % showTimes.length],
    format: typeof plan === "string" ? (index % 2 ? "IMAX" : "2D") : plan.format || "2D",
    status:
      typeof plan === "string" ? inferShowStatus(index) : plan.status || inferShowStatus(index),
    cancellable: typeof plan === "string" ? index % 2 === 0 : plan.cancellable !== false,
    screen:
      typeof plan === "string"
        ? index % 3 === 0
          ? "Audi 1"
          : "Screen 1"
        : plan.screen || (theaterIndex % 2 ? "Screen 2" : "Screen 1"),
  }));
}

function buildScreens(theater, showPlan, theaterIndex) {
  const screenNames = [...new Set(showPlan.map((plan) => plan.screen).filter(Boolean))];
  return screenNames.map((name, index) => {
    const cols = index % 2 === 0 ? 14 : 12;
    const rows = index % 2 === 0 ? 10 : 8;
    return {
      id: `${theater.id}-${slugify(name)}`,
      name,
      type: index === 0 ? "Premium" : index === 1 ? "Regular" : "Luxe",
      totalSeats: rows * cols,
      occupancy: 35 + ((theaterIndex + index) % 50),
      seatLayout: {
        rows: buildRows(rows),
        cols,
        rowCount: rows,
        seatsPerRow: cols,
        platinumRows: 2,
        silverRows: 2,
        vipRows: 2,
        aisleAfter: Math.floor(cols / 2),
        blockedSeats: index % 3 === 0 ? ["A1", "A2"] : [],
      },
    };
  });
}

function buildShowOperations(theaters, movies) {
  return theaters.flatMap((theater, theaterIndex) =>
    movies.flatMap((movie, movieIndex) =>
      theater.showPlan.map((plan, showIndex) => {
        const screen =
          theater.screens.find((item) => item.name === plan.screen) || theater.screens[0];
        const price = showPrice(showIndex, theaterIndex, movieIndex);
        const payload = {
          id: `${movie.id}-${theater.id}-${showIndex}`,
          movieId: movie.id,
          movie: movie.title,
          poster: movie.poster,
          backdrop: movie.backdrop,
          duration: movie.duration,
          genres: movie.genres,
          releaseDate: movie.releaseDate,
          description: movie.description,
          cast: movie.cast,
          theaterId: theater.id,
          theater: theater.name,
          screenId: screen?.id || `${theater.id}-${slugify(plan.screen)}`,
          screen: plan.screen,
          date: "",
          time: plan.time,
          startTime: plan.time,
          endTime: "Auto calculated",
          price,
          language: movie.language,
          format: plan.format || movie.format[0] || "2D",
          certificate: movie.certificate,
          status: plan.status,
          cancellable: plan.cancellable,
          listingType: "live",
          seats: screen?.totalSeats || 120,
          seatLayout: screen?.seatLayout || {},
          bookingOpensAt: "Now",
          trailerUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${movie.title} official trailer`)}`,
          notes: "Bulk seeded show inventory",
        };
        return {
          updateOne: {
            filter: { id: payload.id },
            update: { $set: payload },
            upsert: true,
          },
        };
      }),
    ),
  );
}

function buildReviewOperations(movies) {
  return movies.flatMap((movie) =>
    reviewTemplates.map(([name, rating, tags, text, helpfulCount], index) => {
      const review = {
        movieId: movie.id,
        userId: `large-seed-${movie.id}-${slugify(name)}`,
        userEmail: `${slugify(name)}.${movie.id}@demo.bookmyscreen.local`,
        userName: name,
        rating,
        text,
        tags,
        helpfulCount: helpfulCount + index,
        verifiedBooking: true,
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

function buildUserOperations() {
  const customers = Array.from({ length: 80 }, (_, index) => {
    const serial = String(index + 1).padStart(2, "0");
    return {
      name: `Demo Customer ${serial}`,
      email: `customer${serial}@bookmyscreen.local`,
      role: "user",
      verified: true,
      blocked: index % 17 === 0,
      status: index % 17 === 0 ? "Blocked" : "Active",
      ownerStatus: "Approved",
    };
  });
  const owners = catalogTheaters.slice(0, 24).map((theater, index) => ({
    name: `${theater.name} Owner`,
    email: `owner${String(index + 1).padStart(2, "0")}@bookmyscreen.local`,
    role: "theater-owner",
    verified: true,
    blocked: false,
    status: "Active",
    ownerStatus: "Approved",
    ownerApplication: {
      id: `owner-app-${theater.id}`,
      theaterName: theater.name,
      companyName: `${theater.name} Cinemas Pvt Ltd`,
      city: theater.city,
      area: theater.area,
      address: theater.address,
      contact: `+91 9${String(700000000 + index * 219).slice(0, 9)}`,
      screens: 3,
      gstNumber: `GST${String(index + 1).padStart(4, "0")}BMS`,
      documents: "GST, PAN, theatre license",
      message: "Approved seed cinema partner",
      submittedAt: new Date(Date.now() - (index + 12) * 86400000),
      reviewedAt: new Date(Date.now() - (index + 6) * 86400000),
      reviewedBy: "bulk-seed",
    },
  }));

  return [...customers, ...owners].map((user) => ({
    updateOne: {
      filter: { email: user.email },
      update: { $set: user },
      upsert: true,
    },
  }));
}

function buildBookingOperations(theaters, movies) {
  return Array.from({ length: 260 }, (_, index) => {
    const movie = movies[index % movies.length];
    const theater = theaters[index % theaters.length];
    const plan = theater.showPlan[index % theater.showPlan.length];
    const seats = [`${rowFor(index)}${(index % 10) + 1}`, `${rowFor(index)}${(index % 10) + 2}`];
    const cancelled = index % 9 === 0;
    const total = 420 + (index % 8) * 90;
    const payload = {
      ref: `BMSDEMO${String(index + 1).padStart(5, "0")}`,
      email: `customer${String((index % 80) + 1).padStart(2, "0")}@bookmyscreen.local`,
      showId: `${movie.id}-${theater.id}-${index % theater.showPlan.length}`,
      movieId: movie.id,
      movie: movie.title,
      theaterId: theater.id,
      theater: theater.name,
      screen: plan.screen,
      time: `${relativeDateLabel(index)} ${plan.time}`,
      seats,
      total,
      totalAmount: total,
      paymentId: `seed-pay-${String(index + 1).padStart(5, "0")}`,
      paymentProvider: "local",
      paymentStatus: cancelled ? "refunded" : "paid",
      status: cancelled ? "cancelled" : "confirmed",
      createdAt: new Date(Date.now() - (index % 30) * 86400000),
      updatedAt: new Date(Date.now() - (index % 14) * 86400000),
    };
    return {
      updateOne: {
        filter: { ref: payload.ref },
        update: { $set: payload },
        upsert: true,
      },
    };
  });
}

function buildSubscriberOperations() {
  return Array.from({ length: 60 }, (_, index) => ({
    updateOne: {
      filter: { email: `subscriber${String(index + 1).padStart(2, "0")}@bookmyscreen.local` },
      update: {
        $set: {
          email: `subscriber${String(index + 1).padStart(2, "0")}@bookmyscreen.local`,
          source: index % 2 === 0 ? "homepage" : "launch-alerts",
        },
      },
      upsert: true,
    },
  }));
}

function buildFoodMenu(index) {
  return [
    {
      id: "popcorn-classic",
      name: "Classic Popcorn",
      price: 180 + (index % 4) * 10,
      status: "Live",
    },
    {
      id: "combo-meal",
      name: "Popcorn + Coke Combo",
      price: 320 + (index % 5) * 15,
      status: "Live",
    },
    { id: "nachos", name: "Cheese Nachos", price: 240 + (index % 3) * 20, status: "Live" },
  ];
}

function buildStaff(theater, index) {
  return [
    {
      id: `${theater.id}-manager`,
      name: `${initials(theater.name)} Manager`,
      role: "Manager",
      shift: "Full day",
      status: "Active",
    },
    {
      id: `${theater.id}-counter`,
      name: `${initials(theater.name)} Counter`,
      role: "Counter Staff",
      shift: index % 2 ? "Evening" : "Morning",
      status: "Active",
    },
    {
      id: `${theater.id}-scanner`,
      name: `${initials(theater.name)} Scanner`,
      role: "Entry Scanner",
      shift: "Night",
      status: "Active",
    },
  ];
}

function buildRefundCases(theater, index) {
  if (index % 4 !== 0) return [];
  return [
    {
      ref: `RF${theater.id.slice(0, 5).toUpperCase()}${index}`,
      customer: "Demo Customer",
      email: `customer${String((index % 80) + 1).padStart(2, "0")}@bookmyscreen.local`,
      movie: "Cancelled ticket",
      screen: "Screen 1",
      time: "08:40 PM",
      seats: ["D5", "D6"],
      amount: 560 + (index % 5) * 80,
      paymentStatus: "Paid",
      status: index % 8 === 0 ? "Review" : "Pending",
    },
  ];
}

function buildScanStats(index) {
  return [
    { label: "Scanned today", value: 120 + index },
    { label: "Pending entry", value: 12 + (index % 20) },
    { label: "Invalid scans", value: index % 5 },
  ];
}

function showPrice(showIndex, theaterIndex, movieIndex) {
  const offset = (theaterIndex % 8) * 10 + (movieIndex % 5) * 8;
  return {
    platinum: 180 + offset + showIndex * 8,
    silver: 220 + offset + showIndex * 10,
    gold: 260 + offset + showIndex * 12,
    vip: 420 + offset + showIndex * 18,
  };
}

async function upsertInBatches(model, operations, label) {
  for (let index = 0; index < operations.length; index += WRITE_BATCH_SIZE) {
    await model.bulkWrite(operations.slice(index, index + WRITE_BATCH_SIZE), { ordered: false });
  }
  console.log(`Upserted ${operations.length} ${label}.`);
}

async function ensureMovieTextIndex() {
  const indexes = await Movie.collection.indexes();
  const textIndexes = indexes.filter((index) =>
    Object.values(index.key || {}).some((value) => value === "text"),
  );

  for (const index of textIndexes) {
    await Movie.collection.dropIndex(index.name).catch((error) => {
      if (error?.codeName !== "IndexNotFound") {
        throw error;
      }
    });
  }

  await Movie.collection.createIndex(
    { title: "text", genres: "text", language: "text" },
    {
      name: "movie_text_search",
      default_language: "none",
      language_override: "textLanguage",
    },
  );
  console.log("Movie text index ready.");
}

function toList(value, fallback = []) {
  if (Array.isArray(value)) return value.filter(Boolean);
  const items = String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length ? items : fallback;
}

function buildRows(count) {
  return "ABCDEFGHJKLMNPQRSTUVWXYZ".slice(0, count).split("");
}

function rowFor(index) {
  return buildRows(10)[index % 10];
}

function inferShowStatus(index) {
  if (index === 4) return "sold";
  if (index === 3) return "fast";
  return "ok";
}

function relativeDateLabel(index) {
  if (index % 3 === 0) return "Today";
  if (index % 3 === 1) return "Tomorrow";
  return "This week";
}

function initials(value) {
  return String(value || "BM")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function cleanEnv(value) {
  return String(value ?? "")
    .trim()
    .replace(/^['"]|['"]$/g, "");
}
