import { Router } from "express";
import { Booking } from "../models/Booking.js";
import { Show } from "../models/Show.js";
import { Theater } from "../models/Theater.js";
import { User } from "../models/User.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { isMongoReady } from "../services/database.js";

const router = Router();

router.use(requireAuth, requireRole("theater-owner"));

router.get(
  "/workspace",
  asyncHandler(async (request, response) => {
    const owner = await requireMongoOwner(request, response);
    if (!owner) return;

    const theater = await ensureOwnerTheater(owner);
    const workspace = await buildOwnerWorkspace(owner, theater);
    response.json({ workspace });
  }),
);

router.put(
  "/workspace",
  asyncHandler(async (request, response) => {
    const owner = await requireMongoOwner(request, response);
    if (!owner) return;

    const theater = await ensureOwnerTheater(owner);
    const profile = normalizeProfile(request.body.cinemaProfile, theater, owner);
    const screens = normalizeScreens(request.body.screens);
    const shows = normalizeShows(request.body.shows, {
      owner,
      theater,
      profile,
      screens,
    });
    const services = normalizeServices(request.body.services);

    await Theater.updateOne(
      { _id: theater._id },
      {
        $set: {
          name: profile.name,
          city: profile.city,
          area: profile.area,
          address: profile.address,
          distance: profile.distance,
          contact: profile.contact,
          manager: profile.manager,
          cancellationPolicy: profile.cancellationPolicy,
          amenities: splitList(profile.amenities),
          logoText: initials(profile.name),
          movieIds: unique(shows.map((show) => show.movieId).filter(Boolean)),
          showPlan: shows
            .filter(
              (show) =>
                show.listingType !== "coming-soon" &&
                String(show.status || "").toLowerCase() !== "draft",
            )
            .map((show) => ({
              time: show.startTime,
              format: show.format,
              status: publicShowStatus(show.status),
              cancellable: show.cancellable !== false,
              screen: show.screen,
            })),
          screens: screens.map(toTheaterScreen),
          foodMenu: services.foodMenu,
          staff: services.staff,
          refundCases: services.refundCases,
          scanStats: services.scanStats,
        },
      },
    );

    await Show.deleteMany({ ownerId: owner._id, theaterId: theater.id });
    if (shows.length) await Show.insertMany(shows);

    const nextTheater = await Theater.findById(theater._id).lean();
    const workspace = await buildOwnerWorkspace(owner, nextTheater);
    response.json({ workspace });
  }),
);

async function requireMongoOwner(request, response) {
  if (!isMongoReady()) {
    response.status(503).json({ error: "MongoDB is required for owner operations." });
    return null;
  }

  const owner = await User.findById(request.auth?.sub);
  if (!owner) {
    response.status(404).json({ error: "Owner account not found." });
    return null;
  }

  if (owner.ownerStatus !== "Approved") {
    response.status(403).json({
      error: "Owner account is not approved yet.",
      status: owner.ownerStatus || "Pending",
      application: mapOwnerApplication(owner),
    });
    return null;
  }

  return owner;
}

async function ensureOwnerTheater(owner) {
  const application = owner.ownerApplication ?? {};
  const theaterId = ownerTheaterId(owner);
  let theater =
    (await Theater.findOne({ ownerId: owner._id })) || (await Theater.findOne({ id: theaterId }));

  if (!theater) {
    theater = await Theater.create({
      id: theaterId,
      name: application.theaterName || owner.name || "Owner cinema",
      city: application.city || "Jabalpur",
      area: application.area || "",
      address: application.address || `${application.area || application.city || "Jabalpur"}`,
      contact: application.contact || "",
      manager: application.companyName || owner.name || "Manager desk",
      amenities: ["M-Ticket", "Food & Beverage"],
      cancellationPolicy: "Cancellation available up to 2 hours before movie timing.",
      ownerId: owner._id,
      approved: true,
      screens: buildInitialScreens(application.screens),
      foodMenu: defaultFoodMenu(),
      staff: defaultStaff(),
      refundCases: defaultRefundCases(),
      scanStats: defaultScanStats(),
    });
  }

  let changed = false;
  if (!theater.ownerId) {
    theater.ownerId = owner._id;
    changed = true;
  }
  if (!theater.foodMenu?.length) {
    theater.foodMenu = defaultFoodMenu();
    changed = true;
  }
  if (!theater.staff?.length) {
    theater.staff = defaultStaff();
    changed = true;
  }
  if (!theater.refundCases?.length) {
    theater.refundCases = defaultRefundCases();
    changed = true;
  }
  if (!theater.scanStats?.length) {
    theater.scanStats = defaultScanStats();
    changed = true;
  }
  if (changed) await theater.save();

  return theater;
}

