import { Router } from "express";
import { theaters, showTimes } from "../seed.js";

const router = Router();

const screens = [
  {
    id: "screen-1",
    name: "Screen 1",
    totalSeats: 140,
    seatLayout: { rows: ["A", "B", "C", "D", "E", "F", "G", "H", "J", "K"], cols: 14 },
  },
  {
    id: "screen-2",
    name: "Screen 2",
    totalSeats: 96,
    seatLayout: { rows: ["A", "B", "C", "D", "E", "F", "G", "H"], cols: 12 },
  },
];

function enrichTheater(theater, index = 0) {
  return {
    ...theater,
    city: theater.city || "Bengaluru",
    address: theater.address || `${theater.area}, ${theater.city || "Bengaluru"}`,
    approved: true,
    screens: screens.map((screen) => ({ ...screen, id: `${theater.id}-${screen.id}` })),
    rating: 4.5 + (index % 4) / 10,
  };
}

router.get("/", (request, response) => {
  const city = String(request.query.city ?? "")
    .trim()
    .toLowerCase();
  const list = theaters
    .map(enrichTheater)
    .filter((theater) => !city || theater.city.toLowerCase() === city);
  response.json({ theaters: list, showTimes });
});

export { enrichTheater, router as theaterRoutes };
