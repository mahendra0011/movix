import { movies } from "@/features/movies/data/movieCatalog";

const images = {
  stream:
    "https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?auto=format&fit=crop&w=1400&q=80",
  concert:
    "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1400&q=80",
  comedy:
    "https://images.unsplash.com/photo-1527224857830-43a7acc85260?auto=format&fit=crop&w=1400&q=80",
  festival:
    "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1400&q=80",
  theatre:
    "https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&w=1400&q=80",
  stage:
    "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1400&q=80",
  stadium:
    "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1400&q=80",
  football:
    "https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=1400&q=80",
  tennis:
    "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1400&q=80",
};

const movieById = Object.fromEntries(movies.map((movie) => [movie.id, movie]));

const streamItems = [
  {
    ...fromMovie("dune-part-two"),
    category: "Premium Rental",
    venue: "BookMyScreen Stream",
    date: "Available tonight",
    time: "4K UHD",
    price: 199,
    badge: "New",
  },
  {
    ...fromMovie("oppenheimer"),
    category: "Award Winners",
    venue: "BookMyScreen Stream",
    date: "Watch at home",
    time: "4K UHD",
    price: 149,
    badge: "Editor pick",
  },
  {
    ...fromMovie("spider-verse"),
    category: "Family",
    venue: "BookMyScreen Stream",
    date: "Weekend special",
    time: "HD",
    price: 99,
    badge: "Top rated",
  },
  {
    ...fromMovie("inception"),
    category: "Classics",
    venue: "BookMyScreen Stream",
    date: "Anytime",
    time: "4K UHD",
    price: 129,
    badge: "Classic",
  },
];

