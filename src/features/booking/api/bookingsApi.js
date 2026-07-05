import { baseRequest, HAS_CONFIGURED_API_URL } from "@/features/api/baseApi";
import QRCode from "qrcode";

const LOCAL_BOOKINGS_KEY = "movix-local-bookings";
const LOCAL_SEAT_STATE_KEY = "movix-local-seat-state";
const LOCAL_TICKET_OTPS_KEY = "movix-local-ticket-otps";
const DEMO_TICKET_OTP = "123456";
const ACTION_TIMEOUT_MS = 2500;

async function createBooking(input) {
  return withRemoteFallback(
    () =>
      baseRequest("/api/bookings", {
        method: "POST",
        timeoutMs: ACTION_TIMEOUT_MS,
        body: input,
      }),
    () => localCreateBooking(input),
  );
}

async function fetchSeatState(showId) {
  if (!shouldUseRemoteBooking()) return localFetchSeatState(showId).state;

  try {
    const data = await baseRequest(`/api/seat-state/${encodeURIComponent(showId)}`, {
      timeoutMs: ACTION_TIMEOUT_MS,
    });
    return data.state;
  } catch {
    return localFetchSeatState(showId).state;
  }
}

async function fetchMyBookings() {
  return withRemoteFallback(
    async () => {
      const data = await baseRequest("/api/me/bookings", { timeoutMs: ACTION_TIMEOUT_MS });
      return data.bookings ?? [];
    },
    () => readLocalBookings(),
  );
}

async function sendTicketOtp(email) {
  return withRemoteFallback(
    () =>
      baseRequest("/api/ticket-otp", {
        method: "POST",
        timeoutMs: ACTION_TIMEOUT_MS,
        body: { email },
      }),
    () => localSendTicketOtp(email),
  );
}

async function verifyTicketOtp(input) {
  return withRemoteFallback(
    () =>
      baseRequest("/api/ticket-otp/verify", {
        method: "POST",
        timeoutMs: ACTION_TIMEOUT_MS,
        body: input,
      }),
    () => localVerifyTicketOtp(input),
  );
}

async function createPaymentIntent(amount) {
  return withRemoteFallback(
    () =>
      baseRequest("/api/payments/intent", {
        method: "POST",
        timeoutMs: ACTION_TIMEOUT_MS,
        body: { amount },
      }),
    () => ({
      payment: {
        id: `demo-pay-${Date.now().toString(36)}`,
        provider: "local",
        amount,
      },
    }),
  );
}

async function confirmPayment(payment) {
  return withRemoteFallback(
    () =>
      baseRequest("/api/payments/confirm", {
        method: "POST",
        timeoutMs: ACTION_TIMEOUT_MS,
        body: payment,
      }),
    () => ({
      payment: {
        id: payment?.paymentId || payment?.id || `demo-paid-${Date.now().toString(36)}`,
        provider: payment?.provider || "local",
      },
    }),
  );
}

async function withRemoteFallback(remoteRequest, localFallback) {
  if (!shouldUseRemoteBooking()) return localFallback();

  try {
    return await remoteRequest();
  } catch (error) {
    if (error.response) throw error;
    return localFallback();
  }
}

function shouldUseRemoteBooking() {
  return HAS_CONFIGURED_API_URL;
}

function localFetchSeatState(showId) {
  const states = readJson(LOCAL_SEAT_STATE_KEY, {});
  const state = normalizeSeatState(states[showId]);
  states[showId] = state;
  writeJson(LOCAL_SEAT_STATE_KEY, states);
  return { state };
}

function localSendTicketOtp(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) throwLocalError("Enter a valid email for your ticket.");

  const otps = readJson(LOCAL_TICKET_OTPS_KEY, {});
  otps[normalizedEmail] = {
    otp: DEMO_TICKET_OTP,
    expiresAt: Date.now() + 10 * 60 * 1000,
  };
  writeJson(LOCAL_TICKET_OTPS_KEY, otps);
  return Promise.resolve({ ok: true, message: `Demo ticket OTP is ${DEMO_TICKET_OTP}.` });
}

function localVerifyTicketOtp(input) {
  const email = normalizeEmail(input?.email);
  const otp = String(input?.otp ?? "").trim();
  const otps = readJson(LOCAL_TICKET_OTPS_KEY, {});
  const record = otps[email];

  if (!record || record.expiresAt < Date.now() || record.otp !== otp) {
    throwLocalError("Ticket OTP is invalid or expired.");
  }

  delete otps[email];
  writeJson(LOCAL_TICKET_OTPS_KEY, otps);
  return Promise.resolve({
    ok: true,
    emailVerificationToken: `local-ticket-${window.btoa(`${email}:${Date.now()}`)}`,
    message: "Ticket email verified.",
  });
}

async function localCreateBooking(input) {
  const showId = normalizeShowId(input?.showId);
  const seats = normalizeSeats(input?.seats);
  if (seats.length === 0) throwLocalError("Select at least one seat.");

  const states = readJson(LOCAL_SEAT_STATE_KEY, {});
  const state = normalizeSeatState(states[showId]);
  const booked = new Set(state.booked);
  const conflictSeats = seats.filter((seat) => booked.has(seat));
  if (conflictSeats.length > 0) {
    throwLocalError("Some seats are already booked.", 409, { conflictSeats });
  }

  states[showId] = {
    booked: [...new Set([...state.booked, ...seats])],
  };
  writeJson(LOCAL_SEAT_STATE_KEY, states);

  const booking = {
    id: `booking-${Date.now().toString(36)}`,
    ref: `MVX${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    showId,
    movieId: input?.movieId,
    movie: input?.movie || "Movie",
    theaterId: input?.theaterId,
    theater: input?.theater || "Theater",
    screen: input?.screen || "Screen",
    time: input?.time || "Showtime",
    seats,
    total: Number(input?.total || 0),
    email: normalizeEmail(input?.email),
    paymentId: input?.paymentId,
    paymentProvider: input?.paymentProvider || "local",
    bookedAt: new Date().toISOString(),
  };
  const bookings = [booking, ...readLocalBookings()];
  writeJson(LOCAL_BOOKINGS_KEY, bookings.slice(0, 100));

  const qrPayload = JSON.stringify({
    ref: booking.ref,
    movie: booking.movie,
    theater: booking.theater,
    time: booking.time,
    seats: booking.seats,
    total: booking.total,
  });
  const qrDataUrl = await QRCode.toDataURL(qrPayload, { margin: 1, width: 220 }).catch(() => "");

  return {
    ok: true,
    booking,
    qrDataUrl,
    ticketUrl: "",
    invoiceUrl: "",
  };
}

function normalizeSeatState(state) {
  return {
    booked: Array.isArray(state?.booked) ? state.booked.map(String) : [],
  };
}

function readLocalBookings() {
  return readJson(LOCAL_BOOKINGS_KEY, []);
}

function normalizeShowId(showId) {
  return String(showId || "local-show");
}

function normalizeSeats(seats) {
  return Array.isArray(seats)
    ? [...new Set(seats.map((seat) => String(seat).trim()).filter(Boolean))]
    : [];
}

function normalizeEmail(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function readJson(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function throwLocalError(message, status = 400, data = {}) {
  const error = new Error(message);
  error.response = { status, data: { error: message, ...data } };
  throw error;
}

export {
  confirmPayment,
  createBooking,
  createPaymentIntent,
  sendTicketOtp,
  fetchMyBookings,
  fetchSeatState,
  verifyTicketOtp,
};
