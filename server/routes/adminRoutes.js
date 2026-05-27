import { Router } from "express";
import { Booking } from "../models/Booking.js";
import { Movie } from "../models/Movie.js";
import { Theater } from "../models/Theater.js";
import { User } from "../models/User.js";
import { theaters } from "../seed.js";
import { env } from "../config/env.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { getMemoryUsers, updateMemoryUserOwnerStatus } from "./authRoutes.js";
import { getMemoryBookings } from "../services/bookingStore.js";
import { isMongoReady } from "../services/database.js";
import { isRedisReady } from "../services/redisClient.js";

const router = Router();
const SCREEN_CAPACITY = 140;
const ownerStatuses = new Set(["Pending", "Approved", "Rejected"]);

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

router.get(
  "/theater-applications",
  asyncHandler(async (_request, response) => {
    const owners = isMongoReady()
      ? await User.find({ role: "theater-owner" }).sort({ updatedAt: -1 }).lean()
      : getMemoryUsers().filter((user) => user.role === "theater-owner");

    response.json({ theaters: owners.map(mapOwnerApplication) });
  }),
);

router.patch(
  "/theater-applications/:id",
  asyncHandler(async (request, response) => {
    const status = normalizeOwnerStatus(request.body.status);
    if (!ownerStatuses.has(status)) {
      response.status(400).json({ error: "Status must be Pending, Approved, or Rejected." });
      return;
    }

    let user;
    if (isMongoReady()) {
      user = await User.findById(request.params.id);
      if (!user) {
        response.status(404).json({ error: "Owner application not found." });
        return;
      }

      user.ownerStatus = status;
      user.ownerApplication = {
        ...(user.ownerApplication?.toObject?.() ?? user.ownerApplication ?? {}),
        reviewedAt: new Date(),
        reviewedBy: request.user?.email || request.auth?.email || "Admin",
      };
      await user.save();
      await syncApprovedTheater(user, status);
      response.json({ theater: mapOwnerApplication(user) });
      return;
    }

    user = updateMemoryUserOwnerStatus(
      request.params.id,
      status,
      request.user?.email || request.auth?.email || "Admin",
    );
    if (!user) {
      response.status(404).json({ error: "Owner application not found." });
      return;
    }

    response.json({ theater: mapOwnerApplication(user) });
  }),
);

function mapOwnerApplication(user) {
  const application = user.ownerApplication ?? {};
  const userId = String(user._id ?? user.id ?? application.ownerId ?? "");
  return {
    id: userId,
    userId,
    name: application.theaterName || "Untitled cinema",
    owner: application.companyName || user.name || "Theater owner",
    ownerEmail: user.email,
    city: application.city || "",
    area: application.area || "",
    address: application.address || "",
    contact: application.contact || "",
    screens: Math.max(1, Number(application.screens || 1)),
    status: user.ownerStatus || "Pending",
    documents: application.documents || "GST, Fire NOC",
    gstNumber: application.gstNumber || "",
    submittedAt: application.submittedAt,
    reviewedAt: application.reviewedAt,
    reviewedBy: application.reviewedBy,
    source: "api",
  };
}

async function syncApprovedTheater(user, status) {
  if (!isMongoReady()) return;
  const application = user.ownerApplication ?? {};
  const name = application.theaterName || "";
  const city = application.city || "";
  if (!name || !city) return;

  const theaterId = slugify(`${name}-${city}`);
  await Theater.updateOne(
    { id: theaterId },
    {
      $set: {
        id: theaterId,
        name,
        city,
        area: application.area || "",
        address: application.address || `${application.area || city}, ${city}`,
        ownerId: user._id,
        approved: status === "Approved",
        screens: buildScreens(application.screens),
      },
    },
    { upsert: status === "Approved" },
  );
}

function buildScreens(countValue) {
  const count = Math.min(12, Math.max(1, Number(countValue || 1)));
  return Array.from({ length: count }, (_, index) => ({
    id: `screen-${index + 1}`,
    name: `Screen ${index + 1}`,
    totalSeats: 120,
    seatLayout: { rows: ["A", "B", "C", "D", "E", "F", "G", "H"], cols: 15 },
  }));
}

function normalizeOwnerStatus(status) {
  const value = String(status || "")
    .trim()
    .toLowerCase();
  if (value === "approved") return "Approved";
  if (value === "rejected") return "Rejected";
  return "Pending";
}

function slugify(value) {
  return String(value || "cinema")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export { router as adminRoutes };
