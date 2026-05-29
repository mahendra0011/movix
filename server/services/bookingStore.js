import {
  movies as catalogMovies,
  showTimes,
  theaters as catalogTheaters,
} from "../../src/features/movies/data/movieCatalog.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const seedBookingUsers = [
  "aarav.sharma@example.com",
  "priya.menon@example.com",
  "rahul.nair@example.com",
  "nisha.rao@example.com",
  "karthik.iyer@example.com",
  "meera.singh@example.com",
  "dev.patel@example.com",
  "sana.khan@example.com",
  "ananya.das@example.com",
  "vikram.bose@example.com",
  "isha.verma@example.com",
  "mahendra.customer@example.com",
];

function timestamp(daysAgo, hour, minute = 0) {
  const date = new Date(Date.now() - daysAgo * DAY_MS);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function showLabel(daysFromToday, time) {
  const date = new Date(Date.now() + daysFromToday * DAY_MS);
  const label = date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  return `${label} ${time}`;
}

function seedBooking({
  ref,
  email,
  showId,
  movieId,
  movie,
  theaterId,
  theater,
  screen,
  time,
  seats,
  total,
  createdAt,
}) {
  return {
    ref,
    email,
    showId,
    movieId,
    movie,
    theaterId,
    theater,
    screen,
    time,
    seats,
    total,
    totalAmount: total,
    paymentId: `seed_${ref.toLowerCase()}`,
    paymentProvider: "local",
    paymentStatus: "paid",
    status: "confirmed",
    createdAt,
    updatedAt: createdAt,
  };
}

const seedBookings = catalogMovies.slice(0, 12).map((movie, index) => {
  const theater = catalogTheaters[index % catalogTheaters.length];
  const showIndex = index % showTimes.length;
  const seats = makeSeats(index);
  return seedBooking({
    ref: `MX-SEED-26${String(index + 1).padStart(2, "0")}`,
    email: seedBookingUsers[index % seedBookingUsers.length],
    showId: `${movie.id}-${theater.id}-${showIndex}`,
    movieId: movie.id,
    movie: movie.title,
    theaterId: theater.id,
    theater: theater.name,
    screen: index % 3 === 0 ? "IMAX" : `Screen ${(index % 4) + 1}`,
    time: showLabel(index % 7, showTimes[showIndex]),
    seats,
    total: seats.length * (420 + (index % 3) * 60),
    createdAt: timestamp(index % 7, 10 + (index % 10), (index * 5) % 60),
  });
});

function makeSeats(index) {
  const row = String.fromCharCode(65 + (index % 8));
  const start = 3 + (index % 6);
  const count = index % 4 === 0 ? 3 : 2;
  return Array.from({ length: count }, (_, seatIndex) => `${row}${start + seatIndex}`);
}

const memoryBookings = [...seedBookings];

function addMemoryBooking(booking) {
  memoryBookings.push(booking);
  return booking;
}

function getMemoryBookings() {
  return memoryBookings;
}

function getMemoryBookingByRef(ref) {
  return memoryBookings.find((booking) => booking.ref === ref);
}

function getMemoryBookedSeats(showId) {
  return memoryBookings
    .filter((booking) => booking.showId === showId && booking.status === "confirmed")
    .flatMap((booking) => booking.seats);
}

export { addMemoryBooking, getMemoryBookedSeats, getMemoryBookingByRef, getMemoryBookings };