async function buildOwnerWorkspace(owner, theater) {
  const shows = await Show.find({ ownerId: owner._id, theaterId: theater.id })
    .sort({ createdAt: -1 })
    .lean();
  const bookings = await Booking.find({ theaterId: theater.id }).sort({ createdAt: -1 }).lean();

  return {
    cinemaProfile: mapCinemaProfile(theater, owner),
    screens: (theater.screens ?? []).map(mapScreen),
    shows: shows.map((show) => mapShow(show, theater)),
    bookings: bookings.map(mapBooking),
    services: {
      foodMenu: theater.foodMenu?.length ? theater.foodMenu : defaultFoodMenu(),
      staff: theater.staff?.length ? theater.staff : defaultStaff(),
      refundCases: theater.refundCases?.length ? theater.refundCases : defaultRefundCases(),
      scanStats: theater.scanStats?.length ? theater.scanStats : defaultScanStats(),
    },
    ownerStatus: owner.ownerStatus,
    application: mapOwnerApplication(owner),
  };
}

function mapCinemaProfile(theater, owner) {
  return {
    id: theater.id,
    ownerKey: String(owner._id),
    name: theater.name,
    city: theater.city,
    area: theater.area || "",
    address: theater.address || "",
    distance: theater.distance || "",
    contact: theater.contact || "",
    manager: theater.manager || owner.name || "Manager desk",
    amenities: (theater.amenities ?? []).join(", "),
    cancellationPolicy: theater.cancellationPolicy || "",
  };
}

function mapScreen(screen) {
  return {
    id: screen.id,
    name: screen.name,
    type: screen.type || "Premium",
    seats: Number(screen.totalSeats || screen.seats || 0),
    occupancy: Number(screen.occupancy || 0),
    seatLayout: screen.seatLayout || {},
  };
}

function mapShow(show, theater) {
  return {
    id: show.id,
    ownerKey: String(show.ownerId || theater.ownerId || ""),
    theaterId: show.theaterId,
    theater: show.theater || theater.name,
    city: theater.city,
    area: theater.area,
    address: theater.address,
    distance: theater.distance,
    amenities: (theater.amenities ?? []).join(", "),
    listingType: show.listingType || "live",
    movieId: show.movieId,
    movie: show.movie || show.movieId,
    poster: show.poster || "",
    screen: show.screen,
    date: show.date || "",
    time: show.time || formatShowTime(show.startTime, show.endTime),
    startTime: show.startTime,
    endTime: show.endTime,
    language: show.language || "English",
    format: show.format || "2D",
    certificate: show.certificate || "UA",
    price: Number(show.price?.gold || 0),
    priceLabel:
      show.listingType === "coming-soon"
        ? "Notify me"
        : `Rs ${Number(show.price?.gold || 0).toLocaleString("en-IN")} onwards`,
    pricing: {
      gold: Number(show.price?.gold || 0),
      silver: Number(show.price?.silver || 0),
      platinum: Number(show.price?.platinum || 0),
      vip: Number(show.price?.vip || 0),
    },
    seats: Number(show.seats || 0),
    seatLayout: show.seatLayout || null,
    status: show.status || "Open",
    bookingOpensAt: show.bookingOpensAt || "",
    trailerUrl: show.trailerUrl || "",
    notes: show.notes || "",
  };
}

function mapBooking(booking) {
  return {
    ref: booking.ref,
    customer: emailName(booking.email),
    email: booking.email || "",
    phone: booking.phone || "",
    movie: booking.movie,
    screen: booking.screen,
    time: booking.time,
    seats: booking.seats ?? [],
    total: Number(booking.total || booking.totalAmount || 0),
    paymentStatus: booking.paymentStatus === "paid" ? "Paid" : booking.paymentStatus || "Pending",
    status: booking.status || "confirmed",
    ticketStatus: booking.status === "cancelled" ? "Cancelled" : "Confirmed",
    createdAt: booking.createdAt?.toISOString?.() || "",
    bookedAt: booking.createdAt
      ? new Date(booking.createdAt).toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "",
  };
}

