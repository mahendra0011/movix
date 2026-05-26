import { Router } from "express";
import { Booking } from "../models/Booking.js";
import { Movie } from "../models/Movie.js";
import { Theater } from "../models/Theater.js";
import { User } from "../models/User.js";
import { theaters } from "../seed.js";
import { env } from "../config/env.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { getMemoryBookings } from "../services/bookingStore.js";
import { isMongoReady } from "../services/database.js";
import { isRedisReady } from "../services/redisClient.js";

const router = Router();
const SCREEN_CAPACITY = 140;

router.use(requireAuth, requireRole("admin"));

function bookingDate(booking) {
  const value = booking.createdAt ?? booking.updatedAt ?? new Date();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function dayKey(date) {
  return date.toISOString().slice(0, 10);
}

function recentDays(count) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (count - 1 - index));
    return date;
  });
}

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
    } else {
      userCount = new Set(bookings.map((booking) => booking.email).filter(Boolean)).size + 1;
    }

    const confirmedBookings = bookings.filter((booking) => booking.status !== "cancelled");
    const revenue = confirmedBookings.reduce(
      (sum, booking) => sum + Number(booking.total || booking.totalAmount || 0),
      0,
    );
    const seatsSold = confirmedBookings.reduce((sum, booking) => sum + booking.seats.length, 0);
    const byMovie = confirmedBookings.reduce((acc, booking) => {
      const current = acc[booking.movie] ?? { movie: booking.movie, value: 0, bookings: 0 };
      current.value += Number(booking.total || booking.totalAmount || 0);
      current.bookings += 1;
      acc[booking.movie] = current;
      return acc;
    }, {});
    const byTheater = confirmedBookings.reduce((acc, booking) => {
      const current = acc[booking.theater] ?? {
        theater: booking.theater,
        revenue: 0,
        bookings: 0,
        seatsSold: 0,
      };
      current.revenue += Number(booking.total || booking.totalAmount || 0);
      current.bookings += 1;
      current.seatsSold += booking.seats.length;
      acc[booking.theater] = current;
      return acc;
    }, {});
    const bookingsByDay = confirmedBookings.reduce((acc, booking) => {
      const key = dayKey(bookingDate(booking));
      const current = acc[key] ?? { revenue: 0, bookings: 0, seats: 0 };
      current.revenue += Number(booking.total || booking.totalAmount || 0);
      current.bookings += 1;
      current.seats += booking.seats.length;
      acc[key] = current;
      return acc;
    }, {});
    const revenueTrend = recentDays(7).map((date) => {
      const key = dayKey(date);
      const data = bookingsByDay[key] ?? { revenue: 0, bookings: 0, seats: 0 };
      return {
        day: date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
        revenue: data.revenue,
        bookings: data.bookings,
        seats: data.seats,
      };
    });
    const popularMovies = Object.values(byMovie)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
    const theaterPerformance = theaters.map((theater) => {
      const data = byTheater[theater.name] ?? {
        theater: theater.name,
        revenue: 0,
        bookings: 0,
        seatsSold: 0,
      };
      return {
        ...data,
        area: theater.area,
        occupancy: data.seatsSold
          ? Math.min(98, Math.round((data.seatsSold / SCREEN_CAPACITY) * 100))
          : 0,
      };
    });
    const recentBookings = [...confirmedBookings]
      .sort((a, b) => bookingDate(b).getTime() - bookingDate(a).getTime())
      .slice(0, 6)
      .map((booking) => ({
        ref: booking.ref,
        movie: booking.movie,
        theater: booking.theater,
        seats: booking.seats,
        total: Number(booking.total || booking.totalAmount || 0),
        paymentProvider: booking.paymentProvider,
        paymentStatus: booking.paymentStatus,
        status: booking.status,
        time: booking.time,
        createdAt: bookingDate(booking).toISOString(),
      }));
    const paymentConnected =
      env.paymentProvider === "razorpay" && env.razorpayKeyId && env.razorpayKeySecret;

    response.json({
      summary: {
        revenue,
        bookings: confirmedBookings.length,
        seatsSold,
        users: userCount,
        movies: movieCount,
        theaters: theaterCount,
        occupancy: seatsSold
          ? Math.min(98, Math.round((seatsSold / (theaterCount * SCREEN_CAPACITY)) * 100))
          : 0,
        averageOrderValue: confirmedBookings.length
          ? Math.round(revenue / confirmedBookings.length)
          : 0,
        averageSeatsPerBooking: confirmedBookings.length
          ? Number((seatsSold / confirmedBookings.length).toFixed(1))
          : 0,
        topMovie: popularMovies[0]?.movie ?? "No bookings yet",
        database: isMongoReady() ? "MongoDB" : "Local store",
        redis: isRedisReady() ? "Redis" : "Local locks",
        socket: "enabled",
        payment: paymentConnected ? "Razorpay" : "Test checkout",
      },
      charts: {
        revenueTrend,
        popularMovies,
        theaterPerformance,
      },
      recentBookings,
    });
  }),
);

export { router as adminRoutes };
