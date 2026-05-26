import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { Booking } from "../models/Booking.js";
import {
  addMemoryBooking,
  getMemoryBookedSeats,
  getMemoryBookingByRef,
} from "../services/bookingStore.js";
import { cleanDocument, isMongoReady } from "../services/database.js";
import { sendBookingEmail } from "../services/emailService.js";
import { generateQrDataUrl, generateQrPng, generateTicketPdf } from "../services/ticketService.js";
import {
  getSeatState,
  lockSeats,
  releaseSeats,
  roomName,
  verifySeatLocks,
} from "../services/seatService.js";

function createRef() {
  return `BMS${Date.now().toString(36).toUpperCase()}${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;
}

function normalizeSeats(seats) {
  return Array.isArray(seats)
    ? [...new Set(seats.map((seat) => String(seat).trim()).filter(Boolean))]
    : [];
}

function createBookingRoutes({ io }) {
  const router = Router();

  async function getBookedSeats(showId) {
    if (!isMongoReady()) return getMemoryBookedSeats(showId);
    const docs = await Booking.find({ showId, status: "confirmed" }, { seats: 1 }).lean();
    return docs.flatMap((booking) => booking.seats);
  }

  async function emitSeatState(showId) {
    const state = await getSeatState(showId, await getBookedSeats(showId));
    io.to(roomName(showId)).emit("seat-state", state);
    return state;
  }

  async function findBooking(ref) {
    if (!isMongoReady()) return getMemoryBookingByRef(ref);
    return cleanDocument(await Booking.findOne({ ref }).lean());
  }

  router.get(
    "/seat-state/:showId",
    asyncHandler(async (request, response) => {
      response.json({
        state: await getSeatState(
          request.params.showId,
          await getBookedSeats(request.params.showId),
        ),
      });
    }),
  );

  router.post(
    "/lock-seats",
    asyncHandler(async (request, response) => {
      const { showId, seats, ownerId } = request.body;
      const booked = new Set(await getBookedSeats(showId));
      const seatList = normalizeSeats(seats);
      const bookedConflicts = seatList.filter((seat) => booked.has(seat));

      if (bookedConflicts.length > 0) {
        response
          .status(409)
          .json({ error: "Some seats are already booked.", conflictSeats: bookedConflicts });
        return;
      }

      const result = await lockSeats({ showId, seats: seatList, ownerId });
      if (!result.ok) {
        response.status(409).json({
          error: result.message ?? "Some seats are locked.",
          conflictSeats: result.conflictSeats,
        });
        return;
      }

      const state = await emitSeatState(showId);
      response.json({ ok: true, state });
    }),
  );

  router.post(
    "/release-seats",
    asyncHandler(async (request, response) => {
      const { showId, seats, ownerId } = request.body;
      await releaseSeats({ showId, seats, ownerId });
      const state = await emitSeatState(showId);
      response.json({ ok: true, state });
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
      ownerId,
      email = "",
      paymentId = `local_${Date.now().toString(36)}`,
      paymentProvider = "local",
    } = request.body;
    const seatList = normalizeSeats(seats);

    if (!showId || !movieId || !movie || !theater || !time || seatList.length === 0) {
      response
        .status(400)
        .json({ error: "Booking requires a show, movie, theater, time, and seats." });
      return;
    }

    const booked = new Set(await getBookedSeats(showId));
    const bookedConflicts = seatList.filter((seat) => booked.has(seat));
    if (bookedConflicts.length > 0) {
      response
        .status(409)
        .json({ error: "Some seats are already booked.", conflictSeats: bookedConflicts });
      return;
    }

    if (ownerId && !(await verifySeatLocks({ showId, seats: seatList, ownerId }))) {
      response.status(409).json({ error: "Seats must be locked before payment." });
      return;
    }

    const booking = {
      ref: createRef(),
      email: String(email),
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

    if (ownerId) await releaseSeats({ showId, seats: seatList, ownerId });
    const state = await emitSeatState(showId);
    const qrDataUrl = await generateQrDataUrl(saved);

    sendBookingEmail(saved).catch((error) => console.warn("Booking email failed:", error.message));

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

export { createBookingRoutes };