function normalizeProfile(input = {}, theater, owner) {
  const application = owner.ownerApplication ?? {};
  const name = cleanText(input.name) || theater.name || application.theaterName || "Owner cinema";
  const city = cleanText(input.city) || theater.city || application.city || "Jabalpur";
  return {
    id: theater.id,
    name,
    city,
    area: cleanText(input.area) || theater.area || application.area || "",
    address:
      cleanText(input.address) ||
      theater.address ||
      application.address ||
      `${application.area || city}, ${city}`,
    distance: cleanText(input.distance) || theater.distance || "",
    contact: cleanText(input.contact) || theater.contact || application.contact || "",
    manager: cleanText(input.manager) || theater.manager || application.companyName || owner.name,
    amenities: cleanText(input.amenities) || (theater.amenities ?? []).join(", "),
    cancellationPolicy:
      cleanText(input.cancellationPolicy) ||
      theater.cancellationPolicy ||
      "Cancellation available up to 2 hours before movie timing.",
  };
}

function normalizeScreens(input = []) {
  const rows = Array.isArray(input) && input.length ? input : buildInitialScreens(1);
  return rows.slice(0, 12).map((screen, index) => {
    const seatLayout = normalizeSeatLayout(screen.seatLayout);
    const seats = Number(screen.seats || screen.totalSeats || countSeats(seatLayout) || 120);
    const name = cleanText(screen.name) || `Screen ${index + 1}`;
    return {
      id: cleanText(screen.id) || slugify(`${name}-${index + 1}`),
      name,
      type: cleanText(screen.type) || "Premium",
      seats,
      occupancy: Number(screen.occupancy || 0),
      seatLayout,
    };
  });
}

function normalizeShows(input = [], context) {
  if (!Array.isArray(input)) return [];
  const screenMap = new Map(context.screens.map((screen) => [screen.name, screen]));

  return input.slice(0, 200).map((show, index) => {
    const selectedScreen = screenMap.get(show.screen) ?? context.screens[0];
    const listingType = show.listingType === "coming-soon" ? "coming-soon" : "live";
    const startTime = listingType === "coming-soon" ? "TBA" : cleanText(show.startTime) || "18:30";
    const endTime = listingType === "coming-soon" ? "TBA" : cleanText(show.endTime) || "21:10";
    const gold = Number(show.pricing?.gold || show.price || 300);
    const silver = Number(show.pricing?.silver || gold);
    const platinum = Number(show.pricing?.platinum || gold);
    const vip = Number(show.pricing?.vip || platinum);
    const movieTitle = cleanText(show.movie) || cleanText(show.customTitle) || "Untitled show";
    const id = cleanText(show.id) || `${slugify(movieTitle)}-${Date.now()}-${index}`;

    return {
      id,
      ownerId: context.owner._id,
      theaterId: context.theater.id,
      theater: context.profile.name,
      movieId: cleanText(show.movieId) || slugify(movieTitle),
      movie: movieTitle,
      poster: cleanText(show.poster),
      screenId: selectedScreen?.id || slugify(show.screen || "screen-1"),
      screen: cleanText(show.screen) || selectedScreen?.name || "Screen 1",
      date: cleanText(show.date || show.showDate || show.comingSoonDate),
      time: cleanText(show.time) || formatShowTime(startTime, endTime),
      startTime,
      endTime,
      price: {
        platinum,
        silver,
        gold,
        vip,
      },
      language: cleanText(show.language) || "English",
      format: cleanText(show.format) || "2D",
      certificate: cleanText(show.certificate) || "UA",
      status: listingType === "coming-soon" ? "Coming soon" : cleanText(show.status) || "Open",
      cancellable: show.cancellable !== false,
      listingType,
      seats: Number(show.seats || selectedScreen?.seats || 0),
      seatLayout: show.seatLayout || selectedScreen?.seatLayout || {},
      bookingOpensAt: cleanText(show.bookingOpensAt),
      trailerUrl: cleanText(show.trailerUrl),
      notes: cleanText(show.notes),
    };
  });
}

function normalizeServices(input = {}) {
  return {
    foodMenu: Array.isArray(input.foodMenu) ? input.foodMenu : defaultFoodMenu(),
    staff: Array.isArray(input.staff) ? input.staff : defaultStaff(),
    refundCases: Array.isArray(input.refundCases) ? input.refundCases : defaultRefundCases(),
    scanStats: Array.isArray(input.scanStats) ? input.scanStats : defaultScanStats(),
  };
}

