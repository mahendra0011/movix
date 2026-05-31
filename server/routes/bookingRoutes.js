import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { Booking } from "../models/Booking.js";
import {
  addMemoryBooking,
  getMemoryBookedSeats,
  getMemoryBookingByRef,
  getMemoryBookings,
} from "../services/bookingStore.js";
import { cleanDocument, isMongoReady } from "../services/database.js";
import { sendBookingEmail, sendOtpEmail } from "../services/emailService.js";
import { generateQrDataUrl, generateQrPng, generateTicketPdf } from "../services/ticketService.js";
import { getSeatState, roomName } from "../services/seatService.js";
import { notifyBookingCreated, notifyBookingStatusChange } from "../services/notificationEvents.js";

function createRef() {
  return `MX${Date.now().toString(36).toUpperCase()}${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;
}

const bookingOtps = new Map();
const bookingEmailTokens = new Map();
const BOOKING_OTP_TTL_MS = 10 * 60 * 1000;
const BOOKING_EMAIL_TOKEN_TTL_MS = 15 * 60 * 1000;

function normalizeEmail(email) {
  return String(email ?? "")
    .trim()
    .toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function createOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function cleanExpiredBookingTokens() {
  const now = Date.now();
  for (const [email, entry] of bookingOtps.entries()) {
    if (entry.expiresAt <= now) bookingOtps.delete(email);
  }
  for (const [token, entry] of bookingEmailTokens.entries()) {
    if (entry.expiresAt <= now) bookingEmailTokens.delete(token);
  }
}

function isVerifiedBookingEmail(email, token) {
  cleanExpiredBookingTokens();
  const entry = bookingEmailTokens.get(String(token ?? ""));
  return Boolean(entry && entry.email === email && entry.expiresAt > Date.now());
}

function normalizeSeats(seats) {
  return Array.isArray(seats)
    ? [...new Set(seats.map((seat) => String(seat).trim()).filter(Boolean))]
    : [];
}

function createBookingRoutes({ io, seatHolds }) {
  const router = Router();

  async function getBookedSeats(showId) {
    if (!isMongoReady()) return getMemoryBookedSeats(showId);
    const docs = await Booking.find({ showId, status: "confirmed" }, { seats: 1 }).lean();
    return docs.flatMap((booking) => booking.seats);
  }

  async function buildSeatState(showId, ownerId = "", snapshot) {
    const bookedSeats = snapshot?.bookedSeats ?? (await getBookedSeats(showId));
    const heldSeats = snapshot?.heldSeats ?? seatHolds.getHeldSeats(showId);
    return getSeatState(showId, bookedSeats, heldSeats, ownerId);
  }

  async function emitSeatState(showId) {
    const snapshot = {
      bookedSeats: await getBookedSeats(showId),
      heldSeats: seatHolds.getHeldSeats(showId),
    };
    const state = await buildSeatState(showId, "", snapshot);
    const sockets = await io.in(roomName(showId)).fetchSockets();
    for (const client of sockets) {
      client.emit("seat-state", await buildSeatState(showId, client.id, snapshot));
    }
    return state;
  }

  async function findBooking(ref) {
    if (!isMongoReady()) return getMemoryBookingByRef(ref);
    return cleanDocument(await Booking.findOne({ ref }).lean());
  }

  function serializeBooking(booking) {
    return {
      ref: booking.ref,
      movie: booking.movie,
      theater: booking.theater,
      screen: booking.screen,
      time: booking.time,
      seats: booking.seats ?? [],
      total: Number(booking.total || booking.totalAmount || 0),
      paymentStatus: booking.paymentStatus,
      status: booking.status,
      createdAt: booking.createdAt ?? booking.updatedAt ?? "",
      ticketUrl: `/api/bookings/${booking.ref}/ticket.pdf`,
      invoiceUrl: `/api/bookings/${booking.ref}/invoice.pdf`,
    };
  }

  router.get(
    "/seat-state/:showId",
    asyncHandler(async (request, response) => {
      response.json({
        state: await buildSeatState(request.params.showId),
      });
    }),
  );

  router.post(
    "/ticket-otp",
    asyncHandler(async (request, response) => {
      const email = normalizeEmail(request.body.email);
      if (!isValidEmail(email)) {
        response.status(400).json({ error: "Enter a valid email to receive the ticket OTP." });
        return;
      }

      const otp = createOtp();
      bookingOtps.set(email, {
        otpHash: await bcrypt.hash(otp, 10),
        expiresAt: Date.now() + BOOKING_OTP_TTL_MS,
      });
      await sendOtpEmail(email, otp, { purpose: "ticket" });
      response.status(201).json({ ok: true, message: "Ticket OTP sent to your email." });
    }),
  );

  router.post(
    "/ticket-otp/verify",
    asyncHandler(async (request, response) => {
      cleanExpiredBookingTokens();
      const email = normalizeEmail(request.body.email);
      const otp = String(request.body.otp ?? "");
      const entry = bookingOtps.get(email);

      if (!entry || entry.expiresAt <= Date.now() || !(await bcrypt.compare(otp, entry.otpHash))) {
        response.status(400).json({ error: "Ticket OTP is invalid or expired." });
        return;
      }

      bookingOtps.delete(email);
      const emailVerificationToken = crypto.randomUUID();
      bookingEmailTokens.set(emailVerificationToken, {
        email,
        expiresAt: Date.now() + BOOKING_EMAIL_TOKEN_TTL_MS,
      });

      response.json({
        ok: true,
        email,
        emailVerificationToken,
        message: "Ticket email verified.",
      });
    }),
  );

  const createBookingHandler = asyncHandler(async (request, response) => {
    const {
      showId,
      movieId,
      movie,
      theaterId = "",
      theater,
      screen = "Screen 3",
      time,
      seats,
      total,
      email = "",
      emailVerificationToken = "",
      holdToken = "",
      paymentId = `local_${Date.now().toString(36)}`,
      paymentProvider = "local",
    } = request.body;
    const seatList = normalizeSeats(seats);
    const normalizedEmail = normalizeEmail(email);

    if (!showId || !movieId || !movie || !theater || !time || seatList.length === 0) {
      response
        .status(400)
        .json({ error: "Booking requires a show, movie, theater, time, and seats." });
      return;
    }

    if (
      !isValidEmail(normalizedEmail) ||
      !isVerifiedBookingEmail(normalizedEmail, emailVerificationToken)
    ) {
      response.status(400).json({ error: "Verify your ticket email with OTP before booking." });
      return;
    }

    const bookedSeats = await getBookedSeats(showId);
    const booked = new Set(bookedSeats);
    const bookedConflicts = seatList.filter((seat) => booked.has(seat));
    const heldConflicts = seatHolds.findConflicts(showId, seatList, holdToken, bookedSeats);
    const conflictSeats = [...new Set([...bookedConflicts, ...heldConflicts])];
    if (conflictSeats.length > 0) {
      response.status(409).json({
        error: "Some seats are already booked or selected by another user.",
        conflictSeats,
      });
      return;
    }

    const booking = {
      ref: createRef(),
      email: normalizedEmail,
      showId: String(showId),
      movieId: String(movieId),
      movie: String(movie),
      theaterId: String(theaterId),
      theater: String(theater),
      screen: String(screen),
      time: String(time),
      seats: seatList,
      total: Number(total || 0),
      totalAmount: Number(total || 0),
      paymentId: String(paymentId),
      paymentProvider,
      paymentStatus: "paid",
      status: "confirmed",
    };

    const saved = isMongoReady()
      ? cleanDocument(await Booking.create(booking))
      : addMemoryBooking({ ...booking, createdAt: new Date().toISOString() });

    bookingEmailTokens.delete(emailVerificationToken);
    seatHolds.releaseBookedSeats(showId, seatList);
    const state = await emitSeatState(showId);
    const qrDataUrl = await generateQrDataUrl(saved);

    sendBookingEmail(saved).catch((error) => console.warn("Booking email failed:", error.message));
    notifyBookingCreated(saved);

    response.status(201).json({
      booking: saved,
      qrDataUrl,
      state,
      ticketUrl: `/api/bookings/${saved.ref}/ticket.pdf`,
      invoiceUrl: `/api/bookings/${saved.ref}/invoice.pdf`,
    });
  });

  router.post("/book", createBookingHandler);
  router.post("/bookings", createBookingHandler);

  router.get(
    "/me/bookings",
    requireAuth,
    asyncHandler(async (request, response) => {
      const email = normalizeEmail(request.user?.email ?? request.auth?.email);
      if (!email) {
        response.status(400).json({ error: "Account email is required." });
        return;
      }

      const bookings = isMongoReady()
        ? await Booking.find({ email }).sort({ createdAt: -1 }).limit(8).lean()
        : getMemoryBookings()
            .filter((booking) => normalizeEmail(booking.email) === email)
            .sort(
              (a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
            )
            .slice(0, 8);

      response.json({ bookings: bookings.map(serializeBooking) });
    }),
  );

  router.patch(
    "/bookings/:ref/status",
    requireAuth,
    requireRole("admin", "theater-owner"),
    asyncHandler(async (request, response) => {
      const booking = await findBooking(request.params.ref);
      if (!booking) {
        response.status(404).json({ error: "Booking not found." });
        return;
      }

      const previousBooking = { ...booking };
      const nextStatus = normalizeBookingStatus(request.body.status, booking.status);
      const nextPaymentStatus = normalizePaymentStatus(
        request.body.paymentStatus,
        booking.paymentStatus,
      );
      const nextTime = String(request.body.time || booking.time || "");
      const reason = String(request.body.reason || "").trim();

      const updates = {
        status: nextStatus,
        paymentStatus: nextPaymentStatus,
        time: nextTime,
      };

      let saved;
      if (isMongoReady()) {
        saved = cleanDocument(
          await Booking.findOneAndUpdate(
            { ref: request.params.ref },
            { $set: updates },
            { new: true },
          ),
        );
      } else {
        Object.assign(booking, updates, { updatedAt: new Date().toISOString() });
        saved = booking;
      }

      const event = buildBookingStatusEvent(previousBooking, saved, reason);
      notifyBookingStatusChange(saved, event);

      response.json({ booking: serializeBooking(saved), event });
    }),
  );

  router.get(
    "/bookings/:ref",
    asyncHandler(async (request, response) => {
      const booking = await findBooking(request.params.ref);
      if (!booking) {
        response.status(404).json({ error: "Booking not found." });
        return;
      }
      response.json({ booking, qrDataUrl: await generateQrDataUrl(booking) });
    }),
  );

  router.get(
    "/bookings/:ref/qr.png",
    asyncHandler(async (request, response) => {
      const booking = await findBooking(request.params.ref);
      if (!booking) {
        response.status(404).json({ error: "Booking not found." });
        return;
      }
      response.setHeader("content-type", "image/png");
      response.send(await generateQrPng(booking));
    }),
  );

  router.get(
    "/bookings/:ref/ticket.pdf",
    asyncHandler(async (request, response) => {
      const booking = await findBooking(request.params.ref);
      if (!booking) {
        response.status(404).json({ error: "Booking not found." });
        return;
      }
      response.setHeader("content-type", "application/pdf");
      response.setHeader("content-disposition", `inline; filename="${booking.ref}-ticket.pdf"`);
      response.send(await generateTicketPdf(booking));
    }),
  );

  router.get(
    "/bookings/:ref/invoice.pdf",
    asyncHandler(async (request, response) => {
      const booking = await findBooking(request.params.ref);
      if (!booking) {
        response.status(404).json({ error: "Booking not found." });
        return;
      }
      response.setHeader("content-type", "application/pdf");
      response.setHeader("content-disposition", `inline; filename="${booking.ref}-invoice.pdf"`);
      response.send(await generateTicketPdf(booking, { invoice: true }));
    }),
  );

  return { router, getBookedSeats, emitSeatState };
}

function normalizeBookingStatus(value, fallback = "confirmed") {
  return ["confirmed", "held", "cancelled"].includes(value) ? value : fallback || "confirmed";
}

function normalizePaymentStatus(value, fallback = "paid") {
  return ["pending", "paid", "failed", "refunded"].includes(value) ? value : fallback || "paid";
}

function buildBookingStatusEvent(previous, next, reason) {
  if (next.status === "cancelled" && previous.status !== "cancelled") {
    return {
      type: "cancellation",
      title: "Booking cancelled",
      message: `${next.movie} booking ${next.ref} was cancelled.${
        reason ? ` Reason: ${reason}` : ""
      }`,
    };
  }

  if (next.paymentStatus === "refunded" && previous.paymentStatus !== "refunded") {
    return {
      type: "refund",
      title: "Refund update",
      message: `Refund completed for ${next.movie} booking ${next.ref}.`,
    };
  }

  if (next.time !== previous.time) {
    return {
      type: "reschedule",
      title: "Show rescheduled",
      message: `${next.movie} has a new showtime: ${next.time}.`,
    };
  }

  return {
    type: "booking-update",
    title: "Booking updated",
    message: `${next.movie} booking ${next.ref} was updated.${reason ? ` ${reason}` : ""}`,
  };
}

export { createBookingRoutes };
