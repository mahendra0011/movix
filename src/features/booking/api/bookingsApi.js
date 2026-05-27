import { HAS_CONFIGURED_API_URL, requestJson } from "@/shared/services/httpClient";

const LOCAL_BOOKINGS_KEY = "bms-local-bookings";
const LOCAL_SEAT_STATE_KEY = "bms-local-seat-state";
const LOCAL_TICKET_OTPS_KEY = "bms-local-ticket-otps";
const DEMO_TICKET_OTP = "123456";
const ACTION_TIMEOUT_MS = 2500;
const LOCK_TTL_MS = 5 * 60 * 1000;

async function createBooking(input) {
  return withRemoteFallback(
    () =>
      requestJson("/api/bookings", {
        method: "POST",
        timeoutMs: ACTION_TIMEOUT_MS,
        body: JSON.stringify(input),
      }),
    () => localCreateBooking(input),
  );
}

async function fetchSeatState(showId) {
  if (!shouldUseRemoteBooking()) return localFetchSeatState(showId).state;

  try {
    const data = await requestJson(`/api/seat-state/${encodeURIComponent(showId)}`, {
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
      const data = await requestJson("/api/me/bookings", { timeoutMs: ACTION_TIMEOUT_MS });
      return data.bookings ?? [];
    },
    () => readLocalBookings(),
  );
}

async function lockSeats(input) {
  return withRemoteFallback(
    () =>
      requestJson("/api/lock-seats", {
        method: "POST",
        timeoutMs: ACTION_TIMEOUT_MS,
        body: JSON.stringify(input),
      }),
    () => localLockSeats(input),
  );
}

async function releaseSeats(input) {
  return withRemoteFallback(
    () =>
      requestJson("/api/release-seats", {
        method: "POST",
        timeoutMs: ACTION_TIMEOUT_MS,
        body: JSON.stringify(input),
      }),
    () => localReleaseSeats(input),
  );
}

async function sendTicketOtp(email) {
  return withRemoteFallback(
    () =>
      requestJson("/api/ticket-otp", {
        method: "POST",
        timeoutMs: ACTION_TIMEOUT_MS,
        body: JSON.stringify({ email }),
      }),
    () => localSendTicketOtp(email),
  );
}

async function verifyTicketOtp(input) {
  return withRemoteFallback(
    () =>
      requestJson("/api/ticket-otp/verify", {
        method: "POST",
        timeoutMs: ACTION_TIMEOUT_MS,
        body: JSON.stringify(input),
      }),
    () => localVerifyTicketOtp(input),
  );
}

async function createPaymentIntent(amount) {
  return withRemoteFallback(
    () =>
      requestJson("/api/payments/intent", {
        method: "POST",
        timeoutMs: ACTION_TIMEOUT_MS,
        body: JSON.stringify({ amount }),
      }),
    () => ({
      payment: {
        id: `demo-pay-${Date.now().toString(36)}`,
        provider: "demo",
        amount,
      },
    }),
  );
}

async function confirmPayment(payment) {
  return withRemoteFallback(
    () =>
      requestJson("/api/payments/confirm", {
        method: "POST",
        timeoutMs: ACTION_TIMEOUT_MS,
        body: JSON.stringify(payment),
      }),
    () => ({
      payment: {
        id: payment?.paymentId || payment?.id || `demo-paid-${Date.now().toString(36)}`,
        provider: payment?.provider || "demo",
      },
    }),
  );
}

async function withRemoteFallback(remoteRequest, localFallback) {
  if (!shouldUseRemoteBooking()) return localFallback();

  try {
    return await remoteRequest();
  } catch {
    return localFallback();
  }
}

function shouldUseRemoteBooking() {
  return HAS_CONFIGURED_API_URL;
}

function localFetchSeatState(showId) {
  const states = readJson(LOCAL_SEAT_STATE_KEY, {});
  const state = pruneExpiredLocks(states[showId]);
  states[showId] = state;
  writeJson(LOCAL_SEAT_STATE_KEY, states);
  return { state };
}

function localLockSeats(input) {
  const showId = normalizeShowId(input?.showId);
  const ownerId = String(input?.ownerId || "local-owner");
  const requestedSeats = normalizeSeats(input?.seats);
  const states = readJson(LOCAL_SEAT_STATE_KEY, {});
  const state = pruneExpiredLocks(states[showId]);
  const booked = new Set(state.booked);
  const activeLocks = state.locks.filter((lock) => lock.ownerId !== ownerId);
  const conflictSeats = requestedSeats.filter(
    (seat) => booked.has(seat) || activeLocks.some((lock) => lock.seat === seat),
  );

  if (conflictSeats.length > 0) {
    states[showId] = { ...state, locks: activeLocks };
    writeJson(LOCAL_SEAT_STATE_KEY, states);
    return { ok: false, conflictSeats, state: states[showId] };
  }

  const expiresAt = Date.now() + LOCK_TTL_MS;
  states[showId] = {
    ...state,
    locks: [
      ...activeLocks,
      ...requestedSeats.map((seat) => ({
        seat,
        ownerId,
        expiresAt,
      })),
    ],
  };
  writeJson(LOCAL_SEAT_STATE_KEY, states);
  return { ok: true, state: states[showId] };
}

function localReleaseSeats(input) {
  const showId = normalizeShowId(input?.showId);
  const ownerId = String(input?.ownerId || "local-owner");
  const released = new Set(normalizeSeats(input?.seats));
  const states = readJson(LOCAL_SEAT_STATE_KEY, {});
  const state = pruneExpiredLocks(states[showId]);

  states[showId] = {
    ...state,
    locks: state.locks.filter((lock) => lock.ownerId !== ownerId || !released.has(lock.seat)),
  };
  writeJson(LOCAL_SEAT_STATE_KEY, states);
  return { ok: true, state: states[showId] };
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

function localCreateBooking(input) {
  const showId = normalizeShowId(input?.showId);
  const seats = normalizeSeats(input?.seats);
  if (seats.length === 0) throwLocalError("Select at least one seat.");

  const states = readJson(LOCAL_SEAT_STATE_KEY, {});
  const state = pruneExpiredLocks(states[showId]);
  states[showId] = {
    ...state,
    booked: [...new Set([...state.booked, ...seats])],
    locks: state.locks.filter((lock) => !seats.includes(lock.seat)),
  };
  writeJson(LOCAL_SEAT_STATE_KEY, states);

  const booking = {
    id: `booking-${Date.now().toString(36)}`,
    ref: `BMS${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    showId,
    ownerId: input?.ownerId,
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
    paymentProvider: input?.paymentProvider || "demo",
    bookedAt: new Date().toISOString(),
  };
  const bookings = [booking, ...readLocalBookings()];
  writeJson(LOCAL_BOOKINGS_KEY, bookings.slice(0, 100));

  return Promise.resolve({
    ok: true,
    booking,
    ticketUrl: "",
    invoiceUrl: "",
  });
}

function pruneExpiredLocks(state) {
  const normalized = normalizeSeatState(state);
  const now = Date.now();
  return {
    ...normalized,
    locks: normalized.locks.filter((lock) => Number(lock.expiresAt) > now),
  };
}

function normalizeSeatState(state) {
  return {
    booked: Array.isArray(state?.booked) ? state.booked.map(String) : [],
    locks: Array.isArray(state?.locks)
      ? state.locks
          .map((lock) => ({
            seat: String(lock?.seat || ""),
            ownerId: String(lock?.ownerId || ""),
            expiresAt: Number(lock?.expiresAt || 0),
          }))
          .filter((lock) => lock.seat && lock.ownerId)
      : [],
    lockTtlMs: LOCK_TTL_MS,
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

function throwLocalError(message, status = 400) {
  const error = new Error(message);
  error.response = { status, data: { error: message } };
  throw error;
}

export {
  confirmPayment,
  createBooking,
  createPaymentIntent,
  sendTicketOtp,
  fetchMyBookings,
  fetchSeatState,
  lockSeats,
  releaseSeats,
  verifyTicketOtp,
};