function toTheaterScreen(screen) {
  return {
    id: screen.id,
    name: screen.name,
    type: screen.type,
    totalSeats: screen.seats,
    occupancy: screen.occupancy,
    seatLayout: screen.seatLayout,
  };
}

function buildInitialScreens(countValue) {
  const count = Math.min(12, Math.max(1, Number(countValue || 1)));
  return Array.from({ length: count }, (_, index) => ({
    id: `screen-${index + 1}`,
    name: `Screen ${index + 1}`,
    type: index === 0 ? "Premium" : "Regular",
    totalSeats: 120,
    occupancy: 0,
    seatLayout: { rowCount: 8, seatsPerRow: 15, platinumRows: 2, silverRows: 2, vipRows: 2 },
  }));
}

function mapOwnerApplication(user) {
  const application = user.ownerApplication ?? {};
  return {
    id: cleanText(application.id) || String(user._id),
    ownerId: String(user._id),
    ownerName: user.name || "",
    ownerEmail: user.email || "",
    theaterName: application.theaterName || "",
    companyName: application.companyName || "",
    city: application.city || "",
    area: application.area || "",
    address: application.address || "",
    contact: application.contact || "",
    screens: Number(application.screens || 1),
    gstNumber: application.gstNumber || "",
    documents: application.documents || "",
    status: user.ownerStatus || "Pending",
    submittedAt: application.submittedAt,
    reviewedAt: application.reviewedAt,
    reviewedBy: application.reviewedBy,
  };
}

function defaultFoodMenu() {
  return [
    { item: "Classic popcorn combo", stock: "86 packs", price: 349, status: "Live" },
    { item: "Nachos and cola", stock: "42 packs", price: 299, status: "Live" },
    { item: "Family interval box", stock: "18 packs", price: 699, status: "Low stock" },
  ];
}

function defaultStaff() {
  return [
    { name: "Counter desk", role: "Counter staff", shift: "10 AM - 6 PM", access: "Bookings" },
    { name: "Floor manager", role: "Manager", shift: "2 PM - 11 PM", access: "Refunds" },
    { name: "Gate scanner", role: "Entry staff", shift: "5 PM - 12 AM", access: "QR scan" },
  ];
}

function defaultRefundCases() {
  return [];
}

function defaultScanStats() {
  return [
    { gate: "Gate A", value: "0 scanned", text: "Entry scans appear after tickets are verified" },
    { gate: "Gate B", value: "0 scanned", text: "No duplicate QR attempts" },
    { gate: "Exceptions", value: "0 checks", text: "Manual ticket verification queue" },
  ];
}

function ownerTheaterId(user) {
  const application = user.ownerApplication ?? {};
  return slugify(`${application.theaterName || user.name || "cinema"}-${application.city || ""}`);
}

function publicShowStatus(status) {
  const value = String(status || "").toLowerCase();
  if (value.includes("sold")) return "sold";
  if (value.includes("fast")) return "fast";
  return "ok";
}

function normalizeSeatLayout(layout = {}) {
  return {
    rowCount: Number(layout.rowCount || 8),
    seatsPerRow: Number(layout.seatsPerRow || 15),
    platinumRows: Number(layout.platinumRows || 2),
    silverRows: Number(layout.silverRows || 2),
    vipRows: Number(layout.vipRows || 2),
    aisleAfter: Number(layout.aisleAfter || 0),
    blockedSeats: Array.isArray(layout.blockedSeats) ? layout.blockedSeats : [],
  };
}

function countSeats(layout) {
  return Number(layout.rowCount || 0) * Number(layout.seatsPerRow || 0);
}

function splitList(value) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function unique(values) {
  return [...new Set(values)];
}

function cleanText(value) {
  return String(value ?? "").trim();
}

function emailName(email) {
  return (
    String(email || "")
      .split("@")[0]
      ?.replace(/[._-]+/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase()) || "Customer"
  );
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
  return String(value || "cinema")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatShowTime(startTime, endTime) {
  if (!startTime || startTime === "TBA") return "Coming soon";
  return endTime && endTime !== "TBA"
    ? `${formatTimeLabel(startTime)} - ${formatTimeLabel(endTime)}`
    : formatTimeLabel(startTime);
}

function formatTimeLabel(value) {
  const [hourText, minute = "00"] = String(value || "").split(":");
  const hour = Number(hourText);
  if (Number.isNaN(hour)) return value || "TBA";
  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12.toString().padStart(2, "0")}:${minute} ${suffix}`;
}

export { router as ownerRoutes };