const sectionCatalog = {
  stream: {
    eyebrow: "Watch at home",
    title: "Stream premieres and classics",
    subtitle: "Curated rentals, weekend picks and premium digital premieres.",
    heroImage: images.stream,
    searchPlaceholder: "Search stream titles, genres or language",
    filters: ["All", "Premium Rental", "Award Winners", "Family", "Classics"],
    stats: [
      { value: "4K", label: "Premium quality" },
      { value: "48h", label: "Rental window" },
      { value: "HD", label: "Mobile ready" },
    ],
    items: streamItems,
  },
  events: {
    eyebrow: "Live around you",
    title: "Events worth stepping out for",
    subtitle: "Concerts, comedy, festivals and fan nights managed in one clean section.",
    heroImage: images.concert,
    searchPlaceholder: "Search events, artists or city",
    filters: ["All", "Concert", "Comedy", "Festival", "Screening"],
    stats: [
      { value: "24", label: "Live listings" },
      { value: "12", label: "Cities" },
      { value: "Live", label: "Seat status" },
    ],
    items: [
      item({
        title: "Arijit Singh Live",
        category: "Concert",
        venue: "Palace Grounds",
        city: "Bengaluru",
        date: "Sat, 14 Jun",
        time: "7:00 PM",
        price: 1999,
        rating: 4.8,
        image: images.concert,
        badge: "Selling fast",
      }),
      item({
        title: "Zakir Khan Stand-up Night",
        category: "Comedy",
        venue: "Phoenix Marketcity",
        city: "Mumbai",
        date: "Fri, 20 Jun",
        time: "8:30 PM",
        price: 899,
        rating: 4.7,
        image: images.comedy,
        badge: "Few seats",
      }),
      item({
        title: "Sunburn Arena",
        category: "Festival",
        venue: "Baga Beach Arena",
        city: "Goa",
        date: "Sat, 28 Jun",
        time: "6:00 PM",
        price: 1499,
        rating: 4.6,
        image: images.festival,
        badge: "Weekend",
      }),
      item({
        title: "Interstellar Fan Screening",
        category: "Screening",
        venue: "PVR: Orion Mall",
        city: "Bengaluru",
        date: "Sun, 29 Jun",
        time: "10:30 PM",
        price: 499,
        rating: 4.9,
        image: movieById.interstellar.backdrop,
        movieId: "interstellar",
        badge: "IMAX",
      }),
    ],
  },
  plays: {
    eyebrow: "Stage and theatre",
    title: "Plays, drama and live storytelling",
    subtitle: "Premium theatre listings with venues, timings and seat-ready cards.",
    heroImage: images.theatre,
    searchPlaceholder: "Search plays, venues or city",
    filters: ["All", "Drama", "Classic", "Hindi", "English"],
    stats: [
      { value: "18", label: "Plays live" },
      { value: "6", label: "Venues" },
      { value: "2h", label: "Avg runtime" },
    ],
    items: [
      item({
        title: "Hamlet",
        category: "Classic",
        venue: "Ranga Shankara",
        city: "Bengaluru",
        date: "Thu, 12 Jun",
        time: "7:30 PM",
        price: 450,
        rating: 4.7,
        image: images.stage,
        badge: "English",
      }),
      item({
        title: "Court Martial",
        category: "Hindi",
        venue: "Prithvi Theatre",
        city: "Mumbai",
        date: "Sun, 15 Jun",
        time: "6:00 PM",
        price: 499,
        rating: 4.8,
        image: images.theatre,
        badge: "Critic pick",
      }),
      item({
        title: "Mahabharata: The Epic",
        category: "Drama",
        venue: "Kamani Auditorium",
        city: "Delhi",
        date: "Sat, 21 Jun",
        time: "7:00 PM",
        price: 799,
        rating: 4.6,
        image: images.stage,
        badge: "Grand stage",
      }),
      item({
        title: "The Mousetrap",
        category: "English",
        venue: "NCPA",
        city: "Mumbai",
        date: "Fri, 27 Jun",
        time: "8:00 PM",
        price: 699,
        rating: 4.5,
        image: images.theatre,
        badge: "Mystery",
      }),
    ],
  },
  sports: {
    eyebrow: "Matches and fan parks",
    title: "Sports tickets and live screenings",
    subtitle: "Football, cricket, tennis and kabaddi experiences with clear pricing.",
    heroImage: images.stadium,
    searchPlaceholder: "Search teams, sport or city",
    filters: ["All", "Cricket", "Football", "Kabaddi", "Tennis"],
    stats: [
      { value: "32", label: "Events" },
      { value: "Live", label: "Inventory" },
      { value: "QR", label: "Entry ready" },
    ],
    items: [
      item({
        title: "India vs Australia Fan Park",
        category: "Cricket",
        venue: "Chinnaswamy Fan Zone",
        city: "Bengaluru",
        date: "Sun, 22 Jun",
        time: "5:00 PM",
        price: 599,
        rating: 4.8,
        image: images.stadium,
        badge: "Big screen",
      }),
      item({
        title: "Bengaluru FC Home Match",
        category: "Football",
        venue: "Kanteerava Stadium",
        city: "Bengaluru",
        date: "Wed, 25 Jun",
        time: "7:30 PM",
        price: 799,
        rating: 4.7,
        image: images.football,
        badge: "Home stand",
      }),
      item({
        title: "Pro Kabaddi Night",
        category: "Kabaddi",
        venue: "Sree Kanteerava Indoor Stadium",
        city: "Bengaluru",
        date: "Fri, 27 Jun",
        time: "8:00 PM",
        price: 499,
        rating: 4.5,
        image: images.stadium,
        badge: "Family",
      }),
      item({
        title: "City Tennis Open",
        category: "Tennis",
        venue: "KSLTA Courts",
        city: "Bengaluru",
        date: "Sat, 28 Jun",
        time: "4:00 PM",
        price: 699,
        rating: 4.4,
        image: images.tennis,
        badge: "Finals",
      }),
    ],
  },
};

function fromMovie(id) {
  const movie = movieById[id];
  return {
    id,
    title: movie.title,
    description: movie.description,
    city: movie.language,
    image: movie.backdrop,
    poster: movie.poster,
    rating: movie.rating,
    movieId: movie.id,
  };
}

function item(input) {
  return {
    id: input.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, ""),
    description:
      input.description ??
      `${input.title} at ${input.venue}, ${input.city}. Verified listing with digital entry support.`,
    ...input,
  };
}

export { sectionCatalog };
