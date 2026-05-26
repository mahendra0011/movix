import { Router } from "express";
import { Booking } from "../models/Booking.js";
import { Movie } from "../models/Movie.js";
import { Theater } from "../models/Theater.js";
import { User } from "../models/User.js";
import { theaters } from "../seed.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { getMemoryBookings } from "../services/bookingStore.js";
import { isMongoReady } from "../services/database.js";
import { isRedisReady } from "../services/redisClient.js";

const router = Router();

router.get(
  "/summary",
  asyncHandler(async (_request, response) => {
    let bookings = getMemoryBookings();
    let userCount = 0;
    let movieCount = 8;
    let theaterCount = theaters.length;

    if (isMongoReady()) {
      bookings = await Booking.find({}).lean();
      userCount = await User.countDocuments();
      movieCount = await Movie.countDocuments();
      theaterCount = Math.max(await Theater.countDocuments(), theaters.length);
    }

    const revenue = bookings.reduce(
      (sum, booking) => sum + Number(booking.total || booking.totalAmount || 0),
      0,
    );
    const seatsSold = bookings.reduce((sum, booking) => sum + booking.seats.length, 0);
    const byMovie = bookings.reduce((acc, booking) => {
      acc[booking.movie] = (acc[booking.movie] || 0) + Number(booking.total || 0);
      return acc;
    }, {});
    const revenueTrend = Array.from({ length: 7 }, (_, index) => ({
      day: `D${index + 1}`,
      revenue: Math.round((revenue / 7 || 1200) * (0.75 + index * 0.08)),
    }));

    response.json({
      summary: {
        revenue,
        bookings: bookings.length,
        seatsSold,
        users: userCount,
        movies: movieCount,
        theaters: theaterCount,
        occupancy: seatsSold
          ? Math.min(98, Math.round((seatsSold / (theaterCount * 140)) * 100))
          : 64,
        database: isMongoReady() ? "mongodb" : "memory",
        redis: isRedisReady() ? "connected" : "memory-locks",
        socket: "enabled",
      },
      charts: {
        revenueTrend,
        popularMovies: Object.entries(byMovie).map(([movie, value]) => ({ movie, value })),
      },
    });
  }),
);

export { router as adminRoutes };
