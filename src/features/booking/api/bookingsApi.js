import { requestJson } from "@/shared/services/httpClient";

function localBooking(input) {
  return {
    ...input,
    ref: `BMS${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
    status: "held",
  };
}

async function createBooking(input) {
  try {
    return await requestJson("/api/bookings", {
      method: "POST",
      body: JSON.stringify(input),
    });
  } catch {
    return { booking: localBooking(input) };
  }
}

async function fetchSeatState(showId) {
  const data = await requestJson(`/api/seat-state/${encodeURIComponent(showId)}`);
  return data.state;
}

async function lockSeats(input) {
  return requestJson("/api/lock-seats", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

async function releaseSeats(input) {
  return requestJson("/api/release-seats", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

async function createPaymentIntent(amount) {
  return requestJson("/api/payments/mock-intent", {
    method: "POST",
    body: JSON.stringify({ amount }),
  });
}

async function confirmPayment(paymentId) {
  return requestJson("/api/payments/mock-confirm", {
    method: "POST",
    body: JSON.stringify({ paymentId }),
  });
}

export {
  confirmPayment,
  createBooking,
  createPaymentIntent,
  fetchSeatState,
  lockSeats,
  releaseSeats,
};
