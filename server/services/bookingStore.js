const DAY_MS = 24 * 60 * 60 * 1000;

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
    screen: "Screen 3",
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

const seedBookings = [
  seedBooking({
    ref: "BMS-SEED-2401",
    email: "aarav.sharma@example.com",
    showId: "interstellar-pvr-orion-0",
    movieId: "interstellar",
    movie: "Interstellar",
    theaterId: "pvr-orion",
    theater: "PVR INOX: Orion Mall",
    time: showLabel(0, "10:30 AM"),
    seats: ["B5", "B6"],
    total: 960,
    createdAt: timestamp(0, 10, 20),
  }),
  seedBooking({
    ref: "BMS-SEED-2402",
    email: "priya.menon@example.com",
    showId: "dune-part-two-inox-garuda-1",
    movieId: "dune-part-two",
    movie: "Dune: Part Two",
    theaterId: "inox-garuda",
    theater: "INOX: Garuda Mall",
    time: showLabel(0, "01:45 PM"),
    seats: ["C7", "C8", "C9"],
    total: 1410,
    createdAt: timestamp(0, 13, 5),
  }),
  seedBooking({
    ref: "BMS-SEED-2403",
    email: "rahul.nair@example.com",
    showId: "oppenheimer-pvr-vega-2",
    movieId: "oppenheimer",
    movie: "Oppenheimer",
    theaterId: "pvr-vega",
    theater: "PVR: Vega City",
    time: showLabel(1, "04:30 PM"),
    seats: ["E3", "E4"],
    total: 1040,
    createdAt: timestamp(1, 18, 40),
  }),
  seedBooking({
    ref: "BMS-SEED-2404",
    email: "nisha.rao@example.com",
    showId: "spider-verse-cinepolis-forum-3",
    movieId: "spider-verse",
    movie: "Spider-Man: Across the Spider-Verse",
    theaterId: "cinepolis-forum",
    theater: "Cinepolis: Forum Shantiniketan",
    time: showLabel(1, "07:15 PM"),
    seats: ["D1", "D2", "D3", "D4"],
    total: 1680,
    createdAt: timestamp(1, 15, 15),
  }),
  seedBooking({
    ref: "BMS-SEED-2405",
    email: "karthik.iyer@example.com",
    showId: "inception-pvr-orion-0",
    movieId: "inception",
    movie: "Inception",
    theaterId: "pvr-orion",
    theater: "PVR INOX: Orion Mall",
    time: showLabel(2, "10:30 AM"),
    seats: ["F8", "F9"],
    total: 920,
    createdAt: timestamp(2, 19, 25),
  }),
  seedBooking({
    ref: "BMS-SEED-2406",
    email: "meera.singh@example.com",
    showId: "barbie-inox-garuda-3",
    movieId: "barbie",
    movie: "Barbie",
    theaterId: "inox-garuda",
    theater: "INOX: Garuda Mall",
    time: showLabel(2, "07:15 PM"),
    seats: ["A9", "A10", "A11"],
    total: 1170,
    createdAt: timestamp(2, 11, 50),
  }),
  seedBooking({
    ref: "BMS-SEED-2407",
    email: "dev.patel@example.com",
    showId: "the-batman-pvr-vega-4",
    movieId: "the-batman",
    movie: "The Batman",
    theaterId: "pvr-vega",
    theater: "PVR: Vega City",
    time: showLabel(3, "10:30 PM"),
    seats: ["G5", "G6"],
    total: 980,
    createdAt: timestamp(3, 20, 10),
  }),
  seedBooking({
    ref: "BMS-SEED-2408",
    email: "sana.khan@example.com",
    showId: "joker-cinepolis-forum-4",
    movieId: "joker",
    movie: "Joker",
    theaterId: "cinepolis-forum",
    theater: "Cinepolis: Forum Shantiniketan",
    time: showLabel(3, "10:30 PM"),
    seats: ["H1", "H2"],
    total: 900,
    createdAt: timestamp(3, 14, 35),
  }),
  seedBooking({
    ref: "BMS-SEED-2409",
    email: "ananya.das@example.com",
    showId: "interstellar-inox-garuda-2",
    movieId: "interstellar",
    movie: "Interstellar",
    theaterId: "inox-garuda",
    theater: "INOX: Garuda Mall",
    time: showLabel(4, "04:30 PM"),
    seats: ["C1", "C2", "C3"],
    total: 1440,
    createdAt: timestamp(4, 17, 45),
  }),
  seedBooking({
    ref: "BMS-SEED-2410",
    email: "vikram.bose@example.com",
    showId: "dune-part-two-pvr-orion-4",
    movieId: "dune-part-two",
    movie: "Dune: Part Two",
    theaterId: "pvr-orion",
    theater: "PVR INOX: Orion Mall",
    time: showLabel(4, "10:30 PM"),
    seats: ["J7", "J8"],
    total: 1100,
    createdAt: timestamp(4, 12, 10),
  }),
  seedBooking({
    ref: "BMS-SEED-2411",
    email: "isha.verma@example.com",
    showId: "oppenheimer-cinepolis-forum-1",
    movieId: "oppenheimer",
    movie: "Oppenheimer",
    theaterId: "cinepolis-forum",
    theater: "Cinepolis: Forum Shantiniketan",
    time: showLabel(5, "01:45 PM"),
    seats: ["E9", "E10"],
    total: 1040,
    createdAt: timestamp(5, 16, 5),
  }),
  seedBooking({
    ref: "BMS-SEED-2412",
    email: "mahendra.customer@example.com",
    showId: "spider-verse-pvr-vega-0",
    movieId: "spider-verse",
    movie: "Spider-Man: Across the Spider-Verse",
    theaterId: "pvr-vega",
    theater: "PVR: Vega City",
    time: showLabel(6, "10:30 AM"),
    seats: ["A3", "A4", "A5"],
    total: 1260,
    createdAt: timestamp(6, 11, 30),
  }),
];

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
