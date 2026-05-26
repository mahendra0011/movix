import { requestJson } from "@/shared/services/httpClient";

async function createBooking(input) {
  return requestJson("/api/bookings", {
    method: "POST",
    body: JSON.stringify(input),
  });
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
  return requestJson("/api/payments/intent", {
    method: "POST",
    body: JSON.stringify({ amount }),
  });
}

async function confirmPayment(payment) {
  return requestJson("/api/payments/confirm", {
    method: "POST",
    body: JSON.stringify(payment),
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
