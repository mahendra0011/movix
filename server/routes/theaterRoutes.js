import { Router } from "express";
import { Theater } from "../models/Theater.js";
import { theaters, showTimes } from "../seed.js";
import { isMongoReady } from "../services/database.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

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

router.get(
  "/",
  asyncHandler(async (request, response) => {
    const city = String(request.query.city ?? "")
      .trim()
      .toLowerCase();
    let list = theaters
      .map(enrichTheater)
      .filter((theater) => !city || theater.city.toLowerCase() === city);
    if (isMongoReady()) {
      const ownerTheaters = await Theater.find({ approved: true }).lean();
      const enrichedOwnerTheaters = ownerTheaters
        .map((theater, index) => enrichTheater(theater, index + list.length))
        .filter((theater) => !city || theater.city.toLowerCase() === city);
      list = [...enrichedOwnerTheaters, ...list];
    }
    response.json({ theaters: list, showTimes });
  }),
);

export { enrichTheater, router as theaterRoutes };
